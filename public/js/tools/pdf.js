// S Craft — PDF Tools Engine (100% Client-Side with pdf-lib & JSZip)
import { readFileAsArrayBuffer, downloadBlob, formatBytes } from '../ui-utils.js';

function getPdfLib() {
  const lib = window.PDFLib;
  if (!lib) {
    throw new Error('PDF-Lib is not loaded. Please ensure vendor/pdf-lib.min.js is included.');
  }
  return lib;
}

/**
 * Sign PDF (Visual flattened signature)
 * In PDF coordinate system, origin (0, 0) is at the BOTTOM-LEFT.
 */
export async function signPdf(pdfBytes, signatureDataUrl, options = {}) {
  const { PDFDocument, degrees } = getPdfLib();
  const doc = await PDFDocument.load(pdfBytes);
  const totalPages = doc.getPageCount();

  const targetPageIndex = Math.max(0, Math.min(totalPages - 1, (options.page || 1) - 1));
  const page = doc.getPage(targetPageIndex);
  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();

  // Convert signature data URL to image bytes
  const isPng = signatureDataUrl.includes('image/png') || !signatureDataUrl.includes('image/jpeg');
  const base64Data = signatureDataUrl.split(',')[1];
  const sigBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

  let embeddedImage;
  if (isPng) {
    embeddedImage = await doc.embedPng(sigBytes);
  } else {
    embeddedImage = await doc.embedJpg(sigBytes);
  }

  // Calculate signature width & height
  const scale = options.scale !== undefined ? options.scale : 0.25; // default 25% of page width
  const aspect = embeddedImage.width / embeddedImage.height;
  const drawWidth = options.width || (pageWidth * scale);
  const drawHeight = options.height || (drawWidth / aspect);

  // Normalize position coordinates (top-left relative to bottom-left)
  // options.x is from left; options.y is from top of page
  const x = options.x !== undefined ? options.x : (pageWidth - drawWidth) / 2;
  const topY = options.y !== undefined ? options.y : (pageHeight * 0.7);
  const y = pageHeight - topY - drawHeight; // Flip to PDF bottom-left origin

  const angle = options.rotation || 0;
  const opacity = options.opacity !== undefined ? options.opacity : 1.0;

  page.drawImage(embeddedImage, {
    x,
    y,
    width: drawWidth,
    height: drawHeight,
    rotate: degrees(angle),
    opacity
  });

  const modifiedBytes = await doc.save();
  const blob = new Blob([modifiedBytes], { type: 'application/pdf' });
  return {
    blob,
    size: blob.size,
    totalPages
  };
}

/**
 * Merge Multiple PDFs
 */
export async function mergePdfs(pdfBuffers) {
  const { PDFDocument } = getPdfLib();
  const mergedDoc = await PDFDocument.create();

  for (let i = 0; i < pdfBuffers.length; i++) {
    const srcDoc = await PDFDocument.load(pdfBuffers[i], { ignoreEncryption: true });
    const pageIndices = srcDoc.getPageIndices();
    const copiedPages = await mergedDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach(p => mergedDoc.addPage(p));
  }

  const mergedBytes = await mergedDoc.save();
  const blob = new Blob([mergedBytes], { type: 'application/pdf' });
  return {
    blob,
    size: blob.size,
    totalPages: mergedDoc.getPageCount()
  };
}

/**
 * Split PDF
 * Extracts specified pages/range, or splits all pages into individual files in a ZIP.
 */
export async function splitPdf(pdfBytes, pageRangeStr = 'all') {
  const { PDFDocument } = getPdfLib();
  const input = await PDFDocument.load(pdfBytes);
  const count = input.getPageCount();

  // Create each output from the original document so page order and content are retained.
  const makeDocument = async indices => {
    const output = await PDFDocument.create();
    const pages = await output.copyPages(input, indices);
    for (const page of pages) output.addPage(page);
    return new Blob([await output.save()], { type: 'application/pdf' });
  };

  if (pageRangeStr === 'all') {
    if (!window.JSZip) throw new Error('JSZip is required for multi-file split');
    const archive = new window.JSZip();
    for (let index = 0; index < count; index += 1) {
      const document = await makeDocument([index]);
      archive.file(`page_${index + 1}.pdf`, await document.arrayBuffer());
    }
    const blob = await archive.generateAsync({ type: 'blob' });
    return { isZip: true, blob, size: blob.size, pageCount: count };
  }

  // A page can appear once even if the entered ranges overlap. Select in document order.
  const selected = new Set();
  for (const entry of String(pageRangeStr).split(',')) {
    const bounds = entry.trim().split('-');
    const first = parseInt(bounds[0], 10);
    const last = bounds.length > 1 ? parseInt(bounds[1], 10) : first;
    if (!Number.isFinite(first) || !Number.isFinite(last)) continue;
    for (let page = Math.max(first, 1); page <= Math.min(last, count); page += 1) selected.add(page - 1);
  }
  const indices = [...selected].sort((a, b) => a - b);
  if (indices.length === 0) throw new Error('No valid pages matched the specified range.');
  const blob = await makeDocument(indices);
  return { isZip: false, blob, size: blob.size, pageCount: indices.length };
}

/**
 * Organize Pages (Rotate, Delete, Add Blank, Reorder)
 */
export async function organizePdfPages(pdfBytes, pageConfigs) {
  // pageConfigs: Array<{ origIndex: number, rotateDelta: number, delete: boolean }>
  const { PDFDocument, degrees } = getPdfLib();
  const srcDoc = await PDFDocument.load(pdfBytes);
  const outDoc = await PDFDocument.create();

  for (const cfg of pageConfigs) {
    if (cfg.delete) continue;

    if (cfg.isBlank) {
      outDoc.addPage([595.28, 841.89]); // A4 blank page
      continue;
    }

    const [copiedPage] = await outDoc.copyPages(srcDoc, [cfg.origIndex]);
    if (cfg.rotateDelta) {
      const currentRotation = copiedPage.getRotation().angle;
      copiedPage.setRotation(degrees((currentRotation + cfg.rotateDelta) % 360));
    }
    outDoc.addPage(copiedPage);
  }

  const outBytes = await outDoc.save();
  const blob = new Blob([outBytes], { type: 'application/pdf' });
  return { blob, size: blob.size, totalPages: outDoc.getPageCount() };
}

/**
 * Compress PDF
 */
export async function compressPdf(pdfBytes, strength = 50) {
  const { PDFDocument } = getPdfLib();
  const sourceBytes = pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);
  const originalSize = sourceBytes.byteLength;
  const compressionStrength = Math.max(0, Math.min(80, Number(strength) || 0));
  let compressedBytes;

  const structuralDoc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
  const structuralBytes = await structuralDoc.save({ useObjectStreams: true, addDefaultPage: false });
  compressedBytes = structuralBytes;

  if (compressionStrength > 0 && window.pdfjsLib) {
    // Re-encode each page as a JPEG so image-heavy scans get real, measurable compression.
    // This intentionally flattens text/vector content; the UI labels this tradeoff.
    const source = await window.pdfjsLib.getDocument({ data: sourceBytes.slice(), isEvalSupported: false }).promise;
    const output = await PDFDocument.create();
    const renderScale = 1.5 - compressionStrength * 0.008;
    const jpegQuality = Math.max(0.3, 0.92 - compressionStrength * 0.0075);
    for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
      const page = await source.getPage(pageNumber);
      const viewport = page.getViewport({ scale: renderScale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      const jpeg = await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? blob.arrayBuffer().then(resolve, reject) : reject(new Error('Could not encode a PDF page')), 'image/jpeg', jpegQuality));
      const image = await output.embedJpg(jpeg);
      const pageOut = output.addPage([viewport.width / renderScale, viewport.height / renderScale]);
      pageOut.drawImage(image, { x: 0, y: 0, width: pageOut.getWidth(), height: pageOut.getHeight() });
      canvas.width = 0; canvas.height = 0;
    }
    const rasterBytes = await output.save({ useObjectStreams: true });
    // Rasterization can bloat text/vector PDFs. Keep the smallest valid result and
    // never replace the original with a larger output.
    if (rasterBytes.byteLength < compressedBytes.byteLength) compressedBytes = rasterBytes;
    await source.destroy();
  }

  if (compressedBytes.byteLength >= originalSize) compressedBytes = sourceBytes;

  const blob = new Blob([compressedBytes], { type: 'application/pdf' });
  return {
    blob,
    size: blob.size,
    initialSize: originalSize,
    savedBytes: Math.max(0, originalSize - blob.size),
    compressionStrength,
    isSmaller: blob.size < originalSize
  };
}

/**
 * Watermark PDF
 */
export async function watermarkPdf(pdfBytes, text, options = {}) {
  const { PDFDocument, StandardFonts, rgb, degrees } = getPdfLib();
  const doc = await PDFDocument.load(pdfBytes);
  const imageBytes = options.imageBytes;
  const watermarkImage = imageBytes ? (options.imageType === 'image/png' ? await doc.embedPng(imageBytes) : await doc.embedJpg(imageBytes)) : null;
  const watermarkText = String(text || '').trim();
  const font = watermarkText ? await doc.embedFont(StandardFonts.HelveticaBold) : null;
  const pages = doc.getPages();
  const opacity = Math.max(0, Math.min(1, options.opacity !== undefined ? Number(options.opacity) : 0.25));
  const angle = Number(options.angle !== undefined ? options.angle : 45);
  const sizeScale = Math.max(0.25, Math.min(2, Number(options.sizeScale ?? 1)));
  const xPosition = Math.max(0, Math.min(1, options.x ?? 0.5));
  const yPosition = Math.max(0, Math.min(1, options.y ?? 0.5));
  const color = options.color || rgb(0.5, 0.5, 0.5);
  const requestedPageIndices = options.pageIndices;
  const pageIndices = requestedPageIndices === undefined
    ? pages.map((_, index) => index)
    : [...new Set(requestedPageIndices.map(index => Math.trunc(Number(index))))].filter(index => index >= 0 && index < pages.length);
  if (!watermarkImage && !watermarkText) throw new Error('Choose watermark text, a logo image, or both.');
  if (!pageIndices.length) throw new Error('Select at least one PDF page to watermark.');

  pageIndices.forEach(pageIndex => {
    const page = pages[pageIndex];
    const { width, height } = page.getSize();
    const radians = (angle * Math.PI) / 180;
    const imageScale = watermarkImage ? Math.min(width * 0.35 / watermarkImage.width, height * 0.28 / watermarkImage.height) * sizeScale : 0;
    let imageDims = watermarkImage ? watermarkImage.scale(imageScale) : null;
    let fontSize = watermarkText ? Math.max(8, Math.round(width / 15 * sizeScale)) : 0;
    let textWidth = watermarkText ? font.widthOfTextAtSize(watermarkText, fontSize) : 0;
    let textHeight = watermarkText ? font.heightAtSize(fontSize) : 0;
    const gap = watermarkImage && watermarkText ? Math.max(5, Math.min(width, height) * 0.018 * sizeScale) : 0;

    // Keep the stacked image+text group inside each page, even at large sizes or steep angles.
    const fitScale = () => {
      const groupWidth = Math.max(imageDims?.width || 0, textWidth);
      const groupHeight = (imageDims?.height || 0) + (imageDims && textHeight ? gap : 0) + textHeight;
      const boundsWidth = Math.abs(groupWidth * Math.cos(radians)) + Math.abs(groupHeight * Math.sin(radians));
      const boundsHeight = Math.abs(groupHeight * Math.cos(radians)) + Math.abs(groupWidth * Math.sin(radians));
      return Math.min(1, Math.max(1, width - 8) / Math.max(boundsWidth, 1), Math.max(1, height - 8) / Math.max(boundsHeight, 1));
    };
    const fit = fitScale();
    if (fit < 1) {
      if (imageDims) imageDims = { width: imageDims.width * fit, height: imageDims.height * fit };
      if (fontSize) {
        fontSize = Math.max(6, fontSize * fit);
        textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
        textHeight = font.heightAtSize(fontSize);
      }
    }

    const groupWidth = Math.max(imageDims?.width || 0, textWidth);
    const groupHeight = (imageDims?.height || 0) + (imageDims && textHeight ? gap * fit : 0) + textHeight;
    const boundsWidth = Math.abs(groupWidth * Math.cos(radians)) + Math.abs(groupHeight * Math.sin(radians));
    const boundsHeight = Math.abs(groupHeight * Math.cos(radians)) + Math.abs(groupWidth * Math.sin(radians));
    const centerX = boundsWidth / 2 + xPosition * Math.max(0, width - boundsWidth);
    const centerY = boundsHeight / 2 + yPosition * Math.max(0, height - boundsHeight);
    let cursorY = centerY + groupHeight / 2;
    if (imageDims) {
      cursorY -= imageDims.height / 2;
      page.drawImage(watermarkImage, {
        x: centerX - imageDims.width / 2,
        y: cursorY - imageDims.height / 2,
        ...imageDims,
        rotate: degrees(angle),
        opacity
      });
      cursorY -= imageDims.height / 2;
      if (textHeight) cursorY -= gap * fit;
    }
    if (textHeight) {
      const textCenterY = cursorY - textHeight / 2;
      page.drawText(watermarkText, {
        x: centerX - textWidth / 2,
        y: textCenterY - textHeight / 2,
        size: fontSize,
        font,
        color,
        rotate: degrees(angle),
        opacity
      });
    }
  });

  const modifiedBytes = await doc.save();
  const blob = new Blob([modifiedBytes], { type: 'application/pdf' });
  return { blob, size: blob.size, totalPages: pages.length, watermarkedPages: pageIndices.length };
}

/**
 * Images to PDF
 */
export async function imagesToPdf(imageFiles, options = {}) {
  const { PDFDocument, PageSizes } = getPdfLib();
  const doc = await PDFDocument.create();

  for (const file of imageFiles) {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const bytes = new Uint8Array(arrayBuffer);
    const isJpeg = file.type === 'image/jpeg' || file.name.endsWith('.jpg') || file.name.endsWith('.jpeg');

    let image;
    if (isJpeg) {
      image = await doc.embedJpg(bytes);
    } else {
      image = await doc.embedPng(bytes);
    }

    const { width: imgW, height: imgH } = image;
    const page = doc.addPage([imgW, imgH]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: imgW,
      height: imgH
    });
  }

  const pdfBytes = await doc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  return { blob, size: blob.size, totalPages: imageFiles.length };
}

/**
 * Text to PDF Converter
 */
export async function textToPdf(textContent, { title } = {}) {
  const { PDFDocument, StandardFonts, PageSizes, breakTextIntoLines, rgb } = getPdfLib();
  const document = await PDFDocument.create();
  const body = await document.embedFont(StandardFonts.Helvetica);
  const heading = title ? await document.embedFont(StandardFonts.HelveticaBold) : null;
  const [width, height] = PageSizes.A4;
  const margin = 50;
  const fontSize = 11;
  const lineHeight = 16;
  const linesPerPage = Math.floor((height - 2 * margin - 40) / lineHeight);
  const measure = (value) => body.widthOfTextAtSize(value, fontSize);

  // Preserve blank paragraphs and let pdf-lib measure and wrap the text.
  const lines = textContent.replaceAll('\t', '    ').split(/\r\n|\r|\n/).flatMap(
    (paragraph) => paragraph.trim()
      ? breakTextIntoLines(paragraph, [' '], width - 2 * margin, measure)
      : ['']
  );

  const totalPages = Math.max(1, Math.ceil(lines.length / linesPerPage));
  for (let index = 0; index < totalPages; index++) {
    const page = document.addPage(PageSizes.A4);
    const hasTitle = index === 0 && heading;
    const top = height - margin;
    if (hasTitle) {
      page.drawText(title, { x: margin, y: top, size: 16, font: heading, color: rgb(0.1, 0.1, 0.1) });
    }
    const start = index * linesPerPage;
    lines.slice(start, start + linesPerPage).forEach((line, row) => {
      if (!line) return;
      page.drawText(line, {
        x: margin,
        y: top - (hasTitle ? 30 : 0) - row * lineHeight,
        size: fontSize,
        font: body,
        color: rgb(0.15, 0.15, 0.15),
      });
    });

    const footer = `Page ${index + 1} of ${totalPages}`;
    page.drawText(footer, {
      x: (width - body.widthOfTextAtSize(footer, 9)) / 2,
      y: margin / 2,
      size: 9,
      font: body,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  const blob = new Blob([await document.save()], { type: 'application/pdf' });
  return { blob, size: blob.size, totalPages };
}
