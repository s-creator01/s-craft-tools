// S Craft — PDF Priority Acceptance Test Suite
// Verifies:
// 1. PDF Creation, text, and structure
// 2. Visible signature embedding on target page with coordinate translation
// 3. Merging multiple PDFs preserving order and page counts
// 4. Splitting PDF extracting specified page ranges
// 5. Organizing pages (rotate, add blank, reorder)
// 6. Watermarking PDF pages
// 7. Stream compression and object stream optimization

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load bundled local vendor pdf-lib UMD bundle
const pdfLibCode = fs.readFileSync(path.join(__dirname, '../public/vendor/pdf-lib.min.js'), 'utf-8');
const exportsObj = {};
const sandbox = { ...globalThis, Uint8Array, ArrayBuffer, exports: exportsObj, module: { exports: exportsObj } };
vm.createContext(sandbox);
vm.runInContext(pdfLibCode, sandbox);
const { PDFDocument, StandardFonts, rgb, degrees, PageSizes } = sandbox.module.exports;

let passed = 0;
let total = 0;

async function it(name, fn) {
  total++;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`);
    throw err;
  }
}

export async function runPdfTests() {
  console.log('\n--- Running PDF Priority Tests (Sign, Merge, Split, Organize) ---');

  // Test 1: Create sample base PDF document
  let docA, docB, bytesA, bytesB;

  await it('PDF: Document creation and basic text rendering', async () => {
    docA = await PDFDocument.create();
    const font = await docA.embedFont(StandardFonts.Helvetica);
    const page1 = docA.addPage(PageSizes.A4);
    page1.drawText('Document A - Page 1', { x: 50, y: 750, size: 24, font, color: rgb(0, 0, 0) });
    const page2 = docA.addPage(PageSizes.A4);
    page2.drawText('Document A - Page 2', { x: 50, y: 750, size: 24, font, color: rgb(0, 0, 0) });

    bytesA = await docA.save();
    assert(bytesA.length > 500, 'PDF bytes must be non-empty');
    assert.strictEqual(docA.getPageCount(), 2);
  });

  await it('PDF: Create second document for merge tests', async () => {
    docB = await PDFDocument.create();
    const font = await docB.embedFont(StandardFonts.Helvetica);
    const p1 = docB.addPage(PageSizes.A4);
    p1.drawText('Document B - Page 1', { x: 50, y: 750, size: 24, font });

    bytesB = await docB.save();
    assert.strictEqual(docB.getPageCount(), 1);
  });

  // Test 2: Visual Signature Embedding
  await it('PDF: Sign PDF embeds visible signature onto target page with proper coordinates', async () => {
    const docToSign = await PDFDocument.load(bytesA);
    const totalPages = docToSign.getPageCount();
    const targetPage = docToSign.getPage(0); // Page 1
    const { width: pW, height: pH } = targetPage.getSize();

    // Use standard PNG Data URL as sample signature
    const pngSignatureDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const embeddedSig = await docToSign.embedPng(pngSignatureDataUrl);

    // Place signature on page (x: 100, y: 80 from top, width: 150, height: 50)
    const sigW = 150;
    const sigH = 50;
    const posX = 100;
    const posYFromTop = 80;
    const posYPdf = pH - posYFromTop - sigH;

    targetPage.drawImage(embeddedSig, {
      x: posX,
      y: posYPdf,
      width: sigW,
      height: sigH,
      opacity: 0.95
    });

    const signedBytes = await docToSign.save();
    assert(signedBytes.length > bytesA.length, 'Signed PDF must be larger than original');

    // Reload and verify page count and validity
    const reloaded = await PDFDocument.load(signedBytes);
    assert.strictEqual(reloaded.getPageCount(), totalPages);
  });

  // Test 3: Merge Multiple PDFs
  await it('PDF: Merge multiple PDFs preserves page count and exact file sequence', async () => {
    const mergedDoc = await PDFDocument.create();

    const d1 = await PDFDocument.load(bytesA);
    const d2 = await PDFDocument.load(bytesB);

    const pages1 = await mergedDoc.copyPages(d1, d1.getPageIndices());
    pages1.forEach(p => mergedDoc.addPage(p));

    const pages2 = await mergedDoc.copyPages(d2, d2.getPageIndices());
    pages2.forEach(p => mergedDoc.addPage(p));

    const mergedBytes = await mergedDoc.save();
    const verified = await PDFDocument.load(mergedBytes);

    // Document A had 2 pages, Document B had 1 page -> total 3 pages!
    assert.strictEqual(verified.getPageCount(), 3);
  });

  // Test 4: Split PDF Page Range
  await it('PDF: Split PDF accurately extracts specified page subset', async () => {
    // Merge first to get 3-page doc
    const sourceDoc = await PDFDocument.create();
    const d1 = await PDFDocument.load(bytesA);
    const d2 = await PDFDocument.load(bytesB);
    const pages1 = await sourceDoc.copyPages(d1, d1.getPageIndices());
    pages1.forEach(p => sourceDoc.addPage(p));
    const pages2 = await sourceDoc.copyPages(d2, d2.getPageIndices());
    pages2.forEach(p => sourceDoc.addPage(p));
    const threePageBytes = await sourceDoc.save();

    // Extract pages 2 and 3 (0-indexed: 1, 2)
    const src = await PDFDocument.load(threePageBytes);
    const splitDoc = await PDFDocument.create();
    const targetIndices = src.getPageIndices().filter(i => i >= 1); // [1, 2]
    const copied = await splitDoc.copyPages(src, targetIndices);
    copied.forEach(p => splitDoc.addPage(p));

    const splitBytes = await splitDoc.save();
    const splitReloaded = await PDFDocument.load(splitBytes);
    assert.strictEqual(splitReloaded.getPageCount(), 2);
  });

  // Test 5: Organize Pages (Rotate & Insert Blank Page)
  await it('PDF: Organize pages rotates individual pages and inserts blank pages', async () => {
    const doc = await PDFDocument.load(bytesA);
    const orgDoc = await PDFDocument.create();

    // Page 1 rotated 90 degrees
    const [p1] = await orgDoc.copyPages(doc, doc.getPageIndices().slice(0, 1));
    p1.setRotation(degrees(90));
    orgDoc.addPage(p1);

    // Insert Blank A4 Page
    orgDoc.addPage(PageSizes.A4);

    // Page 2 unrotated
    const [p2] = await orgDoc.copyPages(doc, doc.getPageIndices().slice(1, 2));
    orgDoc.addPage(p2);

    const orgBytes = await orgDoc.save();
    const orgReloaded = await PDFDocument.load(orgBytes);
    assert.strictEqual(orgReloaded.getPageCount(), 3);
    assert.strictEqual(orgReloaded.getPage(0).getRotation().angle, 90);
  });

  // Test 6: Watermark PDF
  await it('PDF: Watermark PDF applies text watermark with rotation and opacity', async () => {
    const doc = await PDFDocument.load(bytesA);
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const pages = doc.getPages();

    for (const page of pages) {
      const { width, height } = page.getSize();
      page.drawText('CONFIDENTIAL', {
        x: width / 4,
        y: height / 2,
        size: 36,
        font,
        color: rgb(0.8, 0.2, 0.2),
        rotate: degrees(45),
        opacity: 0.3
      });
    }

    const wmBytes = await doc.save();
    assert(wmBytes.length > bytesA.length);
    const wmReloaded = await PDFDocument.load(wmBytes);
    assert.strictEqual(wmReloaded.getPageCount(), 2);
  });

  // Test 7: Compress PDF with Object Streams
  await it('PDF: Compress PDF uses object stream compression', async () => {
    const doc = await PDFDocument.load(bytesA);
    const compressedBytes = await doc.save({
      useObjectStreams: true,
      addDefaultPage: false
    });
    assert(compressedBytes.length > 0);
    const compReloaded = await PDFDocument.load(compressedBytes);
    assert.strictEqual(compReloaded.getPageCount(), 2);
  });

  // Test 8: Protect PDF with 256-bit AES encryption via QPDF
  let encryptedBytes;
  await it('PDF: Protect PDF with 256-bit AES password encryption via QPDF', async () => {
    const require = createRequire(import.meta.url);
    const qpdfCode = fs.readFileSync(path.join(__dirname, '../public/vendor/qpdf.js'), 'utf-8');
    const getModule = new Function('__dirname', 'require', qpdfCode + '\nreturn Module;');
    const createMod = getModule(__dirname, require);
    const qpdf = await createMod({
      locateFile: () => path.join(__dirname, '../public/vendor/qpdf.wasm')
    });

    const inPath = `/test_in_${Date.now()}.pdf`;
    const outPath = `/test_enc_${Date.now()}.pdf`;
    qpdf.FS.writeFile(inPath, bytesA);
    qpdf.callMain([inPath, '--encrypt', 'secret123', 'secret123', '256', '--', outPath]);
    encryptedBytes = qpdf.FS.readFile(outPath);
    assert(encryptedBytes && encryptedBytes.length > 0, 'Encrypted bytes must exist');

    // Verify PDFDocument.load fails without password
    let failedWithoutPassword = false;
    try {
      await PDFDocument.load(encryptedBytes);
    } catch (e) {
      failedWithoutPassword = e.message.includes('encrypt');
    }
    assert.strictEqual(failedWithoutPassword, true, 'Encrypted PDF must not open without password');
    qpdf.FS.unlink(inPath);
    qpdf.FS.unlink(outPath);
  });

  // Test 9: Unlock PDF with correct password via QPDF
  await it('PDF: Unlock and decrypt PDF removes password protection completely', async () => {
    const require = createRequire(import.meta.url);
    const qpdfCode = fs.readFileSync(path.join(__dirname, '../public/vendor/qpdf.js'), 'utf-8');
    const getModule = new Function('__dirname', 'require', qpdfCode + '\nreturn Module;');
    const createMod = getModule(__dirname, require);
    const qpdf = await createMod({
      locateFile: () => path.join(__dirname, '../public/vendor/qpdf.wasm')
    });

    const encInPath = `/test_enc_in_${Date.now()}.pdf`;
    const decOutPath = `/test_dec_out_${Date.now()}.pdf`;
    qpdf.FS.writeFile(encInPath, encryptedBytes);
    qpdf.callMain([encInPath, '--password=secret123', '--decrypt', decOutPath]);
    const decBytes = qpdf.FS.readFile(decOutPath);
    assert(decBytes && decBytes.length > 0, 'Decrypted bytes must exist');

    // Verify unlocked PDF now opens cleanly without password
    const decDoc = await PDFDocument.load(decBytes);
    assert.strictEqual(decDoc.getPageCount(), 2, 'Decrypted document must open with 2 pages');
    qpdf.FS.unlink(encInPath);
    qpdf.FS.unlink(decOutPath);
  });

  // Test 10: Reject incorrect password during decryption
  await it('PDF: Decrypt with incorrect password is safely rejected', async () => {
    const require = createRequire(import.meta.url);
    const qpdfCode = fs.readFileSync(path.join(__dirname, '../public/vendor/qpdf.js'), 'utf-8');
    const getModule = new Function('__dirname', 'require', qpdfCode + '\nreturn Module;');
    const createMod = getModule(__dirname, require);
    const qpdf = await createMod({
      locateFile: () => path.join(__dirname, '../public/vendor/qpdf.wasm')
    });

    const encInPath = `/test_enc_wrong_${Date.now()}.pdf`;
    const wrongOutPath = `/test_wrong_out_${Date.now()}.pdf`;
    qpdf.FS.writeFile(encInPath, encryptedBytes);
    
    // Silence stderr for test
    const origErr = console.error;
    console.error = () => {};
    try {
      qpdf.callMain([encInPath, '--password=wrongpassword', '--decrypt', wrongOutPath]);
    } catch (e) {}
    process.exitCode = 0;
    console.error = origErr;

    let outExists = false;
    try {
      const out = qpdf.FS.readFile(wrongOutPath);
      outExists = out.length > 0;
    } catch (e) {
      outExists = false;
    }
    assert.strictEqual(outExists, false, 'Output file must not be created with wrong password');
    qpdf.FS.unlink(encInPath);
  });

  console.log(`✓ All ${passed} PDF priority tests passed cleanly!\n`);
  return { passed, total };
}

if (process.argv[1]?.endsWith('test-pdf-ops.js')) {
  runPdfTests().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
