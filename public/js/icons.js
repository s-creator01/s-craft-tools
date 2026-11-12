// S Craft — Outline Icons Bundle (Clean 1.5px SVG paths, 100% offline)

const iconPaths = {
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3z"/>',
  pdf: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  image: '<rect x="2" y="3" width="20" height="18" rx="3"/><circle cx="8" cy="9" r="2"/><path d="m3 18 6-6 4 4 3-3 5 5"/>',
  text: '<path d="M4 6V4h16v2M12 4v16m-5 0h10"/>',
  video: '<rect x="2" y="5" width="15" height="14" rx="2"/><path d="m17 10 5-3v10l-5-3"/>',
  audio: '<path d="M2 10v4m4-8v12m4-16v20m4-15v10m4-13v16m4-10v4"/>',
  time: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  number: '<rect x="3" y="2" width="18" height="20" rx="2"/><path d="M7 7h10M8 12h1m6 0h1m-8 5h1m6 0h1"/>',
  resize: '<path d="M8 3H3v5m13 13h5v-5M3 3l7 7m11 11-7-7"/>',
  compress: '<path d="M4 10h6V4M20 14h-6v6M10 4 4 10m10 10 6-6"/>',
  crop: '<path d="M6 2v15a2 2 0 0 0 2 2h14M2 6h15a2 2 0 0 1 2 2v14"/>',
  convert: '<path d="M4 7h13l-4-4m4 4-4 4M20 17H7l4-4m-4 4 4 4"/>',
  signature: '<path d="M3 20c3-8 5-14 7-14 4 0-4 15 0 14 3 0 5-8 7-8 2 0-1 7 4 7"/>',
  merge: '<rect x="3" y="3" width="13" height="15" rx="2"/><path d="M8 21h11a2 2 0 0 0 2-2V8"/>',
  split: '<circle cx="6" cy="7" r="3"/><circle cx="6" cy="17" r="3"/><path d="m9 9 12 12M9 15 21 3"/>',
  watermark: '<path d="M12 3c-2 4-6 8-6 12a6 6 0 0 0 12 0c0-4-4-8-6-12Z"/>',
  rotate: '<path d="M3 11a9 9 0 1 1 3 7M3 4v7h7"/>',
  background: '<rect x="2" y="3" width="20" height="18" rx="3"/><path d="m3 18 6-6 4 4 3-3 5 5"/><path d="M18 1v6m-3-3h6"/>',
  cut: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8 8 20 20M8 16 20 4"/>',
  volume: '<path d="M4 9v6h4l5 4V5L8 9H4m13-1a5 5 0 0 1 0 8"/>',
  calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M7 7h10M8 12h1m6 0h1m-8 5h1m6 0h1"/>',
  play: '<path d="m8 5 11 7-11 7z"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  unlock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  sun: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  common: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 9h8m-8 5h8"/>'
};

export function getIcon(name, size = 20) {
  const path = iconPaths[name] || iconPaths.common;
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}
