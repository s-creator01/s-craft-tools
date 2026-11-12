// S Craft — High-Fidelity Video & Audio Preview Components (100% Offline)
import { formatBytes } from './ui-utils.js';

function formatTimecode(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00.0';
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  return `${mins.toString().padStart(2, '0')}:${secs.padStart(4, '0')}`;
}

/**
 * Mounts an interactive video preview player with metadata and trim scrub controls.
 * @param {HTMLElement} container
 * @param {File|Blob} fileOrBlob
 * @param {object} [options]
 */
export function mountVideoPreview(container, fileOrBlob, options = {}) {
  const url = URL.createObjectURL(fileOrBlob);
  const filename = fileOrBlob.name || 'video_clip.mp4';
  const initialStart = options.initialStart || 0;
  const initialEnd = options.initialEnd || 10;

  container.innerHTML = `
    <div class="media-preview-box">
      <div style="position:relative;width:100%;display:flex;justify-content:center;background:#000;border-radius:6px;overflow:hidden;">
        <video id="videoPreviewElement" class="video-player-element" controls playsinline src="${url}"></video>
        ${options.cropAspect ? `
          <div id="videoCropGuide" style="position:absolute;top:0;bottom:0;border:2px dashed #3B82F6;pointer-events:none;background:rgba(59,130,246,0.1);"></div>
        ` : ''}
      </div>

      <div class="media-meta-bar">
        <span class="media-meta-tag"><strong>${filename}</strong></span>
        <span class="media-meta-tag" id="vidResTag">-- &times; --</span>
        <span class="media-meta-tag" id="vidDurTag">--:--</span>
        <span class="media-meta-tag">${formatBytes(fileOrBlob.size)}</span>
      </div>

      ${options.showTrimControls ? `
        <div class="media-trim-panel">
          <div class="media-trim-times">
            <span>Trim Window: <strong id="trimWindowLabel">0.0s &ndash; 10.0s</strong></span>
            <span style="color:var(--primary);font-weight:700;" id="trimLengthLabel">Length: 10.0s</span>
          </div>

          <div class="input-group-grid" style="margin-top:4px;">
            <div class="opt-row">
              <label class="opt-label" for="vidTrimStartSlider">Start Time (sec)</label>
              <input type="range" id="vidTrimStartSlider" min="0" max="100" step="0.1" value="${initialStart}">
              <div style="display:flex;gap:6px;margin-top:4px;">
                <input type="number" id="vidTrimStartNum" class="opt-input" style="width:80px;" min="0" step="0.1" value="${initialStart}">
                <button class="viewer-tool-btn" id="btnVidSetStart" style="font-size:11px;">Set to Playhead</button>
              </div>
            </div>

            <div class="opt-row">
              <label class="opt-label" for="vidTrimEndSlider">End Time (sec)</label>
              <input type="range" id="vidTrimEndSlider" min="0" max="100" step="0.1" value="${initialEnd}">
              <div style="display:flex;gap:6px;margin-top:4px;">
                <input type="number" id="vidTrimEndNum" class="opt-input" style="width:80px;" min="0" step="0.1" value="${initialEnd}">
                <button class="viewer-tool-btn" id="btnVidSetEnd" style="font-size:11px;">Set to Playhead</button>
              </div>
            </div>
          </div>
        </div>
      ` : ''}
    </div>
  `;

  const video = container.querySelector('#videoPreviewElement');
  const resTag = container.querySelector('#vidResTag');
  const durTag = container.querySelector('#vidDurTag');

  let duration = 0;
  let trimStart = initialStart;
  let trimEnd = initialEnd;

  video.addEventListener('loadedmetadata', () => {
    duration = video.duration || 0;
    resTag.innerHTML = `<strong>${video.videoWidth}&times;${video.videoHeight}</strong> px`;
    durTag.innerHTML = `<strong>${formatTimecode(duration)}</strong>`;

    if (options.showTrimControls) {
      const sliderStart = container.querySelector('#vidTrimStartSlider');
      const sliderEnd = container.querySelector('#vidTrimEndSlider');
      const numStart = container.querySelector('#vidTrimStartNum');
      const numEnd = container.querySelector('#vidTrimEndNum');

      sliderStart.max = duration;
      sliderEnd.max = duration;
      numStart.max = duration;
      numEnd.max = duration;

      if (trimEnd > duration || trimEnd === 10) {
        trimEnd = Math.min(duration, Math.max(1, duration));
        sliderEnd.value = trimEnd;
        numEnd.value = trimEnd.toFixed(1);
      }
      updateTrimDisplay();
    }

    if (options.cropAspect) {
      updateCropGuide(options.cropAspect);
    }
  });

  function updateCropGuide(aspect) {
    const guide = container.querySelector('#videoCropGuide');
    if (!guide || !video.videoWidth || !video.videoHeight) return;
    const playerW = video.clientWidth;
    const playerH = video.clientHeight;

    let targetRatio = 1;
    if (aspect === '1:1') targetRatio = 1;
    else if (aspect === '16:9') targetRatio = 16 / 9;
    else if (aspect === '9:16') targetRatio = 9 / 16;

    let guideW = playerH * targetRatio;
    let guideH = playerH;
    if (guideW > playerW) {
      guideW = playerW;
      guideH = guideW / targetRatio;
    }

    guide.style.width = `${Math.round(guideW)}px`;
    guide.style.height = `${Math.round(guideH)}px`;
    guide.style.left = `${Math.round((playerW - guideW) / 2)}px`;
    guide.style.top = `${Math.round((playerH - guideH) / 2)}px`;
  }

  function updateTrimDisplay() {
    if (!options.showTrimControls) return;
    const windowLabel = container.querySelector('#trimWindowLabel');
    const lengthLabel = container.querySelector('#trimLengthLabel');
    const length = Math.max(0, trimEnd - trimStart);

    windowLabel.textContent = `${trimStart.toFixed(1)}s – ${trimEnd.toFixed(1)}s`;
    lengthLabel.textContent = `Length: ${length.toFixed(1)}s`;

    if (options.onTrimChange) {
      options.onTrimChange(trimStart, trimEnd);
    }
  }

  if (options.showTrimControls) {
    const sliderStart = container.querySelector('#vidTrimStartSlider');
    const sliderEnd = container.querySelector('#vidTrimEndSlider');
    const numStart = container.querySelector('#vidTrimStartNum');
    const numEnd = container.querySelector('#vidTrimEndNum');
    const btnSetStart = container.querySelector('#btnVidSetStart');
    const btnSetEnd = container.querySelector('#btnVidSetEnd');

    sliderStart.addEventListener('input', () => {
      trimStart = Math.min(parseFloat(sliderStart.value), trimEnd - 0.2);
      numStart.value = trimStart.toFixed(1);
      video.currentTime = trimStart;
      updateTrimDisplay();
    });

    numStart.addEventListener('input', () => {
      const val = parseFloat(numStart.value);
      if (!isNaN(val) && val >= 0) {
        trimStart = Math.min(val, trimEnd - 0.2);
        sliderStart.value = trimStart;
        video.currentTime = trimStart;
        updateTrimDisplay();
      }
    });

    sliderEnd.addEventListener('input', () => {
      trimEnd = Math.max(parseFloat(sliderEnd.value), trimStart + 0.2);
      numEnd.value = trimEnd.toFixed(1);
      video.currentTime = trimEnd;
      updateTrimDisplay();
    });

    numEnd.addEventListener('input', () => {
      const val = parseFloat(numEnd.value);
      if (!isNaN(val) && val > trimStart) {
        trimEnd = val;
        sliderEnd.value = trimEnd;
        video.currentTime = trimEnd;
        updateTrimDisplay();
      }
    });

    btnSetStart.addEventListener('click', () => {
      trimStart = Math.min(video.currentTime, trimEnd - 0.2);
      sliderStart.value = trimStart;
      numStart.value = trimStart.toFixed(1);
      updateTrimDisplay();
    });

    btnSetEnd.addEventListener('click', () => {
      trimEnd = Math.max(video.currentTime, trimStart + 0.2);
      sliderEnd.value = trimEnd;
      numEnd.value = trimEnd.toFixed(1);
      updateTrimDisplay();
    });
  }

  if (options.rotation) {
    video.style.transform = `rotate(${options.rotation}deg)`;
    video.style.transition = 'transform 0.3s ease';
  }

  return {
    videoEl: video,
    setRotation(deg) {
      video.style.transform = `rotate(${deg}deg)`;
    },
    setCropAspect(aspect) {
      updateCropGuide(aspect);
    },
    getTrim() {
      return { start: trimStart, end: trimEnd };
    },
    destroy() {
      URL.revokeObjectURL(url);
    }
  };
}

/**
 * Mounts an interactive audio preview player with metadata and trim scrub controls.
 * @param {HTMLElement} container
 * @param {File|Blob} fileOrBlob
 * @param {object} [options]
 */
export function mountAudioPreview(container, fileOrBlob, options = {}) {
  const url = URL.createObjectURL(fileOrBlob);
  const filename = fileOrBlob.name || 'audio_track.mp3';
  const initialStart = options.initialStart || 0;
  const initialEnd = options.initialEnd || 30;

  container.innerHTML = `
    <div class="audio-preview-card">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:44px;height:44px;border-radius:8px;background:rgba(37,99,235,0.1);color:var(--primary);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
        </div>
        <div style="overflow:hidden;flex:1;">
          <div style="font-weight:650;font-size:13.5px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${filename}</div>
          <div style="font-size:11.5px;color:var(--muted);margin-top:2px;">
            <span id="audDurTag">--:--</span> &bull; <span>${formatBytes(fileOrBlob.size)}</span>
          </div>
        </div>
      </div>

      <audio id="audioPreviewElement" class="audio-player-element" controls src="${url}"></audio>

      ${options.showTrimControls ? `
        <div class="media-trim-panel" style="margin-top:4px;">
          <div class="media-trim-times">
            <span>Trim Window: <strong id="audTrimWindowLabel">0.0s &ndash; 30.0s</strong></span>
            <span style="color:var(--primary);font-weight:700;" id="audTrimLengthLabel">Length: 30.0s</span>
          </div>

          <div class="input-group-grid" style="margin-top:4px;">
            <div class="opt-row">
              <label class="opt-label" for="audTrimStartSlider">Start (sec)</label>
              <input type="range" id="audTrimStartSlider" min="0" max="100" step="0.1" value="${initialStart}">
              <div style="display:flex;gap:6px;margin-top:4px;">
                <input type="number" id="audTrimStartNum" class="opt-input" style="width:80px;" min="0" step="0.1" value="${initialStart}">
                <button class="viewer-tool-btn" id="btnAudSetStart" style="font-size:11px;">Set to Playhead</button>
              </div>
            </div>

            <div class="opt-row">
              <label class="opt-label" for="audTrimEndSlider">End (sec)</label>
              <input type="range" id="audTrimEndSlider" min="0" max="100" step="0.1" value="${initialEnd}">
              <div style="display:flex;gap:6px;margin-top:4px;">
                <input type="number" id="audTrimEndNum" class="opt-input" style="width:80px;" min="0" step="0.1" value="${initialEnd}">
                <button class="viewer-tool-btn" id="btnAudSetEnd" style="font-size:11px;">Set to Playhead</button>
              </div>
            </div>
          </div>
        </div>
      ` : ''}
    </div>
  `;

  const audio = container.querySelector('#audioPreviewElement');
  const durTag = container.querySelector('#audDurTag');

  let duration = 0;
  let trimStart = initialStart;
  let trimEnd = initialEnd;

  audio.addEventListener('loadedmetadata', () => {
    duration = audio.duration || 0;
    durTag.textContent = formatTimecode(duration);

    if (options.showTrimControls) {
      const sliderStart = container.querySelector('#audTrimStartSlider');
      const sliderEnd = container.querySelector('#audTrimEndSlider');
      const numStart = container.querySelector('#audTrimStartNum');
      const numEnd = container.querySelector('#audTrimEndNum');

      sliderStart.max = duration;
      sliderEnd.max = duration;
      numStart.max = duration;
      numEnd.max = duration;

      if (trimEnd > duration || trimEnd === 30) {
        trimEnd = Math.min(duration, Math.max(1, duration));
        sliderEnd.value = trimEnd;
        numEnd.value = trimEnd.toFixed(1);
      }
      updateTrimDisplay();
    }
  });

  function updateTrimDisplay() {
    if (!options.showTrimControls) return;
    const windowLabel = container.querySelector('#audTrimWindowLabel');
    const lengthLabel = container.querySelector('#audTrimLengthLabel');
    const length = Math.max(0, trimEnd - trimStart);

    windowLabel.textContent = `${trimStart.toFixed(1)}s – ${trimEnd.toFixed(1)}s`;
    lengthLabel.textContent = `Length: ${length.toFixed(1)}s`;

    if (options.onTrimChange) {
      options.onTrimChange(trimStart, trimEnd);
    }
  }

  if (options.showTrimControls) {
    const sliderStart = container.querySelector('#audTrimStartSlider');
    const sliderEnd = container.querySelector('#audTrimEndSlider');
    const numStart = container.querySelector('#audTrimStartNum');
    const numEnd = container.querySelector('#audTrimEndNum');
    const btnSetStart = container.querySelector('#btnAudSetStart');
    const btnSetEnd = container.querySelector('#btnAudSetEnd');

    sliderStart.addEventListener('input', () => {
      trimStart = Math.min(parseFloat(sliderStart.value), trimEnd - 0.2);
      numStart.value = trimStart.toFixed(1);
      audio.currentTime = trimStart;
      updateTrimDisplay();
    });

    numStart.addEventListener('input', () => {
      const val = parseFloat(numStart.value);
      if (!isNaN(val) && val >= 0) {
        trimStart = Math.min(val, trimEnd - 0.2);
        sliderStart.value = trimStart;
        audio.currentTime = trimStart;
        updateTrimDisplay();
      }
    });

    sliderEnd.addEventListener('input', () => {
      trimEnd = Math.max(parseFloat(sliderEnd.value), trimStart + 0.2);
      numEnd.value = trimEnd.toFixed(1);
      audio.currentTime = trimEnd;
      updateTrimDisplay();
    });

    numEnd.addEventListener('input', () => {
      const val = parseFloat(numEnd.value);
      if (!isNaN(val) && val > trimStart) {
        trimEnd = val;
        sliderEnd.value = trimEnd;
        audio.currentTime = trimEnd;
        updateTrimDisplay();
      }
    });

    btnSetStart.addEventListener('click', () => {
      trimStart = Math.min(audio.currentTime, trimEnd - 0.2);
      sliderStart.value = trimStart;
      numStart.value = trimStart.toFixed(1);
      updateTrimDisplay();
    });

    btnSetEnd.addEventListener('click', () => {
      trimEnd = Math.max(audio.currentTime, trimStart + 0.2);
      sliderEnd.value = trimEnd;
      numEnd.value = trimEnd.toFixed(1);
      updateTrimDisplay();
    });
  }

  if (options.speed) {
    audio.playbackRate = options.speed;
  }

  return {
    audioEl: audio,
    setSpeed(speed) {
      audio.playbackRate = speed;
    },
    getTrim() {
      return { start: trimStart, end: trimEnd };
    },
    destroy() {
      URL.revokeObjectURL(url);
    }
  };
}
