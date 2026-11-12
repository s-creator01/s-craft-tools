// S Craft — Image Tools Engine (100% Client-Side Canvas & JSZip)
import { formatBytes, downloadBlob, loadImage, readFileAsDataURL } from '../ui-utils.js';
import { logActivity } from '../recent.js';

/**
 * Exact Image Resize Engine
 * Guarantees exact independent Width and Height pixel rasterization.
 */
export async function resizeImageExact(imageSource, options = {}) {
  const img = imageSource instanceof Image ? imageSource : await loadImage(imageSource);
  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  let targetW = parseInt(options.width) || origW;
  let targetH = parseInt(options.height) || origH;
  const mode = options.mode || 'exact'; // 'exact' | 'max' | 'original'
  const fit = options.fit || 'crop';    // 'crop' | 'contain' | 'stretch'
  const format = options.format || 'image/jpeg';
  let quality = options.quality !== undefined ? options.quality : 0.92;
  const bgColor = options.bgColor || '#FFFFFF';

  if (mode === 'original') {
    targetW = origW;
    targetH = origH;
  } else if (mode === 'max') {
    const scale = Math.min(targetW / origW, targetH / origH, 1.0);
    targetW = Math.round(origW * scale);
    targetH = Math.round(origH * scale);
  }

  // Create canvas strictly at exact target dimensions
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');

  // Background fill for transparent images converted to JPEG or contain padding
  if (format === 'image/jpeg' || fit === 'contain') {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, targetW, targetH);
  }

  if (fit === 'stretch') {
    ctx.drawImage(img, 0, 0, targetW, targetH);
  } else if (fit === 'contain') {
    const scale = Math.min(targetW / origW, targetH / origH);
    const drawW = Math.round(origW * scale);
    const drawH = Math.round(origH * scale);
    const dx = Math.round((targetW - drawW) / 2);
    const dy = Math.round((targetH - drawH) / 2);
    ctx.drawImage(img, dx, dy, drawW, drawH);
  } else {
    // 'crop' (Crop to fit without distortion)
    const scale = Math.max(targetW / origW, targetH / origH);
    const srcW = targetW / scale;
    const srcH = targetH / scale;
    const sx = Math.max(0, (origW - srcW) / 2);
    const sy = Math.max(0, (origH - srcH) / 2);
    ctx.drawImage(img, sx, sy, srcW, srcH, 0, 0, targetW, targetH);
  }

  // Target size iterative compression (if requested)
  let blob = await new Promise(r => canvas.toBlob(r, format, quality));

  if (options.targetMaxKb && options.targetMaxKb > 0 && format !== 'image/png') {
    const maxBytes = options.targetMaxKb * 1024;
    // Try progressively lower quality while preserving the requested dimensions.
    // Return the first candidate that fits, or the smallest quality tried.
    const initialQuality = Math.max(0.1, Math.min(1, quality));
    for (let step = 1; blob.size > maxBytes && step <= 9; step++) {
      const nextQuality = Math.max(0.1, initialQuality * (1 - step / 10));
      blob = await new Promise(r => canvas.toBlob(r, format, nextQuality));
      if (!blob) throw new Error('This browser could not encode the image.');
    }
  }

  return {
    blob,
    width: targetW,
    height: targetH,
    size: blob.size,
    canvas
  };
}

/**
 * Target-Size Image Compression
 * Iteratively converges to <= target KB while maintaining image clarity
 */
export async function compressImageToTargetSize(file, targetKb, options = {}) {
  if (typeof window.imageCompression !== 'function') {
    throw new Error('The local image compression library is not loaded.');
  }
  const format = options.format || (file.type === 'image/png' && !targetKb ? 'image/png' : 'image/jpeg');
  // Render first so JPEGs receive the same white background as the conversion tool.
  const rendered = await convertImage(file, format, 0.95);
  const input = new File([rendered.blob], file.name || 'image', { type: rendered.blob.type });
  const blob = await window.imageCompression(input, {
    maxSizeMB: (targetKb || 100) / 1024,
    fileType: format,
    initialQuality: 0.95,
    useWebWorker: false,
    preserveExif: false,
    maxIteration: 10
  });
  return { blob, size: blob.size, initialSize: file.size, format: blob.type };
}

/**
 * Sign Image Engine
 * Renders signature overlay on image at specific position, scale, rotation, and opacity.
 */
export async function signImage(imageFile, signatureDataUrl, options = {}) {
  const baseImg = await loadImage(imageFile);
  const sigImg = await loadImage(signatureDataUrl);

  const canvas = document.createElement('canvas');
  canvas.width = baseImg.naturalWidth;
  canvas.height = baseImg.naturalHeight;
  const ctx = canvas.getContext('2d');

  // Draw base image
  ctx.drawImage(baseImg, 0, 0);

  // Calculate signature placement
  // options.x, options.y are normalized (0..1) or pixel coordinates
  const scale = options.scale !== undefined ? options.scale : 0.3; // % of image width
  const sigAspect = sigImg.naturalWidth / sigImg.naturalHeight;
  const drawWidth = baseImg.naturalWidth * scale;
  const drawHeight = drawWidth / sigAspect;

  const posX = options.x !== undefined ? options.x : (baseImg.naturalWidth - drawWidth) / 2;
  const posY = options.y !== undefined ? options.y : (baseImg.naturalHeight - drawHeight) * 0.75;
  const rotationRad = ((options.rotation || 0) * Math.PI) / 180;
  const opacity = options.opacity !== undefined ? options.opacity : 1.0;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(posX + drawWidth / 2, posY + drawHeight / 2);
  ctx.rotate(rotationRad);
  ctx.drawImage(sigImg, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  ctx.restore();

  const outFormat = imageFile.type || 'image/jpeg';
  const blob = await new Promise(r => canvas.toBlob(r, outFormat, 0.95));

  return {
    blob,
    width: canvas.width,
    height: canvas.height,
    size: blob.size,
    canvas
  };
}

/**
 * Watermark Image
 */
export async function watermarkImage(imageFile, watermarkTextOrLogo, options = {}) {
  const img = await loadImage(imageFile);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(img, 0, 0);

  const opacity = options.opacity !== undefined ? options.opacity : 0.4;
  ctx.save();
  ctx.globalAlpha = opacity;

  if (typeof watermarkTextOrLogo === 'string') {
    // Text watermark
    const text = watermarkTextOrLogo;
    const fontSize = Math.max(16, Math.round(canvas.width / 25));
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = options.color || '#FFFFFF';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;

    if (options.tile) {
      // Tiled watermark
      ctx.rotate((-30 * Math.PI) / 180);
      const stepX = fontSize * 10;
      const stepY = fontSize * 6;
      for (let x = -canvas.width; x < canvas.width * 2; x += stepX) {
        for (let y = -canvas.height; y < canvas.height * 2; y += stepY) {
          ctx.fillText(text, x, y);
        }
      }
    } else {
      // Bottom-right or center
      const metrics = ctx.measureText(text);
      const x = options.position === 'center' ? (canvas.width - metrics.width) / 2 : canvas.width - metrics.width - 24;
      const y = options.position === 'center' ? canvas.height / 2 : canvas.height - 24;
      ctx.fillText(text, x, y);
    }
  } else if (watermarkTextOrLogo instanceof Image || watermarkTextOrLogo instanceof Blob) {
    // Image watermark
    const logo = watermarkTextOrLogo instanceof Image ? watermarkTextOrLogo : await loadImage(watermarkTextOrLogo);
    const logoW = canvas.width * (options.scale || 0.2);
    const logoH = (logoW / logo.naturalWidth) * logo.naturalHeight;
    if (options.tile) {
      const stepX = Math.max(180, canvas.width / 3.5);
      const stepY = Math.max(150, canvas.height / 4);
      const markW = Math.min(logoW, stepX * 0.7);
      const markH = (markW / logo.naturalWidth) * logo.naturalHeight;
      for (let x = stepX / 2; x < canvas.width; x += stepX) {
        for (let y = stepY / 2; y < canvas.height; y += stepY) {
          ctx.drawImage(logo, x - markW / 2, y - markH / 2, markW, markH);
        }
      }
    } else {
      const x = options.position === 'center' ? (canvas.width - logoW) / 2 : canvas.width - logoW - 20;
      const y = options.position === 'center' ? (canvas.height - logoH) / 2 : canvas.height - logoH - 20;
      ctx.drawImage(logo, x, y, logoW, logoH);
    }
  }

  ctx.restore();
  const blob = await new Promise(r => canvas.toBlob(r, imageFile.type || 'image/jpeg', 0.92));
  return { blob, size: blob.size, canvas };
}

/**
 * Add Text / Annotation to Image
 */
export async function addTextToImage(imageFile, text, options = {}) {
  const img = await loadImage(imageFile);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(img, 0, 0);

  const fontSize = options.fontSize || Math.max(18, Math.round(canvas.width / 30));
  ctx.font = `600 ${fontSize}px sans-serif`;
  const metrics = ctx.measureText(text);
  const padding = 10;

  const posX = options.x !== undefined ? options.x : (canvas.width - metrics.width) / 2;
  const posY = options.y !== undefined ? options.y : canvas.height * 0.85;

  if (options.backgroundPill) {
    ctx.fillStyle = options.bgColor || 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.roundRect(posX - padding, posY - fontSize, metrics.width + padding * 2, fontSize + padding, 8);
    ctx.fill();
  }

  ctx.fillStyle = options.color || '#FFFFFF';
  ctx.fillText(text, posX, posY);

  const blob = await new Promise(r => canvas.toBlob(r, imageFile.type || 'image/jpeg', 0.92));
  return { blob, size: blob.size, canvas };
}

/**
 * Rotate & Flip Image
 */
export async function rotateFlipImage(imageFile, angle = 0, flipH = false, flipV = false) {
  const img = await loadImage(imageFile);
  const origW = img.naturalWidth;
  const origH = img.naturalHeight;

  const rad = (angle * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));

  const newW = Math.round(origW * cos + origH * sin);
  const newH = Math.round(origW * sin + origH * cos);

  const canvas = document.createElement('canvas');
  canvas.width = newW;
  canvas.height = newH;
  const ctx = canvas.getContext('2d');

  ctx.translate(newW / 2, newH / 2);
  ctx.rotate(rad);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(img, -origW / 2, -origH / 2);

  const blob = await new Promise(r => canvas.toBlob(r, imageFile.type || 'image/jpeg', 0.95));
  return { blob, width: newW, height: newH, size: blob.size, canvas };
}

/**
 * Convert Image Format
 */
export async function convertImage(imageFile, targetMimeType, quality = 0.92, bgColor = '#FFFFFF') {
  const { blob, canvas } = await resizeImageExact(imageFile, {
    mode: 'original',
    fit: 'stretch',
    format: targetMimeType,
    quality,
    bgColor,
  });
  if (!blob || blob.type !== targetMimeType) {
    throw new Error('This browser could not encode the selected image format.');
  }
  return { blob, size: blob.size, canvas };
}

/**
 * Strip Image Metadata (EXIF scrub)
 */
export async function stripImageMetadata(imageFile) {
  const bytes = new Uint8Array(await imageFile.arrayBuffer());
  const type = imageFile.type.toLowerCase();

  // Remove metadata chunks/segments without decoding and re-encoding pixels.
  // This preserves the exact compressed image data and therefore avoids the
  // size increase and quality loss that a canvas round-trip can introduce.
  if (type === 'image/jpeg' || type === 'image/jpg') {
    if (bytes[0] === 0xff && bytes[1] === 0xd8) {
      const parts = [bytes.slice(0, 2)];
      let offset = 2;
      while (offset < bytes.length) {
        if (bytes[offset] !== 0xff) { parts.push(bytes.slice(offset)); break; }
        let markerStart = offset;
        while (bytes[offset] === 0xff) offset++;
        const marker = bytes[offset++];
        if (marker === 0xda || marker === 0xd9) { parts.push(bytes.slice(markerStart)); break; }
        if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { parts.push(bytes.slice(markerStart, offset)); continue; }
        if (offset + 2 > bytes.length) { parts.push(bytes.slice(markerStart)); break; }
        const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
        const end = offset + segmentLength;
        if (segmentLength < 2 || end > bytes.length) { parts.push(bytes.slice(markerStart)); break; }
        if (marker !== 0xe1 && marker !== 0xed && marker !== 0xec) parts.push(bytes.slice(markerStart, end));
        offset = end;
      }
      const size = parts.reduce((sum, part) => sum + part.length, 0);
      const clean = new Uint8Array(size); let at = 0;
      for (const part of parts) { clean.set(part, at); at += part.length; }
      const blob = new Blob([clean], { type: 'image/jpeg' });
      return { blob, size: blob.size, method: 'Metadata segments removed; image data preserved' };
    }
  }

  if (type === 'image/png' && bytes[0] === 0x89 && bytes[1] === 0x50) {
    const parts = [bytes.slice(0, 8)]; let offset = 8;
    while (offset + 12 <= bytes.length) {
      const length = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0);
      const end = offset + 12 + length;
      if (end > bytes.length) { parts.push(bytes.slice(offset)); break; }
      const name = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
      if (!['eXIf', 'tEXt', 'zTXt', 'iTXt'].includes(name)) parts.push(bytes.slice(offset, end));
      offset = end;
      if (name === 'IEND') break;
    }
    const size = parts.reduce((sum, part) => sum + part.length, 0);
    const clean = new Uint8Array(size); let at = 0;
    for (const part of parts) { clean.set(part, at); at += part.length; }
    const blob = new Blob([clean], { type: 'image/png' });
    return { blob, size: blob.size, method: 'Metadata chunks removed; image data preserved' };
  }

  const img = await loadImage(imageFile);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const mime = imageFile.type === 'image/webp' ? 'image/webp' : 'image/png';
  const blob = await new Promise(r => canvas.toBlob(r, mime, 0.95));
  return { blob, size: blob.size, method: 'Image re-encoded without metadata' };
}

/**
 * Batch Process Images to ZIP
 */
export async function batchProcessImages(files, actionFn, zipName = 'processed-images.zip') {
  const JSZipLib = window.JSZip;
  if (!JSZipLib) throw new Error('JSZip library is not loaded');

  const zip = new JSZipLib();
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const { blob, fileName } = await actionFn(file, i);
    zip.file(fileName || `image_${i + 1}.jpg`, blob);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return { zipBlob, count: files.length };
}
