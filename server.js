/**
 * S-Craft Tools — Local Offline Server
 * 
 * Binds exclusively to 127.0.0.1 (loopback) to guarantee local privacy.
 * Serves the responsive client application and provides offline media
 * processing via the locally installed FFmpeg binary.
 * Zero external network calls.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { spawn, execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, 'public');

// Locate local FFmpeg binary
function findLocalFFmpeg() {
  const candidates = [
    path.join(os.homedir(), '.local', 'bin', 'ffmpeg'),
    '/usr/local/bin/ffmpeg',
    '/opt/homebrew/bin/ffmpeg',
    'ffmpeg'
  ];

  for (const bin of candidates) {
    try {
      execSync(`"${bin}" -version`, { stdio: 'ignore' });
      return bin;
    } catch {
      // continue searching
    }
  }
  return null;
}

const FFMPEG_BIN = findLocalFFmpeg();

// MIME Types map
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.aac': 'audio/aac',
  '.wasm': 'application/wasm',
  '.onnx': 'application/octet-stream',
  '.map': 'application/json'
};

// Execute FFmpeg command asynchronously with timeout
function runFFmpeg(args, timeoutMs = 300000) {
  return new Promise((resolve, reject) => {
    if (!FFMPEG_BIN) {
      return reject(new Error('Local FFmpeg binary not found on this system'));
    }

    const proc = spawn(FFMPEG_BIN, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';

    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error(`FFmpeg processing timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ success: true, stderr });
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-500)}`));
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function probeHasAudio(inputPath) {
  return new Promise((resolve, reject) => {
    if (!FFMPEG_BIN) return reject(new Error('Local FFmpeg binary not found on this system'));
    const probeBin = FFMPEG_BIN.includes('/') ? path.join(path.dirname(FFMPEG_BIN), 'ffprobe') : 'ffprobe';
    const proc = spawn(probeBin, ['-v','error','-select_streams','a:0','-show_entries','stream=codec_type','-of','default=noprint_wrappers=1:nokey=1',inputPath], { stdio: ['ignore','pipe','pipe'] });
    let stdout=''; let stderr='';
    const timer=setTimeout(()=>{proc.kill('SIGKILL');reject(new Error('Media stream inspection timed out.'));},10000);
    proc.stdout.on('data',data=>stdout+=data.toString()); proc.stderr.on('data',data=>stderr+=data.toString());
    proc.on('close',code=>{clearTimeout(timer);if(code===0)resolve(stdout.trim()==='audio');else reject(new Error(`Could not inspect media streams: ${stderr.slice(-300)}`));});
    proc.on('error',error=>{clearTimeout(timer);reject(error);});
  });
}

// Handle media operations
async function handleMediaOperation(body) {
  const { operation, options = {}, inputBase64, inputsBase64, inputName = 'input.mp4' } = body;
  const tempDir = path.join(os.tmpdir(), `scraft_${crypto.randomUUID()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    let inputExt = path.extname(inputName).toLowerCase() || '.mp4';
    let inputPath = path.join(tempDir, `input${inputExt}`);

    if (inputBase64) {
      fs.writeFileSync(inputPath, Buffer.from(inputBase64, 'base64'));
    }

    let outputPath = '';
    let outputExt = '';
    let outputMime = '';
    let ffmpegArgs = [];

    switch (operation) {
      case 'trim-video': {
        outputExt = inputExt;
        outputPath = path.join(tempDir, `trimmed${outputExt}`);
        outputMime = inputExt === '.webm' ? 'video/webm' : 'video/mp4';
        const start = options.start || 0;
        const duration = (options.end || 10) - start;
        ffmpegArgs = [
          '-y',
          '-ss', String(start),
          '-i', inputPath,
          '-t', String(duration),
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-movflags', '+faststart',
          '-c:a', 'aac',
          '-preset', 'fast',
          outputPath
        ];
        break;
      }

      case 'compress-video': {
        outputExt = '.mp4';
        outputPath = path.join(tempDir, `compressed.mp4`);
        outputMime = 'video/mp4';
        const crf = options.quality === 'low' ? '32' : options.quality === 'medium' ? '28' : '23';
        const hasAudio = await probeHasAudio(inputPath);
        ffmpegArgs = [
          '-y',
          '-i', inputPath,
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-movflags', '+faststart',
          '-crf', crf,
          '-preset', 'fast'
        ];
        if (hasAudio) ffmpegArgs.push('-c:a', 'aac', '-b:a', '128k');
        else ffmpegArgs.push('-an');
        ffmpegArgs.push(outputPath);
        break;
      }

      case 'crop-video': {
        outputExt = '.mp4';
        outputPath = path.join(tempDir, `cropped.mp4`);
        outputMime = 'video/mp4';
        // options: { aspect: '1:1' | '16:9' | '4:3' | '9:16' }
        let cropFilter = 'crop=min(iw\\,ih):min(iw\\,ih)'; // 1:1 default
        if (options.aspect === '16:9') {
          cropFilter = 'crop=if(gte(iw/ih\\,16/9)\\,trunc(ih*16/9/2)*2\\,iw):if(gte(iw/ih\\,16/9)\\,ih\\,trunc(iw*9/16/2)*2)';
        } else if (options.aspect === '4:3') {
          cropFilter = 'crop=if(gte(iw/ih\\,4/3)\\,trunc(ih*4/3/2)*2\\,iw):if(gte(iw/ih\\,4/3)\\,ih\\,trunc(iw*3/4/2)*2)';
        } else if (options.aspect === '9:16') {
          cropFilter = 'crop=if(gte(iw/ih\\,9/16)\\,trunc(ih*9/16/2)*2\\,iw):if(gte(iw/ih\\,9/16)\\,ih\\,trunc(iw*16/9/2)*2)';
        }
        const hasAudio = await probeHasAudio(inputPath);
        ffmpegArgs = [
          '-y',
          '-i', inputPath,
          '-vf', cropFilter,
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-movflags', '+faststart',
          '-preset', 'fast'
        ];
        if (hasAudio) ffmpegArgs.push('-c:a', 'copy');
        else ffmpegArgs.push('-an');
        ffmpegArgs.push(outputPath);
        break;
      }

      case 'resize-video': {
        outputExt = '.mp4';
        outputPath = path.join(tempDir, `resized.mp4`);
        outputMime = 'video/mp4';
        const w = options.width || 1280;
        const h = options.height || 720;
        // Make sure dimensions are even for H.264
        const evenW = Math.floor(w / 2) * 2;
        const evenH = Math.floor(h / 2) * 2;
        const hasAudio = await probeHasAudio(inputPath);
        ffmpegArgs = [
          '-y',
          '-i', inputPath,
          '-vf', `scale=${evenW}:${evenH}`,
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-movflags', '+faststart',
          '-preset', 'fast'
        ];
        if (hasAudio) ffmpegArgs.push('-c:a', 'copy');
        else ffmpegArgs.push('-an');
        ffmpegArgs.push(outputPath);
        break;
      }

      case 'rotate-video': {
        outputExt = '.mp4';
        outputPath = path.join(tempDir, `rotated.mp4`);
        outputMime = 'video/mp4';
        let vf = 'transpose=1'; // 90 CW
        if (options.angle === 180) vf = 'transpose=2,transpose=2';
        if (options.angle === 270) vf = 'transpose=2'; // 90 CCW
        if (options.flip === 'horizontal') vf = 'hflip';
        if (options.flip === 'vertical') vf = 'vflip';
        const hasAudio = await probeHasAudio(inputPath);
        ffmpegArgs = [
          '-y',
          '-i', inputPath,
          '-vf', vf,
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-movflags', '+faststart',
          '-preset', 'fast'
        ];
        if (hasAudio) ffmpegArgs.push('-c:a', 'copy');
        else ffmpegArgs.push('-an');
        ffmpegArgs.push(outputPath);
        break;
      }

      case 'speed-video': {
        const speed = Math.max(0.5, Math.min(2, Number(options.speed) || 1.5));
        outputExt='.mp4'; outputPath=path.join(tempDir,'speed.mp4'); outputMime='video/mp4';
        const hasAudio=await probeHasAudio(inputPath);
        ffmpegArgs=['-y','-i',inputPath,'-vf',`setpts=PTS/${speed}`,'-c:v','libx264','-preset','fast'];
        if(hasAudio) ffmpegArgs.push('-af',`atempo=${speed}`,'-c:a','aac'); else ffmpegArgs.push('-an');
        ffmpegArgs.push(outputPath);
        break;
      }

      case 'extract-audio': {
        const hasAudio = await probeHasAudio(inputPath);
        if (!hasAudio) {
          throw new Error('This video file has no audio stream to extract.');
        }
        const fmt = (options.format || 'mp3').toLowerCase();
        outputExt = `.${fmt}`;
        outputPath = path.join(tempDir, `extracted${outputExt}`);
        outputMime = fmt === 'wav' ? 'audio/wav' : fmt === 'aac' ? 'audio/aac' : 'audio/mpeg';
        const codec = fmt === 'wav' ? 'pcm_s16le' : fmt === 'aac' ? 'aac' : 'libmp3lame';
        ffmpegArgs = [
          '-y',
          '-i', inputPath,
          '-vn',
          '-c:a', codec,
          outputPath
        ];
        break;
      }

      case 'mute-video': {
        outputExt = '.mp4';
        outputPath = path.join(tempDir, `muted.mp4`);
        outputMime = 'video/mp4';
        ffmpegArgs = [
          '-y',
          '-i', inputPath,
          '-an',
          '-c:v', 'copy',
          outputPath
        ];
        break;
      }

      case 'convert-video': {
        const fmt = (options.format || 'mp4').toLowerCase();
        outputExt = `.${fmt}`;
        outputPath = path.join(tempDir, `converted${outputExt}`);
        outputMime = fmt === 'webm' ? 'video/webm' : fmt === 'mov' ? 'video/quicktime' : 'video/mp4';
        const vcodec = fmt === 'webm' ? 'libvpx-vp9' : 'libx264';
        const acodec = fmt === 'webm' ? 'libopus' : 'aac';
        ffmpegArgs = [
          '-y',
          '-i', inputPath,
          '-c:v', vcodec,
          '-preset', 'fast',
          '-c:a', acodec,
          outputPath
        ];
        break;
      }

      case 'merge-videos': {
        if (!inputsBase64 || inputsBase64.length < 2) {
          throw new Error('Merging requires at least two video inputs');
        }
        outputExt = '.mp4';
        outputPath = path.join(tempDir, `merged.mp4`);
        outputMime = 'video/mp4';

        const listFilePath = path.join(tempDir, 'concat_list.txt');
        let listContent = '';
        inputsBase64.forEach((b64, idx) => {
          const partPath = path.join(tempDir, `part_${idx}.mp4`);
          fs.writeFileSync(partPath, Buffer.from(b64, 'base64'));
          listContent += `file '${partPath}'\n`;
        });
        fs.writeFileSync(listFilePath, listContent);

        ffmpegArgs = [
          '-y',
          '-f', 'concat',
          '-safe', '0',
          '-i', listFilePath,
          '-c', 'copy',
          outputPath
        ];
        break;
      }

      case 'trim-audio': {
        outputExt = inputExt || '.mp3';
        outputPath = path.join(tempDir, `trimmed${outputExt}`);
        outputMime = inputExt === '.wav' ? 'audio/wav' : 'audio/mpeg';
        const start = options.start || 0;
        const duration = (options.end || 10) - start;
        ffmpegArgs = [
          '-y',
          '-ss', String(start),
          '-i', inputPath,
          '-t', String(duration),
          '-c', 'copy',
          outputPath
        ];
        break;
      }

      case 'merge-audio': {
        if (!inputsBase64 || inputsBase64.length < 2) {
          throw new Error('Merging requires at least two audio inputs');
        }
        outputExt = '.mp3';
        outputPath = path.join(tempDir, `merged.mp3`);
        outputMime = 'audio/mpeg';

        const listFilePath = path.join(tempDir, 'concat_audio.txt');
        let listContent = '';
        inputsBase64.forEach((b64, idx) => {
          const partPath = path.join(tempDir, `audio_${idx}.mp3`);
          fs.writeFileSync(partPath, Buffer.from(b64, 'base64'));
          listContent += `file '${partPath}'\n`;
        });
        fs.writeFileSync(listFilePath, listContent);

        ffmpegArgs = [
          '-y',
          '-f', 'concat',
          '-safe', '0',
          '-i', listFilePath,
          '-c:a', 'libmp3lame',
          outputPath
        ];
        break;
      }

      case 'loop-audio': {
        outputExt = '.mp3';
        outputPath = path.join(tempDir, `looped.mp3`);
        outputMime = 'audio/mpeg';
        const count = Math.max(1, Math.min(20, options.count || 2));
        ffmpegArgs = [
          '-y',
          '-stream_loop', String(count - 1),
          '-i', inputPath,
          '-c', 'copy',
          outputPath
        ];
        break;
      }

      case 'speed-audio': {
        outputExt = '.mp3';
        outputPath = path.join(tempDir, `speed.mp3`);
        outputMime = 'audio/mpeg';
        const speed = Math.max(0.5, Math.min(2.0, options.speed || 1.25));
        ffmpegArgs = [
          '-y',
          '-i', inputPath,
          '-filter:a', `atempo=${speed}`,
          '-c:a', 'libmp3lame',
          outputPath
        ];
        break;
      }

      case 'volume-audio': {
        outputExt = '.mp3';
        outputPath = path.join(tempDir, `volume.mp3`);
        outputMime = 'audio/mpeg';
        const vol = Math.max(0, Math.min(300, options.volume || 150)) / 100;
        ffmpegArgs = [
          '-y',
          '-i', inputPath,
          '-filter:a', `volume=${vol}`,
          '-c:a', 'libmp3lame',
          outputPath
        ];
        break;
      }

      case 'convert-audio': {
        const fmt = (options.format || 'mp3').toLowerCase();
        outputExt = `.${fmt}`;
        outputPath = path.join(tempDir, `converted${outputExt}`);
        outputMime = fmt === 'wav' ? 'audio/wav' : fmt === 'aac' ? 'audio/aac' : fmt === 'ogg' ? 'audio/ogg' : 'audio/mpeg';
        const codec = fmt === 'wav' ? 'pcm_s16le' : fmt === 'aac' ? 'aac' : fmt === 'ogg' ? 'libvorbis' : 'libmp3lame';
        ffmpegArgs = [
          '-y',
          '-i', inputPath,
          '-c:a', codec,
          outputPath
        ];
        break;
      }

      case 'compress-audio': {
        outputExt = '.mp3';
        outputPath = path.join(tempDir, `compressed.mp3`);
        outputMime = 'audio/mpeg';
        const bitrate = options.bitrate || '128k';
        ffmpegArgs = [
          '-y',
          '-i', inputPath,
          '-c:a', 'libmp3lame',
          '-b:a', bitrate,
          outputPath
        ];
        break;
      }

      case 'fade-audio': {
        outputExt = '.mp3';
        outputPath = path.join(tempDir, `faded.mp3`);
        outputMime = 'audio/mpeg';
        const fadeIn = options.fadeIn || 2;
        const fadeOut = options.fadeOut || 2;
        const dur = options.duration || 10;
        const startFadeOut = Math.max(0, dur - fadeOut);
        ffmpegArgs = [
          '-y',
          '-i', inputPath,
          '-af', `afade=t=in:ss=0:d=${fadeIn},afade=t=out:st=${startFadeOut}:d=${fadeOut}`,
          '-c:a', 'libmp3lame',
          outputPath
        ];
        break;
      }

      case 'denoise-audio': {
        outputExt='.mp3'; outputPath=path.join(tempDir,'denoised.mp3'); outputMime='audio/mpeg';
        const strength=options.strength==='light'?6:options.strength==='strong'?16:10;
        ffmpegArgs=['-y','-i',inputPath,'-vn','-af',`afftdn=nr=${strength}:nf=-40`,'-c:a','libmp3lame','-b:a','192k',outputPath];
        break;
      }

      default:
        throw new Error(`Unsupported media operation: ${operation}`);
    }

    // Run the operation locally
    if (['compress-video', 'trim-video', 'crop-video', 'resize-video', 'speed-video', 'rotate-video'].includes(operation)) {
      ffmpegArgs.splice(ffmpegArgs.length - 1, 0, '-fpsmax', '60');
    }
    await runFFmpeg(ffmpegArgs);

    if (!fs.existsSync(outputPath)) {
      throw new Error('Output file was not generated by FFmpeg');
    }

    const outputBuffer = fs.readFileSync(outputPath);
    const outputBase64 = outputBuffer.toString('base64');
    const outFileName = `${path.parse(inputName).name}_${operation}${outputExt}`;

    return {
      success: true,
      outputBase64,
      mimeType: outputMime,
      fileName: outFileName,
      size: outputBuffer.length
    };
  } finally {
    // Immediate cleanup of temporary directory and files
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}

// Read JSON body helper
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 500 * 1024 * 1024) { // 500 MB limit
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// Request dispatcher
async function handleRequest(req, res) {
  const urlObj = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
  const pathname = urlObj.pathname;

  // Set privacy headers (no-cache, security, sameorigin frame embedding)
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  // Loopback is reachable from a browser tab on another site. Restrict API
  // access to the local host and reject cross-site requests, including simple
  // text/plain form submissions that bypass CORS preflight.
  if (pathname.startsWith('/api/')) {
    const localHost = urlObj.hostname === '127.0.0.1' || urlObj.hostname === 'localhost';
    let sameOrigin = true;
    if (req.headers.origin) {
      try { sameOrigin = new URL(req.headers.origin).origin === urlObj.origin; }
      catch { sameOrigin = false; }
    }
    const crossSite = req.headers['sec-fetch-site'] === 'cross-site';
    const jsonPost = req.method !== 'POST' || /^application\/json(?:\s*;|\s*$)/i.test(req.headers['content-type'] || '');
    if (!localHost || !sameOrigin || crossSite || !jsonPost) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Request not allowed' }));
      return;
    }
  }

  // Media API endpoints
  if (pathname === '/api/media/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      available: !!FFMPEG_BIN,
      binaryPath: FFMPEG_BIN,
      platform: os.platform(),
      arch: os.arch()
    }));
    return;
  }

  if (pathname === '/api/media/process' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const result = await handleMediaOperation(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: err.message || 'Media processing error'
      }));
    }
    return;
  }

  if (pathname === '/api/default-save-location' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      downloadsDir: path.join(os.homedir(), 'Downloads'),
      desktopDir: path.join(os.homedir(), 'Desktop')
    }));
    return;
  }

  if (pathname === '/api/save-to-disk' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const { base64Data, filename, targetDirectory } = body;
      if (!base64Data || !filename) {
        throw new Error('Missing base64Data or filename');
      }

      let dir = targetDirectory ? targetDirectory.replace(/^~(?=$|\/|\\)/, os.homedir()) : path.join(os.homedir(), 'Downloads');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const safeName = path.basename(filename).replace(/[/\\?%*:|"<>]/g, '_');
      const targetPath = path.join(dir, safeName);
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(targetPath, buffer);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        path: targetPath,
        filename: safeName,
        directory: dir,
        size: buffer.length
      }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  if (pathname === '/api/reveal-in-finder' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const targetPath = body.path ? body.path.replace(/^~(?=$|\/|\\)/, os.homedir()) : null;
      if (targetPath && fs.existsSync(targetPath)) {
        spawn('open', ['-R', targetPath]);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // Static file serving
  if (req.method === 'GET' || req.method === 'HEAD') {
    let safePath = pathname === '/' ? '/index.html' : pathname;
    safePath = path.normalize(safePath).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(PUBLIC_DIR, safePath);

    // Ensure the file is inside the public folder
    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Access Denied');
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': mime,
        'Content-Length': stats.size
      });

      if (req.method === 'HEAD') {
        res.end();
        return;
      }

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    });
    return;
  }

  res.writeHead(405, { 'Content-Type': 'text/plain' });
  res.end('Method Not Allowed');
}

// Watch parent process if requested (for standalone desktop wrapper app)
if (process.argv.includes('--watch-parent')) {
  const ppid = process.ppid;
  setInterval(() => {
    try {
      if (process.ppid !== ppid || ppid === 1) {
        process.exit(0);
      }
      process.kill(ppid, 0);
    } catch {
      process.exit(0);
    }
  }, 1000).unref();
}

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

// Start local server with automatic port retry
function startServer(initialPort = parseInt(process.env.PORT || process.argv.find(a => /^\d+$/.test(a)), 10) || 3300, maxTries = 10) {
  let port = initialPort;
  let attempts = 0;

  function tryListen() {
    const server = http.createServer(handleRequest);

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        attempts++;
        if (attempts < maxTries) {
          port++;
          tryListen();
        } else {
          console.error(`Error: Could not bind to any port between ${initialPort} and ${port}.`);
          process.exit(1);
        }
      } else {
        console.error('Server error:', err);
        process.exit(1);
      }
    });

    server.once('listening', () => {
      console.log('==================================================');
      console.log('   S-Craft Tools — Simple tools. Your files stay local.');
      console.log('==================================================');
      console.log(`READY: {"port": ${port}}`);
      console.log(`✓ Running locally at: http://127.0.0.1:${port}`);
      console.log(`✓ Local loopback: 127.0.0.1 only (private & safe)`);
      console.log(`✓ Local FFmpeg: ${FFMPEG_BIN ? FFMPEG_BIN : 'Not detected'}`);
      console.log(`✓ Offline runtime active — zero external calls`);
      console.log('Press Ctrl+C to stop the server.\n');
    });

    // Strictly bind to 127.0.0.1
    server.listen(port, '127.0.0.1');
  }

  tryListen();
}

startServer();
