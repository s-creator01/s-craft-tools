import { processBrowserMedia } from './browser-media.js';
import { isLocalApp } from '../ui-utils.js';
// S-Craft Tools — Audio Tools Client Engine
// Connects to local loopback helper (127.0.0.1) for offline FFmpeg operations
import { extractAudioFromVideo } from './video.js';

export { extractAudioFromVideo };

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read audio file'));
    reader.readAsDataURL(file);
  });
}

async function readMediaResponse(response) {
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Audio and video tools require the local S-Craft Tools app. Start it with npm start.');
  }
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Local audio operation failed');
  }
  return result;
}

async function callLocalAudioApi(operation, file, options = {}) {
  if (!await isLocalApp()) return processBrowserMedia(operation, [file], options);
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

export async function trimAudio(file, startSec, endSec) {
  return callLocalAudioApi('trim-audio', file, { start: startSec, end: endSec });
}

export async function loopAudio(file, count = 2) {
  return callLocalAudioApi('loop-audio', file, { count });
}

export async function changeAudioSpeed(file, speed = 1.25) {
  return callLocalAudioApi('speed-audio', file, { speed });
}

export async function adjustAudioVolume(file, volumePercent = 150) {
  return callLocalAudioApi('volume-audio', file, { volume: volumePercent });
}

export async function convertAudio(file, format = 'mp3') {
  return callLocalAudioApi('convert-audio', file, { format });
}

export async function compressAudio(file, bitrate = '128k') {
  return callLocalAudioApi('compress-audio', file, { bitrate });
}

export async function fadeAudio(file, fadeIn = 2, fadeOut = 2, duration = 10) {
  return callLocalAudioApi('fade-audio', file, { fadeIn, fadeOut, duration });
}

export async function reduceAudioNoise(file, strength = 'normal') {
  return callLocalAudioApi('denoise-audio', file, { strength });
}

export async function mergeAudio(files) {
  if (!await isLocalApp()) return processBrowserMedia('merge-audio', files);
  const inputsBase64 = [];
  for (const f of files) {
    inputsBase64.push(await fileToBase64(f));
  }

  const payload = {
    operation: 'merge-audio',
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
