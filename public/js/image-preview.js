// S Craft — High-Fidelity Interactive Image Preview & Crop Components (100% Offline)
import { formatBytes } from './ui-utils.js';

/**
 * Mounts an interactive crop editor with draggable rectangle & resize handles.
 * @param {HTMLElement} container
 * @param {HTMLImageElement} img
 * @param {object} [options]
 */
export function mountInteractiveCrop(container, img, options = {}) {
  const naturalW = img.naturalWidth;
  const naturalH = img.naturalHeight;

  container.innerHTML = `
    <div style="position:relative;display:inline-block;width:max-content;max-width:100%;max-height:500px;overflow:visible;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,0.12);" id="cropStageWrapper">
      <img id="cropBaseImg" src="${img.src}" style="display:block;width:auto;max-width:min(100%, 980px);max-height:480px;object-fit:contain;pointer-events:none;user-select:none;" alt="Crop source"/>
      <div id="cropBoxRect" class="crop-box-rect">
        <div class="crop-rect-grid-v"></div>
        <div class="crop-rect-grid-v2"></div>
        <div class="resize-handle handle-nw" data-handle="nw"></div>
        <div class="resize-handle handle-ne" data-handle="ne"></div>
        <div class="resize-handle handle-se" data-handle="se"></div>
        <div class="resize-handle handle-sw" data-handle="sw"></div>
      </div>
    </div>
  `;

  const wrapper = container.querySelector('#cropStageWrapper');
  const baseImg = container.querySelector('#cropBaseImg');
  const box = container.querySelector('#cropBoxRect');

  let aspect = options.aspect || '1:1';
  let cropState = {
    xPct: 0.1,
    yPct: 0.1,
    wPct: 0.8,
    hPct: 0.8
  };

  function updateCropBoxDimensions() {
    const dispW = baseImg.clientWidth;
    const dispH = baseImg.clientHeight;
    if (!dispW || !dispH) return;

    if (aspect === '1:1') {
      const minSide = Math.min(dispW, dispH) * 0.7;
      cropState.wPct = minSide / dispW;
      cropState.hPct = minSide / dispH;
    } else if (aspect === '4:3') {
      const targetW = Math.min(dispW * 0.8, dispH * 0.8 * (4 / 3));
      cropState.wPct = targetW / dispW;
      cropState.hPct = (targetW * 3 / 4) / dispH;
    } else if (aspect === '16:9') {
      const targetW = Math.min(dispW * 0.85, dispH * 0.85 * (16 / 9));
      cropState.wPct = targetW / dispW;
      cropState.hPct = (targetW * 9 / 16) / dispH;
    }

    // Center crop box initially
    cropState.xPct = (1 - cropState.wPct) / 2;
    cropState.yPct = (1 - cropState.hPct) / 2;
    applyCropBoxStyles();
  }

  function applyCropBoxStyles() {
    const dispW = baseImg.clientWidth;
    const dispH = baseImg.clientHeight;
    if (!dispW || !dispH) return;

    const left = cropState.xPct * dispW;
    const top = cropState.yPct * dispH;
    const w = cropState.wPct * dispW;
    const h = cropState.hPct * dispH;

    box.style.left = `${Math.round(left)}px`;
    box.style.top = `${Math.round(top)}px`;
    box.style.width = `${Math.round(w)}px`;
    box.style.height = `${Math.round(h)}px`;

    notifyCropChange();
  }

  function notifyCropChange() {
    const x = Math.round(cropState.xPct * naturalW);
    const y = Math.round(cropState.yPct * naturalH);
    const width = Math.round(cropState.wPct * naturalW);
    const height = Math.round(cropState.hPct * naturalH);

    if (options.onCropChange) {
      options.onCropChange({ x, y, width, height, naturalW, naturalH });
    }
  }

  // Dragging & Resizing Box
  let isDragging = false;
  let isResizing = false;
  let resizeHandle = null;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;
  let initialW = 0;
  let initialH = 0;

  box.addEventListener('pointerdown', (e) => {
    const handle = e.target.closest('.resize-handle');
    if (handle) {
      isResizing = true;
      resizeHandle = handle.dataset.handle;
      startX = e.clientX;
      startY = e.clientY;
      initialW = parseFloat(box.style.width);
      initialH = parseFloat(box.style.height);
      initialLeft = parseFloat(box.style.left);
      initialTop = parseFloat(box.style.top);
      e.stopPropagation();
      e.preventDefault();
      box.setPointerCapture?.(e.pointerId);
      return;
    }

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    initialLeft = parseFloat(box.style.left) || 0;
    initialTop = parseFloat(box.style.top) || 0;
    e.preventDefault();
  });

  window.addEventListener('pointermove', (e) => {
    const dispW = baseImg.clientWidth;
    const dispH = baseImg.clientHeight;
    if (!dispW || !dispH) return;

    if (isDragging) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const boxW = parseFloat(box.style.width);
      const boxH = parseFloat(box.style.height);

      let newLeft = Math.max(0, Math.min(dispW - boxW, initialLeft + dx));
      let newTop = Math.max(0, Math.min(dispH - boxH, initialTop + dy));

      cropState.xPct = newLeft / dispW;
      cropState.yPct = newTop / dispH;
      applyCropBoxStyles();
    } else if (isResizing) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      const leftSide = resizeHandle.endsWith('w');
      const topSide = resizeHandle.startsWith('n');
      const anchorX = leftSide ? initialLeft + initialW : initialLeft;
      const anchorY = topSide ? initialTop + initialH : initialTop;
      let newW = Math.max(20, Math.min(dispW, initialW + (leftSide ? -dx : dx)));
      let newH = Math.max(20, Math.min(dispH, initialH + (topSide ? -dy : dy)));
      const fixedRatio = aspect === '1:1' ? 1 : aspect === '4:3' ? 4 / 3 : aspect === '16:9' ? 16 / 9 : null;
      if (fixedRatio) {
        if (Math.abs(dx) > Math.abs(dy)) newH = newW / fixedRatio;
        else newW = newH * fixedRatio;
      }
      newW = Math.max(1, Math.min(newW, leftSide ? anchorX : dispW - anchorX));
      newH = Math.max(1, Math.min(newH, topSide ? anchorY : dispH - anchorY));
      cropState.wPct = newW / dispW;
      cropState.hPct = newH / dispH;
      cropState.xPct = (leftSide ? anchorX - newW : anchorX) / dispW;
      cropState.yPct = (topSide ? anchorY - newH : anchorY) / dispH;
      applyCropBoxStyles();
    }
  });

  window.addEventListener('pointerup', () => {
    isDragging = false;
    isResizing = false;
  });

  // Observe base image load / resize
  if (baseImg.complete) {
    updateCropBoxDimensions();
  } else {
    baseImg.addEventListener('load', () => updateCropBoxDimensions());
  }

  return {
    setAspect(newAspect) {
      aspect = newAspect;
      updateCropBoxDimensions();
    },
    getCropData() {
      return {
        x: Math.round(cropState.xPct * naturalW),
        y: Math.round(cropState.yPct * naturalH),
        width: Math.round(cropState.wPct * naturalW),
        height: Math.round(cropState.hPct * naturalH)
      };
    }
  };
}

/**
 * Mounts an interactive stage with the base photo and a movable signature overlay.
 * @param {HTMLElement} container
 * @param {HTMLImageElement} img
 * @param {string|null} signatureDataUrl
 * @param {object} [options]
 */
export function mountInteractiveSignatureOverlay(container, img, signatureDataUrl, options = {}) {
  const naturalW = img.naturalWidth;
  const naturalH = img.naturalHeight;

  container.innerHTML = `
    <div style="position:relative;display:inline-block;width:max-content;max-width:100%;max-height:500px;overflow:hidden;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,0.12);" id="sigStageWrapper">
      <img id="sigBaseImg" src="${img.src}" style="display:block;width:auto;max-width:min(100%, 980px);max-height:480px;object-fit:contain;pointer-events:none;user-select:none;" alt="Base Image"/>
      <div id="sigOverlayBox" class="draggable-item-overlay" style="${signatureDataUrl ? 'display:flex;' : 'display:none;'}">
        <img id="sigOverlayImg" src="${signatureDataUrl || ''}" style="width:100%;height:100%;object-fit:contain;pointer-events:none;user-select:none;" alt="Signature Overlay"/>
        <div class="resize-handle handle-se" data-handle="se"></div>
      </div>
    </div>
  `;

  const wrapper = container.querySelector('#sigStageWrapper');
  const baseImg = container.querySelector('#sigBaseImg');
  const box = container.querySelector('#sigOverlayBox');
  const overlayImg = container.querySelector('#sigOverlayImg');
  overlayImg.addEventListener('load', () => { if (signatureDataUrl) updateOverlayPosition(); });

  let sigScale = options.scale !== undefined ? options.scale : 0.3; // 30% of image width
  let sigOpacity = options.opacity !== undefined ? options.opacity : 1.0;
  let sigRotation = options.rotation || 0;
  let posXPct = 0.5;
  let posYPct = 0.75;

  function updateOverlayPosition() {
    if (!signatureDataUrl) {
      box.style.display = 'none';
      return;
    }
    box.style.display = 'flex';
    if (overlayImg.src !== new URL(signatureDataUrl, document.baseURI).href) overlayImg.src = signatureDataUrl;

    const dispW = baseImg.clientWidth;
    const dispH = baseImg.clientHeight;
    if (!dispW || !dispH) return;

    const sigAspect = overlayImg.naturalWidth && overlayImg.naturalHeight ? overlayImg.naturalWidth / overlayImg.naturalHeight : 2.5;
    const overlayW = Math.min(dispW * sigScale, dispW * 0.88, dispH * sigAspect * 0.88);
    const overlayH = overlayW / sigAspect;

    let left = posXPct * dispW - overlayW / 2;
    let top = posYPct * dispH - overlayH / 2;

    left = Math.max(0, Math.min(dispW - overlayW, left));
    top = Math.max(0, Math.min(dispH - overlayH, top));

    box.style.width = `${Math.round(overlayW)}px`;
    box.style.height = `${Math.round(overlayH)}px`;
    box.style.left = `${Math.round(left)}px`;
    box.style.top = `${Math.round(top)}px`;
    box.style.opacity = sigOpacity;
    box.style.transform = `rotate(${sigRotation}deg)`;

    notifyPlacement();
  }

  function notifyPlacement() {
    const dispW = baseImg.clientWidth;
    const dispH = baseImg.clientHeight;
    if (!dispW || !dispH) return;

    const overlayLeft = parseFloat(box.style.left) || 0;
    const overlayTop = parseFloat(box.style.top) || 0;
    const overlayW = parseFloat(box.style.width) || 100;
    const overlayH = parseFloat(box.style.height) || 45;

    // Convert to natural image pixel coordinates
    const natX = (overlayLeft / dispW) * naturalW;
    const natY = (overlayTop / dispH) * naturalH;
    const natW = (overlayW / dispW) * naturalW;
    const natH = (overlayH / dispH) * naturalH;

    if (options.onPlacementChange) {
      options.onPlacementChange({
        x: Math.round(natX),
        y: Math.round(natY),
        width: Math.round(natW),
        height: Math.round(natH),
        scale: sigScale,
        opacity: sigOpacity,
        rotation: sigRotation
      });
    }
  }

  // Dragging support
  let isDragging = false;
  let isResizing = false;
  let startX = 0;
  let startY = 0;
  let initLeft = 0;
  let initTop = 0;
  let initW = 0;

  box.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('resize-handle')) {
      isResizing = true;
      startX = e.clientX;
      initW = parseFloat(box.style.width);
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    initLeft = parseFloat(box.style.left) || 0;
    initTop = parseFloat(box.style.top) || 0;
    box.classList.add('active');
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    const dispW = baseImg.clientWidth;
    const dispH = baseImg.clientHeight;
    if (!dispW || !dispH) return;

    if (isDragging) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const boxW = parseFloat(box.style.width);
      const boxH = parseFloat(box.style.height);

      let newLeft = Math.max(0, Math.min(dispW - boxW, initLeft + dx));
      let newTop = Math.max(0, Math.min(dispH - boxH, initTop + dy));

      box.style.left = `${newLeft}px`;
      box.style.top = `${newTop}px`;

      posXPct = (newLeft + boxW / 2) / dispW;
      posYPct = (newTop + boxH / 2) / dispH;
      notifyPlacement();
    } else if (isResizing) {
      const dx = e.clientX - startX;
      const newW = Math.max(50, Math.min(dispW, initW + dx));
      sigScale = newW / dispW;
      updateOverlayPosition();
    }
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
    isResizing = false;
    box.classList.remove('active');
  });

  // Click on image to move signature
  baseImg.addEventListener('click', (e) => {
    if (!signatureDataUrl) return;
    const rect = baseImg.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    posXPct = clickX / baseImg.clientWidth;
    posYPct = clickY / baseImg.clientHeight;
    updateOverlayPosition();
  });

  if (baseImg.complete) {
    updateOverlayPosition();
  } else {
    baseImg.addEventListener('load', () => updateOverlayPosition());
  }

  return {
    updateSignature(newSigUrl) {
      signatureDataUrl = newSigUrl;
      updateOverlayPosition();
    },
    setScale(scalePct) {
      sigScale = scalePct / 100;
      updateOverlayPosition();
    },
    setOpacity(opPct) {
      sigOpacity = opPct / 100;
      box.style.opacity = sigOpacity;
      notifyPlacement();
    },
    setRotation(deg) {
      sigRotation = deg;
      box.style.transform = `rotate(${deg}deg)`;
      notifyPlacement();
    },
    getPlacement() {
      const dispW = baseImg.clientWidth;
      const dispH = baseImg.clientHeight;
      const overlayLeft = parseFloat(box.style.left) || 0;
      const overlayTop = parseFloat(box.style.top) || 0;
      return {
        x: Math.round((overlayLeft / dispW) * naturalW),
        y: Math.round((overlayTop / dispH) * naturalH),
        width: Math.round(((parseFloat(box.style.width) || 0) / dispW) * naturalW),
        height: Math.round(((parseFloat(box.style.height) || 0) / dispH) * naturalH),
        scale: sigScale,
        opacity: sigOpacity,
        rotation: sigRotation
      };
    }
  };
}
