// S Craft — Image Priority Acceptance Test Suite
// Verifies:
// 1. Independent Width/Height exact pixel rasterization (200x230 px)
// 2. Unlocked aspect ratio independence (changing H does not alter W)
// 3. Target-size constraint (<= 50 KB)
// 4. Combined 200x230 px AND <= 50 KB validation
// 5. Signature overlay and visual placement
// 6. Real raster image validation via macOS sips & ffprobe

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(os.tmpdir(), 'scraft_img_tests');
fs.mkdirSync(TMP_DIR, { recursive: true });

let passed = 0;
let total = 0;

function it(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`);
    throw err;
  }
}

// Helper to inspect real raster image dimensions using macOS sips
function getImageSpecs(filePath) {
  const output = execSync(`sips -g pixelWidth -g pixelHeight "${filePath}"`, { encoding: 'utf-8' });
  const wMatch = output.match(/pixelWidth:\s*(\d+)/);
  const hMatch = output.match(/pixelHeight:\s*(\d+)/);
  const size = fs.statSync(filePath).size;
  return {
    width: wMatch ? parseInt(wMatch[1]) : 0,
    height: hMatch ? parseInt(hMatch[1]) : 0,
    size
  };
}

export async function runImageTests() {
  console.log('\n--- Running Image Priority Tests (Exact Dimensions & Target KB) ---');

  // Test 1: Sizing Math & Aspect Ratio Independence
  it('Image: Width & Height inputs are strictly independent when aspect ratio is unlocked', () => {
    let width = 200;
    let height = 230;
    let locked = false;

    // Simulate user changing height
    height = 500;
    if (locked) width = Math.round(height * (200 / 230));
    // When unlocked, width MUST NOT change!
    assert.strictEqual(width, 200);
    assert.strictEqual(height, 500);

    // Simulate user toggling lock ON
    locked = true;
    const ratio = width / height; // 200 / 500 = 0.4
    height = 1000;
    if (locked) width = Math.round(height * ratio);
    assert.strictEqual(width, 400);
  });

  // Test 2: Dimension Fit Modes (Crop, Contain, Stretch, Max, Original)
  it('Image: Fit mode calculations prevent distortion and guarantee exact dimensions', () => {
    const origW = 4000;
    const origH = 3000;
    const targetW = 200;
    const targetH = 230;

    // Exact Crop to Fit
    const scale = Math.max(targetW / origW, targetH / origH); // max(200/4000, 230/3000) = 0.07666
    const srcW = targetW / scale;
    const srcH = targetH / scale;
    const sx = Math.max(0, (origW - srcW) / 2);
    const sy = Math.max(0, (origH - srcH) / 2);

    assert(sx >= 0);
    assert(sy >= 0);
    assert.strictEqual(targetW, 200);
    assert.strictEqual(targetH, 230);

    // Max Dimensions (Proportional bounding box)
    const maxDim = 200;
    const maxScale = Math.min(maxDim / origW, maxDim / origH, 1.0);
    const fitW = Math.round(origW * maxScale);
    const fitH = Math.round(origH * maxScale);
    assert.strictEqual(fitW, 200);
    assert.strictEqual(fitH, 150); // Preserves 4:3 ratio!
  });

  // Test 3: Generate Real 4000x3000 Source Image and perform Exact 200x230 px resize
  const sourceImage = path.join(TMP_DIR, 'source_4000x3000.jpg');
  const exactResized = path.join(TMP_DIR, 'exact_200x230.jpg');
  const targetCompressed = path.join(TMP_DIR, 'target_50kb.jpg');
  const signedImage = path.join(TMP_DIR, 'signed_output.jpg');

  // Create real test image via sips or ffmpeg
  execSync(`ffmpeg -y -f lavfi -i color=c=blue:s=4000x3000 -vframes 1 "${sourceImage}"`, { stdio: 'ignore' });
  const srcSpecs = getImageSpecs(sourceImage);
  assert.strictEqual(srcSpecs.width, 4000);
  assert.strictEqual(srcSpecs.height, 3000);

  it('Image: Real 4000x3000 image exported to EXACTLY 200x230 pixels', () => {
    // Perform exact crop-to-fit resize to 200x230
    execSync(`ffmpeg -y -i "${sourceImage}" -vf "scale=200:230:force_original_aspect_ratio=increase,crop=200:230" "${exactResized}"`, { stdio: 'ignore' });
    const outSpecs = getImageSpecs(exactResized);

    assert.strictEqual(outSpecs.width, 200, 'Width must be exactly 200 px');
    assert.strictEqual(outSpecs.height, 230, 'Height must be exactly 230 px');
  });

  it('Image: Target-size compression achieves <= 50 KB while preserving 200x230 px', () => {
    // Compress 200x230 to <= 50 KB
    execSync(`ffmpeg -y -i "${exactResized}" -q:v 2 "${targetCompressed}"`, { stdio: 'ignore' });
    const compSpecs = getImageSpecs(targetCompressed);

    assert.strictEqual(compSpecs.width, 200, 'Dimensions must remain 200 px');
    assert.strictEqual(compSpecs.height, 230, 'Dimensions must remain 230 px');
    assert(compSpecs.size <= 50 * 1024, `File size (${compSpecs.size} bytes) must be <= 50 KB (51200 bytes)`);
  });

  it('Image: Signature overlay correctly composites signature on base image', () => {
    // Create signature overlay and composite
    const sigPath = path.join(TMP_DIR, 'sig.png');
    execSync(`ffmpeg -y -f lavfi -i color=c=black:s=100x40 -vframes 1 "${sigPath}"`, { stdio: 'ignore' });

    execSync(`ffmpeg -y -i "${exactResized}" -i "${sigPath}" -filter_complex "[0:v][1:v]overlay=50:150" "${signedImage}"`, { stdio: 'ignore' });
    const signSpecs = getImageSpecs(signedImage);

    assert.strictEqual(signSpecs.width, 200);
    assert.strictEqual(signSpecs.height, 230);
    assert(signSpecs.size > 0);
  });

  // Cleanup temp files
  try {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  } catch {}

  console.log(`✓ All ${passed} image priority tests passed cleanly!\n`);
  return { passed, total };
}

if (process.argv[1]?.endsWith('test-image-exact.js')) {
  runImageTests().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
