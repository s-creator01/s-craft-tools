let localApp;
export function isLocalApp() {
  if (!['localhost', '127.0.0.1'].includes(location.hostname)) return Promise.resolve(false);
  localApp ??= fetch('/api/media/status').then(async (response) => {
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return false;
    return typeof (await response.json()).available === 'boolean';
  }).catch(() => false);
  return localApp;
}

// S Craft — Shared UI & File Utilities (100% Client-Side)

export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function showToast(message, duration = 3000) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'all 0.2s ease-out';
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

let activeSavePromiseResolve = null;

async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function downloadBlob(blobOrUrl, filename) {
  const defaultName = filename || 'scraft_export';

  // Resolve Blob instance
  let blob = blobOrUrl;
  if (typeof blobOrUrl === 'string') {
    try {
      const resp = await fetch(blobOrUrl);
      blob = await resp.blob();
    } catch {
      blob = new Blob([blobOrUrl], { type: 'application/octet-stream' });
    }
  }

  const modal = document.getElementById('saveFileModal');
  if (!modal) {
    // Fallback if modal DOM element is not mounted
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return;
  }

  // Pre-fill modal fields
  const nameInput = document.getElementById('saveFileNameInput');
  const locationDisplay = document.getElementById('saveLocationDisplay');
  const sizeMeta = document.getElementById('saveFileSizeMeta');
  const typeMeta = document.getElementById('saveFileTypeMeta');
  const changeBtn = document.getElementById('btnChangeSaveLocation');
  const useLocalApp = await isLocalApp();
  changeBtn.style.display = useLocalApp ? 'inline-flex' : 'none';
  const confirmBtn = document.getElementById('btnConfirmSaveFile');
  const cancelBtn = document.getElementById('btnCancelSaveModal');
  const closeBtn = document.getElementById('closeSaveModalBtn');

  nameInput.value = defaultName;
  sizeMeta.textContent = `Size: ${formatBytes(blob.size)}`;

  const ext = defaultName.includes('.') ? defaultName.slice(defaultName.lastIndexOf('.')) : '';
  const baseName = ext ? defaultName.slice(0, defaultName.lastIndexOf('.')) : defaultName;
  typeMeta.textContent = `Format: ${ext.replace('.', '').toUpperCase() || 'File'}`;

  let currentDir = localStorage.getItem('scraft_save_directory') || '~/Downloads';
  locationDisplay.textContent = useLocalApp ? currentDir : 'Browser downloads';
  locationDisplay.title = locationDisplay.textContent;

  modal.classList.add('open');
  modal.classList.add('show');
  modal.style.display = 'grid';
  modal.setAttribute('aria-hidden', 'false');

  // Focus and pre-select base name
  setTimeout(() => {
    nameInput.focus();
    if (ext) {
      nameInput.setSelectionRange(0, baseName.length);
    } else {
      nameInput.select();
    }
  }, 100);

  // Native folder selection hook
  window.onNativeFolderChosen = (chosenPath) => {
    if (chosenPath) {
      currentDir = chosenPath;
      locationDisplay.textContent = currentDir;
      locationDisplay.title = currentDir;
      localStorage.setItem('scraft_save_directory', currentDir);
    }
  };

  const closeModal = () => {
    modal.classList.remove('open');
    modal.classList.remove('show');
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    cleanupListeners();
  };

  const handleChangeFolder = () => {
    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeBridge) {
      window.webkit.messageHandlers.nativeBridge.postMessage({
        action: 'chooseFolder',
        current: currentDir
      });
    } else {
      const prompted = prompt('Enter destination directory path on your Mac:', currentDir);
      if (prompted && prompted.trim()) {
        currentDir = prompted.trim();
        locationDisplay.textContent = currentDir;
        locationDisplay.title = currentDir;
        localStorage.setItem('scraft_save_directory', currentDir);
      }
    }
  };

  const handleConfirmSave = async () => {
    let finalName = nameInput.value.trim();
    if (!finalName) finalName = defaultName;
    if (ext && !finalName.toLowerCase().endsWith(ext.toLowerCase())) {
      finalName += ext;
    }

    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Saving...';

    try {
      if (useLocalApp) {
        const base64Data = await blobToBase64(blob);

        // Attempt 1: Direct save via local backend server
        const saveResp = await fetch('/api/save-to-disk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data,
            filename: finalName,
            targetDirectory: currentDir
          })
        });

        const resJson = await saveResp.json();
        if (resJson && resJson.success) {
          closeModal();
          showToast(`✓ Saved: ${resJson.filename} in ${currentDir.replace(/^.*[\\\/]/, '')}`);
          return;
        }

        // Attempt 2: Native bridge save if backend call failed
        if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeBridge) {
          window.webkit.messageHandlers.nativeBridge.postMessage({
            action: 'saveFileModal',
            filename: finalName,
            base64: base64Data
          });
          closeModal();
          return;
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = finalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      closeModal();
      showToast(`✓ Downloaded ${finalName}`);
    } catch (err) {
      // Standard browser download fallback
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = finalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      closeModal();
      showToast(`Saved ${finalName}`);
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = `Save File`;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Enter' && e.target === nameInput) handleConfirmSave();
  };

  function cleanupListeners() {
    changeBtn.removeEventListener('click', handleChangeFolder);
    confirmBtn.removeEventListener('click', handleConfirmSave);
    cancelBtn.removeEventListener('click', closeModal);
    closeBtn.removeEventListener('click', closeModal);
    document.removeEventListener('keydown', handleKeyDown);
  }

  changeBtn.addEventListener('click', handleChangeFolder);
  confirmBtn.addEventListener('click', handleConfirmSave);
  cancelBtn.addEventListener('click', closeModal);
  closeBtn.addEventListener('click', closeModal);
  document.addEventListener('keydown', handleKeyDown);
}

export function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file as data URL'));
    reader.readAsDataURL(file);
  });
}

export function loadImage(srcOrBlob, options = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const isBlob = srcOrBlob instanceof Blob;
    const url = isBlob ? URL.createObjectURL(srcOrBlob) : srcOrBlob;
    if (isBlob && options.retainUrl) img._sCraftObjectUrl = url;

    img.onload = () => {
      if (isBlob && !options.retainUrl) URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      if (isBlob) URL.revokeObjectURL(url);
      reject(new Error('Failed to load image element'));
    };
    img.src = url;
  });
}

export function releaseImage(img) {
  if (img && img._sCraftObjectUrl) {
    URL.revokeObjectURL(img._sCraftObjectUrl);
    img._sCraftObjectUrl = null;
  }
}

export function setupDropzone(dropEl, onFiles, options = {}) {
  const input = dropEl.querySelector('input[type="file"]');
  const multiple = !!options.multiple;
  const accept = options.accept || '*/*';

  if (input) {
    input.multiple = multiple;
    input.accept = accept;
    input.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        onFiles(Array.from(e.target.files));
      }
    });

    dropEl.addEventListener('click', (e) => {
      if (e.target !== input) {
        input.click();
      }
    });
  }

  ['dragenter', 'dragover'].forEach(name => {
    dropEl.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropEl.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    dropEl.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropEl.classList.remove('dragover');
    });
  });

  dropEl.addEventListener('drop', (e) => {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFiles(Array.from(e.dataTransfer.files));
    }
  });
}
