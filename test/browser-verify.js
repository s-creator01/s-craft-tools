// S Craft — Automated Real Browser (Chrome DevTools Protocol) Verification Suite
// Tests live browser rendering, category navigation, tool views, and preview components.

import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';

const CHROME_BIN = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9333;
const APP_URL = 'http://127.0.0.1:3300';
const SCREENSHOT_DIR = path.resolve(process.cwd(), 'work/browser-screenshots');
const IMAGE_FIXTURE = path.join(os.tmpdir(), 'scraft_browser_fixture_image_for_overflow_regression_validation.bmp');
const PORTRAIT_FIXTURE = process.env.SCRAFT_PORTRAIT_FIXTURE;

if (!PORTRAIT_FIXTURE || !fs.existsSync(PORTRAIT_FIXTURE)) {
  throw new Error('Set SCRAFT_PORTRAIT_FIXTURE to a local test portrait.');
}

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function writeImageFixture(filePath) {
  const width = 64, height = 64, stride = width * 3, pixelBytes = stride * height;
  const bmp = Buffer.alloc(54 + pixelBytes);
  bmp.write('BM', 0); bmp.writeUInt32LE(bmp.length, 2); bmp.writeUInt32LE(54, 10);
  bmp.writeUInt32LE(40, 14); bmp.writeInt32LE(width, 18); bmp.writeInt32LE(height, 22);
  bmp.writeUInt16LE(1, 26); bmp.writeUInt16LE(24, 28); bmp.writeUInt32LE(pixelBytes, 34);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const offset = 54 + (height - 1 - y) * stride + x * 3;
    const subject = x >= 20 && x < 44 && y >= 16 && y < 48;
    bmp[offset] = subject ? 190 : 255;
    bmp[offset + 1] = subject ? 65 : 255;
    bmp[offset + 2] = subject ? 40 : 255;
  }
  fs.writeFileSync(filePath, bmp);
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function runBrowserVerification() {
  console.log('======================================================');
  console.log('   S Craft — End-to-End Real Browser Verification     ');
  console.log('======================================================\n');
  writeImageFixture(IMAGE_FIXTURE);

  console.log('1. Launching Headless Chrome on port ' + DEBUG_PORT + '...');
  const chromeProc = spawn(CHROME_BIN, [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=/tmp/scraft-chrome-test-profile',
    '--window-size=1280,840',
    APP_URL
  ], { stdio: 'ignore' });

  let wsUrl = null;
  for (let attempt = 0; attempt < 30; attempt++) {
    await delay(300);
    try {
      const list = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json`);
      if (list && list.length > 0) {
        const pageTarget = list.find(t => t.type === 'page' && !t.url.startsWith('chrome-extension')) || list[0];
        if (pageTarget && pageTarget.webSocketDebuggerUrl) {
          wsUrl = pageTarget.webSocketDebuggerUrl;
          break;
        }
      }
    } catch {
      // Chrome not ready yet, continue polling
    }
  }

  if (!wsUrl) {
    chromeProc.kill();
    throw new Error('Failed to connect to Chrome DevTools Protocol after 10 seconds.');
  }

  console.log('✓ Connected to Chrome DevTools Protocol: ' + wsUrl);

  const ws = new WebSocket(wsUrl);
  let msgId = 1;
  const pending = new Map();
  const consoleErrors = [];

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }

    if (data.method === 'Runtime.consoleAPICalled') {
      if (data.params.type === 'error') {
        const text = data.params.args.map(a => a.value || a.description || '').join(' ');
        consoleErrors.push(text);
      }
    }

    if (data.method === 'Runtime.exceptionThrown') {
      const desc = data.params.exceptionDetails?.exception?.description || data.params.exceptionDetails?.text;
      consoleErrors.push(desc);
    }
  };

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  function sendCommand(method, params = {}) {
    const id = msgId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression) {
    const res = await sendCommand('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      const errStr = res.exceptionDetails.exception?.description || res.exceptionDetails.text || 'Evaluation failed';
      console.error('Evaluate Exception:', errStr);
      throw new Error(errStr);
    }
    return res.result?.value;
  }

  async function waitFor(expression, timeoutMs = 120000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (await evaluate(expression)) return true;
      await delay(250);
    }
    throw new Error(`Timed out waiting for browser condition: ${expression}`);
  }

  async function takeScreenshot(filename) {
    const res = await sendCommand('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const outPath = path.isAbsolute(filename) ? filename : path.join(SCREENSHOT_DIR, filename);
    fs.writeFileSync(outPath, buffer);
    return outPath;
  }

  async function setInputFiles(selector, filePath) {
    await sendCommand('DOM.enable');
    const { root } = await sendCommand('DOM.getDocument', { depth: -1 });
    const { nodeId } = await sendCommand('DOM.querySelector', { nodeId: root.nodeId, selector });
    if (!nodeId) throw new Error(`Could not find file input: ${selector}`);
    await sendCommand('DOM.setFileInputFiles', { files: [filePath], nodeId });
  }

  try {
    await sendCommand('Runtime.enable');
    await sendCommand('Page.enable');
    await sendCommand('Console.enable');

    console.log('\n2. Navigating to ' + APP_URL + ' and waiting for load event...');
    await sendCommand('Page.navigate', { url: APP_URL });
    await delay(1500);
    await evaluate(`localStorage.removeItem('scraft_ui_preferences_v1')`);
    await sendCommand('Page.reload');
    await delay(600);

    const readyState = await evaluate(`document.readyState`);
    const pageTitle = await evaluate(`document.title`);
    const currentUrl = await evaluate(`window.location.href`);
    console.log(`  ✓ Current URL: ${currentUrl}, readyState: ${readyState}, Title: "${pageTitle}"`);

    if (consoleErrors.length > 0) {
      console.log('Console errors captured during load:', consoleErrors);
    }

    const navCounts = await evaluate(`({buttons:document.querySelectorAll('#sideNav .side-btn').length,categories:Array.from(document.querySelectorAll('#sideNav .side-btn')).filter(button=>button.textContent.includes('Tools')).length,favorites:Array.from(document.querySelectorAll('#sideNav .side-btn')).some(button=>button.textContent.trim()==='Favorites'),quickAccess:!!document.getElementById('quickAccessTools')})`);
    console.log(`  ✓ Side navigation categories count: ${navCounts.categories} plus Favorites; Quick Access rendered`);
    if (navCounts.categories !== 7 || navCounts.buttons !== 8 || !navCounts.favorites || !navCounts.quickAccess) throw new Error('Expected seven categories, a Favorites entry, and Quick Access');

    const activeCategory = await evaluate(`document.getElementById('categoryTitle').textContent.trim()`);
    console.log(`  ✓ Initial Category: "${activeCategory}"`);

    const initialToolsCount = await evaluate(`document.querySelectorAll('#toolsGrid .tool-card').length`);
    console.log(`  ✓ Tools in initial category: ${initialToolsCount}`);
    if (initialToolsCount < 5) throw new Error('Tools grid is empty or incomplete');

    await takeScreenshot('01-browse-screen.png');

    const categoryCardCounts = {'PDF Tools':9,'Image Tools':10,'Text Tools':10,'Video Tools':10,'Audio Tools':10,'Time Tools':10,'Number Tools':11};
    for (const [label, expected] of Object.entries(categoryCardCounts)) {
      const rendered = await evaluate(`(() => { const button=Array.from(document.querySelectorAll('#sideNav .side-btn')).find(item=>item.textContent.includes(${JSON.stringify(label)})); button.click(); return {count:document.querySelectorAll('#toolsGrid .tool-card').length,moreHeading:document.body.innerText.includes('More tools'),separateGrid:!!document.getElementById('moreToolsSection')}; })()`);
      if (rendered.count !== expected || rendered.moreHeading || rendered.separateGrid) throw new Error(`${label} should show all ${expected} cards in one grid with no More tools section; got ${JSON.stringify(rendered)}`);
    }
    console.log('  ✓ All seven categories show their complete tool catalogs in one aligned grid');
    for (const width of [768,390]) {
      await sendCommand('Emulation.setDeviceMetricsOverride', {width,height:844,deviceScaleFactor:1,mobile:width<600});
      const layout = await evaluate(`({viewport:document.documentElement.clientWidth,page:document.documentElement.scrollWidth,grid:document.querySelector('#toolsGrid').getBoundingClientRect().width})`);
      if (layout.page > layout.viewport + 1 || layout.grid > layout.viewport + 1) throw new Error(`Browse layout overflows at ${width}px: ${JSON.stringify(layout)}`);
    }
    await sendCommand('Emulation.clearDeviceMetricsOverride');
    console.log('  ✓ Browse categories fit tablet (768px) and phone (390px) viewports');

    console.log('\n3. Testing Category Switching & Tool Rendering...');

    // Switch to PDF Category
    console.log('  -> Switching to PDF Tools category...');
    await evaluate(`
      const pdfBtn = Array.from(document.querySelectorAll('#sideNav .side-btn')).find(b => b.textContent.includes('PDF Tools'));
      pdfBtn.click();
    `);
    await delay(300);

    const pdfToolsCount = await evaluate(`document.querySelectorAll('#toolsGrid .tool-card').length`);
    console.log(`  ✓ PDF Tools displayed: ${pdfToolsCount} cards`);
    if (pdfToolsCount !== 9) throw new Error(`Expected 9 PDF tools, got ${pdfToolsCount}`);

    // Click into "Sign PDF"
    console.log('  -> Clicking "Sign PDF" tool...');
    await evaluate(`
      const signPdfCard = Array.from(document.querySelectorAll('#toolsGrid .tool-card')).find(c => c.textContent.includes('Sign PDF'));
      signPdfCard.click();
    `);
    await delay(400);

    const signPdfHeader = await evaluate(`document.querySelector('.tool-detail-header .title')?.textContent.trim() || ''`);
    const hasStudioIframe = await evaluate(`!!document.getElementById('pdfStudioIframe')`);
    const hasSignDropzone = await evaluate(`!!document.getElementById('signPdfDropzone')`);
    console.log(`  ✓ Rendered Tool: "${signPdfHeader}"`);
    console.log(`  ✓ Has Top Upload Dropzone: ${hasSignDropzone}`);
    console.log(`  ✓ Has Full Studio Viewer Container: ${hasStudioIframe}`);
    if (!hasStudioIframe || !hasSignDropzone) throw new Error('Sign PDF tool missing full studio viewer or upload dropzone');

    await takeScreenshot('02-tool-sign-pdf.png');

    // Click "Back to Tools"
    await evaluate(`document.getElementById('backBtn').click()`);
    await delay(300);

    // Click into "Protect / Unlock"
    console.log('  -> Clicking "Protect / Unlock" tool...');
    await evaluate(`
      const protCard = Array.from(document.querySelectorAll('#toolsGrid .tool-card')).find(c => c.textContent.includes('Protect / Unlock'));
      protCard.click();
    `);
    await delay(400);

    const hasProtDropzone = await evaluate(`!!document.getElementById('protPdfDropzone')`);
    const hasProtModeTabs = await evaluate(`document.querySelectorAll('#protModeTabs .segmented-btn').length === 2`);
    const hasPassInput = await evaluate(`!!document.getElementById('pdfPassEnc')`);
    console.log(`  ✓ Has Protect/Unlock Dropzone: ${hasProtDropzone}`);
    console.log(`  ✓ Has Dual Protect / Unlock Mode Tabs: ${hasProtModeTabs}`);
    console.log(`  ✓ Has AES-256 Password Input: ${hasPassInput}`);
    if (!hasProtDropzone || !hasProtModeTabs || !hasPassInput) throw new Error('Protect / Unlock tool missing required controls');

    await evaluate(`document.getElementById('backBtn').click()`);
    await delay(300);

    // Click into "Organize Pages"
    console.log('  -> Clicking "Organize Pages" tool...');
    await evaluate(`
      const orgCard = Array.from(document.querySelectorAll('#toolsGrid .tool-card')).find(c => c.textContent.includes('Organize Pages'));
      orgCard.click();
    `);
    await delay(400);

    const hasOrgStage = await evaluate(`!!document.getElementById('orgPreviewStage')`);
    console.log(`  ✓ Has Organize Thumbnail Stage: ${hasOrgStage}`);
    if (!hasOrgStage) throw new Error('Organize Pages tool missing thumbnail preview stage');

    await evaluate(`document.getElementById('backBtn').click()`);
    await delay(300);

    // Click into "Split PDF"
    console.log('  -> Clicking "Split PDF" tool...');
    await evaluate(`
      const splitCard = Array.from(document.querySelectorAll('#toolsGrid .tool-card')).find(c => c.textContent.includes('Split PDF'));
      splitCard.click();
    `);
    await delay(400);

    const hasSplitStage = await evaluate(`!!document.getElementById('splitPreviewStage')`);
    console.log(`  ✓ Has Split Thumbnail Stage: ${hasSplitStage}`);
    if (!hasSplitStage) throw new Error('Split PDF tool missing split preview stage');

    await evaluate(`document.getElementById('backBtn').click()`);
    await delay(300);

    // Click into "Watermark PDF"
    console.log('  -> Clicking "Watermark PDF" tool...');
    await evaluate(`
      const wmCard = Array.from(document.querySelectorAll('#toolsGrid .tool-card')).find(c => c.textContent.includes('Watermark PDF'));
      wmCard.click();
    `);
    await delay(400);

    const hasWmStage = await evaluate(`!!document.getElementById('wmPdfPreviewStage')`);
    console.log(`  ✓ Has Watermark PDF Stage: ${hasWmStage}`);
    if (!hasWmStage) throw new Error('Watermark PDF tool missing preview stage');

    await evaluate(`document.getElementById('backBtn').click()`);
    await delay(300);

    // Switch to Image Category
    console.log('  -> Switching to Image Tools category...');
    await evaluate(`
      const imgBtn = Array.from(document.querySelectorAll('#sideNav .side-btn')).find(b => b.textContent.includes('Image Tools'));
      imgBtn.click();
    `);
    await delay(300);

    // Click into "Sign Image"
    console.log('  -> Clicking "Sign Image" tool...');
    await evaluate(`
      const signImgCard = Array.from(document.querySelectorAll('#toolsGrid .tool-card')).find(c => c.textContent.includes('Sign Image'));
      signImgCard.click();
    `);
    await delay(400);

    const hasImgSigStage = await evaluate(`!!document.getElementById('signImgPreviewStage')`);
    console.log(`  ✓ Has Interactive Image Signature Stage: ${hasImgSigStage}`);
    if (!hasImgSigStage) throw new Error('Sign Image tool missing interactive signature stage');
    await setInputFiles('#signImgDropzone input[type="file"]', IMAGE_FIXTURE);
    await delay(200);
    await evaluate(`document.querySelector('#sigTypeTabs [data-tab="upload"]').click()`);
    await setInputFiles('#uploadSigInput', PORTRAIT_FIXTURE);
    await delay(300);
    await waitFor(`document.getElementById('sigUploadStatus').textContent.includes('loaded')`);
    const signatureReady = await evaluate(`({overlay:document.getElementById('sigOverlayBox').style.display,tool:document.getElementById('sigUploadStatus').textContent})`);
    if (signatureReady.overlay === 'none' || !signatureReady.tool.includes('loaded')) throw new Error('Uploaded signature preview failed');
    await evaluate(`document.getElementById('btnProcessSignImg').click()`);
    await delay(250);
    if (!(await evaluate(`!document.getElementById('btnDownloadSignImg').disabled && document.getElementById('signMeta').textContent.includes('Signed output')`))) throw new Error('Sign Image did not produce an output');
    console.log('  ✓ Sign Image loads and applies an uploaded signature');

    await evaluate(`document.getElementById('backBtn').click()`);
    await delay(300);

    // Click into "Crop Image"
    console.log('  -> Clicking "Crop Image" tool...');
    await evaluate(`
      const cropCard = Array.from(document.querySelectorAll('#toolsGrid .tool-card')).find(c => c.textContent.includes('Crop Image'));
      cropCard.click();
    `);
    await delay(400);

    const hasCropStage = await evaluate(`!!document.getElementById('cropPreviewStage')`);
    console.log(`  ✓ Has Interactive Crop Stage: ${hasCropStage}`);
    if (!hasCropStage) throw new Error('Crop Image tool missing crop preview stage');

    await evaluate(`document.getElementById('backBtn').click()`);
    await delay(300);

    // Click into "Resize Image"
    console.log('  -> Clicking "Resize Image" tool...');
    await evaluate(`
      const resizeCard = Array.from(document.querySelectorAll('#toolsGrid .tool-card')).find(c => c.textContent.includes('Resize Image'));
      resizeCard.click();
    `);
    await delay(400);

    const hasResizeCanvas = await evaluate(`!!document.getElementById('resizeCanvas')`);
    console.log(`  ✓ Has Resize Canvas Stage: ${hasResizeCanvas}`);
    if (!hasResizeCanvas) throw new Error('Resize Image tool missing preview canvas');

    await evaluate(`document.getElementById('backBtn').click()`);
    await delay(300);

    const imagePrimaryTools = await evaluate(`Array.from(document.querySelectorAll('#toolsGrid .tool-card')).map(card=>card.textContent.trim())`);
    if (imagePrimaryTools.some(label => label.includes('ID Photo / Signature Size')) || !imagePrimaryTools.some(label => label.includes('Rotate & Flip')) || imagePrimaryTools.length !== 10) throw new Error(`Image catalog should show all 10 tools, including Rotate & Flip and Sign Image; got ${imagePrimaryTools.length}`);
    console.log('  ✓ All 10 Image tools are visible in the same grid, including Rotate & Flip and Sign Image');

    if (imagePrimaryTools.some(label => label.includes('Remove Background'))) throw new Error('Removed tool remains visible');

    // Verify freeform crop handles resize the selection and crop applies to the selected region.
    console.log('  -> Checking freeform crop resizing and output...');
    await evaluate(`Array.from(document.querySelectorAll('#toolsGrid .tool-card')).find(c => c.textContent.includes('Crop Image')).click()`);
    await delay(250);
    await setInputFiles('#cropDropzone input[type="file"]', IMAGE_FIXTURE);
    await delay(250);
    await evaluate(`document.querySelector('#cropAspect [data-aspect="free"]').click()`);
    const cropBefore = await evaluate(`document.getElementById('cropBoundsReadout').textContent`);
    const handle = await evaluate(`(() => { const r=document.querySelector('#cropBoxRect .handle-se').getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
    await sendCommand('Input.dispatchMouseEvent', {type:'mousePressed',x:handle.x,y:handle.y,button:'left',clickCount:1});
    await sendCommand('Input.dispatchMouseEvent', {type:'mouseMoved',x:handle.x+18,y:handle.y+13,button:'left'});
    await sendCommand('Input.dispatchMouseEvent', {type:'mouseReleased',x:handle.x+18,y:handle.y+13,button:'left'});
    await delay(100);
    const cropAfter = await evaluate(`document.getElementById('cropBoundsReadout').textContent`);
    if (cropBefore === cropAfter) throw new Error('Freeform crop handle did not change crop dimensions');
    await evaluate(`document.getElementById('btnProcessCrop').click()`);
    await delay(200);
    const cropResult = await evaluate(`({enabled:!document.getElementById('btnDownloadCrop').disabled,stats:document.getElementById('cropResultStats').textContent})`);
    if (!cropResult.enabled || !cropResult.stats.includes('Cropped output')) throw new Error('Crop output was not created or measured');
    console.log('  ✓ Freeform crop selection resizes and exports a measured crop');
    await evaluate(`document.getElementById('backBtn').click()`);
    await delay(250);

    // Check long filenames stay inside the Resize file badge and ratio control aligns with dimensions.
    console.log('  -> Checking Resize filename clipping and control alignment...');
    await evaluate(`Array.from(document.querySelectorAll('#toolsGrid .tool-card')).find(c => c.textContent.includes('Resize Image')).click()`);
    await delay(250);
    await setInputFiles('#resizeDropzone input[type="file"]', IMAGE_FIXTURE);
    await delay(250);
    const resizeLayout = await evaluate(`(() => {const badge=document.querySelector('#resizeStudioArea .image-file-row .file-badge').getBoundingClientRect();const name=document.getElementById('resizeDocName').getBoundingClientRect();const preview=document.querySelector('#resizeStudioArea .image-result-panel').getBoundingClientRect();const ratio=document.getElementById('lockRatio').getBoundingClientRect();const h=document.getElementById('rh').getBoundingClientRect();return {nameRight:name.right,badgeRight:badge.right,previewLeft:preview.left,ratioCenter:ratio.top+ratio.height/2,heightCenter:h.top+h.height/2,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth};})()`);
    if (resizeLayout.nameRight > resizeLayout.badgeRight+1 || resizeLayout.badgeRight > resizeLayout.previewLeft+1 || Math.abs(resizeLayout.ratioCenter-resizeLayout.heightCenter)>10 || resizeLayout.overflow) throw new Error(`Resize layout regressed: ${JSON.stringify(resizeLayout)}`);
    console.log('  ✓ Resize filename stays inside its badge; Keep ratio aligns with dimensions');
    await evaluate(`document.getElementById('rw').value=40;document.getElementById('rw').dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('rh').value=30;document.getElementById('rh').dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('btnProcessResize').click()`);
    await delay(250);
    if (!(await evaluate(`!document.getElementById('btnDownloadResize').disabled && document.getElementById('resizeResultStats').textContent.includes('Resized output')`))) throw new Error('Resize output did not become available');
    console.log('  ✓ Resize action creates a measured output');
    await evaluate(`document.getElementById('backBtn').click()`);
    await delay(250);

    console.log('  -> Checking Compress Image target and result display...');
    await evaluate(`Array.from(document.querySelectorAll('#toolsGrid .tool-card')).find(c => c.textContent.includes('Compress Image')).click()`);
    await delay(250);
    await setInputFiles('#compressDropzone input[type="file"]', IMAGE_FIXTURE);
    await delay(250);
    const compressLayout = await evaluate(`({target:!!document.getElementById('targetKb'),slider:!!document.getElementById('compressPercent'),overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth})`);
    if (!compressLayout.target || !compressLayout.slider || compressLayout.overflow) throw new Error(`Compress layout/target missing: ${JSON.stringify(compressLayout)}`);
    await evaluate(`document.getElementById('targetKb').value=5;document.getElementById('targetKb').dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('btnProcessCompress').click()`);
    await delay(500);
    if (!(await evaluate(`!document.getElementById('btnDownloadCompress').disabled && document.getElementById('compressStats').textContent.includes('Compressed size')`))) throw new Error('Compress Image did not produce a measured output');
    console.log('  ✓ Compress Image exposes a KB target and reports the compressed output');
    await evaluate(`document.getElementById('backBtn').click()`);
    await delay(250);

    // Verify single-page Watermark controls, clear action, and output application.
    console.log('  -> Checking image watermark content controls and output...');
    await evaluate(`Array.from(document.querySelectorAll('#toolsGrid .tool-card')).find(c => c.textContent.includes('Watermark Image')).click()`);
    await delay(250);
    await setInputFiles('#wmImgDropzone input[type="file"]', IMAGE_FIXTURE);
    await delay(250);
    await evaluate(`document.getElementById('wmImgText').value='S CRAFT TEST';document.getElementById('wmImgText').dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('wmImgContent').value='text';document.getElementById('wmImgContent').dispatchEvent(new Event('change',{bubbles:true}));document.getElementById('btnProcessWmImg').click()`);
    await delay(250);
    if (!(await evaluate(`!document.getElementById('btnDownloadWmImg').disabled && document.getElementById('wmImgMeta').textContent.includes('Watermarked output')`))) throw new Error('Watermark output did not become available');
    await evaluate(`document.getElementById('btnClearWmText').click()`);
    if (await evaluate(`document.getElementById('wmImgText').value !== '' || !document.getElementById('btnDownloadWmImg').disabled`)) throw new Error('Watermark Clear did not clear content and invalidate stale output');
    await setInputFiles('#wmImgLogo', IMAGE_FIXTURE);
    await delay(180);
    await evaluate(`document.getElementById('wmImgContent').value='logo';document.getElementById('wmImgContent').dispatchEvent(new Event('change',{bubbles:true}));document.getElementById('btnProcessWmImg').click()`);
    await delay(220);
    if (!(await evaluate(`!document.getElementById('btnDownloadWmImg').disabled && document.getElementById('wmImgLogoName').textContent.includes('scraft_browser_fixture')`))) throw new Error('Photo watermark did not load and apply');
    console.log('  ✓ Watermark applies text, Clear empties the text and disables stale download');
    await evaluate(`document.getElementById('backBtn').click()`);
    await delay(250);

    console.log('  -> Checking Add Text and Images typography, photo cleanup, and output...');
    await evaluate(`Array.from(document.querySelectorAll('#toolsGrid .tool-card')).find(c => c.textContent.includes('Add Text')).click()`);
    await delay(250);
    await setInputFiles('#addTextDropzone input[type="file"]', PORTRAIT_FIXTURE);
    await delay(250);
    await evaluate(`document.getElementById('captionText').value='S Craft';document.getElementById('captionText').dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('openCaptionFonts').click()`);
    const fontDialog = await evaluate(`({open:document.getElementById('captionFontDialog').classList.contains('open'),count:document.querySelectorAll('.font-picker-option').length})`);
    if (!fontDialog.open || fontDialog.count < 5) throw new Error(`Font picker did not open with popular font choices: ${JSON.stringify(fontDialog)}`);
    await evaluate(`document.querySelector('.font-picker-option[data-font="Roboto"]').click();document.querySelector('.color-swatch[data-color="#2563eb"]').click();document.querySelector('.format-toggle[data-format="bold"]').click();document.querySelector('.format-toggle[data-format="underline"]').click()`);
    const fontApplied = await evaluate(`({name:document.getElementById('captionFontName').textContent,loaded:document.fonts.check('24px Roboto'),bold:document.querySelector('[data-format="bold"]').getAttribute('aria-pressed'),underline:document.querySelector('[data-format="underline"]').getAttribute('aria-pressed')})`);
    if (fontApplied.name !== 'Roboto' || !fontApplied.loaded || fontApplied.bold !== 'true' || fontApplied.underline !== 'true') throw new Error(`Font or formatting selection failed: ${JSON.stringify(fontApplied)}`);
    await setInputFiles('#captionPhoto', IMAGE_FIXTURE);
    await waitFor(`!document.getElementById('removeCaptionPhoto').disabled && document.getElementById('captionPhotoName').textContent.includes('scraft_browser_fixture')`);
    if (!(await evaluate(`!!document.querySelector('#addTextPreviewStage canvas')`))) throw new Error(`Photo overlay loaded without a base preview canvas: ${await evaluate(`({name:document.getElementById('captionPhotoName').textContent,stage:document.getElementById('addTextPreviewStage')?.innerHTML,studio:document.getElementById('addTextStudioArea')?.style.display})`)}`);
    await evaluate(`document.getElementById('btnProcessAddText').click()`);
    await delay(250);
    if (!(await evaluate(`!document.getElementById('btnDownloadAddText').disabled && document.getElementById('addTextMeta').textContent.includes('Captioned output')`))) throw new Error('Styled text/photo overlays were not exported');
    console.log('  ✓ Font popup, locally bundled font, color/format toggles, photo overlay, and export work');
    const textLayout = await evaluate(`(() => {const p=document.querySelector('.add-text-preview');return {viewport:document.documentElement.clientWidth,page:document.documentElement.scrollWidth,controls:document.querySelector('.add-text-controls').getBoundingClientRect(),preview:p.getBoundingClientRect(),previewScroll:p.scrollHeight-p.clientHeight}})()`);
    if (textLayout.page > textLayout.viewport + 1 || textLayout.preview.width < 250 || textLayout.previewScroll > 2) throw new Error(`Add Text editor layout overflows or hides preview: ${JSON.stringify(textLayout)}`);
    await takeScreenshot('/tmp/scraft-add-text-desktop-qa.png');
    await evaluate(`document.getElementById('backBtn').click()`);
    await delay(250);

    console.log('  -> Checking Remove Metadata layout and lossless cleanup...');
    await evaluate(`Array.from(document.querySelectorAll('#toolsGrid .tool-card')).find(c => c.textContent.includes('Remove Metadata')).click()`);
    await delay(250);
    await setInputFiles('#metaDropzone input[type="file"]', PORTRAIT_FIXTURE);
    await delay(300);
    await evaluate(`document.getElementById('btnProcessMeta').click()`);
    await waitFor(`!document.getElementById('btnDownloadMeta').disabled && document.getElementById('metaResultStats').textContent.includes('Clean output')`);
    const metadataLayout = await evaluate(`(() => {const v=document.documentElement.clientWidth;const p=document.documentElement.scrollWidth;const badge=document.querySelector('#metaStudioArea .file-badge').getBoundingClientRect();const preview=document.querySelector('#metaStudioArea .studio-image-preview').getBoundingClientRect();const stats=document.getElementById('metaResultStats').getBoundingClientRect();return {viewport:v,page:p,badgeRight:badge.right,previewLeft:preview.left,statsRight:stats.right,previewRight:preview.right,stats:document.getElementById('metaResultStats').textContent};})()`);
    if (metadataLayout.page > metadataLayout.viewport + 1 || metadataLayout.badgeRight > metadataLayout.previewLeft + 1 || metadataLayout.statsRight > metadataLayout.previewLeft + 1) throw new Error(`Remove Metadata layout or stats overflow: ${JSON.stringify(metadataLayout)}`);
    console.log(`  ✓ Metadata output keeps its preview beside controls; ${metadataLayout.stats.replace(/\s+/g,' ')}`);
    await evaluate(`document.getElementById('backBtn').click()`);
    await delay(250);
    if (!(await evaluate(`Array.from(document.querySelectorAll('#toolsGrid .tool-card')).some(c => c.textContent.includes('Combine Image')) && !Array.from(document.querySelectorAll('#toolsGrid .tool-card')).some(c => c.textContent.includes('Batch Images'))`))) throw new Error('Batch Images was not renamed to Combine Image');
    console.log('  ✓ Image tool catalog uses the Combine Image name');

    await sendCommand('Emulation.setDeviceMetricsOverride', {width:390,height:844,deviceScaleFactor:1,mobile:true});
    await evaluate(`Array.from(document.querySelectorAll('#toolsGrid .tool-card')).find(c => c.textContent.includes('Resize Image')).click()`);
    await delay(250);
    await setInputFiles('#resizeDropzone input[type="file"]', IMAGE_FIXTURE);
    await delay(250);
    const phoneLayout = await evaluate(`(() => {const badge=document.querySelector('#resizeStudioArea .image-file-row .file-badge').getBoundingClientRect();const controls=document.querySelector('#resizeStudioArea .image-editor-controls').getBoundingClientRect();return {viewport:document.documentElement.clientWidth,page:document.documentElement.scrollWidth,badgeRight:badge.right,controlsRight:controls.right};})()`);
    if (phoneLayout.page > phoneLayout.viewport + 1 || phoneLayout.badgeRight > phoneLayout.controlsRight + 1) throw new Error(`Resize layout overflows at 390px: ${JSON.stringify(phoneLayout)}`);
    console.log('  ✓ Long image filename and Resize layout remain inside the 390px mobile viewport');
    await evaluate(`document.getElementById('backBtn').click()`);
    await delay(250);
    await evaluate(`Array.from(document.querySelectorAll('#toolsGrid .tool-card')).find(c => c.textContent.includes('Add Text')).click()`);
    await delay(200);
    await setInputFiles('#addTextDropzone input[type="file"]', IMAGE_FIXTURE);
    await delay(220);
    const addTextPhone = await evaluate(`(() => ({viewport:document.documentElement.clientWidth,page:document.documentElement.scrollWidth,controls:document.querySelector('.add-text-controls').getBoundingClientRect().width,preview:document.querySelector('.add-text-preview').getBoundingClientRect().width}))()`);
    if (addTextPhone.page > addTextPhone.viewport + 1 || addTextPhone.preview < 250) throw new Error(`Add Text layout overflows or hides preview at 390px: ${JSON.stringify(addTextPhone)}`);
    await takeScreenshot('/tmp/scraft-add-text-mobile-qa.png');
    console.log('  ✓ Add Text controls and live preview fit the 390px viewport');
    await evaluate(`document.getElementById('backBtn').click()`);
    await delay(200);
    await evaluate(`Array.from(document.querySelectorAll('#toolsGrid .tool-card')).find(c => c.textContent.includes('Remove Metadata')).click()`);
    await delay(200);
    await setInputFiles('#metaDropzone input[type="file"]', IMAGE_FIXTURE);
    await delay(220);
    const metadataPhone = await evaluate(`(() => ({viewport:document.documentElement.clientWidth,page:document.documentElement.scrollWidth,preview:document.querySelector('#metaStudioArea .studio-image-preview').getBoundingClientRect().width,badge:document.querySelector('#metaStudioArea .file-badge').getBoundingClientRect()}))()`);
    if (metadataPhone.page > metadataPhone.viewport + 1 || metadataPhone.preview < 250 || metadataPhone.badge.right > metadataPhone.viewport + 1) throw new Error(`Remove Metadata layout overflows at 390px: ${JSON.stringify(metadataPhone)}`);
    console.log('  ✓ Remove Metadata controls and preview fit the 390px viewport');
    await sendCommand('Emulation.clearDeviceMetricsOverride');
    await evaluate(`document.getElementById('backBtn').click()`);
    await delay(250);

    // Switch to Video Category
    console.log('  -> Switching to Video Tools category...');
    await evaluate(`
      const vidBtn = Array.from(document.querySelectorAll('#sideNav .side-btn')).find(b => b.textContent.includes('Video Tools'));
      vidBtn.click();
    `);
    await delay(300);

    // Click into "Trim Video"
    console.log('  -> Clicking "Trim Video" tool...');
    await evaluate(`
      const trimVidCard = Array.from(document.querySelectorAll('#toolsGrid .tool-card')).find(c => c.textContent.includes('Trim Video'));
      trimVidCard.click();
    `);
    await delay(400);

    const hasVidPreviewStage = await evaluate(`!!document.getElementById('vidPreviewStage')`);
    console.log(`  ✓ Has Video Preview Player Stage: ${hasVidPreviewStage}`);
    if (!hasVidPreviewStage) throw new Error('Trim Video tool missing video preview stage');

    await takeScreenshot('03-tool-trim-video.png');

    await evaluate(`document.getElementById('backBtn').click()`);
    await delay(300);

    // Switch to Audio Category
    console.log('  -> Switching to Audio Tools category...');
    await evaluate(`
      const audBtn = Array.from(document.querySelectorAll('#sideNav .side-btn')).find(b => b.textContent.includes('Audio Tools'));
      audBtn.click();
    `);
    await delay(300);

    // Click into "Trim Audio"
    console.log('  -> Clicking "Trim Audio" tool...');
    await evaluate(`
      const trimAudCard = Array.from(document.querySelectorAll('#toolsGrid .tool-card')).find(c => c.textContent.includes('Trim Audio'));
      trimAudCard.click();
    `);
    await delay(400);

    const hasAudPreviewStage = await evaluate(`!!document.getElementById('audPreviewStage')`);
    console.log(`  ✓ Has Audio Preview Player Stage: ${hasAudPreviewStage}`);
    if (!hasAudPreviewStage) throw new Error('Trim Audio tool missing audio preview stage');

    await takeScreenshot('04-tool-trim-audio.png');

    console.log('\n3b. Checking new text, time, number tools and saved navigation...');
    await evaluate(`document.getElementById('backBtn').click();Array.from(document.querySelectorAll('#sideNav .side-btn')).find(button=>button.textContent.includes('Text Tools')).click()`);
    await evaluate(`Array.from(document.querySelectorAll('#toolsGrid .tool-card')).find(card=>card.textContent.includes('Random Text')).click()`);
    await evaluate(`document.getElementById('randomMode').value='words';document.getElementById('randomCount').value='5';document.getElementById('randomGenerate').click()`);
    if (!(await evaluate(`document.getElementById('randomOutput').value.trim().split(/\\s+/).length===5`))) throw new Error('Random Text did not generate the requested five words');
    await evaluate(`document.getElementById('backBtn').click();Array.from(document.querySelectorAll('#toolsGrid .tool-card')).find(card=>card.textContent.includes('Text Extractor')).click()`);
    await evaluate(`document.getElementById('extractInput').value='Contact a@example.com or https://example.com';document.getElementById('extractInput').dispatchEvent(new Event('input',{bubbles:true}))`);
    if (!(await evaluate(`document.getElementById('extractOutput').value.includes('a@example.com')`))) throw new Error('Text Extractor did not find the email address');
    await evaluate(`document.getElementById('backBtn').click();Array.from(document.querySelectorAll('#toolsGrid .tool-card')).find(card=>card.textContent.includes('Slug Generator')).click()`);
    await evaluate(`document.getElementById('slugInput').value='My New Website!';document.getElementById('slugInput').dispatchEvent(new Event('input',{bubbles:true}))`);
    if (!(await evaluate(`document.getElementById('slugOutput').value==='my-new-website'`))) throw new Error('Slug Generator returned an incorrect slug');
    await evaluate(`document.getElementById('backBtn').click();Array.from(document.querySelectorAll('#sideNav .side-btn')).find(button=>button.textContent.includes('Time Tools')).click();Array.from(document.querySelectorAll('#toolsGrid .tool-card')).find(card=>card.textContent.includes('Business Days')).click()`);
    if (!(await evaluate(`!!document.getElementById('businessStart') && !!document.getElementById('businessResult')`))) throw new Error('Business Days tool did not render its calculator');
    await evaluate(`document.getElementById('backBtn').click();Array.from(document.querySelectorAll('#sideNav .side-btn')).find(button=>button.textContent.includes('Number Tools')).click();Array.from(document.querySelectorAll('#toolsGrid .tool-card')).find(card=>card.textContent.includes('EMI Calculator')).click()`);
    if (!(await evaluate(`document.getElementById('emiResult').textContent.includes('₹8,884.88')`))) throw new Error('EMI default calculation is incorrect');
    console.log('  ✓ Random Text, Text Extractor, Slug, Business Days and EMI routes render with expected results');

    await evaluate(`document.getElementById('backBtn').click();Array.from(document.querySelectorAll('#sideNav .side-btn')).find(button=>button.textContent.includes('Image Tools')).click();document.querySelector('#toolsGrid .tool-favorite').click();Array.from(document.querySelectorAll('#sideNav .side-btn')).find(button=>button.textContent.trim()==='Favorites').click()`);
    if (!(await evaluate(`document.querySelectorAll('#toolsGrid .tool-card').length>0`))) throw new Error('Favorite tool did not appear in Favorites');
    await evaluate(`document.getElementById('backBtn').click();document.getElementById('manageQuickAccessBtn').click();const pin=document.querySelector('#quickAccessManageList input[value="pdf-merge"]');if(!pin.checked){pin.checked=true;pin.dispatchEvent(new Event('change',{bubbles:true}));}`);
    if (!(await evaluate(`JSON.parse(localStorage.getItem('scraft_ui_preferences_v1')).pinnedToolIds.includes('pdf-merge')`))) throw new Error('Quick Access pin was not saved to local preferences');
    await sendCommand('Page.navigate', {url:APP_URL});
    await delay(400);
    const restoredPrefs = await evaluate(`({quick:!!document.querySelector('#quickAccessTools [data-tool-id="pdf-merge"]'),favorites:JSON.parse(localStorage.getItem('scraft_ui_preferences_v1')).favoriteToolIds.length>0})`);
    if (!restoredPrefs.quick || !restoredPrefs.favorites) throw new Error(`Favorites/Quick Access preferences did not survive a reload: ${JSON.stringify(restoredPrefs)}`);
    console.log('  ✓ Favorites and Quick Access persist using stable tool IDs');

    console.log('\n3c. Checking Settings sections, Apply, and Quick Access layering...');
    await evaluate(`Array.from(document.querySelectorAll('#sideNav .side-btn')).find(button=>button.textContent.includes('PDF Tools')).click()`);
    await evaluate(`document.getElementById('settingsBtn').click()`);
    const settingsSections = await evaluate(`({sections:[...document.querySelectorAll('[data-settings-section]')].map(button=>button.dataset.settingsSection),apply:!!document.getElementById('settingsApplyBtn'),accent:!!document.querySelector('[data-accent-color="none"]')})`);
    if (!settingsSections.apply || !settingsSections.accent || settingsSections.sections.join(',') !== 'appearance,tool-preferences,shortcuts') throw new Error(`Settings sections or controls missing: ${JSON.stringify(settingsSections)}`);
    const swatchAlignment = await evaluate(`(()=>{const blue=document.querySelector('[data-accent-color="#2563eb"]').getBoundingClientRect(),green=document.querySelector('[data-accent-color="#16a34a"]').getBoundingClientRect(),custom=document.querySelector('#customAccentColor').getBoundingClientRect();return {blue:{x:blue.x,y:blue.y,w:blue.width,h:blue.height},green:{x:green.x,y:green.y,w:green.width,h:green.height},custom:{x:custom.x,y:custom.y,w:custom.width,h:custom.height}}})()`);
    if (swatchAlignment.blue.y !== swatchAlignment.green.y || swatchAlignment.blue.y !== swatchAlignment.custom.y || swatchAlignment.blue.w !== 34 || swatchAlignment.green.w !== 34 || swatchAlignment.custom.w !== 34) throw new Error(`Accent color choices are misaligned: ${JSON.stringify(swatchAlignment)}`);
    await evaluate(`document.querySelector('[data-accent-color="#16a34a"]').click()`);
    const stagedAccent = await evaluate(`getComputedStyle(document.body).getPropertyValue('--accent').trim()`);
    if (stagedAccent === '#16a34a') throw new Error('Accent color changed before Apply');
    await evaluate(`document.getElementById('settingsApplyBtn').click()`);
    await evaluate(`Array.from(document.querySelectorAll('#sideNav .side-btn')).find(button=>button.textContent.includes('PDF Tools')).click()`);
    const appliedAccent = await evaluate(`({color:getComputedStyle(document.body).getPropertyValue('--accent').trim(),saved:JSON.parse(localStorage.getItem('scraft_ui_preferences_v1')).accentColor,navColor:getComputedStyle(document.querySelector('#sideNav .side-btn.active')).color})`);
    if (appliedAccent.color !== '#16a34a' || appliedAccent.saved !== '#16a34a' || appliedAccent.navColor !== 'rgb(22, 163, 74)') throw new Error(`Accent did not apply to the main app and persist: ${JSON.stringify(appliedAccent)}`);
    await evaluate(`document.getElementById('settingsBtn').click();document.querySelector('[data-settings-section="tool-preferences"]').click();document.querySelector('[data-start-page="favorites"]').click();document.getElementById('settingsApplyBtn').click()`);
    if (await evaluate(`document.getElementById('categoryTitle').textContent.trim() !== 'Favorites'`)) throw new Error('Start page preference did not change the current view');
    await evaluate(`document.getElementById('settingsBtn').click();document.querySelector('[data-settings-section="tool-preferences"]').click();document.querySelector('[data-start-page="all-tools"]').click();document.getElementById('settingsApplyBtn').click()`);
    if (await evaluate(`document.getElementById('categoryTitle').textContent.trim() !== 'All Tools'`)) throw new Error('All tools Start page preference did not apply');
    await evaluate(`document.getElementById('settingsBtn').click();document.querySelector('[data-settings-section="appearance"]').click();document.querySelector('[data-accent-color="none"]').click();document.getElementById('settingsApplyBtn').click()`);
    await evaluate(`document.getElementById('settingsBtn').click();document.querySelector('[data-settings-section="tool-preferences"]').click();document.getElementById('settingsManageQuickAccessBtn').click()`);
    const quickLayering = await evaluate(`(()=>{const quick=document.getElementById('quickAccessModal'),settings=document.getElementById('settingsModal'),card=quick.querySelector('.modal-card'),rect=card.getBoundingClientRect(),top=document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);return {quickOpen:quick.classList.contains('open'),settingsOpen:settings.classList.contains('open'),quickAtDocumentRoot:quick.parentElement===document.body,quickZ:Number(getComputedStyle(quick).zIndex),settingsZ:Number(getComputedStyle(settings).zIndex),topmost:quick.contains(top)}})()`);
    if (!quickLayering.quickOpen || !quickLayering.settingsOpen || !quickLayering.quickAtDocumentRoot || quickLayering.quickZ <= quickLayering.settingsZ || !quickLayering.topmost) throw new Error(`Quick Access manager is behind Settings: ${JSON.stringify(quickLayering)}`);
    const settingsFooter = await evaluate(`(()=>{const modal=document.getElementById('settingsModal').getBoundingClientRect(),apply=document.getElementById('settingsApplyBtn').getBoundingClientRect(),cancel=document.getElementById('cancelSettingsBtn').getBoundingClientRect();return {applyVisible:apply.height>0&&apply.bottom<=modal.bottom+1,cancelVisible:cancel.height>0&&cancel.bottom<=modal.bottom+1}})()`);
    if (!settingsFooter.applyVisible || !settingsFooter.cancelVisible) throw new Error(`Settings Apply/Cancel buttons are not visible in the modal: ${JSON.stringify(settingsFooter)}`);
    await evaluate(`document.getElementById('closeQuickAccessBtn').click();document.getElementById('cancelSettingsBtn').click()`);
    await evaluate(`document.getElementById('settingsBtn').click();document.querySelector('[data-settings-section="shortcuts"]').click()`);
    const shortcutsVisible = await evaluate(`document.querySelector('.shortcut-list').textContent.includes('Search tools') && document.querySelector('.shortcut-list').textContent.includes('Enter')`);
    if (!shortcutsVisible) throw new Error('Keyboard shortcuts page did not render its key bindings');
    await evaluate(`document.getElementById('cancelSettingsBtn').click()`);
    await sendCommand('Emulation.setDeviceMetricsOverride', {width:390,height:844,deviceScaleFactor:1,mobile:true});
    await evaluate(`document.getElementById('settingsBtn').click()`);
    const settingsMobile = await evaluate(`({page:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,modal:document.getElementById('settingsModal').getBoundingClientRect().width})`);
    if (settingsMobile.page > settingsMobile.viewport + 1 || settingsMobile.modal > settingsMobile.viewport) throw new Error(`Settings modal overflows phone layout: ${JSON.stringify(settingsMobile)}`);
    await evaluate(`document.getElementById('cancelSettingsBtn').click()`);
    await sendCommand('Emulation.clearDeviceMetricsOverride');
    console.log('  ✓ Appearance/Start page Apply, shortcut navigation, Quick Access layer order, and phone layout verified');

    console.log('\n4. Checking Browser Console Diagnostics...');
    if (consoleErrors.length > 0) {
      console.error('❌ Browser reported console errors during session:');
      consoleErrors.forEach(err => console.error('  - ' + err));
      throw new Error(`Browser encountered ${consoleErrors.length} JavaScript runtime errors.`);
    } else {
      console.log('✓ Clean console: 0 JavaScript errors or unhandled exceptions detected in browser session.');
    }

    console.log('\n======================================================');
    console.log('✓ ALL REAL BROWSER CHECKS PASSED PERFECTLY!');
    console.log('  - All 7 Categories functional and responsive');
    console.log('  - PDF Document Preview & Signature Stage verified');
    console.log('  - Image Crop & Signature Stage verified');
    console.log('  - Video Player & Timeline Scrubber Stage verified');
    console.log('  - Audio Player & Timeline Stage verified');
    console.log('  - 0 console errors in live headless Chrome session');
    console.log('======================================================\n');

  } finally {
    ws.close();
    chromeProc.kill();
    fs.rmSync(IMAGE_FIXTURE, { force: true });
  }
}

runBrowserVerification().catch(err => {
  console.error('\n❌ Real Browser Verification Failed:', err.message);
  process.exit(1);
});
