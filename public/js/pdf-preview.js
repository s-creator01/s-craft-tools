// S Craft — High-Fidelity PDF Preview & Interactive Placement Component (100% Offline)

/**
 * Loads a PDF document using the bundled local pdfjs-dist.
 * @param {Uint8Array} pdfBytes
 * @returns {Promise<any>}
 */
export async function loadPdfDocument(pdfBytes) {
  if (!window.pdfjsLib) {
    throw new Error('PDF.js library is not loaded. Please verify local vendor bundle.');
  }
  const loadingTask = window.pdfjsLib.getDocument({ data: pdfBytes, isEvalSupported: false });
  return await loadingTask.promise;
}

/**
 * Renders a specific page of a PDF document to a canvas with crisp HiDPI support.
 * @param {any} pdfDoc
 * @param {number} pageNum
 * @param {HTMLCanvasElement} canvas
 * @param {object} [options]
 * @returns {Promise<{page: any, viewport: any, scale: number, width: number, height: number, unscaledViewport: any}>}
 */
export async function renderPdfPage(pdfDoc, pageNum, canvas, options = {}) {
  const page = await pdfDoc.getPage(pageNum);
  const unscaled = page.getViewport({ scale: 1.0 });

  let scale = options.scale || 1.0;
  if (options.fitWidth) {
    scale = options.fitWidth / unscaled.width;
  }
  // Clamp scale
  scale = Math.max(0.2, Math.min(3.0, scale));

  const viewport = page.getViewport({ scale });
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const renderContext = {
    canvasContext: ctx,
    transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null,
    viewport: viewport
  };

  await page.render(renderContext).promise;

  return {
    page,
    viewport,
    scale,
    width: viewport.width,
    height: viewport.height,
    unscaledViewport: unscaled
  };
}

/**
 * Mounts a full-featured, interactive PDF viewer with page controls, zoom, and draggable placement.
 * @param {HTMLElement} container
 * @param {Uint8Array} pdfBytes
 * @param {object} [options]
 */
export async function mountInteractivePdfViewer(container, pdfBytes, options = {}) {
  const pdfDoc = await loadPdfDocument(pdfBytes);
  const totalPages = pdfDoc.numPages;

  let currentPage = options.initialPage || 1;
  let currentZoom = options.initialZoom || 1.0;
  let fitMode = 'fit-width';
  let sigDataUrl = options.signatureDataUrl || null;
  let sigPlacement = {
    xPct: 0.5, // 50% from left (center)
    yPct: 0.75, // 75% from top
    widthPt: options.initialSigWidth || 160,
    heightPt: 60
  };

  container.innerHTML = `
    <div class="viewer-toolbar">
      <div class="viewer-toolbar-group">
        <button class="viewer-tool-btn" id="pdfPrevPage" title="Previous Page">&larr;</button>
        <span style="font-weight:600;font-size:12px;display:flex;align-items:center;gap:4px;">
          Page <input type="number" id="pdfPageInput" value="${currentPage}" min="1" max="${totalPages}" style="width:42px;padding:2px 4px;font-size:12px;border:1px solid var(--line);border-radius:4px;text-align:center;"> of ${totalPages}
        </span>
        <button class="viewer-tool-btn" id="pdfNextPage" title="Next Page">&rarr;</button>
      </div>

      <div class="viewer-toolbar-group">
        <button class="viewer-tool-btn" id="pdfZoomOut" title="Zoom Out">&minus;</button>
        <button class="viewer-tool-btn" id="pdfZoomReset" title="Reset Zoom">${Math.round(currentZoom * 100)}%</button>
        <button class="viewer-tool-btn" id="pdfZoomIn" title="Zoom In">&plus;</button>
        <button class="viewer-tool-btn" id="pdfFitWidth" title="Fit to Width">Fit Width</button>
      </div>

      ${options.allowStudioMode ? `
        <div class="viewer-toolbar-group">
          <button class="viewer-tool-btn" id="pdfToggleStudio" style="background:var(--primary);color:#fff;border-color:var(--primary);" title="Switch to Full PDF Studio Viewer">Studio Viewer</button>
        </div>
      ` : ''}
    </div>

    <div class="pdf-viewport-container" id="pdfViewportStage">
      <div class="pdf-paper-page" id="pdfPaperWrapper">
        <canvas class="pdf-canvas-layer" id="pdfRenderCanvas"></canvas>
        <div id="pdfSigOverlayBox" class="draggable-item-overlay" style="display:none;">
          <img id="pdfSigOverlayImg" style="width:100%;height:100%;object-fit:contain;pointer-events:none;" alt="Signature"/>
          <div class="resize-handle handle-se" data-dir="se"></div>
          <div class="resize-handle handle-sw" data-dir="sw"></div>
        </div>
      </div>
    </div>
  `;

  const canvas = container.querySelector('#pdfRenderCanvas');
  const paperWrapper = container.querySelector('#pdfPaperWrapper');
  const viewportStage = container.querySelector('#pdfViewportStage');
  const sigOverlay = container.querySelector('#pdfSigOverlayBox');
  const sigImg = container.querySelector('#pdfSigOverlayImg');

  const btnPrev = container.querySelector('#pdfPrevPage');
  const btnNext = container.querySelector('#pdfNextPage');
  const inputPage = container.querySelector('#pdfPageInput');
  const btnZoomOut = container.querySelector('#pdfZoomOut');
  const btnZoomIn = container.querySelector('#pdfZoomIn');
  const btnZoomReset = container.querySelector('#pdfZoomReset');
  const btnFitWidth = container.querySelector('#pdfFitWidth');

  let currentRenderInfo = null;

  async function renderCurrent() {
    inputPage.value = currentPage;
    btnPrev.disabled = currentPage <= 1;
    btnNext.disabled = currentPage >= totalPages;
    btnZoomReset.textContent = `${Math.round(currentZoom * 100)}%`;

    let fitWidth = null;
    if (fitMode === 'fit-width') {
      const stageW = viewportStage.clientWidth || 700;
      fitWidth = Math.max(300, stageW - 56) * currentZoom;
    }

    currentRenderInfo = await renderPdfPage(pdfDoc, currentPage, canvas, {
      scale: fitMode === 'fit-width' ? null : currentZoom,
      fitWidth: fitWidth
    });

    paperWrapper.style.width = canvas.style.width;
    paperWrapper.style.height = canvas.style.height;

    updateOverlayPosition();
    if (options.onPageChange) {
      options.onPageChange(currentPage, totalPages);
    }
  }

  function updateOverlayPosition() {
    if (!sigDataUrl || !currentRenderInfo) {
      sigOverlay.style.display = 'none';
      return;
    }

    sigOverlay.style.display = 'flex';
    sigImg.src = sigDataUrl;

    const dispW = parseFloat(canvas.style.width);
    const dispH = parseFloat(canvas.style.height);
    const unscaledW = currentRenderInfo.unscaledViewport.width;
    const unscaledH = currentRenderInfo.unscaledViewport.height;

    // Convert PDF points to screen pixels
    const widthPx = (sigPlacement.widthPt / unscaledW) * dispW;
    const heightPx = (sigPlacement.heightPt / unscaledH) * dispH;

    let leftPx = sigPlacement.xPct * dispW - widthPx / 2;
    let topPx = sigPlacement.yPct * dispH - heightPx / 2;

    // Constrain within page
    leftPx = Math.max(0, Math.min(dispW - widthPx, leftPx));
    topPx = Math.max(0, Math.min(dispH - heightPx, topPx));

    sigOverlay.style.width = `${Math.round(widthPx)}px`;
    sigOverlay.style.height = `${Math.round(heightPx)}px`;
    sigOverlay.style.left = `${Math.round(leftPx)}px`;
    sigOverlay.style.top = `${Math.round(topPx)}px`;

    notifyCoordinates();
  }

  function notifyCoordinates() {
    if (!currentRenderInfo) return;
    const dispW = parseFloat(canvas.style.width);
    const dispH = parseFloat(canvas.style.height);
    const unscaledW = currentRenderInfo.unscaledViewport.width;
    const unscaledH = currentRenderInfo.unscaledViewport.height;

    const overlayLeft = parseFloat(sigOverlay.style.left) || 0;
    const overlayTop = parseFloat(sigOverlay.style.top) || 0;
    const overlayW = parseFloat(sigOverlay.style.width) || 100;
    const overlayH = parseFloat(sigOverlay.style.height) || 40;

    // In PDF coordinates (points):
    const pdfX = (overlayLeft / dispW) * unscaledW;
    const pdfYFromTop = (overlayTop / dispH) * unscaledH;
    const pdfWidth = (overlayW / dispW) * unscaledW;
    const pdfHeight = (overlayH / dispH) * unscaledH;

    if (options.onSignatureChange) {
      options.onSignatureChange({
        page: currentPage,
        x: Math.round(pdfX),
        y: Math.round(pdfYFromTop),
        width: Math.round(pdfWidth),
        height: Math.round(pdfHeight)
      });
    }
  }

  // Dragging support for overlay
  let isDragging = false;
  let isResizing = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let initialLeft = 0;
  let initialTop = 0;
  let initialW = 0;
  let initialH = 0;

  sigOverlay.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('resize-handle')) {
      isResizing = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      initialW = parseFloat(sigOverlay.style.width);
      initialH = parseFloat(sigOverlay.style.height);
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    initialLeft = parseFloat(sigOverlay.style.left) || 0;
    initialTop = parseFloat(sigOverlay.style.top) || 0;
    sigOverlay.classList.add('active');
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      const dispW = parseFloat(canvas.style.width);
      const dispH = parseFloat(canvas.style.height);
      const overlayW = parseFloat(sigOverlay.style.width);
      const overlayH = parseFloat(sigOverlay.style.height);

      let newLeft = Math.max(0, Math.min(dispW - overlayW, initialLeft + dx));
      let newTop = Math.max(0, Math.min(dispH - overlayH, initialTop + dy));

      sigOverlay.style.left = `${newLeft}px`;
      sigOverlay.style.top = `${newTop}px`;

      sigPlacement.xPct = (newLeft + overlayW / 2) / dispW;
      sigPlacement.yPct = (newTop + overlayH / 2) / dispH;

      notifyCoordinates();
    } else if (isResizing) {
      const dx = e.clientX - dragStartX;
      const newW = Math.max(50, initialW + dx);
      const aspect = initialW / initialH;
      const newH = newW / aspect;

      sigOverlay.style.width = `${newW}px`;
      sigOverlay.style.height = `${newH}px`;

      if (currentRenderInfo) {
        const dispW = parseFloat(canvas.style.width);
        const unscaledW = currentRenderInfo.unscaledViewport.width;
        sigPlacement.widthPt = (newW / dispW) * unscaledW;
        sigPlacement.heightPt = (newH / dispW) * unscaledW;
      }
      notifyCoordinates();
    }
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      sigOverlay.classList.remove('active');
    }
    if (isResizing) {
      isResizing = false;
    }
  });

  // Touch drag support
  sigOverlay.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    isDragging = true;
    dragStartX = t.clientX;
    dragStartY = t.clientY;
    initialLeft = parseFloat(sigOverlay.style.left) || 0;
    initialTop = parseFloat(sigOverlay.style.top) || 0;
    sigOverlay.classList.add('active');
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const t = e.touches[0];
    const dx = t.clientX - dragStartX;
    const dy = t.clientY - dragStartY;
    const dispW = parseFloat(canvas.style.width);
    const dispH = parseFloat(canvas.style.height);
    const overlayW = parseFloat(sigOverlay.style.width);
    const overlayH = parseFloat(sigOverlay.style.height);

    let newLeft = Math.max(0, Math.min(dispW - overlayW, initialLeft + dx));
    let newTop = Math.max(0, Math.min(dispH - overlayH, initialTop + dy));

    sigOverlay.style.left = `${newLeft}px`;
    sigOverlay.style.top = `${newTop}px`;

    sigPlacement.xPct = (newLeft + overlayW / 2) / dispW;
    sigPlacement.yPct = (newTop + overlayH / 2) / dispH;
    notifyCoordinates();
  }, { passive: true });

  window.addEventListener('touchend', () => {
    if (isDragging) {
      isDragging = false;
      sigOverlay.classList.remove('active');
    }
  });

  // Click on canvas to jump signature to click location
  canvas.addEventListener('click', (e) => {
    if (!sigDataUrl) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const dispW = parseFloat(canvas.style.width);
    const dispH = parseFloat(canvas.style.height);
    const overlayW = parseFloat(sigOverlay.style.width) || 120;
    const overlayH = parseFloat(sigOverlay.style.height) || 45;

    let newLeft = Math.max(0, Math.min(dispW - overlayW, clickX - overlayW / 2));
    let newTop = Math.max(0, Math.min(dispH - overlayH, clickY - overlayH / 2));

    sigOverlay.style.left = `${newLeft}px`;
    sigOverlay.style.top = `${newTop}px`;
    sigPlacement.xPct = (newLeft + overlayW / 2) / dispW;
    sigPlacement.yPct = (newTop + overlayH / 2) / dispH;
    notifyCoordinates();
  });

  // Controls bindings
  btnPrev.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderCurrent();
    }
  });

  btnNext.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderCurrent();
    }
  });

  inputPage.addEventListener('change', () => {
    const p = parseInt(inputPage.value);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      currentPage = p;
      renderCurrent();
    } else {
      inputPage.value = currentPage;
    }
  });

  btnZoomIn.addEventListener('click', () => {
    currentZoom = Math.min(2.5, currentZoom + 0.15);
    fitMode = 'custom';
    renderCurrent();
  });

  btnZoomOut.addEventListener('click', () => {
    currentZoom = Math.max(0.4, currentZoom - 0.15);
    fitMode = 'custom';
    renderCurrent();
  });

  btnZoomReset.addEventListener('click', () => {
    currentZoom = 1.0;
    fitMode = 'custom';
    renderCurrent();
  });

  btnFitWidth.addEventListener('click', () => {
    fitMode = 'fit-width';
    currentZoom = 1.0;
    renderCurrent();
  });

  // Resize listener
  window.addEventListener('resize', () => {
    if (fitMode === 'fit-width') {
      renderCurrent();
    }
  });

  await renderCurrent();

  return {
    pdfDoc,
    totalPages,
    setPage(p) {
      if (p >= 1 && p <= totalPages) {
        currentPage = p;
        renderCurrent();
      }
    },
    setZoom(z) {
      currentZoom = z;
      fitMode = 'custom';
      renderCurrent();
    },
    updateSignature(dataUrl, widthPt = null) {
      sigDataUrl = dataUrl;
      if (widthPt) sigPlacement.widthPt = widthPt;
      updateOverlayPosition();
    },
    setSignatureWidth(widthPt) {
      sigPlacement.widthPt = widthPt;
      updateOverlayPosition();
    },
    getPdfCoordinates() {
      if (!currentRenderInfo) return { page: currentPage, x: 50, y: 50, width: 160, height: 60 };
      const dispW = parseFloat(canvas.style.width);
      const dispH = parseFloat(canvas.style.height);
      const unscaledW = currentRenderInfo.unscaledViewport.width;
      const unscaledH = currentRenderInfo.unscaledViewport.height;

      const overlayLeft = parseFloat(sigOverlay.style.left) || 0;
      const overlayTop = parseFloat(sigOverlay.style.top) || 0;
      const overlayW = parseFloat(sigOverlay.style.width) || 100;
      const overlayH = parseFloat(sigOverlay.style.height) || 40;

      return {
        page: currentPage,
        x: Math.round((overlayLeft / dispW) * unscaledW),
        y: Math.round((overlayTop / dispH) * unscaledH),
        width: Math.round((overlayW / dispW) * unscaledW),
        height: Math.round((overlayH / dispH) * unscaledH)
      };
    }
  };
}

/**
 * Renders all pages of a PDF into a responsive thumbnail grid.
 * @param {HTMLElement} container
 * @param {Uint8Array} pdfBytes
 * @param {object} [options]
 */
export async function renderPdfThumbnailGrid(container, pdfBytes, options = {}) {
  const pdfDoc = await loadPdfDocument(pdfBytes);
  const totalPages = pdfDoc.numPages;

  container.innerHTML = `<div class="pdf-pages-grid" id="pdfThumbGrid"></div>`;
  const grid = container.querySelector('#pdfThumbGrid');

  const pageItems = [];

  for (let p = 1; p <= totalPages; p++) {
    const card = document.createElement('div');
    card.className = 'pdf-page-card';
    card.dataset.pageNum = p;

    card.innerHTML = `
      <canvas class="pdf-page-thumbnail" id="thumb_page_${p}"></canvas>
      <div class="pdf-page-badge">Page ${p}</div>
      ${options.showActions ? `
        <div class="pdf-page-actions">
          <button class="pdf-page-btn" data-act="move-left" title="Move Left">&larr;</button>
          <button class="pdf-page-btn" data-act="rotate" title="Rotate 90&deg;">&#8635;</button>
          <button class="pdf-page-btn" data-act="delete" title="Delete Page">&times;</button>
          <button class="pdf-page-btn" data-act="move-right" title="Move Right">&rarr;</button>
        </div>
      ` : ''}
    `;

    grid.appendChild(card);
    const canvas = card.querySelector(`#thumb_page_${p}`);

    // Render thumbnail
    const page = await pdfDoc.getPage(p);
    const viewport = page.getViewport({ scale: 0.35 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

    pageItems.push({ pageNum: p, card, canvas });

    if (options.onSelectPage) {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.pdf-page-btn')) return;
        options.onSelectPage(p, card);
      });
    }
  }

  return {
    pdfDoc,
    totalPages,
    pageItems
  };
}
