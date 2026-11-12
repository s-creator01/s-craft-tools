const appUrl = process.env.SCRAFT_TEST_URL || 'http://127.0.0.1:3300';
// S Craft — Media Tools (Video/Audio) Acceptance Test Suite
// Verifies local offline FFmpeg execution over loopback 127.0.0.1
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

const TMP_DIR = path.join(os.tmpdir(), 'scraft_media_test');
fs.mkdirSync(TMP_DIR, { recursive: true });

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

export async function runMediaTests() {
  console.log('\n--- Running Media Priority Tests (Local Video & Audio via Loopback) ---');

  // Check server status
  await it('Media: Status endpoint detects local offline FFmpeg', async () => {
    const res = await fetch(new URL('/api/media/status', appUrl));
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.available, true);
    assert(data.binaryPath && data.binaryPath.includes('ffmpeg'));
  });

  // Generate 2-second synthesized test video
  const testVideoPath = path.join(TMP_DIR, 'test_vid.mp4');
  execSync(
    'ffmpeg -y -f lavfi -i color=c=red:s=320x240:d=2 -f lavfi -i sine=f=440:d=2 -c:v libx264 -c:a aac -pix_fmt yuv420p "' + testVideoPath + '"',
    { stdio: 'ignore' }
  );
  const videoBuffer = fs.readFileSync(testVideoPath);
  const videoBase64 = videoBuffer.toString('base64');

  async function processMedia(operation, inputBase64, inputName, options = {}) {
    const response = await fetch(new URL('/api/media/process', appUrl), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation, inputBase64, inputName, options })
    });
    const data = await response.json();
    assert.strictEqual(response.status, 200, data.error || `${operation} failed`);
    assert.strictEqual(data.success, true, data.error || `${operation} did not succeed`);
    assert(data.size > 0 && data.outputBase64.length > 0);
    return { ...data, path: path.join(TMP_DIR, `${operation}${path.extname(data.fileName)}`) };
  }

  async function processMediaMultiple(operation, inputsBase64, inputName) {
    const response = await fetch(new URL('/api/media/process', appUrl), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation, inputsBase64, inputName })
    });
    const data = await response.json();
    assert.strictEqual(response.status, 200, data.error || `${operation} failed`);
    assert.strictEqual(data.success, true, data.error || `${operation} did not succeed`);
    assert(data.size > 0 && data.outputBase64.length > 0);
    return { ...data, path: path.join(TMP_DIR, `${operation}${path.extname(data.fileName)}`) };
  }

  function inspectMedia(filePath) {
    const json = execSync(`ffprobe -v error -show_entries format=duration -show_entries stream=codec_type -of json "${filePath}"`, { encoding: 'utf8' });
    return JSON.parse(json);
  }

  async function saveProcessed(result) {
    fs.writeFileSync(result.path, Buffer.from(result.outputBase64, 'base64'));
    return result.path;
  }

  await it('Media: Trim video locally', async () => {
    const payload = {
      operation: 'trim-video',
      options: { start: 0, end: 1 },
      inputBase64: videoBase64,
      inputName: 'test.mp4'
    };

    const res = await fetch(new URL('/api/media/process', appUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.mimeType, 'video/mp4');
    assert(data.size > 0);
    assert(data.outputBase64.length > 100);
  });

  await it('Media: Mute video (strip audio track) locally', async () => {
    const payload = {
      operation: 'mute-video',
      inputBase64: videoBase64,
      inputName: 'test.mp4'
    };

    const res = await fetch(new URL('/api/media/process', appUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.size > 0);
  });

  await it('Media: Extract audio from video to MP3', async () => {
    const payload = {
      operation: 'extract-audio',
      options: { format: 'mp3' },
      inputBase64: videoBase64,
      inputName: 'test.mp4'
    };

    const res = await fetch(new URL('/api/media/process', appUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.mimeType, 'audio/mpeg');
    assert(data.size > 0);
  });

  await it('Media: Change video speed while keeping audio in sync', async () => {
    const result = await processMedia('speed-video', videoBase64, 'speed-source.mp4', { speed: 1.5 });
    const outputPath = await saveProcessed(result);
    const info = inspectMedia(outputPath);
    const duration = Number(info.format.duration);
    assert(duration > 1.1 && duration < 1.55, `Expected about 1.33 seconds after 1.5x speed, got ${duration}`);
    assert(info.streams.some(stream => stream.codec_type === 'audio'), 'Speed output lost its audio stream');
  });

  await it('Media: Change speed on a silent video without requiring an audio stream', async () => {
    const silentPath = path.join(TMP_DIR, 'silent.mp4');
    execSync(`ffmpeg -y -f lavfi -i color=c=blue:s=320x240:d=2 -c:v libx264 -pix_fmt yuv420p "${silentPath}"`, { stdio: 'ignore' });
    const result = await processMedia('speed-video', fs.readFileSync(silentPath).toString('base64'), 'silent.mp4', { speed: 2 });
    const outputPath = await saveProcessed(result);
    const info = inspectMedia(outputPath);
    const duration = Number(info.format.duration);
    assert(duration > 0.7 && duration < 1.3, `Expected about 1 second after 2x speed, got ${duration}`);
    assert(!info.streams.some(stream => stream.codec_type === 'audio'), 'A silent input unexpectedly gained an audio stream');
  });

  await it('Media: Merge video clips in selected order', async () => {
    const result = await processMediaMultiple('merge-videos', [videoBase64, videoBase64], 'joined.mp4');
    const info = inspectMedia(await saveProcessed(result));
    const duration = Number(info.format.duration);
    assert(duration > 3.7 && duration < 4.4, `Expected two joined 2-second clips, got ${duration} seconds`);
    assert(info.streams.some(stream => stream.codec_type === 'audio'), 'Merged output lost audio');
  });

  await it('Media: Noise reduction and fade export valid audio with the source duration', async () => {
    const sourcePath = path.join(TMP_DIR, 'noise-source.wav');
    execSync(`ffmpeg -y -f lavfi -i "sine=frequency=700:duration=2" -f lavfi -i "anoisesrc=color=white:amplitude=0.02:duration=2" -filter_complex "[0:a][1:a]amix=inputs=2:duration=first" -c:a pcm_s16le "${sourcePath}"`, { stdio: 'ignore' });
    const sourceBase64 = fs.readFileSync(sourcePath).toString('base64');
    const denoised = await processMedia('denoise-audio', sourceBase64, 'noise-source.wav', { strength: 'normal' });
    const denoisedInfo = inspectMedia(await saveProcessed(denoised));
    const duration = Number(denoisedInfo.format.duration);
    assert(duration > 1.8 && duration < 2.2, `Noise reduction changed audio duration: ${duration}`);
    const faded = await processMedia('fade-audio', sourceBase64, 'noise-source.wav', { fadeIn: 0.2, fadeOut: 0.2, duration: 2 });
    const fadedInfo = inspectMedia(await saveProcessed(faded));
    assert(Math.abs(Number(fadedInfo.format.duration) - 2) < 0.25, 'Fade output duration does not match its source');
    assert.notStrictEqual(denoised.outputBase64, sourceBase64, 'Noise reduction did not create a processed output');
    const mp3Path = path.join(TMP_DIR, 'noise-source.mp3');
    execSync(`ffmpeg -y -i "${sourcePath}" -c:a libmp3lame -b:a 128k "${mp3Path}"`, { stdio: 'ignore' });
    const audioBase64 = fs.readFileSync(mp3Path).toString('base64');
    const merged = await processMediaMultiple('merge-audio', [audioBase64, audioBase64], 'joined.mp3');
    const mergedInfo = inspectMedia(await saveProcessed(merged));
    assert(Number(mergedInfo.format.duration) > 3.7, 'Merged audio output did not include both tracks');
  });

  // Cleanup
  try {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  } catch {}

  console.log(`✓ All ${passed} media priority tests passed cleanly!\n`);
  return { passed, total };
}

if (process.argv[1]?.endsWith('test-media-local.js')) {
  runMediaTests().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
