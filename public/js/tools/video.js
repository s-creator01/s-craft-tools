import { processBrowserMedia } from './browser-media.js';
import { isLocalApp } from '../ui-utils.js';
// S-Craft Tools — Video Tools Client Engine
// Connects to local loopback helper (127.0.0.1) for hardware-accelerated offline FFmpeg operations

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read media file'));
    reader.readAsDataURL(file);
  });
}

async function readMediaResponse(response) {
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Audio and video tools require the local S-Craft Tools app. Start it with npm start.');
  }
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Local media operation failed');
  }
  return result;
}

async function callLocalMediaApi(operation, file, options = {}, onProgress) {
  if (!await isLocalApp()) return processBrowserMedia(operation, [file], options, onProgress);
  const inputBase64 = await fileToBase64(file);
  const payload = {
    operation,
    options,
    inputBase64,
    inputName: file.name
  };

  const response = await fetch('/api/media/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const resJson = await readMediaResponse(response);

  // Convert base64 back to Blob
  const byteChars = atob(resJson.outputBase64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: resJson.mimeType });

  return {
    blob,
    size: resJson.size,
    fileName: resJson.fileName,
    mimeType: resJson.mimeType
  };
}

export async function trimVideo(file, startSec, endSec) {
  return callLocalMediaApi('trim-video', file, { start: startSec, end: endSec });
}

export async function compressVideo(file, quality = 'medium', resolution = '720', onProgress) {
  return callLocalMediaApi('compress-video', file, { quality, resolution }, onProgress);
}

export async function cropVideo(file, aspect = '1:1') {
  return callLocalMediaApi('crop-video', file, { aspect });
}

export async function resizeVideo(file, width, height) {
  return callLocalMediaApi('resize-video', file, { width, height });
}

export async function changeVideoSpeed(file, speed = 1.5) {
  return callLocalMediaApi('speed-video', file, { speed });
}

export async function rotateVideo(file, angle = 90, flip = 'none') {
  return callLocalMediaApi('rotate-video', file, { angle, flip });
}

export async function extractAudioFromVideo(file, format = 'mp3') {
  return callLocalMediaApi('extract-audio', file, { format });
}

export async function muteVideo(file) {
  return callLocalMediaApi('mute-video', file);
}

export async function convertVideo(file, format = 'mp4') {
  return callLocalMediaApi('convert-video', file, { format });
}

export async function mergeVideos(files) {
  if (!await isLocalApp()) return processBrowserMedia('merge-videos', files);
  const inputsBase64 = [];
  for (const f of files) {
    inputsBase64.push(await fileToBase64(f));
  }

  const payload = {
    operation: 'merge-videos',
    inputsBase64,
    inputName: files[0].name
  };

  const response = await fetch('/api/media/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const resJson = await readMediaResponse(response);

  const byteChars = atob(resJson.outputBase64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: resJson.mimeType });

  return {
    blob,
    size: resJson.size,
    fileName: resJson.fileName
  };
}
