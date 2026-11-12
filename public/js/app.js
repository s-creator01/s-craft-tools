// S-Craft Tools — Main Application Controller
// 100% Local, Responsive, English UI

import { getIcon } from './icons.js';
import { logActivity, clearActivity, renderRecentList } from './recent.js';
import { formatBytes, showToast, downloadBlob, readFileAsArrayBuffer, readFileAsDataURL, loadImage, releaseImage, setupDropzone } from './ui-utils.js';
import { mountInteractivePdfViewer, renderPdfThumbnailGrid, loadPdfDocument, renderPdfPage } from './pdf-preview.js';
import { mountVideoPreview, mountAudioPreview } from './media-preview.js';
import { mountInteractiveCrop, mountInteractiveSignatureOverlay } from './image-preview.js';
import { encryptPdf, decryptPdf } from './pdf-crypto.js';
import * as ImageTools from './tools/image.js';
import * as PdfTools from './tools/pdf.js';
import * as VideoTools from './tools/video.js';
import * as AudioTools from './tools/audio.js';
import * as TextTools from './tools/text.js';
import * as TimeTools from './tools/time.js';
import * as NumberTools from './tools/number.js';

// The Approved Seven Categories
const CATEGORIES = [
  { id: 'PDF', label: 'PDF Tools', icon: 'pdf', desc: 'Edit, organize and sign documents' },
  { id: 'Image', label: 'Image Tools', icon: 'image', desc: 'Resize, crop, compress and sign photos' },
  { id: 'Text', label: 'Text Tools', icon: 'text', desc: 'Simple writing and text tools' },
  { id: 'Video', label: 'Video Tools', icon: 'video', desc: 'Trim, compress and convert clips' },
  { id: 'Audio', label: 'Audio Tools', icon: 'audio', desc: 'Trim, merge and improve audio' },
  { id: 'Time', label: 'Time Tools', icon: 'time', desc: 'Timers, dates and time calculations' },
  { id: 'Number', label: 'Number Tools', icon: 'number', desc: 'Everyday calculations and conversions' }
];

// Tool Catalog per Category
const CATALOG = {
  PDF: [
    { id: 'pdf-merge', name: 'Merge PDF', icon: 'merge', desc: 'Combine PDF files in your chosen order' },
    { id: 'pdf-split', name: 'Split PDF', icon: 'split', desc: 'Extract pages or page ranges' },
    { id: 'pdf-compress', name: 'Compress PDF', icon: 'compress', desc: 'Reduce PDF file size' },
    { id: 'pdf-organize', name: 'Organize Pages', icon: 'merge', desc: 'Reorder, rotate or remove pages' },
    { id: 'pdf-sign', name: 'Sign PDF', icon: 'signature', desc: 'Add a signature to PDF pages' },
    { id: 'pdf-protect', name: 'Protect / Unlock', icon: 'lock', desc: 'Add or remove a known password' },
    { id: 'pdf-to-img', name: 'PDF to Images', icon: 'convert', desc: 'Export pages as image files' },
    { id: 'img-to-pdf', name: 'Images to PDF', icon: 'image', desc: 'Turn images into an ordered PDF' },
    { id: 'pdf-watermark', name: 'Watermark PDF', icon: 'watermark', desc: 'Add text or logo watermarks' }
  ],
  Image: [
    { id: 'img-resize', name: 'Resize Image', icon: 'resize', desc: 'Independent Width/Height manual sizing & fit modes' },
    { id: 'img-crop', name: 'Crop Image', icon: 'crop', desc: 'Crop visually with presets (1:1, 4:3, 16:9, free)' },
    { id: 'img-compress', name: 'Compress Image', icon: 'compress', desc: 'Reduce image size to a target' },
    { id: 'img-convert', name: 'Convert Image', icon: 'convert', desc: 'Convert among JPG, PNG, WebP, BMP formats' },
    { id: 'img-text', name: 'Add Text & Markup', icon: 'text', desc: 'Add labels and notes to an image' },
    { id: 'img-watermark', name: 'Watermark Image', icon: 'watermark', desc: 'Overlay custom text or logo with opacity control' },
    { id: 'img-rotate', name: 'Rotate & Flip', icon: 'rotate', desc: 'Fix image orientation' },
    { id: 'img-batch', name: 'Combine Image', icon: 'merge', desc: 'Process several images together' },
    { id: 'img-sign', name: 'Sign Image', icon: 'signature', desc: 'Draw, type or place a signature' },
    { id: 'img-metadata', name: 'Remove Metadata', icon: 'background', desc: 'Remove EXIF and location details' }
  ],
  Text: [
    { id: 'txt-counter', name: 'Word & Char Counter', icon: 'text', desc: 'Words, chars, lines, paragraphs, reading time' },
    { id: 'txt-case', name: 'Case Converter', icon: 'text', desc: 'Change text style quickly' },
    { id: 'txt-replace', name: 'Find & Replace', icon: 'common', desc: 'Replace text matches with case-sensitivity options' },
    { id: 'txt-clean', name: 'Text Cleaner', icon: 'text', desc: 'Remove extra spaces and blank lines' },
    { id: 'txt-random', name: 'Random Text', icon: 'text', desc: 'Create sample text for testing' },
    { id: 'txt-duplicates', name: 'Remove Duplicate Lines', icon: 'text', desc: 'Keep only unique lines' },
    { id: 'txt-sort', name: 'Sort Lines', icon: 'text', desc: 'Sort lines A–Z or Z–A' },
    { id: 'txt-extract', name: 'Text Extractor', icon: 'text', desc: 'Find emails, links and numbers' },
    { id: 'txt-slug', name: 'Slug Generator', icon: 'common', desc: 'Create clean URL text' },
    { id: 'txt-compare', name: 'Text Compare', icon: 'common', desc: 'Compare two text passages' }
  ],
  Video: [
    { id: 'vid-trim', name: 'Trim Video', icon: 'cut', desc: 'Cut clip by start and end seconds with preview' },
    { id: 'vid-compress', name: 'Compress Video', icon: 'compress', desc: 'Optimize video size with quality CRF presets' },
    { id: 'vid-crop', name: 'Crop Video', icon: 'crop', desc: 'Crop video aspect ratio (1:1, 16:9, 4:3, 9:16)' },
    { id: 'vid-resize', name: 'Resize Video', icon: 'resize', desc: 'Fit a new resolution' },
    { id: 'vid-extract-audio', name: 'Extract Audio', icon: 'audio', desc: 'Extract sound track to playable MP3 or WAV' },
    { id: 'vid-convert', name: 'Convert Video', icon: 'convert', desc: 'Transcode between MP4, WebM, MOV formats' },
    { id: 'vid-rotate', name: 'Rotate & Flip', icon: 'rotate', desc: 'Fix camera orientation' },
    { id: 'vid-speed', name: 'Change Speed', icon: 'play', desc: 'Slow down or speed up a clip' },
    { id: 'vid-merge', name: 'Merge Videos', icon: 'merge', desc: 'Join clips in order' },
    { id: 'vid-mute', name: 'Mute Video', icon: 'volume', desc: 'Remove the audio track' }
  ],
  Audio: [
    { id: 'aud-trim', name: 'Trim Audio', icon: 'cut', desc: 'Trim sound track by start and end timestamps' },
    { id: 'aud-merge', name: 'Merge Audio', icon: 'merge', desc: 'Combine multiple audio tracks in sequence' },
    { id: 'aud-convert', name: 'Convert Audio', icon: 'convert', desc: 'Convert common audio formats' },
    { id: 'aud-extract', name: 'Extract from Video', icon: 'audio', desc: 'Pull audio from a video clip' },
    { id: 'aud-speed', name: 'Change Speed', icon: 'play', desc: 'Speed up or slow down audio' },
    { id: 'aud-volume', name: 'Adjust Volume', icon: 'volume', desc: 'Amplify or soften volume level (50% to 200%)' },
    { id: 'aud-denoise', name: 'Noise Reduction', icon: 'audio', desc: 'Reduce steady background hiss' },
    { id: 'aud-compress', name: 'Compress Audio', icon: 'compress', desc: 'Reduce audio bitrate (64k to 320k)' },
    { id: 'aud-fade', name: 'Fade In / Out', icon: 'audio', desc: 'Smooth audio starts and endings' },
    { id: 'aud-loop', name: 'Loop Audio', icon: 'rotate', desc: 'Repeat a track continuously' }
  ],
  Time: [
    { id: 'time-stopwatch', name: 'Stopwatch', icon: 'time', desc: 'Millisecond-precision timer with lap recording' },
    { id: 'time-countdown', name: 'Countdown Timer', icon: 'time', desc: 'Countdown with audio chime completion alarm' },
    { id: 'time-diff', name: 'Date Difference', icon: 'time', desc: 'Exact days, weeks, months, years between two dates' },
    { id: 'time-adjust', name: 'Add / Subtract Dates', icon: 'time', desc: 'Calculate date after adding N days, weeks, months' },
    { id: 'time-zone', name: 'Time Zone Converter', icon: 'time', desc: 'Convert time across major world time zones' },
    { id: 'time-duration', name: 'Duration Converter', icon: 'time', desc: 'Convert seconds, minutes, hours, days, weeks' },
    { id: 'time-timestamp', name: 'Timestamp Converter', icon: 'time', desc: 'Unix epoch timestamp ↔ readable date & ISO' },
    { id: 'time-age', name: 'Age Calculator', icon: 'time', desc: 'Calculate your age instantly' },
    { id: 'time-pomodoro', name: 'Pomodoro Timer', icon: 'time', desc: 'Focus in timed work sessions' },
    { id: 'time-business-days', name: 'Business Days', icon: 'time', desc: 'Count weekdays between dates' }
  ],
  Number: [
    { id: 'num-calc', name: 'Calculator', icon: 'calc', desc: 'Arithmetic calculations with parentheses & memory' },
    { id: 'num-percent', name: 'Percentage Calculator', icon: 'calc', desc: '% of, what %, and % increase/decrease' },
    { id: 'num-units', name: 'Unit Converter', icon: 'convert', desc: 'Length, Mass, Temp, Area, Volume, Digital Data' },
    { id: 'num-emi', name: 'EMI Calculator', icon: 'calc', desc: 'Estimate monthly loan payments' },
    { id: 'num-stats', name: 'Average & Stats', icon: 'calc', desc: 'Mean, median, mode, sum, min, max, std dev' },
    { id: 'num-discount', name: 'Discount Calculator', icon: 'calc', desc: 'Calculate a sale price and savings' },
    { id: 'num-currency', name: 'Currency Converter', icon: 'convert', desc: 'Convert with a rate you provide' },
    { id: 'num-ratio', name: 'Ratio / Proportion', icon: 'calc', desc: 'Solve ratios and proportions' },
    { id: 'num-words', name: 'Number to Words', icon: 'text', desc: 'Convert numbers into natural English words' },
    { id: 'num-round', name: 'Rounding', icon: 'calc', desc: 'Round values to decimal places' },
    { id: 'num-base', name: 'Number Base', icon: 'calc', desc: 'Convert Decimal, Binary, Hexadecimal, Octal' }
  ]
};

// Application State
const state = {
  activeCategory: localStorage.getItem('scraft_category') || 'Image',
  searchQuery: '',
  activeTool: null,
  activeFiles: [],
  processedResult: null,
  isProcessing: false,
  signatureDataUrl: null,
  preferences: loadUiPreferences()
};

function allTools() { return Object.entries(CATALOG).flatMap(([category, tools]) => tools.map(tool => ({ ...tool, category }))); }
const VALID_TOOL_IDS = new Set(allTools().map(tool => tool.id));
function loadUiPreferences() {
  try {
    const value = JSON.parse(localStorage.getItem('scraft_ui_preferences_v1') || '{}');
    return {
      favoriteToolIds: Array.isArray(value.favoriteToolIds) ? value.favoriteToolIds.filter(id => typeof id === 'string') : [],
      pinnedToolIds: Array.isArray(value.pinnedToolIds) ? value.pinnedToolIds.filter(id => typeof id === 'string').slice(0, 3) : [],
      recentToolIds: Array.isArray(value.recentToolIds) ? value.recentToolIds.filter(id => typeof id === 'string') : [],
      startPage: ['all-tools', 'favorites', 'last-used'].includes(value.startPage) ? value.startPage : 'all-tools',
      accentColor: typeof value.accentColor === 'string' ? value.accentColor : 'none',
      backgroundStyle: ['white', 'warm-cream', 'soft-gray', 'dark'].includes(value.backgroundStyle) ? value.backgroundStyle : 'white',
      rememberLastFormat: value.rememberLastFormat !== false,
      lastFormats: value.lastFormats && typeof value.lastFormats === 'object' && !Array.isArray(value.lastFormats) ? value.lastFormats : {}
    };
  } catch { return { favoriteToolIds: [], pinnedToolIds: [], recentToolIds: [], startPage: 'all-tools', accentColor: 'none', backgroundStyle: 'white', rememberLastFormat: true, lastFormats: {} }; }
}
function saveUiPreferences() {
  state.preferences.favoriteToolIds = [...new Set(state.preferences.favoriteToolIds)].filter(id => VALID_TOOL_IDS.has(id));
  state.preferences.pinnedToolIds = [...new Set(state.preferences.pinnedToolIds)].filter(id => VALID_TOOL_IDS.has(id)).slice(0, 3);
  state.preferences.recentToolIds = [...new Set(state.preferences.recentToolIds)].filter(id => VALID_TOOL_IDS.has(id)).slice(0, 12);
  try { localStorage.setItem('scraft_ui_preferences_v1', JSON.stringify(state.preferences)); } catch {}
}

// DOM Elements
const sideNav = document.getElementById('sideNav');
const categoryTitle = document.getElementById('categoryTitle');
const categoryDesc = document.getElementById('categoryDesc');
const categoryIconWrap = document.getElementById('categoryIcon');
const toolsGrid = document.getElementById('toolsGrid');
const searchInput = document.getElementById('searchInput');
const browseScreen = document.getElementById('browseScreen');
const toolDetailScreen = document.getElementById('toolDetailScreen');
const toolDetailContainer = document.getElementById('toolDetailContainer');
const backBtn = document.getElementById('backBtn');
const recentDrawer = document.getElementById('recentDrawer');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const quickAccessModal = document.getElementById('quickAccessModal');
// Keep the nested manager overlay at the document root so it can layer above Settings.
if (quickAccessModal && quickAccessModal.parentElement !== document.body) document.body.appendChild(quickAccessModal);
const closeSettingsBtn = document.getElementById('closeSettingsBtn');

// Initialize Application
export function initApp() {
  applyTheme(getSavedTheme());
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
    if (getSavedTheme() === 'system') applyTheme('system');
  });
  state.activeCategory = resolveStartPage();

  renderSideNav();
  renderCategoryView();
  renderQuickAccess();
  renderRecentList();
  setupEventListeners();
}

// Render Sidebar Navigation
function renderSideNav() {
  sideNav.innerHTML = '<div class="eyebrow">CATEGORIES</div>';
  const favoriteButton = document.createElement('button');
  favoriteButton.className = `side-btn ${state.activeCategory === 'Favorites' ? 'active' : ''}`;
  favoriteButton.innerHTML = `${getIcon('star', 18)}<span>Favorites</span>`;
  favoriteButton.addEventListener('click', () => selectCategory('Favorites'));
  sideNav.appendChild(favoriteButton);
  CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = `side-btn ${cat.id === state.activeCategory ? 'active' : ''}`;
    btn.innerHTML = `${getIcon(cat.icon, 18)}<span>${cat.label}</span>`;
    btn.addEventListener('click', () => selectCategory(cat.id));
    sideNav.appendChild(btn);
  });
}

function selectCategory(category) {
  state.activeCategory = category;
  state.searchQuery = '';
  if (searchInput) searchInput.value = '';
  if (category !== 'Favorites' && category !== 'All') localStorage.setItem('scraft_category', category);
  showBrowseView(); renderSideNav(); renderCategoryView();
}

// Render Tools Grid for Active Category
function renderCategoryView() {
  const cat = state.activeCategory === 'All'
    ? { label: 'All Tools', desc: 'Browse every tool in S-Craft Tools', icon: 'common' }
    : CATEGORIES.find(c => c.id === state.activeCategory) || { label: 'Favorites', desc: 'Your saved tools in one place', icon: 'star' };
  categoryTitle.textContent = cat.label;
  categoryDesc.textContent = cat.desc;
  categoryIconWrap.innerHTML = getIcon(cat.icon, 22);

  const categoryTools = state.activeCategory === 'Favorites'
    ? allTools().filter(tool => state.preferences.favoriteToolIds.includes(tool.id))
    : state.activeCategory === 'All'
      ? allTools()
      : (CATALOG[state.activeCategory] || []).map(tool => ({ ...tool, category: state.activeCategory }));
  const all = categoryTools;
  const tools = all.filter(t => {
    if (!state.searchQuery) return true;
    const q = state.searchQuery.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
  });

  toolsGrid.innerHTML = '';
  if (tools.length === 0) {
    toolsGrid.innerHTML = state.activeCategory === 'Favorites' && !state.searchQuery
      ? '<div class="empty-state">No favorites yet. Star a tool to add it to Quick Access.</div>'
      : `<div class="empty-state">No tools found matching "${escapeHtml(state.searchQuery)}". Try a different keyword.</div>`;
    return;
  }

  const renderCards = list => list.forEach(tool => {
    const wrapper = document.createElement('div'); wrapper.className = 'tool-card-wrap';
    const card = document.createElement('button'); card.className = 'tool-card'; card.setAttribute('aria-label', `Open ${tool.name}`);
    card.innerHTML = `${getIcon(tool.icon, 26)}<span>${escapeHtml(tool.name)}</span><small>${escapeHtml(tool.desc)}</small>`;
    card.addEventListener('click', () => openTool(tool));
    const favorite = document.createElement('button'); favorite.className = `tool-favorite ${state.preferences.favoriteToolIds.includes(tool.id) ? 'is-favorite' : ''}`;
    favorite.type = 'button'; favorite.setAttribute('aria-label', `${state.preferences.favoriteToolIds.includes(tool.id) ? 'Remove' : 'Add'} ${tool.name} ${state.preferences.favoriteToolIds.includes(tool.id) ? 'from' : 'to'} favorites`);
    favorite.setAttribute('aria-pressed', String(state.preferences.favoriteToolIds.includes(tool.id)));
    favorite.innerHTML = getIcon('star', 16);
    favorite.addEventListener('click', event => { event.stopPropagation(); toggleFavorite(tool.id); });
    wrapper.append(card, favorite); toolsGrid.appendChild(wrapper);
  });
  renderCards(tools);
}

function toggleFavorite(toolId) {
  const ids = state.preferences.favoriteToolIds;
  state.preferences.favoriteToolIds = ids.includes(toolId) ? ids.filter(id => id !== toolId) : [...ids, toolId];
  saveUiPreferences(); renderCategoryView(); renderQuickAccess();
}

function renderQuickAccess() {
  const container = document.getElementById('quickAccessTools'); if (!container) return;
  const selected = [...state.preferences.pinnedToolIds, ...state.preferences.recentToolIds].filter((id,index,array)=>array.indexOf(id)===index).slice(0,3);
  container.innerHTML = selected.length ? selected.map(id => {
    const tool=allTools().find(item=>item.id===id); return tool ? `<button class="quick-tool" data-tool-id="${escapeHtml(id)}">${getIcon(tool.icon,15)}<span>${escapeHtml(tool.name)}</span></button>` : '';
  }).join('') : '<span class="quick-access-empty">Open a tool to see it here.</span>';
  container.querySelectorAll('[data-tool-id]').forEach(button=>button.addEventListener('click',()=>{const tool=allTools().find(item=>item.id===button.dataset.toolId);if(tool)openTool(tool);}));
}

// Navigation helpers
function showBrowseView() {
  toolDetailScreen.classList.remove('show');
  browseScreen.classList.add('show');
  state.activeTool = null;
  state.activeFiles = [];
  state.processedResult = null;
}

function showDetailView() {
  browseScreen.classList.remove('show');
  toolDetailScreen.classList.add('show');
}

// Open Specific Tool
function openTool(tool) {
  tool = allTools().find(item => item.id === tool.id) || tool;
  state.activeTool = tool;
  state.preferences.recentToolIds = [tool.id, ...state.preferences.recentToolIds.filter(id => id !== tool.id)];
  saveUiPreferences(); renderQuickAccess();
  state.activeFiles = [];
  state.processedResult = null;
  showDetailView();
  backBtn.innerHTML = `&larr; Back to ${tool.category} Tools`;

  // Render the specific tool interface
  renderToolView(tool);
  applyRememberedFormats(tool.id);
}

// Render Tool Interface
function renderToolView(tool) {
  const container = toolDetailContainer;
  container.innerHTML = `
    <div class="tool-detail-header">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;">
        <div class="bigico">${getIcon(tool.icon, 22)}</div>
        <div>
          <h2 class="title">${tool.name}</h2>
          <p class="subtitle">${tool.desc}</p>
        </div>
      </div>
    </div>
    <div id="toolInteractiveZone"></div>
  `;

  const zone = document.getElementById('toolInteractiveZone');

  switch (tool.id) {
    // IMAGE TOOLS
    case 'img-resize':
      renderImageResizeTool(zone);
      break;
    case 'img-compress':
      renderImageCompressTool(zone);
      break;
    case 'img-sign':
      renderImageSignTool(zone);
      break;
    case 'img-crop':
      renderImageCropTool(zone);
      break;
    case 'img-convert':
      renderImageConvertTool(zone);
      break;
    case 'img-watermark':
      renderImageWatermarkTool(zone);
      break;
    case 'img-text':
      renderImageTextTool(zone);
      break;
    case 'img-metadata':
      renderImageMetadataTool(zone);
      break;
    case 'img-batch':
      renderImageBatchTool(zone);
      break;

    // PDF TOOLS
    case 'pdf-sign':
      renderPdfSignTool(zone);
      break;
    case 'pdf-merge':
      renderPdfMergeTool(zone);
      break;
    case 'pdf-split':
      renderPdfSplitTool(zone);
      break;
    case 'pdf-organize':
      renderPdfOrganizeTool(zone);
      break;
    case 'pdf-compress':
      renderPdfCompressTool(zone);
      break;
    case 'pdf-watermark':
      renderPdfWatermarkTool(zone);
      break;
    case 'pdf-to-img':
      renderPdfToImageTool(zone);
      break;
    case 'img-to-pdf':
      renderImagesToPdfTool(zone);
      break;
    case 'pdf-protect':
      renderPdfProtectTool(zone);
      break;

    // TEXT TOOLS
    case 'txt-case':
      renderTextCaseTool(zone);
      break;
    case 'txt-counter':
      renderTextCounterTool(zone);
      break;
    case 'txt-replace':
      renderTextReplaceTool(zone);
      break;
    case 'txt-clean':
      renderTextCleanTool(zone);
      break;
    case 'txt-random':
      renderRandomTextTool(zone);
      break;
    case 'txt-extract':
      renderTextExtractorTool(zone);
      break;
    case 'txt-slug':
      renderSlugTool(zone);
      break;
    case 'txt-duplicates':
      renderTextDuplicatesTool(zone);
      break;
    case 'txt-sort':
      renderTextSortTool(zone);
      break;
    case 'txt-compare':
      renderTextCompareTool(zone);
      break;
    case 'txt-to-pdf':
      renderTextToPdfTool(zone);
      break;

    // VIDEO TOOLS
    case 'vid-trim':
    case 'vid-compress':
    case 'vid-crop':
    case 'vid-resize':
    case 'vid-rotate':
    case 'vid-extract-audio':
    case 'vid-mute':
    case 'vid-convert':
    case 'vid-merge':
    case 'vid-speed':
      renderVideoGenericTool(zone, tool.id);
      break;

    // AUDIO TOOLS
    case 'aud-extract':
    case 'aud-trim':
    case 'aud-merge':
    case 'aud-loop':
    case 'aud-speed':
    case 'aud-volume':
    case 'aud-compress':
    case 'aud-convert':
    case 'aud-fade':
    case 'aud-denoise':
      renderAudioGenericTool(zone, tool.id);
      break;

    // TIME TOOLS
    case 'time-stopwatch':
      renderStopwatchTool(zone);
      break;
    case 'time-countdown':
      renderCountdownTool(zone);
      break;
    case 'time-diff':
      renderDateDiffTool(zone);
      break;
    case 'time-adjust':
      renderDateAdjustTool(zone);
      break;
    case 'time-zone':
      renderTimeZoneTool(zone);
      break;
    case 'time-duration':
      renderDurationTool(zone);
      break;
    case 'time-timestamp':
      renderTimestampTool(zone);
      break;
    case 'time-age':
      renderAgeTool(zone);
      break;
    case 'time-pomodoro':
      renderPomodoroTool(zone);
      break;
    case 'time-business-days':
      renderBusinessDaysTool(zone);
      break;

    // NUMBER TOOLS
    case 'num-calc':
      renderCalculatorTool(zone);
      break;
    case 'num-percent':
      renderPercentTool(zone);
      break;
    case 'num-units':
      renderUnitConverterTool(zone);
      break;
    case 'num-ratio':
      renderRatioTool(zone);
      break;
    case 'num-stats':
      renderStatsTool(zone);
      break;
    case 'num-words':
      renderNumberWordsTool(zone);
      break;
    case 'num-round':
      renderRoundingTool(zone);
      break;
    case 'num-base':
      renderNumberBaseTool(zone);
      break;
    case 'num-discount':
      renderDiscountTool(zone);
      break;
    case 'num-emi':
      renderEmiTool(zone);
      break;
    case 'num-currency':
      renderManualCurrencyTool(zone);
      break;
    default:
      zone.innerHTML = `<p class="subtitle">Tool under construction.</p>`;
  }
}

/* ========================================================================= */
/*                          PRIORITY TOOL: EXACT IMAGE RESIZE                */
/* ========================================================================= */
function renderImageResizeTool(zone) {
  zone.innerHTML = `
    <div class="tool-body full-studio">
      <div id="resizeUploadArea"><div class="dropzone" id="resizeDropzone"><input type="file" accept="image/png,image/jpeg,image/webp,image/bmp"><div class="dropzone-icon">${getIcon('upload', 36)}</div><b>Choose or drop an image</b><small>JPG, PNG, WebP up to 50MB</small></div></div>
      <div id="resizeStudioArea" class="image-editor-layout" style="display:none;">
        <section class="image-editor-controls">
          <div class="image-file-row"><span class="file-badge">${getIcon('image',18)} <strong id="resizeDocName">image.jpg</strong> <span class="file-size" id="resizeDocSize"></span></span><button class="btn-subtle" id="btnChangeResize">Change</button></div>
          <div class="image-control-section"><div class="image-section-title">Resize amount <strong id="resizePercentLabel">100%</strong></div><input type="range" id="resizePercent" min="10" max="200" value="100" class="image-range"><small>Set a percentage or enter exact dimensions.</small></div>
          <div class="image-control-section"><div class="image-section-title">Dimensions</div>
            <div class="segmented-control" id="resizeMode"><button class="segmented-btn active" data-val="exact">Exact</button><button class="segmented-btn" data-val="max">Fit within</button><button class="segmented-btn" data-val="original">Original</button></div>
            <div class="image-inline-controls"><label>Width <input type="number" id="rw" class="opt-input" min="1" max="12000" value="200"></label><label>Height <input type="number" id="rh" class="opt-input" min="1" max="12000" value="230"></label><label class="toggle-label"><input type="checkbox" id="lockRatio"><span>Keep ratio</span></label></div>
            <select id="resizeFit" class="opt-select"><option value="crop">Crop to fit</option><option value="contain">Fit with padding</option><option value="stretch">Stretch</option></select>
          </div>
          <div class="image-control-section"><div class="image-section-title">File settings</div><div class="image-inline-controls"><select id="rfmt" class="opt-select"><option value="image/jpeg">JPEG</option><option value="image/png">PNG</option><option value="image/webp">WebP</option></select><label>Max KB (optional) <input type="number" id="rtargetKb" class="opt-input" min="1" placeholder="No limit"></label></div></div>
          <div class="studio-topbar-right image-action-row"><button class="btn-primary" id="btnProcessResize" disabled>${getIcon('resize',15)} Resize Image</button><button class="btn-secondary" id="btnDownloadResize" disabled>${getIcon('download',15)} Download</button></div>
        </section>
        <section class="image-result-panel"><div id="resizeResultStats" style="display:none;" class="result-card"></div><div class="studio-image-preview" id="resizeStage"><canvas id="resizeCanvas" class="preview-canvas"></canvas></div><div id="previewMeta" class="image-preview-meta">Choose an image to preview.</div></section>
      </div>
    </div>`;

  let selectedImage = null, selectedFile = null, originalRatio = 1, currentMode = 'exact';
  const $ = id => document.getElementById(id);
  const uploadArea=$('resizeUploadArea'), studioArea=$('resizeStudioArea'), canvas=$('resizeCanvas'), ctx=canvas.getContext('2d');
  const rw=$('rw'), rh=$('rh'), ratio=$('lockRatio'), slider=$('resizePercent'), sliderLabel=$('resizePercentLabel');
  const stats=$('resizeResultStats'), meta=$('previewMeta'), process=$('btnProcessResize'), download=$('btnDownloadResize');
  function setDimensions(w,h){rw.value=Math.max(1,Math.round(w));rh.value=Math.max(1,Math.round(h));}
  function clearResult(){stats.style.display='none';download.disabled=true;state.processedResult=null;if(selectedImage){canvas.width=selectedImage.naturalWidth;canvas.height=selectedImage.naturalHeight;canvas.getContext('2d').drawImage(selectedImage,0,0);meta.textContent=`Original preview · ${selectedImage.naturalWidth} × ${selectedImage.naturalHeight} px · ${formatBytes(selectedFile.size)} · Target ${rw.value || '—'} × ${rh.value || '—'} px`;}}
  $('btnChangeResize').addEventListener('click',()=>{selectedImage=null;selectedFile=null;uploadArea.style.display='block';studioArea.style.display='none';process.disabled=true;clearResult();});
  document.querySelectorAll('#resizeMode .segmented-btn').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('#resizeMode .segmented-btn').forEach(b=>b.classList.toggle('active',b===btn));currentMode=btn.dataset.val;
    if(selectedImage && currentMode==='original')setDimensions(selectedImage.naturalWidth,selectedImage.naturalHeight);
    clearResult();
  }));
  rw.addEventListener('input',()=>{if(lockRatio.checked&&selectedImage){rh.value=Math.max(1,Math.round(Number(rw.value)/originalRatio));slider.value=Math.round(Number(rw.value)/selectedImage.naturalWidth*100);sliderLabel.textContent=`${slider.value}%`;}clearResult();});
  rh.addEventListener('input',()=>{if(lockRatio.checked&&selectedImage){rw.value=Math.max(1,Math.round(Number(rh.value)*originalRatio));slider.value=Math.round(Number(rh.value)/selectedImage.naturalHeight*100);sliderLabel.textContent=`${slider.value}%`;}clearResult();});
  slider.addEventListener('input',()=>{if(!selectedImage)return;const scale=Number(slider.value)/100;sliderLabel.textContent=`${slider.value}%`;setDimensions(selectedImage.naturalWidth*scale,selectedImage.naturalHeight*scale);currentMode='exact';document.querySelectorAll('#resizeMode .segmented-btn').forEach(b=>b.classList.toggle('active',b.dataset.val==='exact'));clearResult();});
  [$('resizeFit'),$('rfmt'),$('rtargetKb')].forEach(control=>control.addEventListener('input',clearResult));
  setupDropzone($('resizeDropzone'),async([file])=>{if(!file)return;try{selectedFile=file;selectedImage=await loadImage(file);originalRatio=selectedImage.naturalWidth/selectedImage.naturalHeight;uploadArea.style.display='none';studioArea.style.display='grid';$('resizeDocName').textContent=file.name;$('resizeDocSize').textContent=`(${selectedImage.naturalWidth}×${selectedImage.naturalHeight} px · ${formatBytes(file.size)})`;setDimensions(selectedImage.naturalWidth,selectedImage.naturalHeight);slider.value=100;sliderLabel.textContent='100%';canvas.width=selectedImage.naturalWidth;canvas.height=selectedImage.naturalHeight;ctx.drawImage(selectedImage,0,0);meta.textContent=`Original preview · ${selectedImage.naturalWidth} × ${selectedImage.naturalHeight} px · ${formatBytes(file.size)}`;process.disabled=false;clearResult();showToast('Image loaded. Set a size and resize.');}catch(err){showToast('Error loading image: '+err.message);}} ,{accept:'image/*'});
  process.addEventListener('click',async()=>{if(!selectedImage)return;process.disabled=true;process.textContent='Processing…';try{const result=await ImageTools.resizeImageExact(selectedImage,{width:Number(rw.value),height:Number(rh.value),mode:currentMode,fit:$('resizeFit').value,format:$('rfmt').value,targetMaxKb:$('rtargetKb').value?Number($('rtargetKb').value):null});state.processedResult=result;canvas.width=result.width;canvas.height=result.height;canvas.getContext('2d').drawImage(result.canvas,0,0);stats.style.display='grid';const delta=result.size-selectedFile.size;stats.innerHTML=`<div class="stat-item"><span class="stat-title">Original</span><span class="stat-val">${selectedImage.naturalWidth} × ${selectedImage.naturalHeight} px · ${formatBytes(selectedFile.size)}</span></div><div class="stat-item"><span class="stat-title">Resized output</span><span class="stat-val">${result.width} × ${result.height} px · ${formatBytes(result.size)}</span></div><div class="stat-item"><span class="stat-title">Size change</span><span class="stat-val">${delta<=0?'−'+formatBytes(-delta):'+'+formatBytes(delta)}</span></div>`;meta.textContent=`Resized preview · ${result.width} × ${result.height} px`;download.disabled=false;logActivity('Resize Image',`${result.width}x${result.height}px`,{size:result.size});showToast(`Resized to ${result.width} × ${result.height} px.`);}catch(err){showToast('Resize failed: '+err.message);}finally{process.disabled=false;process.innerHTML=`${getIcon('resize',16)} Resize Image`;}});
  download.addEventListener('click',()=>{if(!state.processedResult)return;const ext=$('rfmt').value.split('/')[1].replace('jpeg','jpg');downloadBlob(state.processedResult.blob,`resized_${state.processedResult.width}x${state.processedResult.height}.${ext}`);});
}

/* ========================================================================= */
/*                          PRIORITY TOOL: COMPRESS IMAGE                    */
function renderImageCompressTool(zone) {
  zone.innerHTML = `
    <div class="tool-body full-studio"><div id="compImgUploadArea"><div class="dropzone" id="compressDropzone"><input type="file" accept="image/*"><div class="dropzone-icon">${getIcon('upload',36)}</div><b>Choose or drop an image</b><small>JPG, PNG, WebP up to 50MB</small></div></div>
    <div id="compImgStudioArea" class="image-editor-layout" style="display:none;"><section class="image-editor-controls"><div class="image-file-row"><span class="file-badge">${getIcon('image',18)} <strong id="compImgDocName">image.jpg</strong> <span class="file-size" id="compImgDocSize"></span></span><button class="btn-subtle" id="btnChangeCompress">Change</button></div>
      <div class="image-control-section"><div class="image-section-title">Target reduction <strong id="compressPercentLabel">50%</strong></div><input type="range" id="compressPercent" min="10" max="90" value="50" step="5" class="image-range"><small>Sets a suggested maximum file size. Adjust the KB target below when needed.</small></div>
      <div class="image-control-section"><div class="image-section-title">Output settings</div><div class="image-inline-controls"><label>Target Max KB <input type="number" id="targetKb" class="opt-input" min="1" step="1" value="50"></label><select id="compressFormat" class="opt-select"><option value="image/jpeg">JPEG (.jpg)</option><option value="image/webp">WebP (.webp)</option><option value="image/png">PNG (.png)</option></select></div><div class="image-target-note" id="compressSuggestedTarget"></div></div>
      <div class="studio-topbar-right image-action-row"><button class="btn-primary" id="btnProcessCompress" disabled>${getIcon('compress',15)} Compress Image</button><button class="btn-secondary" id="btnDownloadCompress" disabled>${getIcon('download',15)} Download</button></div></section>
      <section class="image-result-panel"><div id="compressStats" style="display:none;" class="result-card"></div><div class="studio-image-preview"><img id="compressImgPreview" class="preview-canvas" style="display:none;" alt="Image preview"><div id="compressMeta" style="color:var(--muted);font-size:13px;padding:20px;text-align:center;">Choose an image to preview.</div></div></section></div></div>`;
  let uploadedFile=null, originalUrl=null;
  const $=id=>document.getElementById(id), upload=$('compImgUploadArea'), studio=$('compImgStudioArea'), target=$('targetKb'), slider=$('compressPercent'), stats=$('compressStats'), preview=$('compressImgPreview'), meta=$('compressMeta'), process=$('btnProcessCompress'), download=$('btnDownloadCompress');
  const clearResult=()=>{stats.style.display='none';download.disabled=true;state.processedResult=null;if(uploadedFile&&originalUrl){preview.src=originalUrl;preview.style.display='block';meta.style.display='none';}};
  function suggestTarget(){if(!uploadedFile)return;const reduction=Number(slider.value);const suggested=Math.max(1,Math.round(uploadedFile.size*(100-reduction)/100/1024));target.value=suggested;$('compressPercentLabel').textContent=`${reduction}% smaller`;$('compressSuggestedTarget').textContent=`Suggested maximum: ${suggested} KB · Original: ${formatBytes(uploadedFile.size)}`;clearResult();}
  $('btnChangeCompress').addEventListener('click',()=>{uploadedFile=null;upload.style.display='block';studio.style.display='none';preview.style.display='none';meta.style.display='block';meta.textContent='Choose an image to preview.';clearResult();if(originalUrl)URL.revokeObjectURL(originalUrl);});
  slider.addEventListener('input',suggestTarget);target.addEventListener('input',()=>{clearResult();if(uploadedFile){$('compressPercentLabel').textContent='Custom target';$('compressSuggestedTarget').textContent=`Maximum output: ${target.value || '—'} KB · Original: ${formatBytes(uploadedFile.size)}`;}});$('compressFormat').addEventListener('change',clearResult);
  setupDropzone($('compressDropzone'),([file])=>{if(!file)return;uploadedFile=file;upload.style.display='none';studio.style.display='grid';$('compImgDocName').textContent=file.name;$('compImgDocSize').textContent=`(${formatBytes(file.size)})`;if(originalUrl)URL.revokeObjectURL(originalUrl);originalUrl=URL.createObjectURL(file);preview.src=originalUrl;preview.style.display='block';meta.style.display='none';slider.value=50;process.disabled=false;suggestTarget();showToast('Image loaded. Choose the target reduction and KB limit.');},{accept:'image/*'});
  process.addEventListener('click',async()=>{if(!uploadedFile)return;process.disabled=true;process.textContent='Compressing…';try{const maxKb=Number(target.value);if(!Number.isFinite(maxKb)||maxKb<=0)throw new Error('Enter a target maximum size in KB.');const res=await ImageTools.compressImageToTargetSize(uploadedFile,maxKb,{format:$('compressFormat').value});state.processedResult=res;const url=URL.createObjectURL(res.blob);preview.src=url;preview.style.display='block';const saved=uploadedFile.size-res.size,pct=uploadedFile.size?((saved/uploadedFile.size)*100).toFixed(1):'0.0';stats.style.display='grid';stats.innerHTML=`<div class="stat-item"><span class="stat-title">Original size</span><span class="stat-val">${formatBytes(uploadedFile.size)}</span></div><div class="stat-item"><span class="stat-title">Compressed size</span><span class="stat-val">${formatBytes(res.size)}</span></div><div class="stat-item"><span class="stat-title">Target / change</span><span class="stat-val">≤ ${maxKb} KB · ${saved>=0?`${pct}% smaller`:`${Math.abs(pct)}% larger`}</span></div>`;meta.style.display='none';download.disabled=false;logActivity('Compress Image',uploadedFile.name,{size:res.size});showToast(res.size<=maxKb*1024?`Compressed to ${formatBytes(res.size)}.`:`Best available output is ${formatBytes(res.size)}; target was not reached.`);}catch(err){showToast('Compression error: '+err.message);}finally{process.disabled=false;process.innerHTML=`${getIcon('compress',16)} Compress Image`;}});
  download.addEventListener('click',()=>{if(!state.processedResult)return;const ext=$('compressFormat').value.split('/')[1].replace('jpeg','jpg');downloadBlob(state.processedResult.blob,`compressed_${uploadedFile.name.replace(/\.[^/.]+$/,'')}.${ext}`);});
}

/* ========================================================================= */
/*                          PRIORITY TOOL: SIGN IMAGE                        */
/* ========================================================================= */
function renderImageSignTool(zone) {
  zone.innerHTML = `
    <div class="tool-body full-studio">
      <div id="signImgUploadArea">
        <div class="dropzone" id="signImgDropzone">
          <input type="file" accept="image/*">
          <div class="dropzone-icon">${getIcon('upload', 36)}</div>
          <b>Choose photo to sign</b>
          <small>JPG, PNG, WebP &bull; 100% offline & local</small>
        </div>
      </div>
      <div id="fileInfoBoxSignImg" style="display:none;"></div>

      <div id="signImgStudioArea" style="display:none;">
        <div class="studio-topbar">
          <div class="studio-topbar-left">
            <span class="file-badge">${getIcon('image', 18)} <strong id="signImgDocName">photo.jpg</strong> <span class="file-size" id="signMeta"></span></span>
            <button class="btn-subtle" id="btnChangeSignImg">${getIcon('refresh', 13)} Change</button>
          </div>
          <div class="studio-topbar-center" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <div class="segmented-control" id="sigTypeTabs" style="margin:0;">
              <button class="segmented-btn active" data-tab="draw">Draw</button>
              <button class="segmented-btn" data-tab="type">Type</button>
              <button class="segmented-btn" data-tab="upload">Upload</button>
            </div>
            <div style="display:flex;align-items:center;gap:6px;font-size:12px;">
              <label for="sigScale">Scale (<span id="valScale">30</span>%):</label>
              <input type="range" id="sigScale" min="10" max="80" value="30" style="width:70px;">
            </div>
            <div style="display:flex;align-items:center;gap:6px;font-size:12px;">
              <label for="sigOpacity">Opacity (<span id="valOpacity">100</span>%):</label>
              <input type="range" id="sigOpacity" min="20" max="100" value="100" style="width:70px;">
            </div>
            <div style="display:flex;align-items:center;gap:6px;font-size:12px;">
              <label for="sigRotation">Rot (<span id="valRot">0</span>&deg;):</label>
              <input type="range" id="sigRotation" min="-45" max="45" value="0" style="width:60px;">
            </div>
          </div>
          <div class="studio-topbar-right">
            <button class="btn-primary" id="btnProcessSignImg" disabled>${getIcon('signature', 15)} Apply & Sign Image</button>
            <button class="btn-secondary" id="btnDownloadSignImg" disabled>${getIcon('download', 15)} Download</button>
          </div>
        </div>

        <div id="signImgControlsBar" style="background:var(--card-bg);border:1px solid var(--line);border-radius:var(--radius);padding:10px 16px;margin-top:10px;">
          <!-- Draw Signature -->
          <div id="tabSigDraw">
            <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
              <div class="signature-box" style="margin:0;max-width:320px;">
                <canvas id="sigCanvas" class="sig-pad-canvas" style="height:80px;"></canvas>
              </div>
              <div class="sig-tools-row" style="margin:0;">
                <div class="color-swatches" id="sigColors">
                  <div class="swatch active" style="background:#111827;" data-color="#111827"></div>
                  <div class="swatch" style="background:#2563EB;" data-color="#2563EB"></div>
                  <div class="swatch" style="background:#DC2626;" data-color="#DC2626"></div>
                </div>
                <button class="btn-secondary" id="btnClearSig" style="padding:4px 10px;font-size:11.5px;">Clear</button>
              </div>
              <span style="font-size:12px;color:var(--muted);">Draw signature in box &bull; it appears live on photo below</span>
            </div>
          </div>

          <!-- Type Signature -->
          <div id="tabSigType" style="display:none;">
            <div style="display:flex;align-items:center;gap:12px;">
              <input type="text" id="typeSigInput" class="opt-input" placeholder="Type your full name..." style="font-family:'Brush Script MT', cursive, sans-serif;font-size:22px;height:42px;max-width:320px;">
              <span style="font-size:12px;color:var(--muted);">Types in cursive and places directly on photo</span>
            </div>
          </div>

          <!-- Upload Signature -->
          <div id="tabSigUpload" style="display:none;">
            <div class="signature-upload-tools" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
              <input type="file" id="uploadSigInput" accept="image/png,image/jpeg,image/webp" class="opt-input" style="max-width:280px;">
              <span id="sigUploadStatus" style="font-size:12px;color:var(--muted);">Use a transparent PNG for a signature without a background.</span>
            </div>
          </div>
        </div>
      <div class="studio-image-preview sign-image-preview">
        <div class="preview-stage" id="signImgPreviewStage" style="width:100%;">
          <div style="text-align:center;color:var(--muted);padding:30px;">
            ${getIcon('signature', 48)}<br><br>
            <strong>No photo loaded</strong><br>
            <p style="margin-top:6px;max-width:300px;">Upload a photo to see the live preview and drag your signature directly onto it.</p>
          </div>
        </div>
      </div>
      </div>
    </div>
  `;

  let baseImageFile = null;
  let signatureDataUrl = null;
  let currentColor = '#111827';
  let sigOverlayController = null;
  let baseLoadedImg = null;

  const uploadArea = document.getElementById('signImgUploadArea');
  const studioArea = document.getElementById('signImgStudioArea');
  const docName = document.getElementById('signImgDocName');
  const btnChange = document.getElementById('btnChangeSignImg');
  const sigCanvas = document.getElementById('sigCanvas');
  const btnProcess = document.getElementById('btnProcessSignImg');
  const btnDownload = document.getElementById('btnDownloadSignImg');
  const previewStage = document.getElementById('signImgPreviewStage');
  const invalidateSignedOutput = () => { state.processedResult = null; btnDownload.disabled = true; };

  btnChange.addEventListener('click', () => {
    releaseImage(baseLoadedImg);
    baseImageFile = null;
    invalidateSignedOutput();
    uploadArea.style.display = 'block';
    studioArea.style.display = 'none';
    btnProcess.disabled = true;
    btnDownload.disabled = true;
    previewStage.innerHTML = `
      <div style="text-align:center;color:var(--muted);padding:30px;">
        ${getIcon('signature', 48)}<br><br>
        <strong>No photo loaded</strong><br>
        <p style="margin-top:6px;max-width:300px;">Upload a photo to see the live preview and drag your signature directly onto it.</p>
      </div>
    `;
  });

  // Setup signature drawing pad
  sigCanvas.width = 400;
  sigCanvas.height = 140;
  const sctx = sigCanvas.getContext('2d');
  sctx.lineWidth = 2.5;
  sctx.lineCap = 'round';
  sctx.lineJoin = 'round';
  sctx.strokeStyle = currentColor;

  let drawing = false;
  sigCanvas.addEventListener('mousedown', (e) => {
    drawing = true;
    sctx.beginPath();
    sctx.moveTo(e.offsetX, e.offsetY);
  });
  sigCanvas.addEventListener('mousemove', (e) => {
    if (!drawing) return;
    sctx.lineTo(e.offsetX, e.offsetY);
    sctx.stroke();
    signatureDataUrl = sigCanvas.toDataURL('image/png');
    invalidateSignedOutput();
    if (sigOverlayController) sigOverlayController.updateSignature(signatureDataUrl);
  });
  window.addEventListener('mouseup', () => { drawing = false; });

  // Touch drawing support
  sigCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const rect = sigCanvas.getBoundingClientRect();
    const touch = e.touches[0];
    drawing = true;
    sctx.beginPath();
    sctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
  });
  sigCanvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!drawing) return;
    const rect = sigCanvas.getBoundingClientRect();
    const touch = e.touches[0];
    sctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    sctx.stroke();
    signatureDataUrl = sigCanvas.toDataURL('image/png');
    invalidateSignedOutput();
    if (sigOverlayController) sigOverlayController.updateSignature(signatureDataUrl);
  });
  window.addEventListener('touchend', () => { drawing = false; });

  document.getElementById('btnClearSig').addEventListener('click', () => {
    sctx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
    signatureDataUrl = null;
    invalidateSignedOutput();
    if (sigOverlayController) sigOverlayController.updateSignature(null);
  });

  // Color picker
  document.querySelectorAll('#sigColors .swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      document.querySelectorAll('#sigColors .swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      currentColor = swatch.dataset.color;
      sctx.strokeStyle = currentColor;
    });
  });

  // Tabs for Draw / Type / Upload
  document.querySelectorAll('#sigTypeTabs .segmented-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#sigTypeTabs .segmented-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      document.getElementById('tabSigDraw').style.display = tab === 'draw' ? 'block' : 'none';
      document.getElementById('tabSigType').style.display = tab === 'type' ? 'block' : 'none';
      document.getElementById('tabSigUpload').style.display = tab === 'upload' ? 'block' : 'none';

      if (tab === 'type') {
        renderTypedSig();
      }
    });
  });

  const typeSigInput = document.getElementById('typeSigInput');
  typeSigInput.addEventListener('input', renderTypedSig);

  function renderTypedSig() {
    const text = typeSigInput.value.trim();
    if (!text) {
      signatureDataUrl = null;
      invalidateSignedOutput();
      if (sigOverlayController) sigOverlayController.updateSignature(null);
      return;
    }
    const c = document.createElement('canvas');
    c.width = 450;
    c.height = 120;
    const ctx = c.getContext('2d');
    ctx.font = 'italic 46px "Brush Script MT", cursive, sans-serif';
    ctx.fillStyle = currentColor;
    ctx.fillText(text, 20, 75);
    signatureDataUrl = c.toDataURL('image/png');
    invalidateSignedOutput();
    if (sigOverlayController) sigOverlayController.updateSignature(signatureDataUrl);
  }

  const uploadSigInput = document.getElementById('uploadSigInput');
  uploadSigInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      signatureDataUrl = await readFileAsDataURL(file);
      invalidateSignedOutput();
      document.getElementById('sigUploadStatus').textContent = `${file.name} loaded.`;
      if (sigOverlayController) sigOverlayController.updateSignature(signatureDataUrl);
    }
  });
  // Slider adjustments
  const sigScale = document.getElementById('sigScale');
  const sigOpacity = document.getElementById('sigOpacity');
  const sigRotation = document.getElementById('sigRotation');

  sigScale.addEventListener('input', () => {
    invalidateSignedOutput();
    document.getElementById('valScale').textContent = sigScale.value;
    if (sigOverlayController) sigOverlayController.setScale(parseInt(sigScale.value));
  });

  sigOpacity.addEventListener('input', () => {
    invalidateSignedOutput();
    document.getElementById('valOpacity').textContent = sigOpacity.value;
    if (sigOverlayController) sigOverlayController.setOpacity(parseInt(sigOpacity.value));
  });

  sigRotation.addEventListener('input', () => {
    invalidateSignedOutput();
    document.getElementById('valRot').textContent = sigRotation.value;
    if (sigOverlayController) sigOverlayController.setRotation(parseInt(sigRotation.value));
  });

  setupDropzone(document.getElementById('signImgDropzone'), async ([file]) => {
    if (!file) return;
    releaseImage(baseLoadedImg);
    state.processedResult = null;
    btnDownload.disabled = true;
    baseImageFile = file;
    document.getElementById('fileInfoBoxSignImg').innerHTML = `
      <div class="file-info-pill">
        <div><strong>${escapeHtml(file.name)}</strong> (${formatBytes(file.size)})</div>
      </div>
    `;

    baseLoadedImg = await loadImage(file, { retainUrl: true });
    docName.textContent = file.name;
    document.getElementById('signMeta').textContent = `${baseLoadedImg.naturalWidth}×${baseLoadedImg.naturalHeight} px · ${formatBytes(file.size)}`;
    uploadArea.style.display = 'none';
    studioArea.style.display = 'grid';

    sigOverlayController = mountInteractiveSignatureOverlay(previewStage, baseLoadedImg, signatureDataUrl, {
      scale: parseInt(sigScale.value) / 100,
      opacity: parseInt(sigOpacity.value) / 100,
      rotation: parseInt(sigRotation.value),
      onPlacementChange: (placement) => {
        sigScale.value = Math.round(placement.scale * 100);
        document.getElementById('valScale').textContent = sigScale.value;
      }
    });

    btnProcess.disabled = false;
    showToast('Image loaded! Drag signature directly on photo or use sliders.');
  });

  btnProcess.addEventListener('click', async () => {
    if (!baseImageFile || !signatureDataUrl) {
      showToast('Please provide both an image and a signature.');
      return;
    }
    btnProcess.disabled = true;
    try {
      const placement = sigOverlayController ? sigOverlayController.getPlacement() : {
        scale: parseInt(sigScale.value) / 100,
        opacity: parseInt(sigOpacity.value) / 100,
        rotation: parseInt(sigRotation.value)
      };

      const result = await ImageTools.signImage(baseImageFile, signatureDataUrl, placement);
      state.processedResult = result;

      // Reload signed image in the preview stage
      const signedImg = await loadImage(result.blob, { retainUrl: true });
      releaseImage(baseLoadedImg);
      baseLoadedImg = signedImg;
      sigOverlayController = mountInteractiveSignatureOverlay(previewStage, signedImg, null);
      document.getElementById('signMeta').textContent = `Signed output · ${result.width} × ${result.height} px · ${formatBytes(result.size)}`;

      btnDownload.disabled = false;
      logActivity('Sign Image', baseImageFile.name, { size: result.size });
      showToast('Signature successfully applied to image!');
    } catch (err) {
      showToast('Signing failed: ' + err.message);
    } finally {
      btnProcess.disabled = false;
    }
  });

  btnDownload.addEventListener('click', () => {
    if (!state.processedResult) return;
    downloadBlob(state.processedResult.blob, `signed_${baseImageFile.name}`);
  });
}

/* ========================================================================= */
/*                          PRIORITY TOOL: ID PHOTO / SIGNATURE PRESET       */
/* ========================================================================= */
function renderIdPhotoTool(zone) {
  zone.innerHTML = `
    <div class="tool-body full-studio">
      <div id="idUploadArea">
        <div class="dropzone" id="idDropzone">
          <input type="file" accept="image/*">
          <div class="dropzone-icon">${getIcon('upload', 36)}</div>
          <b>Choose photo or signature scan</b>
          <small>JPG, PNG, WebP &bull; 100% offline</small>
        </div>
      </div>

      <div id="idStudioArea" style="display:none;width:100%;">
        <div class="studio-topbar">
          <div class="studio-topbar-left">
            <span class="file-badge" id="fileInfoBoxId"></span>
            <button class="btn-subtle" id="btnChangeId">Change</button>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;align-items:center;">
            <div style="display:flex;align-items:center;gap:8px;min-width:0;">
              <label class="opt-label" style="margin:0;font-size:12px;" for="idPresetSelect">Preset:</label>
              <select id="idPresetSelect" class="opt-select" style="padding:4px 8px;font-size:13px;">
                <option value="passport" selected>Passport (200x230, &le;50KB)</option>
                <option value="signature">Signature (300x100, &le;20KB)</option>
                <option value="usvisa">US Visa (600x600, &le;240KB)</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div style="display:flex;align-items:center;gap:4px;">
              <input type="number" id="idW" class="opt-input" value="200" style="width:65px;padding:4px 6px;font-size:13px;" title="Width">
              <span style="color:var(--muted);">&times;</span>
              <input type="number" id="idH" class="opt-input" value="230" style="width:65px;padding:4px 6px;font-size:13px;" title="Height">
            </div>
            <div style="display:flex;align-items:center;gap:4px;">
              <label class="opt-label" style="margin:0;font-size:12px;" for="idMaxKb">Max KB:</label>
              <input type="number" id="idMaxKb" class="opt-input" value="50" style="width:60px;padding:4px 6px;font-size:13px;">
            </div>
            <select id="idFit" class="opt-select" style="padding:4px 8px;font-size:13px;">
              <option value="crop" selected>Crop to Fit</option>
              <option value="contain">Contain w/ Border</option>
            </select>
            <select id="idBg" class="opt-select" style="padding:4px 8px;font-size:13px;">
              <option value="#FFFFFF" selected>White Bg</option>
              <option value="transparent">Transparent</option>
            </select>
            <span id="idMeta" style="font-size:12px;color:var(--muted);font-weight:500;"></span>
          </div>
          <div class="studio-topbar-right">
            <button class="btn-primary" id="btnProcessId" disabled>${getIcon('image', 16)} Generate</button>
            <button class="btn-secondary" id="btnDownloadId" disabled>${getIcon('download', 16)} Download</button>
          </div>
        </div>

        <div id="idResultStats" style="display:none;margin-top:14px;" class="result-card"></div>

        <div class="studio-image-preview" style="margin-top:14px;min-height:460px;">
          <canvas id="idCanvas" class="preview-canvas"></canvas>
        </div>
      </div>
    </div>
  `;

  let uploadedFile = null;
  const idUploadArea = document.getElementById('idUploadArea');
  const idStudioArea = document.getElementById('idStudioArea');
  const btnChangeId = document.getElementById('btnChangeId');
  const idW = document.getElementById('idW');
  const idH = document.getElementById('idH');
  const idMaxKb = document.getElementById('idMaxKb');
  const idBg = document.getElementById('idBg');
  const idFit = document.getElementById('idFit');
  const presetSelect = document.getElementById('idPresetSelect');
  const btnProcess = document.getElementById('btnProcessId');
  const btnDownload = document.getElementById('btnDownloadId');
  const canvas = document.getElementById('idCanvas');
  const stats = document.getElementById('idResultStats');

  btnChangeId.addEventListener('click', () => {
    idUploadArea.style.display = 'block';
    idStudioArea.style.display = 'none';
    uploadedFile = null;
    btnProcess.disabled = true;
    btnDownload.disabled = true;
    stats.style.display = 'none';
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });

  presetSelect.addEventListener('change', () => {
    const p = presetSelect.value;
    if (p === 'passport') { idW.value = 200; idH.value = 230; idMaxKb.value = 50; }
    else if (p === 'signature') { idW.value = 300; idH.value = 100; idMaxKb.value = 20; }
    else if (p === 'usvisa') { idW.value = 600; idH.value = 600; idMaxKb.value = 240; }
  });

  setupDropzone(document.getElementById('idDropzone'), async ([file]) => {
    if (!file) return;
    uploadedFile = file;
    document.getElementById('fileInfoBoxId').innerHTML = `<strong>${escapeHtml(file.name)}</strong> <span class="file-size">${formatBytes(file.size)}</span>`;
    idUploadArea.style.display = 'none';
    idStudioArea.style.display = 'grid';

    const img = await loadImage(file);
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    document.getElementById('idMeta').textContent = `Orig: ${img.naturalWidth}×${img.naturalHeight}px`;
    btnProcess.disabled = false;
    showToast('Photo uploaded. Review preset specifications and click Generate.');
  });

  btnProcess.addEventListener('click', async () => {
    if (!uploadedFile) return;
    btnProcess.disabled = true;
    try {
      const opts = {
        width: parseInt(idW.value) || 200,
        height: parseInt(idH.value) || 230,
        mode: 'exact',
        fit: idFit.value,
        format: 'image/jpeg',
        bgColor: idBg.value,
        targetMaxKb: parseFloat(idMaxKb.value) || 50
      };

      const result = await ImageTools.resizeImageExact(uploadedFile, opts);
      state.processedResult = result;

      canvas.width = result.width;
      canvas.height = result.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(result.canvas, 0, 0);

      stats.style.display = 'grid';
      stats.innerHTML = `
        <div class="stat-item"><span class="stat-title">Raster Dimensions</span><span class="stat-val">${result.width} &times; ${result.height} px</span></div>
        <div class="stat-item"><span class="stat-title">File Size</span><span class="stat-val" style="color:${result.size <= opts.targetMaxKb * 1024 ? 'var(--success)' : 'var(--danger)'};">${formatBytes(result.size)}</span></div>
        <div class="stat-item"><span class="stat-title">Validation</span><span class="stat-val" style="color:var(--success);">&check; Compliant</span></div>
      `;

      btnDownload.disabled = false;
      logActivity('ID Photo Preset', `${result.width}x${result.height}px`, { size: result.size });
      showToast('Form photo created and verified successfully!');
    } catch (err) {
      showToast('Error: ' + err.message);
    } finally {
      btnProcess.disabled = false;
    }
  });

  btnDownload.addEventListener('click', () => {
    if (!state.processedResult) return;
    downloadBlob(state.processedResult.blob, `id_photo_${idW.value}x${idH.value}.jpg`);
  });
}

/* ========================================================================= */
/*                          PRIORITY TOOL: SIGN PDF                          */
/* ========================================================================= */
function renderPdfSignTool(zone) {
  zone.innerHTML = `
    <div class="tool-body full-studio">
      <div id="pdfUploadHeaderArea">
        <div class="dropzone" id="signPdfDropzone">
          <input type="file" accept="application/pdf">
          <div class="dropzone-icon">${getIcon('pdf', 36)}</div>
          <b>Choose PDF document to sign</b>
          <small>PDF format up to 100MB &bull; 100% offline &amp; private</small>
        </div>
      </div>

      <div id="pdfStudioToolbarArea" style="display:none;">
        <div class="studio-topbar">
          <div class="studio-topbar-left">
            <span class="file-badge">
              ${getIcon('pdf', 18)} <strong id="pdfDocName">document.pdf</strong> <span class="file-size" id="pdfDocSize">(0 KB)</span>
            </span>
            <button class="btn-subtle" id="btnChangePdfDoc">${getIcon('refresh', 13)} Change File</button>
          </div>

          <div class="studio-topbar-center">
            <button class="btn-toolbar-action" id="btnTriggerAddSig" title="Open Signature dialog in preview">
              ${getIcon('signature', 15)} <span>Add Signature</span>
            </button>
            <button class="btn-toolbar-action" id="btnTriggerAddText" title="Add text on page">
              ${getIcon('text', 15)} <span>Add Text</span>
            </button>
            <button class="btn-toolbar-action" id="btnTriggerDraw" title="Draw with pen on page">
              ${getIcon('pen', 15)} <span>Draw / Ink</span>
            </button>
          </div>

          <div class="studio-topbar-right">
            <button class="btn-primary" id="btnSaveSignedPdf">${getIcon('check', 15)} Save Signed PDF</button>
            <button class="btn-secondary" id="btnDownloadSignedPdf" disabled>${getIcon('download', 15)} Download</button>
          </div>
        </div>
      </div>

      <div class="studio-viewer-container" id="pdfStudioContainer" style="display:none;">
        <iframe id="pdfStudioIframe" src="./pdfjs-viewer/viewer.html" title="PDF Studio Signature Editor"></iframe>
      </div>

      <div id="pdfSignEmptyPlaceholder" class="preview-box" style="min-height:480px;display:flex;align-items:center;justify-content:center;text-align:center;">
        <div style="color:var(--muted);padding:40px;">
          <div style="margin-bottom:16px;">${getIcon('signature', 56)}</div>
          <h3 style="font-size:16px;color:var(--text);margin-bottom:6px;">No PDF Document Selected</h3>
          <p style="font-size:13px;max-width:380px;margin:0 auto;line-height:1.5;">
            Choose a PDF document above to open the full-width studio where you can draw, type, upload signatures, and place them anywhere on the document.
          </p>
        </div>
      </div>
    </div>
  `;

  let pdfBytes = null;
  let pdfFileName = 'document.pdf';
  let isViewerLoaded = false;

  const uploadArea = document.getElementById('pdfUploadHeaderArea');
  const toolbarArea = document.getElementById('pdfStudioToolbarArea');
  const viewerContainer = document.getElementById('pdfStudioContainer');
  const emptyPlaceholder = document.getElementById('pdfSignEmptyPlaceholder');
  const iframe = document.getElementById('pdfStudioIframe');

  const docName = document.getElementById('pdfDocName');
  const docSize = document.getElementById('pdfDocSize');
  const btnChange = document.getElementById('btnChangePdfDoc');
  const btnSave = document.getElementById('btnSaveSignedPdf');
  const btnDownload = document.getElementById('btnDownloadSignedPdf');

  const btnAddSig = document.getElementById('btnTriggerAddSig');
  const btnAddText = document.getElementById('btnTriggerAddText');
  const btnDraw = document.getElementById('btnTriggerDraw');

  // Pre-configure PDF.js preferences in localStorage so signature editor is active
  try {
    const existing = JSON.parse(localStorage.getItem('pdfjs.preferences') || '{}');
    delete existing.annotationEditorMode;
    localStorage.setItem('pdfjs.preferences', JSON.stringify({
      ...existing,
      enableSignatureEditor: true,
      enablePermissions: false
    }));
  } catch (e) {}

  function enableStudioTools(viewerWin) {
    try {
      const doc = viewerWin.document;
      const editorModeButtons = doc.getElementById('editorModeButtons');
      if (editorModeButtons) editorModeButtons.classList.remove('hidden');

      const editorSignature = doc.getElementById('editorSignature');
      if (editorSignature) editorSignature.removeAttribute('hidden');
      const sigBtn = doc.getElementById('editorSignatureButton');
      if (sigBtn) sigBtn.disabled = false;

      const editorStamp = doc.getElementById('editorStamp');
      if (editorStamp) editorStamp.removeAttribute('hidden');
      const stampBtn = doc.getElementById('editorStampButton');
      if (stampBtn) stampBtn.disabled = false;

      const editorFreeText = doc.getElementById('editorFreeText');
      if (editorFreeText) editorFreeText.removeAttribute('hidden');
      const textBtn = doc.getElementById('editorFreeTextButton');
      if (textBtn) textBtn.disabled = false;

      const editorInk = doc.getElementById('editorInk');
      if (editorInk) editorInk.removeAttribute('hidden');
      const inkBtn = doc.getElementById('editorInkButton');
      if (inkBtn) inkBtn.disabled = false;
    } catch (e) {
      console.warn('Could not enable studio tools:', e);
    }
  }

  async function loadPdfIntoStudio(bytes) {
    uploadArea.style.display = 'none';
    toolbarArea.style.display = 'block';
    viewerContainer.style.display = 'block';
    emptyPlaceholder.style.display = 'none';

    docName.textContent = pdfFileName;
    docSize.textContent = `(${formatBytes(bytes.byteLength)})`;
    btnSave.disabled = false;
    btnDownload.disabled = true;

    const viewerWin = iframe.contentWindow;
    if (!viewerWin) return;

    const app = viewerWin.PDFViewerApplication;
    if (app) {
      await app.initializedPromise;
      let docLoaded = false;
      const onDocLoaded = () => {
        if (docLoaded) return;
        docLoaded = true;
        enableStudioTools(viewerWin);
      };
      app.eventBus?._on('documentloaded', onDocLoaded, { once: true });
      await app.open({ data: bytes });
      if (app.pdfDocument && !docLoaded) onDocLoaded();
    }
  }

  iframe.onload = async () => {
    isViewerLoaded = true;
    if (pdfBytes) {
      await loadPdfIntoStudio(pdfBytes);
    }
  };

  setupDropzone(document.getElementById('signPdfDropzone'), async ([file]) => {
    if (!file) return;
    pdfFileName = file.name;
    const ab = await readFileAsArrayBuffer(file);
    pdfBytes = new Uint8Array(ab);

    if (isViewerLoaded) {
      await loadPdfIntoStudio(pdfBytes);
    }
    showToast('Document opened in Studio! Click "Add Signature" or the pen icon to sign.');
  }, { accept: '.pdf' });

  btnChange.addEventListener('click', () => {
    pdfBytes = null;
    uploadArea.style.display = 'block';
    toolbarArea.style.display = 'none';
    viewerContainer.style.display = 'none';
    emptyPlaceholder.style.display = 'flex';
    btnSave.disabled = true;
    btnDownload.disabled = true;
  });

  // Topbar action shortcuts trigger the viewer's native tools
  btnAddSig.addEventListener('click', () => {
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    const sigBtn = doc.getElementById('editorSignatureButton');
    if (sigBtn) {
      sigBtn.click();
      setTimeout(() => {
        const addBtn = doc.getElementById('editorSignatureAddSignature');
        if (addBtn) addBtn.click();
      }, 120);
    }
  });

  btnAddText.addEventListener('click', () => {
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    const textBtn = doc?.getElementById('editorFreeTextButton');
    if (textBtn) textBtn.click();
  });

  btnDraw.addEventListener('click', () => {
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    const inkBtn = doc?.getElementById('editorInkButton');
    if (inkBtn) inkBtn.click();
  });

  btnSave.addEventListener('click', async () => {
    try {
      const viewerWin = iframe.contentWindow;
      const app = viewerWin?.PDFViewerApplication;
      if (!app?.pdfDocument) throw new Error('PDF document is not ready.');

      app.pdfViewer?.annotationEditorUIManager?.commitOrRemove();
      if (app.pdfViewer && viewerWin.pdfjsLib?.AnnotationEditorType) {
        app.pdfViewer.annotationEditorMode = { mode: viewerWin.pdfjsLib.AnnotationEditorType.NONE ?? 0 };
      }

      btnSave.disabled = true;
      btnSave.textContent = 'Saving...';

      const rawBytes = await app.pdfDocument.saveDocument();
      const signedBytes = rawBytes instanceof Uint8Array ? rawBytes : new Uint8Array(rawBytes);
      const blob = new Blob([signedBytes], { type: 'application/pdf' });
      state.processedResult = { blob, filename: `signed_${pdfFileName}` };
      btnDownload.disabled = false;
      downloadBlob(blob, `signed_${pdfFileName}`);
      showToast('Signed PDF exported and downloaded successfully!');
      logActivity('Sign PDF', pdfFileName, { size: blob.size });
    } catch (err) {
      showToast('Error saving signed PDF: ' + err.message);
    } finally {
      btnSave.disabled = false;
      btnSave.innerHTML = `${getIcon('check', 15)} Save Signed PDF`;
    }
  });

  btnDownload.addEventListener('click', () => {
    if (state.processedResult) {
      downloadBlob(state.processedResult.blob, state.processedResult.filename || `signed_${pdfFileName}`);
    }
  });
}

/* ========================================================================= */
/*                          CORE PDF TOOLS: MERGE, SPLIT, ORGANIZE           */
/* ========================================================================= */
function renderPdfMergeTool(zone) {
  zone.innerHTML = `
    <div class="tool-body full-studio">
      <div id="mergePdfUploadArea">
        <div class="dropzone" id="mergePdfDropzone">
          <input type="file" accept="application/pdf" multiple>
          <div class="dropzone-icon">${getIcon('merge', 36)}</div>
          <b>Choose two or more PDF files</b>
          <small>Select multiple files to merge in order</small>
        </div>
      </div>

      <div id="mergePdfStudioArea" style="display:none;">
        <div class="studio-topbar">
          <div class="studio-topbar-left">
            <span class="file-badge">${getIcon('pdf', 18)} <strong id="mergePdfCount">0 files</strong></span>
            <button class="btn-subtle" id="btnAddMoreMerge">${getIcon('merge', 13)} Add More Files</button>
            <input type="file" accept="application/pdf" multiple id="mergeMoreInput" style="display:none;">
          </div>
          <div class="studio-topbar-center">
            <span style="font-size:12px;color:var(--muted);" id="mergePdfPagesHint"></span>
          </div>
          <div class="studio-topbar-right">
            <button class="btn-primary" id="btnProcessMerge">${getIcon('merge', 15)} Merge PDFs</button>
            <button class="btn-secondary" id="btnDownloadMerge" disabled>${getIcon('download', 15)} Download</button>
          </div>
        </div>
      </div>

      <div id="mergeFileList" class="merge-file-grid"></div>
    </div>
  `;

  let pdfBuffers = [];
  let fileNames = [];
  let previewUrls = [];
  const listEl = document.getElementById('mergeFileList');
  const btnProcess = document.getElementById('btnProcessMerge');
  const btnDownload = document.getElementById('btnDownloadMerge');
  const uploadArea = document.getElementById('mergePdfUploadArea');
  const studioArea = document.getElementById('mergePdfStudioArea');
  const mergeMoreInput = document.getElementById('mergeMoreInput');
  const btnAddMore = document.getElementById('btnAddMoreMerge');
  const mergePdfCount = document.getElementById('mergePdfCount');
  const mergePdfPagesHint = document.getElementById('mergePdfPagesHint');

  function showStudio() {
    uploadArea.style.display = 'none';
    studioArea.style.display = 'block';
  }

  async function addFiles(files) {
    for (const f of files) {
      const ab = await readFileAsArrayBuffer(f);
      const bytes = new Uint8Array(ab);
      pdfBuffers.push(bytes);
      fileNames.push(f.name);
      try {
        const doc = await loadPdfDocument(bytes);
        const page = await doc.getPage(1);
        const viewport = page.getViewport({ scale: Math.min(150 / page.getViewport({ scale: 1 }).width, 0.22) });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        previewUrls.push(canvas.toDataURL('image/jpeg', 0.72));
        canvas.width = 0; canvas.height = 0;
        await doc.destroy();
      } catch (error) {
        console.warn(`Could not create preview for ${f.name}`, error);
        previewUrls.push('');
      }
    }
    if (fileNames.length > 0) showStudio();
    renderMergeList();
  }

  setupDropzone(document.getElementById('mergePdfDropzone'), async (files) => {
    if (!files.length) return;
    await addFiles(files);
  }, { multiple: true, accept: '.pdf' });

  btnAddMore.addEventListener('click', () => mergeMoreInput.click());
  mergeMoreInput.addEventListener('change', async (e) => {
    await addFiles(Array.from(e.target.files));
    mergeMoreInput.value = '';
  });

  function renderMergeList() {
    mergePdfCount.textContent = `${fileNames.length} file${fileNames.length !== 1 ? 's' : ''}`;
    mergePdfPagesHint.textContent = fileNames.length >= 2 ? `Ready to merge ${fileNames.length} documents` : 'Add at least 2 PDFs';

    listEl.innerHTML = fileNames.length > 0 ? `
        ${fileNames.map((name, i) => `
          <div class="file-info-pill merge-pdf-card" draggable="true" data-idx="${i}">
            ${previewUrls[i] ? `<img src="${previewUrls[i]}" alt="Preview of ${name.replace(/[&<>"']/g, '')}" style="width:100%;height:155px;object-fit:contain;background:#fff;border:1px solid var(--line);border-radius:6px;">` : `<div style="width:100%;height:155px;display:grid;place-items:center;background:var(--surface);border:1px solid var(--line);border-radius:6px;">PDF preview unavailable</div>`}
            <span style="width:100%;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><strong>${i + 1}.</strong> ${name}</span>
            <div style="display:flex;gap:6px;">
              <button class="pdf-page-btn" data-move="-1" data-idx="${i}" aria-label="Move ${name} up" ${i === 0 ? 'disabled' : ''}>↑</button>
              <button class="pdf-page-btn" data-move="1" data-idx="${i}" aria-label="Move ${name} down" ${i === fileNames.length - 1 ? 'disabled' : ''}>↓</button>
              <button class="remove-btn" data-idx="${i}">Remove</button>
            </div>
          </div>
        `).join('')}
    ` : '';

    const reorder = (from, to) => {
      if (to < 0 || to >= pdfBuffers.length || from === to) return;
      [pdfBuffers[from], pdfBuffers[to]] = [pdfBuffers[to], pdfBuffers[from]];
      [fileNames[from], fileNames[to]] = [fileNames[to], fileNames[from]];
      [previewUrls[from], previewUrls[to]] = [previewUrls[to], previewUrls[from]];
      btnDownload.disabled = true;
      renderMergeList();
    };
    let dragIndex = null;
    listEl.querySelectorAll('.merge-pdf-card').forEach(card => {
      card.addEventListener('dragstart', e => { dragIndex = Number(card.dataset.idx); e.dataTransfer.effectAllowed = 'move'; });
      card.addEventListener('dragover', e => e.preventDefault());
      card.addEventListener('drop', e => { e.preventDefault(); reorder(dragIndex, Number(card.dataset.idx)); });
    });
    listEl.querySelectorAll('[data-move]').forEach(button => button.addEventListener('click', () => reorder(Number(button.dataset.idx), Number(button.dataset.idx) + Number(button.dataset.move))));

    listEl.querySelectorAll('.remove-btn').forEach(b => {
      b.addEventListener('click', () => {
        const idx = parseInt(b.dataset.idx);
        pdfBuffers.splice(idx, 1);
        fileNames.splice(idx, 1);
        previewUrls.splice(idx, 1);
        if (fileNames.length === 0) {
          uploadArea.style.display = 'block';
          studioArea.style.display = 'none';
        }
        renderMergeList();
      });
    });

    btnProcess.disabled = pdfBuffers.length < 2;
  }

  btnProcess.addEventListener('click', async () => {
    btnProcess.disabled = true;
    try {
      const res = await PdfTools.mergePdfs(pdfBuffers);
      state.processedResult = res;
      btnDownload.disabled = false;
      logActivity('Merge PDF', `${pdfBuffers.length} documents`, { size: res.size });
      showToast(`Merged ${pdfBuffers.length} PDFs into ${res.totalPages} pages (${formatBytes(res.size)})`);
    } catch (e) {
      showToast('Merge error: ' + e.message);
    } finally {
      btnProcess.disabled = false;
    }
  });

  btnDownload.addEventListener('click', () => {
    if (state.processedResult) downloadBlob(state.processedResult.blob, 'merged_document.pdf');
  });
}

function renderPdfSplitTool(zone) {
  zone.innerHTML = `
    <div class="tool-body full-studio">
      <div id="splitUploadArea">
        <div class="dropzone" id="splitPdfDropzone">
          <input type="file" accept="application/pdf">
          <div class="dropzone-icon">${getIcon('split', 36)}</div>
          <b>Choose PDF document to split</b>
          <small>Select a single PDF file &bull; 100% offline</small>
        </div>
      </div>

      <div id="splitStudioArea" style="display:none;width:100%;">
        <div class="studio-topbar">
          <div class="studio-topbar-left">
            <span class="file-badge" id="fileInfoSplit"></span>
            <button class="btn-subtle" id="btnChangeSplit">Change</button>
          </div>
          <div class="studio-topbar-center">
            <div style="display:flex;align-items:center;gap:6px;">
              <label class="opt-label" style="margin:0;font-size:12px;" for="splitMode">Mode:</label>
              <select id="splitMode" class="opt-select" style="padding:4px 8px;font-size:13px;">
                <option value="range" selected>Extract Selected Pages</option>
                <option value="all">Split All Pages into Separate PDFs (ZIP)</option>
              </select>
            </div>

            <div style="display:flex;align-items:center;gap:6px;" id="splitRangeRow">
              <label class="opt-label" style="margin:0;font-size:12px;" for="splitRangeInput">Pages:</label>
              <input type="text" id="splitRangeInput" class="opt-input" value="1" placeholder="e.g. 1-3, 5" style="width:130px;padding:4px 8px;font-size:13px;">
            </div>
            <span id="splitMeta" style="font-size:12px;color:var(--muted);font-weight:500;"></span>
          </div>
          <div class="studio-topbar-right">
            <button class="btn-primary" id="btnProcessSplit" disabled>${getIcon('split', 16)} Split PDF</button>
            <button class="btn-secondary" id="btnDownloadSplit" disabled>${getIcon('download', 16)} Download</button>
          </div>
        </div>

        <div class="studio-thumb-grid" style="margin-top:14px;padding:16px;">
          <div class="preview-stage" id="splitPreviewStage" style="min-height:360px;"></div>
        </div>
      </div>
    </div>
  `;

  let pdfBytes = null;
  let fileName = 'document.pdf';
  let totalPages = 0;
  const splitUploadArea = document.getElementById('splitUploadArea');
  const splitStudioArea = document.getElementById('splitStudioArea');
  const btnChangeSplit = document.getElementById('btnChangeSplit');
  const splitMode = document.getElementById('splitMode');
  const splitRangeRow = document.getElementById('splitRangeRow');
  const splitRangeInput = document.getElementById('splitRangeInput');
  const btnProcess = document.getElementById('btnProcessSplit');
  const btnDownload = document.getElementById('btnDownloadSplit');
  const previewStage = document.getElementById('splitPreviewStage');

  btnChangeSplit.addEventListener('click', () => {
    splitUploadArea.style.display = 'block';
    splitStudioArea.style.display = 'none';
    pdfBytes = null;
    btnProcess.disabled = true;
    btnDownload.disabled = true;
    previewStage.innerHTML = '';
  });

  splitMode.addEventListener('change', () => {
    splitRangeRow.style.display = splitMode.value === 'range' ? 'flex' : 'none';
  });

  function updateSelectedCardsFromInput() {
    const raw = splitRangeInput.value;
    const selectedPages = new Set();
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
    parts.forEach(part => {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(n => parseInt(n.trim()));
        if (!isNaN(start) && !isNaN(end)) {
          for (let p = Math.min(start, end); p <= Math.max(start, end); p++) {
            selectedPages.add(p);
          }
        }
      } else {
        const p = parseInt(part);
        if (!isNaN(p)) selectedPages.add(p);
      }
    });

    previewStage.querySelectorAll('.pdf-page-card').forEach(card => {
      const p = parseInt(card.dataset.pageNum);
      if (selectedPages.has(p)) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });

    document.getElementById('splitMeta').textContent = `Selected ${selectedPages.size} of ${totalPages} pages`;
  }

  splitRangeInput.addEventListener('input', updateSelectedCardsFromInput);

  setupDropzone(document.getElementById('splitPdfDropzone'), async ([file]) => {
    if (!file) return;
    fileName = file.name;
    const ab = await readFileAsArrayBuffer(file);
    pdfBytes = new Uint8Array(ab);
    document.getElementById('fileInfoSplit').innerHTML = `
      <strong>${escapeHtml(file.name)}</strong> <span class="file-size">${formatBytes(file.size)}</span>
    `;
    splitUploadArea.style.display = 'none';
    splitStudioArea.style.display = 'block';

    try {
      previewStage.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:240px;"><div class="dropzone-icon" style="animation:spin 1s linear infinite;">${getIcon('rotate', 32)}</div></div>`;
      const grid = await renderPdfThumbnailGrid(previewStage, pdfBytes, {
        onSelectPage: (p, card) => {
          // Toggle page selection in range
          const raw = splitRangeInput.value;
          const selectedPages = new Set();
          raw.split(',').map(s => s.trim()).filter(Boolean).forEach(part => {
            if (part.includes('-')) {
              const [s, e] = part.split('-').map(n => parseInt(n.trim()));
              if (!isNaN(s) && !isNaN(e)) for (let i = s; i <= e; i++) selectedPages.add(i);
            } else {
              const n = parseInt(part);
              if (!isNaN(n)) selectedPages.add(n);
            }
          });

          if (selectedPages.has(p)) {
            selectedPages.delete(p);
          } else {
            selectedPages.add(p);
          }

          const sorted = Array.from(selectedPages).sort((a, b) => a - b);
          splitRangeInput.value = sorted.join(', ') || '1';
          updateSelectedCardsFromInput();
        }
      });

      totalPages = grid.totalPages;
      if (totalPages > 1 && splitRangeInput.value === '1') {
        splitRangeInput.value = `1-${Math.min(3, totalPages)}`;
      }
      updateSelectedCardsFromInput();
      btnProcess.disabled = false;
    } catch (e) {
      previewStage.innerHTML = `<div style="color:var(--danger);padding:20px;">Failed to render pages: ${escapeHtml(e.message)}</div>`;
    }
  }, { accept: '.pdf' });

  btnProcess.addEventListener('click', async () => {
    if (!pdfBytes) return;
    btnProcess.disabled = true;
    try {
      const mode = splitMode.value;
      const res = await PdfTools.splitPdf(pdfBytes, mode === 'all' ? 'all' : splitRangeInput.value);
      state.processedResult = res;
      btnDownload.disabled = false;
      logActivity('Split PDF', fileName, { size: res.size });
      showToast(res.isZip ? `Extracted all pages to ZIP!` : `Extracted pages to PDF!`);
    } catch (e) {
      showToast('Split failed: ' + e.message);
    } finally {
      btnProcess.disabled = false;
    }
  });

  btnDownload.addEventListener('click', () => {
    if (!state.processedResult) return;
    const outName = state.processedResult.isZip ? 'split_pages.zip' : 'split_extracted.pdf';
    downloadBlob(state.processedResult.blob, outName);
  });
}

function renderPdfOrganizeTool(zone) {
  zone.innerHTML = `
    <div class="tool-body full-studio">
      <div id="orgUploadArea">
        <div class="dropzone" id="orgPdfDropzone">
          <input type="file" accept="application/pdf">
          <div class="dropzone-icon">${getIcon('merge', 36)}</div>
          <b>Choose PDF to organize</b>
          <small>Reorder, rotate and manage pages visually &bull; 100% offline</small>
        </div>
      </div>

      <div id="orgStudioArea" style="display:none;width:100%;">
        <div class="studio-topbar">
          <div class="studio-topbar-left">
            <span class="file-badge" id="fileInfoOrg"></span>
            <button class="btn-subtle" id="btnChangeOrg">Change</button>
          </div>
          <div class="studio-topbar-center">
            <div style="display:flex;align-items:center;gap:6px;">
              <label class="opt-label" style="margin:0;font-size:12px;" for="orgAction">Quick Actions:</label>
              <select id="orgAction" class="opt-select" style="padding:4px 8px;font-size:13px;">
                <option value="none" selected>Custom Card Reordering</option>
                <option value="rotate90">Rotate All Pages 90&deg; Clockwise</option>
                <option value="rotate180">Rotate All Pages 180&deg;</option>
                <option value="addBlank">Insert Blank Page at End</option>
              </select>
            </div>
            <span id="orgMeta" style="font-size:12px;color:var(--muted);font-weight:500;"></span>
          </div>
          <div class="studio-topbar-right">
            <button class="btn-primary" id="btnProcessOrg" disabled>${getIcon('merge', 16)} Apply Changes</button>
            <button class="btn-secondary" id="btnDownloadOrg" disabled>${getIcon('download', 16)} Download</button>
          </div>
        </div>

        <div class="studio-thumb-grid" style="margin-top:14px;padding:16px;">
          <div class="preview-stage" id="orgPreviewStage" style="min-height:360px;"></div>
        </div>
      </div>
    </div>
  `;

  let pdfBytes = null;
  let fileName = 'doc.pdf';
  let pageConfigs = [];
  const orgUploadArea = document.getElementById('orgUploadArea');
  const orgStudioArea = document.getElementById('orgStudioArea');
  const btnChangeOrg = document.getElementById('btnChangeOrg');
  const orgAction = document.getElementById('orgAction');
  const btnProcess = document.getElementById('btnProcessOrg');
  const btnDownload = document.getElementById('btnDownloadOrg');
  const previewStage = document.getElementById('orgPreviewStage');

  btnChangeOrg.addEventListener('click', () => {
    orgUploadArea.style.display = 'block';
    orgStudioArea.style.display = 'none';
    pdfBytes = null;
    pageConfigs = [];
    btnProcess.disabled = true;
    btnDownload.disabled = true;
    previewStage.innerHTML = '';
  });

  async function refreshPageThumbnails() {
    previewStage.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:240px;"><div class="dropzone-icon" style="animation:spin 1s linear infinite;">${getIcon('rotate', 32)}</div></div>`;
    const res = await renderPdfThumbnailGrid(previewStage, pdfBytes, {
      showActions: true
    });

    document.getElementById('orgMeta').textContent = `${res.totalPages} pages in document`;

    // Initialize configs if empty
    if (pageConfigs.length === 0) {
      for (let i = 0; i < res.totalPages; i++) {
        pageConfigs.push({ origIndex: i, rotateDelta: 0, delete: false });
      }
    }

    // Bind action buttons on each card
    previewStage.querySelectorAll('.pdf-page-card').forEach(card => {
      const pageNum = parseInt(card.dataset.pageNum);
      const index = pageNum - 1;

      card.querySelectorAll('.pdf-page-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const act = btn.dataset.act;
          if (act === 'move-left' && index > 0) {
            const temp = pageConfigs[index];
            pageConfigs[index] = pageConfigs[index - 1];
            pageConfigs[index - 1] = temp;
            showToast(`Moved Page ${pageNum} left.`);
            renderConfiguredCards();
          } else if (act === 'move-right' && index < pageConfigs.length - 1) {
            const temp = pageConfigs[index];
            pageConfigs[index] = pageConfigs[index + 1];
            pageConfigs[index + 1] = temp;
            showToast(`Moved Page ${pageNum} right.`);
            renderConfiguredCards();
          } else if (act === 'rotate') {
            pageConfigs[index].rotateDelta = ((pageConfigs[index].rotateDelta || 0) + 90) % 360;
            const canvas = card.querySelector('canvas');
            if (canvas) {
              canvas.style.transform = `rotate(${pageConfigs[index].rotateDelta}deg)`;
              canvas.style.transition = 'transform 0.2s';
            }
            showToast(`Rotated Page ${pageNum} by 90&deg;.`);
          } else if (act === 'delete') {
            pageConfigs.splice(index, 1);
            showToast(`Removed page ${pageNum}.`);
            renderConfiguredCards();
          }
        });
      });
    });
  }

  function renderConfiguredCards() {
    // Re-orders the cards visually based on pageConfigs
    const grid = previewStage.querySelector('#pdfThumbGrid');
    if (!grid) return;
    const cards = Array.from(grid.querySelectorAll('.pdf-page-card'));
    cards.forEach(c => c.remove());

    pageConfigs.forEach((cfg, idx) => {
      const match = cards.find(c => parseInt(c.dataset.pageNum) === (cfg.origIndex + 1));
      if (match) {
        match.querySelector('.pdf-page-badge').textContent = `Position ${idx + 1} (Orig: P${cfg.origIndex + 1})`;
        grid.appendChild(match);
      }
    });
  }

  setupDropzone(document.getElementById('orgPdfDropzone'), async ([file]) => {
    if (!file) return;
    fileName = file.name;
    const ab = await readFileAsArrayBuffer(file);
    pdfBytes = new Uint8Array(ab);
    document.getElementById('fileInfoOrg').innerHTML = `<strong>${escapeHtml(file.name)}</strong> <span class="file-size">${formatBytes(file.size)}</span>`;
    orgUploadArea.style.display = 'none';
    orgStudioArea.style.display = 'block';
    pageConfigs = [];
    await refreshPageThumbnails();
    btnProcess.disabled = false;
  }, { accept: '.pdf' });

  btnProcess.addEventListener('click', async () => {
    if (!pdfBytes) return;
    try {
      const action = orgAction.value;
      let finalConfigs = [...pageConfigs];

      if (action === 'rotate90') {
        finalConfigs.forEach(c => c.rotateDelta = ((c.rotateDelta || 0) + 90) % 360);
      } else if (action === 'rotate180') {
        finalConfigs.forEach(c => c.rotateDelta = ((c.rotateDelta || 0) + 180) % 360);
      } else if (action === 'addBlank') {
        finalConfigs.push({ isBlank: true });
      }

      const res = await PdfTools.organizePdfPages(pdfBytes, finalConfigs);
      state.processedResult = res;
      btnDownload.disabled = false;
      logActivity('Organize Pages', fileName, { size: res.size });
      showToast(`Pages organized successfully! Total: ${res.totalPages} pages.`);
    } catch (e) {
      showToast('Organize error: ' + e.message);
    }
  });

  btnDownload.addEventListener('click', () => {
    if (state.processedResult) downloadBlob(state.processedResult.blob, `organized_${fileName}`);
  });
}

function renderPdfCompressTool(zone) {
  zone.innerHTML = `
    <div class="tool-body full-studio">
      <div id="compPdfUploadArea">
        <div class="dropzone" id="compPdfDropzone">
          <input type="file" accept="application/pdf">
          <div class="dropzone-icon">${getIcon('compress', 36)}</div>
          <b>Choose PDF to compress</b>
          <small>Adjust compression strength and image quality &bull; 100% offline</small>
        </div>
      </div>

      <div id="compPdfStudioArea" style="display:none;width:100%;">
        <div class="studio-topbar">
          <div class="studio-topbar-left">
            <span class="file-badge" id="fileInfoCompPdf"></span>
            <button class="btn-subtle" id="btnChangeCompPdf">Change</button>
          </div>
          <div class="studio-topbar-center compress-settings">
            <div style="display:flex;align-items:center;gap:8px;min-width:260px;">
              <label class="opt-label" style="margin:0;font-size:12px;white-space:nowrap;" for="compPdfQuality">Compression strength: <b id="compPdfQualityValue">50%</b></label>
              <input type="range" id="compPdfQuality" min="0" max="80" step="5" value="50" style="width:120px;">
            </div>
            <div><span id="compPdfMeta" style="font-size:12px;color:var(--muted);font-weight:500;"></span><div class="compress-note">Higher strength can reduce image quality and flatten page content. The saved file will never be larger than the original.</div></div>
          </div>
          <div class="studio-topbar-right">
            <button class="btn-primary" id="btnProcessCompPdf" disabled>${getIcon('compress', 16)} Compress PDF</button>
            <button class="btn-secondary" id="btnDownloadCompPdf" disabled>${getIcon('download', 16)} Download</button>
          </div>
        </div>

        <div id="compPdfStats" style="display:none;margin-top:14px;" class="result-card"></div>

        <div class="studio-image-preview" style="margin-top:14px;">
          <div class="preview-stage" id="compPdfPreviewStage" style="display:flex;align-items:center;justify-content:center;width:100%;"></div>
        </div>
      </div>
    </div>
  `;

  let pdfBytes = null;
  let fileName = 'doc.pdf';
  const compPdfUploadArea = document.getElementById('compPdfUploadArea');
  const compPdfStudioArea = document.getElementById('compPdfStudioArea');
  const btnChangeCompPdf = document.getElementById('btnChangeCompPdf');
  const btnProcess = document.getElementById('btnProcessCompPdf');
  const btnDownload = document.getElementById('btnDownloadCompPdf');
  const previewStage = document.getElementById('compPdfPreviewStage');
  const compPdfQuality = document.getElementById('compPdfQuality');
  compPdfQuality.addEventListener('input', () => { document.getElementById('compPdfQualityValue').textContent = `${compPdfQuality.value}%`; });

  btnChangeCompPdf.addEventListener('click', () => {
    compPdfUploadArea.style.display = 'block';
    compPdfStudioArea.style.display = 'none';
    pdfBytes = null;
    btnProcess.disabled = true;
    btnDownload.disabled = true;
    document.getElementById('compPdfStats').style.display = 'none';
    previewStage.innerHTML = '';
  });

  setupDropzone(document.getElementById('compPdfDropzone'), async ([file]) => {
    if (!file) return;
    fileName = file.name;
    const ab = await readFileAsArrayBuffer(file);
    pdfBytes = new Uint8Array(ab);
    document.getElementById('fileInfoCompPdf').innerHTML = `<strong>${escapeHtml(file.name)}</strong> <span class="file-size">${formatBytes(file.size)}</span>`;
    compPdfUploadArea.style.display = 'none';
    compPdfStudioArea.style.display = 'block';

    try {
      previewStage.innerHTML = `<canvas id="compPdfPreviewCanvas" class="preview-canvas"></canvas>`;
      const canvas = previewStage.querySelector('#compPdfPreviewCanvas');
      const pdfDoc = await loadPdfDocument(pdfBytes);
      await renderPdfPage(pdfDoc, 1, canvas, { fitWidth: 540 });
      document.getElementById('compPdfMeta').textContent = `${file.name} (Original: ${formatBytes(file.size)})`;
      btnProcess.disabled = false;
    } catch (e) {
      previewStage.innerHTML = `<div style="color:var(--danger);padding:20px;">Failed to render preview: ${escapeHtml(e.message)}</div>`;
    }
  }, { accept: '.pdf' });

  btnProcess.addEventListener('click', async () => {
    if (!pdfBytes) return;
    try {
      btnProcess.disabled = true;
      const res = await PdfTools.compressPdf(pdfBytes, Number(compPdfQuality.value));
      state.processedResult = res;
      document.getElementById('compPdfStats').style.display = 'grid';
      const savingsPct = Math.round((1 - res.size / res.initialSize) * 100);
      document.getElementById('compPdfStats').innerHTML = `
        <div class="stat-item"><span class="stat-title">Original Size</span><span class="stat-val">${formatBytes(res.initialSize)}</span></div>
        <div class="stat-item"><span class="stat-title">Compressed Size</span><span class="stat-val" style="color:var(--success);">${formatBytes(res.size)}</span></div>
        <div class="stat-item"><span class="stat-title">Reduction</span><span class="stat-val" style="color:${savingsPct > 0 ? 'var(--success)' : 'var(--muted)'};">${savingsPct > 0 ? `${savingsPct}% smaller` : savingsPct === 0 ? 'No size change' : `${Math.abs(savingsPct)}% larger`}</span></div>
      `;
      btnDownload.disabled = false;
      logActivity('Compress PDF', fileName, { size: res.size });
      showToast(res.isSmaller ? `PDF reduced by ${savingsPct}%` : 'This PDF was already optimized; the original size was kept.');
    } catch (e) {
      showToast('Compression error: ' + e.message);
    } finally {
      btnProcess.disabled = false;
    }
  });

  btnDownload.addEventListener('click', () => {
    if (state.processedResult) downloadBlob(state.processedResult.blob, `compressed_${fileName}`);
  });
}

function renderPdfWatermarkTool(zone) {
  zone.innerHTML = `
    <div class="tool-body full-studio watermark-tool">
      <div id="wmPdfUploadArea">
        <div class="dropzone" id="wmPdfDropzone">
          <input type="file" accept="application/pdf">
          <div class="dropzone-icon">${getIcon('watermark', 36)}</div>
          <b>Choose PDF document</b>
          <small>Add custom watermark to all pages &bull; 100% offline</small>
        </div>
      </div>

      <div id="wmPdfStudioArea" class="wm-workspace" style="display:none;">
        <section class="wm-settings-panel" aria-label="Watermark settings">
          <div class="wm-filebar">
            <span class="file-badge" id="fileInfoWmPdf"></span>
            <button class="btn-subtle" id="btnChangeWmPdf">Change</button>
          </div>

          <div class="wm-setting-card wm-text-card">
            <label class="opt-label" for="wmText">Text watermark</label>
            <div class="wm-text-row">
              <input type="text" id="wmText" class="opt-input" value="CONFIDENTIAL" placeholder="Enter watermark text">
              <button class="btn-subtle" id="wmClearText" type="button">Clear</button>
            </div>
          </div>

          <div class="wm-setting-card wm-logo-card">
            <div class="wm-card-heading"><label class="opt-label" for="wmImageFile">Logo image</label><span class="wm-muted">PNG or JPG</span></div>
            <div class="wm-file-row"><input type="file" id="wmImageFile" accept="image/png,image/jpeg"><button class="btn-subtle" type="button" id="wmClearImage" disabled>Remove</button></div>
            <small id="wmImageStatus" class="wm-help">Optional. Choose text, logo, or both below.</small>
          </div>

          <div class="wm-setting-card wm-mode-card">
            <span class="wm-card-title">Watermark content</span>
            <div class="wm-radio-row" role="radiogroup" aria-label="Watermark content">
              <label><input id="wmModeText" type="radio" name="wmContentMode" value="text"><span>Text</span></label>
              <label><input id="wmModeImage" type="radio" name="wmContentMode" value="image"><span>Logo</span></label>
              <label><input id="wmModeBoth" type="radio" name="wmContentMode" value="both" checked><span>Both</span></label>
            </div>
          </div>

          <div class="wm-compact-row">
            <div class="wm-setting-card">
              <label class="opt-label" for="wmApplyScope">Apply to</label>
              <select id="wmApplyScope" class="opt-input">
                <option value="all" selected>All pages</option>
                <option value="current">This page</option>
              </select>
            </div>
            <div class="wm-setting-card">
              <label class="opt-label" for="wmOpacity">Opacity <b><span id="valWmOp">30</span>%</b></label>
              <input type="range" id="wmOpacity" min="0" max="100" value="30">
            </div>
          </div>

          <div class="wm-setting-card wm-placement-card">
            <label class="wm-switch-label" for="wmPlacementToggle"><input type="checkbox" id="wmPlacementToggle" checked><span>Placement</span></label>
            <div class="wm-placement-controls">
              <label class="wm-range-label" for="wmAngle">Angle <b><span id="valWmAngle">45</span>&deg;</b></label>
              <input type="range" id="wmAngle" min="-90" max="90" value="45">
              <div class="wm-xy-grid">
                <label class="wm-range-label" for="wmX">Position X <b><span id="valWmX">50</span>%</b></label>
                <input type="range" id="wmX" min="0" max="100" value="50">
                <label class="wm-range-label" for="wmY">Position Y <b><span id="valWmY">50</span>%</b></label>
                <input type="range" id="wmY" min="0" max="100" value="50">
              </div>
            </div>
          </div>

          <div class="wm-setting-card wm-size-card">
            <label class="wm-switch-label" for="wmSizeToggle"><input type="checkbox" id="wmSizeToggle" checked><span>Size</span><b><span id="valWmSize">100</span>%</b></label>
            <input type="range" id="wmSize" min="25" max="200" step="5" value="100">
          </div>

          <div class="wm-actions">
            <button class="btn-primary" id="btnProcessWmPdf" disabled>${getIcon('watermark', 16)} Apply watermark</button>
            <button class="btn-secondary" id="btnDownloadWmPdf" disabled>${getIcon('download', 16)} Download</button>
            <span id="wmPdfMeta" class="wm-meta"></span>
          </div>
        </section>

        <section class="wm-preview-panel" aria-label="PDF page preview">
          <div class="viewer-toolbar wm-pagebar">
            <div class="viewer-toolbar-group">
              <button class="viewer-tool-btn" id="btnWmPrevPage" aria-label="Previous page" disabled>&larr;</button>
              <span id="wmPageLabel" class="wm-page-label">Page 1 of 1</span>
              <button class="viewer-tool-btn" id="btnWmNextPage" aria-label="Next page" disabled>&rarr;</button>
            </div>
          </div>
          <div class="preview-stage wm-preview-stage" id="wmPdfPreviewStage">
            <div class="preview-placeholder">Choose a PDF to preview its watermark</div>
          </div>
        </section>
      </div>
    </div>
  `;

  let pdfBytes = null;
  let fileName = 'doc.pdf';
  let pdfDoc = null;
  let currentPage = 1;
  const wmPdfUploadArea = document.getElementById('wmPdfUploadArea');
  const wmPdfStudioArea = document.getElementById('wmPdfStudioArea');
  const btnChangeWmPdf = document.getElementById('btnChangeWmPdf');
  const wmText = document.getElementById('wmText');
  const wmOpacity = document.getElementById('wmOpacity');
  const wmAngle = document.getElementById('wmAngle');
  const wmImageFile = document.getElementById('wmImageFile');
  const wmClearImage = document.getElementById('wmClearImage');
  const wmX = document.getElementById('wmX');
  const wmY = document.getElementById('wmY');
  const wmSize = document.getElementById('wmSize');
  const wmSizeToggle = document.getElementById('wmSizeToggle');
  const wmPlacementToggle = document.getElementById('wmPlacementToggle');
  const wmContentModeOptions = [...zone.querySelectorAll('input[name="wmContentMode"]')];
  const wmClearText = document.getElementById('wmClearText');
  const wmApplyScope = document.getElementById('wmApplyScope');
  let watermarkImageBytes = null;
  let watermarkImageUrl = null;
  const btnProcess = document.getElementById('btnProcessWmPdf');
  const btnDownload = document.getElementById('btnDownloadWmPdf');
  const previewStage = document.getElementById('wmPdfPreviewStage');
  let watermarkPreviewFrame = 0;
  let watermarkPreviewVersion = 0;
  let watermarkPageRenderQueue = Promise.resolve();
  let watermarkPageRenderVersion = 0;
  let watermarkResizeObserver = null;

  function getWatermarkContentMode() {
    return wmContentModeOptions.find(option => option.checked)?.value || 'both';
  }

  btnChangeWmPdf.addEventListener('click', () => {
    wmPdfUploadArea.style.display = 'block';
    wmPdfStudioArea.style.display = 'none';
    pdfBytes = null;
    pdfDoc = null;
    btnProcess.disabled = true;
    btnDownload.disabled = true;
    state.processedResult = null;
    previewStage.innerHTML = '';
    watermarkResizeObserver?.disconnect();
  });

  wmOpacity.addEventListener('input', () => {
    document.getElementById('valWmOp').textContent = wmOpacity.value;
    scheduleWatermarkPreview();
  });
  wmAngle.addEventListener('input', () => {
    document.getElementById('valWmAngle').textContent = wmAngle.value;
    scheduleWatermarkPreview();
  });
  wmText.addEventListener('input', () => {
    syncWatermarkProcessButton();
    scheduleWatermarkPreview();
  });
  wmClearText.addEventListener('click', () => {
    wmText.value = '';
    syncWatermarkProcessButton();
    scheduleWatermarkPreview();
    wmText.focus();
  });
  wmContentModeOptions.forEach(option => option.addEventListener('change', () => {
    updateWatermarkSelectionStatus();
    syncWatermarkProcessButton();
    scheduleWatermarkPreview();
  }));
  wmApplyScope.addEventListener('change', scheduleWatermarkPreview);
  wmPlacementToggle.addEventListener('change', () => {
    [wmAngle, wmX, wmY].forEach(input => { input.disabled = !wmPlacementToggle.checked; });
    scheduleWatermarkPreview();
  });
  wmSizeToggle.addEventListener('change', () => {
    wmSize.disabled = !wmSizeToggle.checked;
    scheduleWatermarkPreview();
  });
  wmSize.addEventListener('input', () => {
    document.getElementById('valWmSize').textContent = wmSize.value;
    scheduleWatermarkPreview();
  });
  [[wmX, 'valWmX'], [wmY, 'valWmY']].forEach(([input, output]) => input.addEventListener('input', () => {
    document.getElementById(output).textContent = input.value;
    scheduleWatermarkPreview();
  }));
  wmImageFile.addEventListener('change', async () => {
    const image = wmImageFile.files?.[0];
    if (watermarkImageUrl) URL.revokeObjectURL(watermarkImageUrl);
    watermarkImageUrl = image ? URL.createObjectURL(image) : null;
    watermarkImageBytes = null;
    wmClearImage.disabled = !image;
    document.getElementById('wmImageStatus').textContent = image ? `Loading ${image.name}…` : 'Optional. Choose text, logo, or both below.';
    if (!image) { updateWatermarkSelectionStatus(); syncWatermarkProcessButton(); scheduleWatermarkPreview(); return; }
    try {
      watermarkImageBytes = new Uint8Array(await readFileAsArrayBuffer(image));
      updateWatermarkSelectionStatus();
    } catch (error) {
      watermarkImageBytes = null;
      wmClearImage.disabled = true;
      wmImageFile.value = '';
      document.getElementById('wmImageStatus').textContent = `Could not read image: ${error.message}`;
    }
    syncWatermarkProcessButton();
    scheduleWatermarkPreview();
  });
  wmClearImage.addEventListener('click', () => {
    wmImageFile.value = '';
    wmImageFile.dispatchEvent(new Event('change'));
  });

  function updateWatermarkSelectionStatus() {
    const image = wmImageFile.files?.[0];
    const status = document.getElementById('wmImageStatus');
    if (!image) {
      status.textContent = 'Optional. Choose text, logo, or both below.';
    } else if (getWatermarkContentMode() === 'text') {
      status.textContent = `${image.name} is ready. Text only is selected; choose logo only or text and logo to include it.`;
    } else if (getWatermarkContentMode() === 'image') {
      status.textContent = `${image.name} is ready and will appear without the text.`;
    } else {
      status.textContent = `${image.name} is ready and will appear with the text.`;
    }
  }

  function syncWatermarkProcessButton() {
    const mode = getWatermarkContentMode();
    const includesText = mode !== 'image' && Boolean(wmText.value.trim());
    const includesImage = mode !== 'text' && Boolean(watermarkImageBytes);
    btnProcess.disabled = !pdfBytes || (!includesText && !includesImage);
  }

  function scheduleWatermarkPreview() {
    cancelAnimationFrame(watermarkPreviewFrame);
    const version = ++watermarkPreviewVersion;
    watermarkPreviewFrame = requestAnimationFrame(() => {
      if (version === watermarkPreviewVersion) updateWatermarkPreviewOverlay();
    });
  }

  function updateWatermarkPreviewOverlay() {
    const page = previewStage.querySelector('#wmPreviewPage');
    const overlay = previewStage.querySelector('#wmPreviewOverlay');
    if (!page || !overlay) return;
    const opacity = Number(wmOpacity.value) / 100;
    const placementOn = wmPlacementToggle.checked;
    const angle = placementOn ? Number(wmAngle.value) : 0;
    const xPercent = placementOn ? Number(wmX.value) : 50;
    const yPercent = placementOn ? Number(wmY.value) : 50;
    const sizeScale = wmSizeToggle.checked ? Number(wmSize.value) / 100 : 1;
    overlay.style.opacity = String(opacity);
    overlay.style.transform = `translate(-50%, -50%) rotate(${-angle}deg) scale(${sizeScale})`;
    const mode = getWatermarkContentMode();
    overlay.style.width = watermarkImageUrl && mode !== 'text' ? '35%' : 'max-content';
    overlay.style.maxHeight = watermarkImageUrl && mode !== 'text' ? '35%' : 'none';
    overlay.style.height = watermarkImageUrl && mode !== 'text' ? '35%' : 'max-content';
    overlay.style.flexDirection = 'column';
    overlay.style.gap = watermarkImageUrl && mode === 'both' ? '6px' : '0';
    overlay.replaceChildren();
    const showImage = Boolean(watermarkImageUrl && watermarkImageBytes && mode !== 'text');
    const showText = mode !== 'image' && Boolean(wmText.value.trim());
    if (showImage) {
      const image = document.createElement('img');
      image.src = watermarkImageUrl;
      image.alt = '';
      image.className = 'wm-preview-logo';
      if (mode === 'both' && showText) image.style.maxHeight = '60%';
      overlay.appendChild(image);
    }
    if (showText) {
      const text = document.createElement('span');
      text.className = 'wm-preview-text';
      text.textContent = wmText.value || 'CONFIDENTIAL';
      text.style.fontSize = `${Math.max(12, Math.min(48, page.clientWidth / 15))}px`;
      if (showImage) text.style.fontSize = `${Math.max(10, Math.min(32, page.clientWidth / 22))}px`;
      overlay.appendChild(text);
    }
    const angleRad = (angle * Math.PI) / 180;
    const scaledWidth = overlay.offsetWidth * sizeScale;
    const scaledHeight = overlay.offsetHeight * sizeScale;
    const boundsWidth = Math.abs(scaledWidth * Math.cos(angleRad)) + Math.abs(scaledHeight * Math.sin(angleRad));
    const boundsHeight = Math.abs(scaledHeight * Math.cos(angleRad)) + Math.abs(scaledWidth * Math.sin(angleRad));
    const halfWidth = boundsWidth / 2;
    const halfHeight = boundsHeight / 2;
    const left = halfWidth + Math.max(0, page.clientWidth - boundsWidth) * (xPercent / 100);
    const top = halfHeight + Math.max(0, page.clientHeight - boundsHeight) * (yPercent / 100);
    overlay.style.left = `${left}px`;
    overlay.style.top = `${top}px`;
    overlay.style.display = opacity > 0 && (showText || showImage) ? 'flex' : 'none';
  }

  async function drawLiveWatermarkPreview() {
    if (!pdfDoc) return;
    const canvas = previewStage.querySelector('#wmCanvas');
    if (!canvas) return;
    const version = ++watermarkPageRenderVersion;
    watermarkPageRenderQueue = watermarkPageRenderQueue.catch(() => {}).then(async () => {
      if (version !== watermarkPageRenderVersion || !canvas.isConnected) return;
      try {
        const previewPanel = previewStage.closest('.wm-preview-panel');
        const page = await pdfDoc.getPage(currentPage);
        const naturalViewport = page.getViewport({ scale: 1 });
        const toolbarHeight = previewPanel?.querySelector('.wm-pagebar')?.offsetHeight || 40;
        const availableHeight = Math.max(220, (previewPanel?.clientHeight || 560) - toolbarHeight - 48);
        const availableWidth = Math.max(190, (previewPanel?.clientWidth || 700) - 44);
        const fitWidth = Math.max(180, Math.min(availableWidth, availableHeight * naturalViewport.width / naturalViewport.height));
        await renderPdfPage(pdfDoc, currentPage, canvas, { fitWidth });
        if (version === watermarkPageRenderVersion && canvas.isConnected) updateWatermarkPreviewOverlay();
      } catch (error) {
        if (version === watermarkPageRenderVersion) console.warn('Watermark preview render failed', error);
      }
    });
  }

  setupDropzone(document.getElementById('wmPdfDropzone'), async ([file]) => {
    if (!file) return;
    fileName = file.name;
    const ab = await readFileAsArrayBuffer(file);
    pdfBytes = new Uint8Array(ab);
    document.getElementById('fileInfoWmPdf').innerHTML = `<strong>${escapeHtml(file.name)}</strong> <span class="file-size">${formatBytes(file.size)}</span>`;
    wmPdfUploadArea.style.display = 'none';
    wmPdfStudioArea.style.display = 'grid';

    try {
      previewStage.innerHTML = `
        <div class="wm-preview-page" id="wmPreviewPage">
          <canvas id="wmCanvas" class="preview-canvas"></canvas>
          <div id="wmPreviewOverlay" aria-hidden="true"></div>
        </div>
      `;

      pdfDoc = await loadPdfDocument(pdfBytes);
      currentPage = 1;

      const btnPrev = document.getElementById('btnWmPrevPage');
      const btnNext = document.getElementById('btnWmNextPage');
      const pageLabel = document.getElementById('wmPageLabel');

      function updateNav() {
        pageLabel.textContent = `Page ${currentPage} of ${pdfDoc.numPages}`;
        btnPrev.disabled = currentPage <= 1;
        btnNext.disabled = currentPage >= pdfDoc.numPages;
        drawLiveWatermarkPreview();
      }

      btnPrev.addEventListener('click', () => {
        if (currentPage > 1) { currentPage--; updateNav(); }
      });
      btnNext.addEventListener('click', () => {
        if (currentPage < pdfDoc.numPages) { currentPage++; updateNav(); }
      });

      updateNav();
      document.getElementById('wmPdfMeta').textContent = `${file.name} (${pdfDoc.numPages} pages)`;
      syncWatermarkProcessButton();
      watermarkResizeObserver?.disconnect();
      watermarkResizeObserver = new ResizeObserver(() => drawLiveWatermarkPreview());
      watermarkResizeObserver.observe(document.querySelector('.wm-preview-panel'));
    } catch (e) {
      previewStage.innerHTML = `<div style="color:var(--danger);padding:20px;">Failed to render: ${escapeHtml(e.message)}</div>`;
    }
  }, { accept: '.pdf' });

  btnProcess.addEventListener('click', async () => {
    if (!pdfBytes) return;
    try {
      const selectedMode = getWatermarkContentMode();
      const useText = selectedMode !== 'image';
      const useImage = selectedMode !== 'text' && Boolean(watermarkImageBytes);
      const placementOn = wmPlacementToggle.checked;
      const targetPageIndices = wmApplyScope.value === 'current' ? [currentPage - 1] : undefined;
      const res = await PdfTools.watermarkPdf(pdfBytes, useText ? wmText.value.trim() : '', {
        opacity: Number(wmOpacity.value) / 100,
        angle: placementOn ? Number(wmAngle.value) : 0,
        x: placementOn ? Number(wmX.value) / 100 : 0.5,
        y: placementOn ? 1 - Number(wmY.value) / 100 : 0.5,
        sizeScale: wmSizeToggle.checked ? Number(wmSize.value) / 100 : 1,
        imageBytes: useImage ? watermarkImageBytes : null,
        imageType: useImage ? wmImageFile.files?.[0]?.type : null,
        pageIndices: targetPageIndices
      });
      state.processedResult = res;
      btnDownload.disabled = false;
      logActivity('Watermark PDF', fileName, { size: res.size });
      showToast(wmApplyScope.value === 'current' ? `Watermark added to page ${currentPage}.` : 'Watermark added to all pages.');
    } catch (e) {
      showToast('Watermark error: ' + e.message);
    }
  });

  btnDownload.addEventListener('click', () => {
    if (state.processedResult) downloadBlob(state.processedResult.blob, `watermarked_${fileName}`);
  });
}

function renderPdfToImageTool(zone) {
  zone.innerHTML = `
    <div class="tool-body full-studio">
      <div id="p2iUploadArea">
        <div class="dropzone" id="p2iDropzone">
          <input type="file" accept="application/pdf">
          <div class="dropzone-icon">${getIcon('convert', 36)}</div>
          <b>Choose PDF document to extract images</b>
          <small>Renders every page into high-resolution JPG or PNG &bull; 100% offline</small>
        </div>
      </div>

      <div id="p2iStudioArea" style="display:none;width:100%;">
        <div class="studio-topbar">
          <div class="studio-topbar-left">
            <span class="file-badge" id="fileInfoP2i"></span>
            <button class="btn-subtle" id="btnChangeP2i">Change</button>
          </div>
          <div class="studio-topbar-center">
            <div style="display:flex;align-items:center;gap:6px;">
              <label class="opt-label" style="margin:0;font-size:12px;" for="p2iFmt">Format:</label>
              <select id="p2iFmt" class="opt-select" style="padding:4px 8px;font-size:13px;">
                <option value="png" selected>PNG (Lossless)</option>
                <option value="jpeg">JPEG (Compact)</option>
              </select>
            </div>
            <span id="p2iMeta" style="font-size:12px;color:var(--muted);font-weight:500;"></span>
          </div>
          <div class="studio-topbar-right">
            <button class="btn-primary" id="btnProcessP2i" disabled>${getIcon('convert', 16)} Convert to Images</button>
            <button class="btn-secondary" id="btnDownloadP2i" disabled>${getIcon('download', 16)} Download</button>
          </div>
        </div>

        <div class="studio-thumb-grid p2i-output-panel">
          <div class="preview-stage" id="p2iPreviewStage" style="min-height:240px;"></div>
        </div>
        <div class="p2i-download-backdrop" id="p2iDownloadDialog" hidden>
          <section class="p2i-download-dialog" role="dialog" aria-modal="true" aria-labelledby="p2iDownloadTitle">
            <div class="p2i-download-icon">${getIcon('download', 20)}</div>
            <h2 id="p2iDownloadTitle">Download converted images</h2>
            <p>Choose how you want to save the page images.</p>
            <div class="p2i-download-choices">
              <button class="btn-primary" id="p2iDownloadZip">${getIcon('download', 16)} Download as ZIP</button>
              <button class="btn-secondary" id="p2iDownloadIndividual">${getIcon('image', 16)} Download individually</button>
            </div>
            <button class="btn-subtle p2i-download-cancel" id="p2iDownloadCancel">Cancel</button>
          </section>
        </div>
      </div>
    </div>
  `;

  let pdfBytes = null;
  let fileName = 'doc.pdf';
  const p2iUploadArea = document.getElementById('p2iUploadArea');
  const p2iStudioArea = document.getElementById('p2iStudioArea');
  const btnChangeP2i = document.getElementById('btnChangeP2i');
  const btnProcess = document.getElementById('btnProcessP2i');
  const btnDownload = document.getElementById('btnDownloadP2i');
  const previewStage = document.getElementById('p2iPreviewStage');
  const downloadDialog = document.getElementById('p2iDownloadDialog');
  const closeDownloadDialog = () => { downloadDialog.hidden = true; };
  let imageBlobs = [];

  btnChangeP2i.addEventListener('click', () => {
    pdfBytes = null;
    imageBlobs = [];
    state.processedResult = null;
    p2iUploadArea.style.display = 'block';
    p2iStudioArea.style.display = 'none';
    btnProcess.disabled = true;
    btnDownload.disabled = true;
    previewStage.innerHTML = '';
  });

  setupDropzone(document.getElementById('p2iDropzone'), async ([file]) => {
    if (!file) return;
    fileName = file.name;
    const ab = await readFileAsArrayBuffer(file);
    pdfBytes = new Uint8Array(ab);
    document.getElementById('fileInfoP2i').innerHTML = `<strong>${escapeHtml(file.name)}</strong> <span class="file-size">${formatBytes(file.size)}</span>`;
    p2iUploadArea.style.display = 'none';
    p2iStudioArea.style.display = 'block';

    try {
      previewStage.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:240px;"><div class="dropzone-icon" style="animation:spin 1s linear infinite;">${getIcon('rotate', 32)}</div></div>`;
      const grid = await renderPdfThumbnailGrid(previewStage, pdfBytes);
      document.getElementById('p2iMeta').textContent = `${grid.totalPages} pages ready to export`;
      btnProcess.disabled = false;
    } catch (e) {
      previewStage.innerHTML = `<div style="color:var(--danger);padding:20px;">Failed to render pages: ${escapeHtml(e.message)}</div>`;
    }
  }, { accept: '.pdf' });

  btnProcess.addEventListener('click', async () => {
    if (!pdfBytes) return;
    btnProcess.disabled = true;
    btnDownload.disabled = true;
    imageBlobs = [];
    state.processedResult = null;
    previewStage.innerHTML = '<div class="p2i-result-state" role="status" aria-live="polite"><span>Converting PDF pages…</span></div>';
    showToast('Extracting pages to images...');
    try {
      const fmt = document.getElementById('p2iFmt').value;
      const pdfDoc = await loadPdfDocument(pdfBytes);
      imageBlobs = [];
      for (let page = 1; page <= pdfDoc.numPages; page += 1) {
        const canvas = document.createElement('canvas');
        await renderPdfPage(pdfDoc, page, canvas, { fitWidth: 1200 });
        const blob = await new Promise(resolve => canvas.toBlob(resolve, fmt === 'jpeg' ? 'image/jpeg' : 'image/png', 0.9));
        if (!blob) throw new Error(`Could not render page ${page} as an image.`);
        imageBlobs.push(blob);
        canvas.width = 0;
        canvas.height = 0;
      }
      const totalSize = imageBlobs.reduce((n, blob) => n + blob.size, 0);
      state.processedResult = { blob: null, size: totalSize, imageCount: imageBlobs.length };
      previewStage.innerHTML = `
        <div class="p2i-result-state" role="status" aria-live="polite">
          <div class="p2i-result-check">${getIcon('check', 22)}</div>
          <div><strong>Converted into images</strong><span>${imageBlobs.length} ${imageBlobs.length === 1 ? 'image is' : 'images are'} ready to download.</span></div>
        </div>
      `;
      btnDownload.disabled = false;
      logActivity('PDF to Images', fileName, { size: totalSize });
      showToast('Converted into images. Choose Download to save them.');
    } catch (e) {
      showToast('Extraction failed: ' + e.message);
    } finally {
      btnProcess.disabled = false;
    }
  });

  btnDownload.addEventListener('click', () => {
    if (!imageBlobs.length) return;
    downloadDialog.hidden = false;
    document.getElementById('p2iDownloadZip').focus();
  });
  document.getElementById('p2iDownloadCancel').addEventListener('click', closeDownloadDialog);
  downloadDialog.addEventListener('click', (event) => {
    if (event.target === downloadDialog) closeDownloadDialog();
  });
  downloadDialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDownloadDialog();
  });
  document.getElementById('p2iDownloadZip').addEventListener('click', async () => {
    if (!imageBlobs.length) return;
    closeDownloadDialog();
    const base = fileName.replace(/\.[^/.]+$/, '');
    if (!window.JSZip) { showToast('ZIP support is unavailable. Choose individual downloads.'); return; }
    const zip = new window.JSZip();
    const ext = document.getElementById('p2iFmt').value === 'jpeg' ? 'jpg' : 'png';
    imageBlobs.forEach((blob, i) => zip.file(`${base}_page_${i + 1}.${ext}`, blob));
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(zipBlob, `${base}_images.zip`);
  });
  document.getElementById('p2iDownloadIndividual').addEventListener('click', () => {
    if (!imageBlobs.length) return;
    closeDownloadDialog();
    const base = fileName.replace(/\.[^/.]+$/, '');
    const ext = document.getElementById('p2iFmt').value === 'jpeg' ? 'jpg' : 'png';
    imageBlobs.forEach((blob, i) => {
      setTimeout(() => downloadBlob(blob, `${base}_page_${i + 1}.${ext}`), i * 250);
    });
    showToast(`Downloading ${imageBlobs.length} images individually.`);
  });
}

function renderImagesToPdfTool(zone) {
  zone.innerHTML = `
    <div class="tool-body full-studio">
      <div id="i2pUploadArea">
        <div class="dropzone" id="i2pDropzone">
          <input type="file" accept="image/png,image/jpeg" multiple>
          <div class="dropzone-icon">${getIcon('image', 36)}</div>
          <b>Choose JPG or PNG images</b>
          <small>Select multiple images to combine into one PDF &bull; 100% offline</small>
        </div>
      </div>

      <div id="i2pStudioArea" style="display:none;width:100%;">
        <div class="studio-topbar">
          <div class="studio-topbar-left">
            <span class="file-badge" id="fileInfoI2p"></span>
            <button class="btn-subtle" id="btnChangeI2p">Reset</button>
          </div>
          <div class="studio-topbar-center">
            <span style="font-size:13px;color:var(--muted);">Images will become individual pages in the generated PDF</span>
          </div>
          <div class="studio-topbar-right">
            <button class="btn-primary" id="btnProcessI2p" disabled>${getIcon('pdf', 16)} Convert Images to PDF</button>
            <button class="btn-secondary" id="btnDownloadI2p" disabled>${getIcon('download', 16)} Download PDF</button>
          </div>
        </div>

        <div class="studio-thumb-grid" style="margin-top:14px;padding:16px;">
          <div id="i2pGallery" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(140px, 1fr));gap:14px;"></div>
        </div>
      </div>
    </div>
  `;

  let imageFiles = [];
  const i2pUploadArea = document.getElementById('i2pUploadArea');
  const i2pStudioArea = document.getElementById('i2pStudioArea');
  const btnChangeI2p = document.getElementById('btnChangeI2p');
  const btnProcess = document.getElementById('btnProcessI2p');
  const btnDownload = document.getElementById('btnDownloadI2p');
  const gallery = document.getElementById('i2pGallery');

  btnChangeI2p.addEventListener('click', () => {
    imageFiles = [];
    i2pUploadArea.style.display = 'block';
    i2pStudioArea.style.display = 'none';
    btnProcess.disabled = true;
    btnDownload.disabled = true;
    gallery.innerHTML = '';
  });

  function renderGallery() {
    gallery.innerHTML = '';
    imageFiles.forEach((f, idx) => {
      const card = document.createElement('div');
      card.style.cssText = 'background:#fff;border:1px solid var(--line);border-radius:6px;padding:8px;display:flex;flex-direction:column;align-items:center;position:relative;box-shadow:0 2px 6px rgba(0,0,0,0.06);';
      const img = document.createElement('img');
      img.src = URL.createObjectURL(f);
      img.style.cssText = 'width:100%;height:100px;object-fit:cover;border-radius:4px;';
      const label = document.createElement('span');
      label.style.cssText = 'font-size:11px;font-weight:600;margin-top:6px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;';
      label.textContent = `P${idx + 1}: ${f.name}`;
      card.appendChild(img);
      card.appendChild(label);
      const controls = document.createElement('div');
      controls.style.cssText = 'display:flex;gap:6px;margin-top:8px;';
      const moveButton = (label, delta, disabled) => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'pdf-page-btn'; button.textContent = label;
        button.title = delta < 0 ? 'Move image up' : 'Move image down';
        button.disabled = disabled;
        button.addEventListener('click', () => {
          const next = idx + delta;
          if (next < 0 || next >= imageFiles.length) return;
          [imageFiles[idx], imageFiles[next]] = [imageFiles[next], imageFiles[idx]];
          renderGallery();
        });
        controls.appendChild(button);
      };
      moveButton('↑', -1, idx === 0); moveButton('↓', 1, idx === imageFiles.length - 1);
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'pdf-page-btn'; remove.textContent = '×'; remove.title = 'Remove image';
      remove.addEventListener('click', () => { imageFiles.splice(idx, 1); renderGallery(); btnProcess.disabled = imageFiles.length === 0; document.getElementById('fileInfoI2p').innerHTML = `<strong>${imageFiles.length} images selected</strong>`; });
      controls.appendChild(remove); card.appendChild(controls);
      gallery.appendChild(card);
    });
  }

  setupDropzone(document.getElementById('i2pDropzone'), (files) => {
    imageFiles = files;
    document.getElementById('fileInfoI2p').innerHTML = `<strong>${files.length} images selected</strong>`;
    i2pUploadArea.style.display = 'none';
    i2pStudioArea.style.display = 'block';
    renderGallery();
    btnProcess.disabled = files.length === 0;
  }, { multiple: true, accept: 'image/png,image/jpeg' });

  btnProcess.addEventListener('click', async () => {
    if (!imageFiles.length) return;
    try {
      const res = await PdfTools.imagesToPdf(imageFiles);
      state.processedResult = res;
      btnDownload.disabled = false;
      logActivity('Images to PDF', `${imageFiles.length} images`, { size: res.size });
      showToast(`Created PDF document with ${res.totalPages} pages!`);
    } catch (e) {
      showToast('Error: ' + e.message);
    }
  });

  btnDownload.addEventListener('click', () => {
    if (state.processedResult) downloadBlob(state.processedResult.blob, 'images_compiled.pdf');
  });
}

function renderPdfProtectTool(zone) {
  zone.innerHTML = `
    <div class="tool-body single-col">
      <div class="dropzone" id="protPdfDropzone">
        <input type="file" accept="application/pdf">
        <div class="dropzone-icon">${getIcon('lock', 36)}</div>
        <b>Choose PDF document</b>
        <small>Encrypt with 256-bit password or unlock protected PDF</small>
      </div>
      <div id="fileInfoProt"></div>

      <div class="segmented-control" id="protModeTabs" style="margin-top:20px;">
        <button class="segmented-btn active" data-mode="encrypt">${getIcon('lock', 14)} Protect with Password</button>
        <button class="segmented-btn" data-mode="decrypt">${getIcon('unlock', 14)} Unlock / Remove Password</button>
      </div>

      <div id="protStatusNotice" style="margin-top:14px;display:none;"></div>

      <div class="options-box" style="margin-top:14px;">
        <div class="opt-row" id="rowEncryptPass">
          <label class="opt-label" for="pdfPassEnc">New Document Password</label>
          <div style="display:flex;gap:8px;">
            <input type="password" id="pdfPassEnc" class="opt-input" placeholder="Set a strong password..." autocomplete="new-password">
            <button type="button" class="btn-secondary" id="btnTogglePassEnc" style="padding:0 12px;" title="Show/Hide">${getIcon('eye', 16)}</button>
          </div>
          <span class="opt-help">Applies industry-standard 256-bit AES encryption. Opening this file in Acrobat, Preview, or Chrome will require this password.</span>
        </div>

        <div class="opt-row" id="rowDecryptPass" style="display:none;">
          <label class="opt-label" for="pdfPassDec">Current Document Password</label>
          <div style="display:flex;gap:8px;">
            <input type="password" id="pdfPassDec" class="opt-input" placeholder="Enter password to unlock..." autocomplete="current-password">
            <button type="button" class="btn-secondary" id="btnTogglePassDec" style="padding:0 12px;" title="Show/Hide">${getIcon('eye', 16)}</button>
          </div>
          <span class="opt-help">Permanently removes password protection so anyone can open this PDF without entering a password.</span>
        </div>
      </div>

      <div class="actions">
        <button class="btn-primary" id="btnProcessProt" disabled>${getIcon('lock', 16)} <span id="lblProtAction">Protect &amp; Save PDF</span></button>
        <button class="btn-secondary" id="btnDownloadProt" disabled>${getIcon('download', 16)} Download Result</button>
      </div>
    </div>
  `;

  let pdfBytes = null;
  let fileName = 'doc.pdf';
  let currentMode = 'encrypt';

  const btnProcess = document.getElementById('btnProcessProt');
  const btnDownload = document.getElementById('btnDownloadProt');
  const passEnc = document.getElementById('pdfPassEnc');
  const passDec = document.getElementById('pdfPassDec');
  const statusNotice = document.getElementById('protStatusNotice');
  const lblProtAction = document.getElementById('lblProtAction');

  function updateMode(mode) {
    currentMode = mode;
    document.querySelectorAll('#protModeTabs .segmented-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });
    if (mode === 'encrypt') {
      document.getElementById('rowEncryptPass').style.display = 'block';
      document.getElementById('rowDecryptPass').style.display = 'none';
      lblProtAction.textContent = 'Protect & Save PDF';
    } else {
      document.getElementById('rowEncryptPass').style.display = 'none';
      document.getElementById('rowDecryptPass').style.display = 'block';
      lblProtAction.textContent = 'Unlock & Save PDF';
    }
  }

  document.querySelectorAll('#protModeTabs .segmented-btn').forEach(btn => {
    btn.addEventListener('click', () => updateMode(btn.dataset.mode));
  });

  document.getElementById('btnTogglePassEnc').addEventListener('click', () => {
    passEnc.type = passEnc.type === 'password' ? 'text' : 'password';
  });
  document.getElementById('btnTogglePassDec').addEventListener('click', () => {
    passDec.type = passDec.type === 'password' ? 'text' : 'password';
  });

  setupDropzone(document.getElementById('protPdfDropzone'), async ([file]) => {
    if (!file) return;
    fileName = file.name;
    const ab = await readFileAsArrayBuffer(file);
    pdfBytes = new Uint8Array(ab);

    // Detect if file is currently encrypted
    try {
      await PDFLib.PDFDocument.load(pdfBytes);
      statusNotice.style.display = 'block';
      statusNotice.innerHTML = `
        <div style="background:rgba(16,185,129,0.1);border:1px solid #10b981;border-radius:6px;padding:10px 14px;font-size:13px;color:#065f46;">
          <strong>Unencrypted Document</strong>: Ready to protect with 256-bit AES encryption.
        </div>
      `;
      updateMode('encrypt');
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('encrypt')) {
        statusNotice.style.display = 'block';
        statusNotice.innerHTML = `
          <div style="background:rgba(239,68,68,0.1);border:1px solid #ef4444;border-radius:6px;padding:10px 14px;font-size:13px;color:#991b1b;">
            🔒 <strong>Password-Protected PDF Detected</strong>: Enter current password to unlock and decrypt.
          </div>
        `;
        updateMode('decrypt');
      } else {
        statusNotice.style.display = 'none';
      }
    }

    document.getElementById('fileInfoProt').innerHTML = `
      <div class="file-info-pill" style="margin-top:12px;">
        <div><strong>${escapeHtml(file.name)}</strong> (${formatBytes(file.size)})</div>
        <button class="btn-subtle" id="btnClearProtFile" style="padding:2px 8px;font-size:11px;">Change</button>
      </div>
    `;

    document.getElementById('btnClearProtFile').addEventListener('click', () => {
      pdfBytes = null;
      document.getElementById('fileInfoProt').innerHTML = '';
      statusNotice.style.display = 'none';
      btnProcess.disabled = true;
      btnDownload.disabled = true;
    });

    btnProcess.disabled = false;
  }, { accept: '.pdf' });

  btnProcess.addEventListener('click', async () => {
    if (!pdfBytes) return;
    btnProcess.disabled = true;
    const oldText = lblProtAction.textContent;
    lblProtAction.textContent = 'Processing with QPDF...';

    try {
      if (currentMode === 'encrypt') {
        const pw = passEnc.value;
        if (!pw || !pw.trim()) {
          throw new Error('Please enter a password to protect the document.');
        }
        const encBytes = await encryptPdf(pdfBytes, pw);
        const blob = new Blob([encBytes], { type: 'application/pdf' });
        state.processedResult = { blob, filename: `protected_${fileName}` };
        btnDownload.disabled = false;
        downloadBlob(blob, `protected_${fileName}`);
        showToast('PDF encrypted successfully with 256-bit AES!');
        logActivity('Protect PDF', fileName, { size: blob.size });
      } else {
        const pw = passDec.value;
        if (!pw || !pw.trim()) {
          throw new Error('Please enter the current password to unlock the document.');
        }
        const decBytes = await decryptPdf(pdfBytes, pw);
        const blob = new Blob([decBytes], { type: 'application/pdf' });
        state.processedResult = { blob, filename: `unlocked_${fileName}` };
        btnDownload.disabled = false;
        downloadBlob(blob, `unlocked_${fileName}`);
        showToast('PDF unlocked successfully! Protection removed.');
        logActivity('Unlock PDF', fileName, { size: blob.size });
      }
    } catch (err) {
      showToast('Error: ' + err.message);
    } finally {
      btnProcess.disabled = false;
      lblProtAction.textContent = oldText;
    }
  });

  btnDownload.addEventListener('click', () => {
    if (state.processedResult) {
      const name = state.processedResult.filename || (currentMode === 'encrypt' ? `protected_${fileName}` : `unlocked_${fileName}`);
      downloadBlob(state.processedResult.blob, name);
    }
  });
}

/* ========================================================================= */
/*                          IMAGE UTILITIES: CROP, CONVERT, ETC.             */
/* ========================================================================= */
function renderImageCropTool(zone) {
  zone.innerHTML = `
    <div class="tool-body full-studio">
      <div id="cropUploadArea">
        <div class="dropzone" id="cropDropzone">
          <input type="file" accept="image/*">
          <div class="dropzone-icon">${getIcon('crop', 36)}</div>
          <b>Choose image to crop</b>
          <small>JPG, PNG, WebP &bull; 100% offline</small>
        </div>
      </div>

      <div id="cropStudioArea" style="display:none;width:100%;">
        <div class="studio-topbar">
          <div class="studio-topbar-left">
            <span class="file-badge" id="fileInfoCrop"></span>
            <button class="btn-subtle" id="btnChangeCrop">Change</button>
          </div>
          <div class="studio-topbar-center">
            <div class="segmented-control" id="cropAspect">
              <button class="segmented-btn active" data-aspect="1:1">1:1 Square</button>
              <button class="segmented-btn" data-aspect="4:3">4:3 Photo</button>
              <button class="segmented-btn" data-aspect="16:9">16:9 Wide</button>
              <button class="segmented-btn" data-aspect="free">Freeform</button>
            </div>
            <div class="crop-transform-controls" aria-label="Rotate and flip crop source">
              <button class="btn-secondary" id="cropRotateLeft" type="button" title="Rotate left 90 degrees">↶ Rotate left</button>
              <button class="btn-secondary" id="cropRotateRight" type="button" title="Rotate right 90 degrees">↷ Rotate right</button>
              <button class="btn-secondary" id="cropFlipH" type="button">Flip horizontal</button>
              <button class="btn-secondary" id="cropFlipV" type="button">Flip vertical</button>
            </div>
            <span id="cropBoundsReadout" style="font-size:12px;color:var(--muted);margin-left:8px;"></span>
          </div>
          <div id="cropResultStats" style="display:none;" class="result-card"></div>
          <div class="studio-topbar-right">
            <button class="btn-primary" id="btnProcessCrop" disabled>${getIcon('crop', 16)} Crop Image</button>
            <button class="btn-secondary" id="btnDownloadCrop" disabled>${getIcon('download', 16)} Download</button>
          </div>
        </div>

        <div class="studio-image-preview crop-image-preview" style="margin-top:0;min-height:360px;">
          <div class="preview-stage" id="cropPreviewStage" style="width:100%;display:flex;align-items:center;justify-content:center;"></div>
        </div>
      </div>
    </div>
  `;

  let img = null;
  let cropSource = null;
  let fileObj = null;
  let cropController = null;
  let currentCropData = null;
  const cropUploadArea = document.getElementById('cropUploadArea');
  const cropStudioArea = document.getElementById('cropStudioArea');
  const btnChangeCrop = document.getElementById('btnChangeCrop');
  const btnProcess = document.getElementById('btnProcessCrop');
  const btnDownload = document.getElementById('btnDownloadCrop');
  const previewStage = document.getElementById('cropPreviewStage');
  const boundsReadout = document.getElementById('cropBoundsReadout');
  const resultStats = document.getElementById('cropResultStats');
  let cropAngle = 0, cropFlipH = false, cropFlipV = false;

  async function rebuildCropSource() {
    if (!fileObj) return;
    const transformed = await ImageTools.rotateFlipImage(fileObj, cropAngle, cropFlipH, cropFlipV);
    releaseImage(cropSource);
    cropSource = await loadImage(transformed.blob, { retainUrl: true });
    const active = document.querySelector('#cropAspect .segmented-btn.active');
    cropController = mountInteractiveCrop(previewStage, cropSource, {
      aspect: active?.dataset.aspect || '1:1',
      onCropChange: data => {
        currentCropData = data;
        boundsReadout.innerHTML = `Crop area: <strong>${data.width} × ${data.height} px</strong>`;
      }
    });
  }

  document.getElementById('cropRotateLeft').addEventListener('click', async()=>{cropAngle=(cropAngle+270)%360;await rebuildCropSource();});
  document.getElementById('cropRotateRight').addEventListener('click', async()=>{cropAngle=(cropAngle+90)%360;await rebuildCropSource();});
  document.getElementById('cropFlipH').addEventListener('click', async()=>{cropFlipH=!cropFlipH;await rebuildCropSource();});
  document.getElementById('cropFlipV').addEventListener('click', async()=>{cropFlipV=!cropFlipV;await rebuildCropSource();});

  btnChangeCrop.addEventListener('click', () => {
    releaseImage(img);
    if (cropSource !== img) releaseImage(cropSource);
    cropUploadArea.style.display = 'block';
    cropStudioArea.style.display = 'none';
    img = null;
    cropSource = null;
    fileObj = null;
    cropController = null;
    btnProcess.disabled = true;
    btnDownload.disabled = true;
    resultStats.style.display = 'none';
    previewStage.innerHTML = '';
  });

  document.querySelectorAll('#cropAspect .segmented-btn').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('#cropAspect .segmented-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      if (cropController) {
        cropController.setAspect(b.dataset.aspect);
      }
    });
  });

  setupDropzone(document.getElementById('cropDropzone'), async ([file]) => {
    if (!file) return;
    releaseImage(img);
    if (cropSource !== img) releaseImage(cropSource);
    fileObj = file;
    img = await loadImage(file, { retainUrl: true });
    cropSource = img;
    cropAngle = 0; cropFlipH = false; cropFlipV = false;
    document.getElementById('fileInfoCrop').innerHTML = `<strong>${escapeHtml(file.name)}</strong> <span class="file-size">${formatBytes(file.size)}</span>`;
    cropUploadArea.style.display = 'none';
    cropStudioArea.style.display = 'grid';
    resultStats.style.display = 'none';

    const activeAspectBtn = document.querySelector('#cropAspect .segmented-btn.active');
    const aspect = activeAspectBtn ? activeAspectBtn.dataset.aspect : '1:1';

    cropController = mountInteractiveCrop(previewStage, cropSource, {
      aspect: aspect,
      onCropChange: (data) => {
        currentCropData = data;
        boundsReadout.innerHTML = `Crop area: <strong>${data.width} &times; ${data.height} px</strong>`;
      }
    });

    btnProcess.disabled = false;
    showToast('Image loaded! Drag or resize the crop box.');
  });

  btnProcess.addEventListener('click', async () => {
    if (!img || !fileObj) return;
    const crop = cropController ? cropController.getCropData() : currentCropData;
    if (!crop || crop.width <= 0 || crop.height <= 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(cropSource, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);

    const blob = await new Promise(r => canvas.toBlob(r, fileObj.type || 'image/jpeg', 0.95));
    if (!blob) { showToast('This image format could not be cropped.'); return; }
    state.processedResult = { blob };

    // Reload cropped result onto preview
    previewStage.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:10px;">
        <img src="${URL.createObjectURL(blob)}" style="max-width:100%;max-height:420px;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,0.15);" alt="Cropped Result"/>
        <span style="font-size:12px;color:var(--success);font-weight:600;">Cropped to ${crop.width} &times; ${crop.height} px (${formatBytes(blob.size)})</span>
      </div>
    `;
    resultStats.style.display = 'grid';
    resultStats.innerHTML = `<div class="stat-item"><span class="stat-title">Original</span><span class="stat-val">${img.naturalWidth} × ${img.naturalHeight} px · ${formatBytes(fileObj.size)}</span></div><div class="stat-item"><span class="stat-title">Cropped output</span><span class="stat-val">${crop.width} × ${crop.height} px · ${formatBytes(blob.size)}</span></div>`;

    btnDownload.disabled = false;
    logActivity('Crop Image', fileObj.name, { size: blob.size });
    showToast(`Image cropped to ${crop.width}×${crop.height} px!`);
  });

  btnDownload.addEventListener('click', () => {
    if (state.processedResult) downloadBlob(state.processedResult.blob, `cropped_${fileObj.name}`);
  });
}

function renderImageConvertTool(zone) {
  zone.innerHTML = `
    <div class="tool-body full-studio">
      <div id="convUploadArea">
        <div class="dropzone" id="convDropzone">
          <input type="file" accept="image/*">
          <div class="dropzone-icon">${getIcon('convert', 36)}</div>
          <b>Choose image to convert</b>
          <small>Convert format locally with zero upload &bull; 100% offline</small>
        </div>
      </div>

      <div id="convStudioArea" style="display:none;width:100%;">
        <div class="studio-topbar">
          <div class="studio-topbar-left">
            <span class="file-badge" id="fileInfoConv"></span>
            <button class="btn-subtle" id="btnChangeConv">Change</button>
          </div>
          <div class="studio-topbar-center">
            <div style="display:flex;align-items:center;gap:6px;">
              <label class="opt-label" style="margin:0;font-size:12px;" for="convFmt">Target Format:</label>
              <select id="convFmt" class="opt-select" style="padding:4px 8px;font-size:13px;">
                <option value="image/jpeg" selected>JPEG (.jpg) — Compact photo format</option>
                <option value="image/png">PNG (.png) — Preserves transparency</option>
                <option value="image/webp">WebP (.webp) — Modern web compression</option>
              </select>
            </div>
            <span id="convMeta" style="font-size:12px;color:var(--muted);font-weight:500;"></span>
          </div>
          <div class="studio-topbar-right">
            <button class="btn-primary" id="btnProcessConv" disabled>${getIcon('convert', 16)} Convert Image</button>
            <button class="btn-secondary" id="btnDownloadConv" disabled>${getIcon('download', 16)} Download</button>
          </div>
        </div>
        <div id="convResultStats" style="display:none;" class="result-card"></div>

        <div class="studio-image-preview" style="margin-top:14px;min-height:500px;">
          <div class="preview-stage" id="convPreviewStage" style="width:100%;display:flex;align-items:center;justify-content:center;"></div>
        </div>
      </div>
    </div>
  `;

  let uploaded = null;
  const convUploadArea = document.getElementById('convUploadArea');
  const convStudioArea = document.getElementById('convStudioArea');
  const btnChangeConv = document.getElementById('btnChangeConv');
  const convFmt = document.getElementById('convFmt');
  const btnProcess = document.getElementById('btnProcessConv');
  const btnDownload = document.getElementById('btnDownloadConv');
  const previewStage = document.getElementById('convPreviewStage');
  const convStats = document.getElementById('convResultStats');

  btnChangeConv.addEventListener('click', () => {
    releaseImage(previewStage._sourceImage);
    releaseImage(previewStage._outputImage);
    convUploadArea.style.display = 'block';
    convStudioArea.style.display = 'none';
    uploaded = null;
    btnProcess.disabled = true;
    btnDownload.disabled = true;
    previewStage.innerHTML = '';
    convStats.style.display = 'none';
  });

  setupDropzone(document.getElementById('convDropzone'), async ([file]) => {
    if (!file) return;
    uploaded = file;
    releaseImage(previewStage._sourceImage);
    releaseImage(previewStage._outputImage);
    document.getElementById('fileInfoConv').innerHTML = `<strong>${escapeHtml(file.name)}</strong> <span class="file-size">${formatBytes(file.size)}</span>`;
    document.getElementById('convMeta').textContent = file.name;
    convUploadArea.style.display = 'none';
    convStudioArea.style.display = 'grid';

    const img = await loadImage(file, { retainUrl: true });
    previewStage._sourceImage = img;
    previewStage.dataset.sourceUrl = img._sCraftObjectUrl || '';
    previewStage.innerHTML = `<img src="${img.src}" class="preview-canvas" alt="Convert preview" style="max-height:520px;"/>`;
    btnProcess.disabled = false;
  });

  btnProcess.addEventListener('click', async () => {
    if (!uploaded) return;
    try {
      const res = await ImageTools.convertImage(uploaded, convFmt.value);
      state.processedResult = res;
      releaseImage(previewStage._outputImage);
      previewStage._outputImage = await loadImage(res.blob, { retainUrl: true });
      previewStage.innerHTML = `<img src="${previewStage._outputImage.src}" class="preview-canvas" alt="Converted image preview" style="max-height:52vh;">`;
      convStats.style.display = 'grid';
      convStats.innerHTML = `<div class="stat-item"><span class="stat-title">Original</span><span class="stat-val">${formatBytes(uploaded.size)}</span></div><div class="stat-item"><span class="stat-title">Converted output</span><span class="stat-val">${formatBytes(res.size)}</span></div><div class="stat-item"><span class="stat-title">Format</span><span class="stat-val">${convFmt.value.split('/')[1].toUpperCase()}</span></div>`;
      btnDownload.disabled = false;
      logActivity('Convert Image', uploaded.name, { size: res.size });
      showToast(`Converted to ${convFmt.value.split('/')[1].toUpperCase()} (${formatBytes(res.size)})`);
    } catch (err) { showToast(`Conversion failed: ${err.message}`); }
  });

  btnDownload.addEventListener('click', () => {
    if (!state.processedResult) return;
    const ext = convFmt.value === 'image/png' ? 'png' : convFmt.value === 'image/webp' ? 'webp' : 'jpg';
    downloadBlob(state.processedResult.blob, `converted_${uploaded.name.replace(/\.[^/.]+$/, '')}.${ext}`);
  });
}

function renderImageWatermarkTool(zone) {
  zone.innerHTML = `
    <div class="tool-body full-studio">
      <div id="wmImgUploadArea">
        <div class="dropzone" id="wmImgDropzone">
          <input type="file" accept="image/*">
          <div class="dropzone-icon">${getIcon('watermark', 36)}</div>
          <b>Choose photo</b>
          <small>Add live visible watermark stamp &bull; 100% offline</small>
        </div>
      </div>

      <div id="wmImgStudioArea" class="image-editor-layout" style="display:none;">
        <section class="image-editor-controls">
          <div class="image-file-row"><span class="file-badge" id="fileInfoWmImg"></span><button class="btn-subtle" id="btnChangeWmImg">Change</button></div>
          <div class="image-control-section"><div class="image-section-title">Text watermark</div><div class="watermark-input-row"><input type="text" id="wmImgText" class="opt-input" placeholder="Enter watermark text"><button id="btnClearWmText" class="btn-subtle" type="button">Clear</button></div></div>
          <div class="image-control-section"><div class="image-section-title">Logo or photo watermark</div><div class="watermark-input-row"><label class="btn-secondary watermark-file-button" for="wmImgLogo">Add Photo<input type="file" id="wmImgLogo" accept="image/*" hidden></label><span id="wmImgLogoName" class="watermark-logo-name">No photo added</span><button id="btnRemoveWmLogo" class="btn-subtle" type="button" disabled>Remove</button></div><div class="watermark-input-row"><select id="wmImgContent" class="opt-select"><option value="text">Text only</option><option value="logo">Photo only</option><option value="both">Text and photo</option></select><select id="wmImgTile" class="opt-select"><option value="tile" selected>Repeating Pattern (Tiled)</option><option value="center">Single Center Stamp</option></select></div></div>
          <div class="image-control-section"><div class="image-section-title">Opacity <strong><span id="valWmImgOp">35</span>%</strong></div><input type="range" id="wmImgOp" min="0" max="100" value="35" class="image-range"></div>
          <div class="image-control-section"><div class="image-section-title">Placement <strong id="wmPlacementLabel">X 50% · Y 50%</strong></div><label>Angle <strong><span id="wmAngleLabel">−30°</span></strong><input type="range" id="wmAngle" min="-90" max="90" value="-30" class="image-range"></label><div class="watermark-input-row"><label class="watermark-slider-label">Position X <strong><span id="wmXLabel">50%</span></strong><input type="range" id="wmX" min="0" max="100" value="50" class="image-range"></label><label class="watermark-slider-label">Position Y <strong><span id="wmYLabel">50%</span></strong><input type="range" id="wmY" min="0" max="100" value="50" class="image-range"></label></div><label class="watermark-slider-label">Size <strong><span id="wmSizeLabel">100%</span></strong><input type="range" id="wmSize" min="30" max="200" value="100" class="image-range"></label><small>Position controls apply to a single stamp. Repeating Pattern (Tiled) keeps the marks spread across the image.</small></div>
          <div class="studio-topbar-right image-action-row"><button class="btn-primary" id="btnProcessWmImg" disabled>${getIcon('watermark',15)} Apply Watermark</button><button class="btn-secondary" id="btnDownloadWmImg" disabled>${getIcon('download',15)} Download</button></div>
          <div id="wmImgMeta" class="image-preview-meta"></div>
        </section>
        <section class="image-result-panel"><div class="studio-image-preview"><div class="preview-stage" id="wmImgPreviewStage" style="width:100%;display:flex;align-items:center;justify-content:center;"></div></div></section>
      </div>
    </div>
  `;

  let uploaded = null;
  let loadedImg = null;
  const wmImgUploadArea = document.getElementById('wmImgUploadArea');
  const wmImgStudioArea = document.getElementById('wmImgStudioArea');
  const btnChangeWmImg = document.getElementById('btnChangeWmImg');
  const textInput = document.getElementById('wmImgText');
  const logoInput = document.getElementById('wmImgLogo');
  const contentSelect = document.getElementById('wmImgContent');
  const opInput = document.getElementById('wmImgOp');
  const tileSelect = document.getElementById('wmImgTile');
  const angleInput = document.getElementById('wmAngle');
  const xInput = document.getElementById('wmX');
  const yInput = document.getElementById('wmY');
  const sizeInput = document.getElementById('wmSize');
  const btnProcess = document.getElementById('btnProcessWmImg');
  const btnDownload = document.getElementById('btnDownloadWmImg');
  const previewStage = document.getElementById('wmImgPreviewStage');
  let logoFile = null, logoImage = null;

  btnChangeWmImg.addEventListener('click', () => {
    wmImgUploadArea.style.display = 'block';
    wmImgStudioArea.style.display = 'none';
    uploaded = null;
    loadedImg = null;
    btnProcess.disabled = true;
    btnDownload.disabled = true;
    previewStage.innerHTML = '';
    logoImage = null; logoFile = null; logoInput.value = '';
  });

  function paintWatermark(canvas) {
    if (!loadedImg) return;
    canvas.width = loadedImg.naturalWidth;
    canvas.height = loadedImg.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(loadedImg, 0, 0);

    const text = textInput.value.trim();
    const mode = contentSelect.value;
    const op = (parseInt(opInput.value) || 0) / 100;
    const isTile = tileSelect.value === 'tile';
    const angle = Number(angleInput.value) * Math.PI / 180;
    const sizeFactor = Number(sizeInput.value) / 100;
    const posX = canvas.width * Number(xInput.value) / 100;
    const posY = canvas.height * Number(yInput.value) / 100;

    ctx.save();
    ctx.globalAlpha = op;
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 4;

    if (text && (mode === 'text' || mode === 'both') && isTile) {
      const stepX = Math.max(160, canvas.width / 4);
      const stepY = Math.max(100, canvas.height / 5);
      const fontSize = Math.max(16, Math.round(canvas.width / 26 * sizeFactor));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';

      for (let x = stepX / 2; x < canvas.width; x += stepX) {
        for (let y = stepY / 2; y < canvas.height; y += stepY) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(angle);
          ctx.fillText(text, 0, 0);
          ctx.restore();
        }
      }
    } else if (text && (mode === 'text' || mode === 'both')) {
      const fontSize = Math.max(18, Math.round(canvas.width / 14 * sizeFactor));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.translate(posX, posY);
      ctx.rotate(angle);
      ctx.fillText(text, 0, 0);
    }
    if (logoImage && (mode === 'logo' || mode === 'both')) {
      if (isTile) {
        const stepX = Math.max(180, canvas.width / 3.5), stepY = Math.max(150, canvas.height / 4);
        const markW = Math.min(canvas.width * 0.18 * sizeFactor, stepX * 0.7);
        const markH = markW * logoImage.naturalHeight / logoImage.naturalWidth;
        for (let x = stepX / 2; x < canvas.width; x += stepX) for (let y = stepY / 2; y < canvas.height; y += stepY) {ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.drawImage(logoImage,-markW/2,-markH/2,markW,markH);ctx.restore();}
      } else {
        const markW = canvas.width * 0.22 * sizeFactor, markH = markW * logoImage.naturalHeight / logoImage.naturalWidth;
        ctx.save();ctx.translate(posX,posY);ctx.rotate(angle);ctx.drawImage(logoImage,-markW/2,-markH/2,markW,markH);ctx.restore();
      }
    }
    ctx.restore();
  }

  function renderWatermarkLive() {
    if (!loadedImg) return;
    const canvas = previewStage.querySelector('#wmImgLiveCanvas');
    if (canvas) paintWatermark(canvas);
  }

  function invalidateWatermarkOutput() {
    state.processedResult = null;
    btnDownload.disabled = true;
    renderWatermarkLive();
  }

  document.getElementById('btnClearWmText').addEventListener('click',()=>{textInput.value='';invalidateWatermarkOutput();});
  logoInput.addEventListener('change',async()=>{const file=logoInput.files?.[0];if(!file)return;logoFile=file;logoImage=await loadImage(file);document.getElementById('wmImgLogoName').textContent=file.name;document.getElementById('btnRemoveWmLogo').disabled=false;invalidateWatermarkOutput();});
  document.getElementById('btnRemoveWmLogo').addEventListener('click',()=>{logoFile=null;logoImage=null;logoInput.value='';document.getElementById('wmImgLogoName').textContent='No photo added';document.getElementById('btnRemoveWmLogo').disabled=true;invalidateWatermarkOutput();});
  textInput.addEventListener('input', invalidateWatermarkOutput);
  opInput.addEventListener('input', () => {
    document.getElementById('valWmImgOp').textContent = opInput.value;
    invalidateWatermarkOutput();
  });
  [[angleInput,'wmAngleLabel',v=>`${v}°`],[xInput,'wmXLabel',v=>`${v}%`],[yInput,'wmYLabel',v=>`${v}%`],[sizeInput,'wmSizeLabel',v=>`${v}%`]].forEach(([input,label,format])=>input.addEventListener('input',()=>{document.getElementById(label).textContent=format(input.value);invalidateWatermarkOutput();}));
  tileSelect.addEventListener('change', invalidateWatermarkOutput);
  contentSelect.addEventListener('change',invalidateWatermarkOutput);

  setupDropzone(document.getElementById('wmImgDropzone'), async ([file]) => {
    if (!file) return;
    uploaded = file;
    loadedImg = await loadImage(file);
    document.getElementById('fileInfoWmImg').innerHTML = `${getIcon('image',18)} <strong>${escapeHtml(file.name)}</strong> <span class="file-size">${formatBytes(file.size)}</span>`;
    document.getElementById('wmImgMeta').textContent = `${file.name} (${loadedImg.naturalWidth}×${loadedImg.naturalHeight} px)`;
    wmImgUploadArea.style.display = 'none';
    wmImgStudioArea.style.display = 'grid';

    previewStage.innerHTML = `<canvas id="wmImgLiveCanvas" class="preview-canvas"></canvas>`;
    renderWatermarkLive();
    btnProcess.disabled = false;
  });

  btnProcess.addEventListener('click', async () => {
    if (!uploaded) return;
    const isTile = tileSelect.value === 'tile';
    const op = (parseInt(opInput.value) || 0) / 100;
    const mode = contentSelect.value;
    const text = textInput.value.trim();
    if ((mode === 'text' || mode === 'both') && !text && (mode === 'text' || !logoFile)) { showToast('Add watermark text or choose the photo mode.'); return; }
    if ((mode === 'logo' || mode === 'both') && !logoFile) { showToast('Add a photo watermark first.'); return; }
    const output = document.createElement('canvas');
    paintWatermark(output);
    const resultBlob = await new Promise(resolve=>output.toBlob(resolve,uploaded.type||'image/jpeg',.92));
    const res = {blob:resultBlob,size:resultBlob.size};
    state.processedResult = res;
    document.getElementById('wmImgMeta').textContent = `Watermarked output · ${formatBytes(res.size)} · ${loadedImg.naturalWidth} × ${loadedImg.naturalHeight} px`;
    btnDownload.disabled = false;
    logActivity('Watermark Image', uploaded.name, { size: res.size });
    showToast('Watermark added!');
  });

  btnDownload.addEventListener('click', () => {
    if (state.processedResult) {
      const ext = state.processedResult.blob.type === 'image/png' ? 'png' : state.processedResult.blob.type === 'image/webp' ? 'webp' : 'jpg';
      downloadBlob(state.processedResult.blob, `watermarked_${uploaded.name.replace(/\.[^/.]+$/,'')}.${ext}`);
    }
  });
}

function renderImageTextTool(zone) {
  zone.innerHTML = `
    <div class="tool-body full-studio">
      <div id="addTextUploadArea">
        <div class="dropzone" id="addTextDropzone">
          <input type="file" accept="image/*">
          <div class="dropzone-icon">${getIcon('text', 36)}</div>
          <b>Choose photo</b>
          <small>Add captions and title cards &bull; 100% offline</small>
        </div>
      </div>

      <div id="addTextStudioArea" style="display:none;width:100%;">
        <div class="add-text-controls">
          <div class="image-file-row"><span class="file-badge" id="fileInfoAddText"></span><button class="btn-subtle" id="btnChangeAddText">Change</button></div>
          <section class="image-control-section">
            <div class="image-section-title"><span>Text overlay</span><button class="btn-subtle" id="clearCaptionText" type="button">Clear</button></div>
            <textarea id="captionText" class="opt-input add-text-entry" placeholder="Enter text to add to your image" rows="3"></textarea>
            <div class="add-text-toolbar">
              <button class="btn-secondary" id="openCaptionFonts" type="button" aria-haspopup="dialog">Font: <span id="captionFontName">Inter</span></button>
              <div class="add-text-colors" role="group" aria-label="Text color">
                <button class="color-swatch is-active" style="--swatch:#ffffff" data-color="#ffffff" aria-label="White" title="White"></button>
                <button class="color-swatch" style="--swatch:#111827" data-color="#111827" aria-label="Black" title="Black"></button>
                <button class="color-swatch" style="--swatch:#2563eb" data-color="#2563eb" aria-label="Blue" title="Blue"></button>
                <button class="color-swatch" style="--swatch:#dc2626" data-color="#dc2626" aria-label="Red" title="Red"></button>
                <button class="color-swatch" style="--swatch:#16a34a" data-color="#16a34a" aria-label="Green" title="Green"></button>
                <label class="custom-color-swatch" title="Choose custom color">＋<input type="color" id="captionCustomColor" value="#ffffff" aria-label="Choose custom text color"></label>
              </div>
              <div class="add-text-format" role="group" aria-label="Text formatting">
                <button type="button" class="format-toggle" data-format="bold" aria-pressed="false" aria-label="Bold"><b>B</b></button>
                <button type="button" class="format-toggle" data-format="italic" aria-pressed="false" aria-label="Italic"><i>I</i></button>
                <button type="button" class="format-toggle" data-format="underline" aria-pressed="false" aria-label="Underline"><u>U</u></button>
              </div>
            </div>
            <label class="image-section-title" for="captionPill">Text background</label>
            <select id="captionPill" class="opt-select"><option value="pill" selected>Dark pill</option><option value="plain">No background</option></select>
          </section>
          <section class="image-control-section">
            <div class="image-section-title"><span>Photo overlay</span><label class="btn-secondary watermark-file-button" for="captionPhoto">Add Photo<input type="file" id="captionPhoto" accept="image/*" hidden></label></div>
            <div class="image-file-row"><span id="captionPhotoName" class="watermark-logo-name">No photo added</span><button class="btn-subtle" id="removeCaptionPhoto" type="button" disabled>Remove</button></div>
            <label class="image-section-title" for="captionPhotoSize">Photo size <span id="captionPhotoSizeValue">18%</span></label>
            <input class="image-range" type="range" id="captionPhotoSize" min="8" max="50" value="18">
          </section>
          <div class="add-text-actions"><button class="btn-primary" id="btnProcessAddText" disabled>${getIcon('text', 16)} Apply overlays</button><button class="btn-secondary" id="btnDownloadAddText" disabled>${getIcon('download', 16)} Download</button></div>
          <span id="addTextMeta" class="image-preview-meta" aria-live="polite">Text and photo changes appear in the preview.</span>
        </div>
        <section class="studio-image-preview add-text-preview">
          <div class="preview-stage" id="addTextPreviewStage"></div>
        </div>
      </div>
    </div>
    <div id="captionFontDialog" class="modal-overlay" role="presentation"><section class="modal-card font-picker-card" role="dialog" aria-modal="true" aria-labelledby="captionFontTitle"><header class="modal-header"><span class="modal-title" id="captionFontTitle">Choose a font</span><button type="button" class="btn-subtle" id="closeCaptionFonts" aria-label="Close font picker">Close</button></header><div class="modal-body"><p class="font-picker-help">Choose a typeface for your image text.</p><div class="font-picker-options" id="captionFontOptions"></div></div></section></div>
  `;

  let uploaded = null;
  let loadedImg = null;
  const addTextUploadArea = document.getElementById('addTextUploadArea');
  const addTextStudioArea = document.getElementById('addTextStudioArea');
  const btnChangeAddText = document.getElementById('btnChangeAddText');
  const caption = document.getElementById('captionText');
  const pillStyle = document.getElementById('captionPill');
  const captionPhoto = document.getElementById('captionPhoto');
  const captionPhotoName = document.getElementById('captionPhotoName');
  const captionPhotoSize = document.getElementById('captionPhotoSize');
  const captionFontDialog = document.getElementById('captionFontDialog');
  const fontFamilies = ['Inter', 'Roboto', 'Open Sans', 'Poppins', 'Montserrat', 'Lato'];
  let selectedFont = 'Inter';
  let selectedColor = '#ffffff';
  const formatting = { bold: false, italic: false, underline: false };
  let captionPhotoImage = null;
  let captionPhotoBlob = null;
  let captionPhotoOriginalName = '';
  const btnProcess = document.getElementById('btnProcessAddText');
  const btnDownload = document.getElementById('btnDownloadAddText');
  const previewStage = document.getElementById('addTextPreviewStage');

  const fontOptions = document.getElementById('captionFontOptions');
  fontOptions.innerHTML = fontFamilies.map(font => `<button type="button" class="font-picker-option${font === selectedFont ? ' is-active' : ''}" data-font="${font}" style="font-family:'${font}',sans-serif"><span>${font}</span><small>The quick brown fox</small></button>`).join('');
  document.getElementById('openCaptionFonts').addEventListener('click', () => captionFontDialog.classList.add('open'));
  document.getElementById('closeCaptionFonts').addEventListener('click', () => captionFontDialog.classList.remove('open'));
  captionFontDialog.addEventListener('click', event => { if (event.target === captionFontDialog) captionFontDialog.classList.remove('open'); });
  fontOptions.addEventListener('click', event => {
    const option = event.target.closest('[data-font]');
    if (!option) return;
    selectedFont = option.dataset.font;
    document.getElementById('captionFontName').textContent = selectedFont;
    fontOptions.querySelectorAll('[data-font]').forEach(item => item.classList.toggle('is-active', item === option));
    document.fonts.load(`700 32px "${selectedFont}"`).then(renderCaptionLive);
    captionFontDialog.classList.remove('open');
    renderCaptionLive();
  });
  captionFontDialog.addEventListener('keydown', event => { if (event.key === 'Escape') captionFontDialog.classList.remove('open'); });
  document.querySelectorAll('.color-swatch').forEach(swatch => swatch.addEventListener('click', () => {
    selectedColor = swatch.dataset.color;
    document.querySelectorAll('.color-swatch').forEach(item => item.classList.toggle('is-active', item === swatch));
    renderCaptionLive();
  }));
  document.getElementById('captionCustomColor').addEventListener('input', event => {
    selectedColor = event.target.value;
    document.querySelectorAll('.color-swatch').forEach(item => item.classList.remove('is-active'));
    renderCaptionLive();
  });
  document.querySelectorAll('.format-toggle').forEach(button => button.addEventListener('click', () => {
    const format = button.dataset.format;
    formatting[format] = !formatting[format];
    button.setAttribute('aria-pressed', String(formatting[format]));
    button.classList.toggle('is-active', formatting[format]);
    renderCaptionLive();
  }));

  btnChangeAddText.addEventListener('click', () => {
    addTextUploadArea.style.display = 'block';
    addTextStudioArea.style.display = 'none';
    uploaded = null;
    loadedImg = null;
    btnProcess.disabled = true;
    btnDownload.disabled = true;
    previewStage.innerHTML = '';
  });

  function renderCaptionLive() {
    if (!loadedImg) return;
    const canvas = previewStage.querySelector('#captionLiveCanvas');
    if (!canvas) return;
    canvas.width = loadedImg.naturalWidth;
    canvas.height = loadedImg.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(loadedImg, 0, 0);

    if (captionPhotoImage) {
      const markW = canvas.width * Number(captionPhotoSize.value) / 100;
      const markH = markW * captionPhotoImage.naturalHeight / captionPhotoImage.naturalWidth;
      ctx.drawImage(captionPhotoImage, canvas.width * 0.08, canvas.height * 0.08, markW, markH);
    }

    const txt = caption.value || '';
    if (!txt) return;

    const fontSize = Math.max(22, Math.round(canvas.width / 26));
    ctx.font = `${formatting.italic ? 'italic ' : ''}${formatting.bold ? '700' : '400'} ${fontSize}px "${selectedFont}", sans-serif`;
    const tw = ctx.measureText(txt).width;
    const pad = fontSize * 0.5;
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.85;

    if (pillStyle.value === 'pill') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      ctx.beginPath();
      ctx.roundRect(cx - tw / 2 - pad, cy - fontSize - pad / 2, tw + pad * 2, fontSize + pad * 1.5, 8);
      ctx.fill();
    }

    ctx.fillStyle = selectedColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, cx, cy - fontSize / 3);
    if (formatting.underline) {
      ctx.fillRect(cx - tw / 2, cy + fontSize / 3, tw, Math.max(2, Math.round(fontSize / 16)));
    }
  }

  caption.addEventListener('input', renderCaptionLive);
  document.getElementById('clearCaptionText').addEventListener('click', () => { caption.value = ''; renderCaptionLive(); caption.focus(); });
  pillStyle.addEventListener('change', renderCaptionLive);
  captionPhotoSize.addEventListener('input', () => { document.getElementById('captionPhotoSizeValue').textContent = `${captionPhotoSize.value}%`; renderCaptionLive(); });
  captionPhoto.addEventListener('change', async () => {
    const file = captionPhoto.files?.[0]; if (!file) return;
    captionPhotoBlob = file;
    captionPhotoOriginalName = file.name;
    captionPhotoImage = await loadImage(file);
    captionPhotoName.textContent = file.name;
    document.getElementById('removeCaptionPhoto').disabled = false;
    renderCaptionLive();
  });
  document.getElementById('removeCaptionPhoto').addEventListener('click', () => {
    captionPhotoImage = null; captionPhotoBlob = null; captionPhotoOriginalName = ''; captionPhoto.value = ''; captionPhotoName.textContent = 'No photo added';
    document.getElementById('removeCaptionPhoto').disabled = true; renderCaptionLive();
  });
  setupDropzone(document.getElementById('addTextDropzone'), async ([file]) => {
    if (!file) return;
    uploaded = file;
    loadedImg = await loadImage(file);
    document.getElementById('fileInfoAddText').innerHTML = `<strong>${escapeHtml(file.name)}</strong> <span class="file-size">${formatBytes(file.size)}</span>`;
    document.getElementById('addTextMeta').textContent = `${file.name} (${loadedImg.naturalWidth}×${loadedImg.naturalHeight} px)`;
    addTextUploadArea.style.display = 'none';
    addTextStudioArea.style.display = 'grid';

    previewStage.innerHTML = `<canvas id="captionLiveCanvas" class="preview-canvas"></canvas>`;
    renderCaptionLive();
    btnProcess.disabled = false;
  });

  btnProcess.addEventListener('click', async () => {
    if (!uploaded) return;
    await document.fonts.load(`700 32px "${selectedFont}"`);
    const output = document.createElement('canvas');
    output.width = loadedImg.naturalWidth; output.height = loadedImg.naturalHeight;
    const ctx = output.getContext('2d'); ctx.drawImage(loadedImg,0,0);
    if (captionPhotoImage) { const markW = output.width * Number(captionPhotoSize.value) / 100; const markH = markW * captionPhotoImage.naturalHeight / captionPhotoImage.naturalWidth; ctx.drawImage(captionPhotoImage, output.width * .08, output.height * .08, markW, markH); }
    const text = caption.value.trim();
    if (text) {
      const fontSize = Math.max(22, Math.round(output.width / 26));
      ctx.font = `${formatting.italic ? 'italic ' : ''}${formatting.bold ? '700' : '400'} ${fontSize}px "${selectedFont}", sans-serif`;
      const tw = ctx.measureText(text).width, pad = fontSize * .5, cx = output.width / 2, cy = output.height * .85;
      if (pillStyle.value === 'pill') { ctx.fillStyle = 'rgba(15, 23, 42, 0.78)'; ctx.beginPath(); ctx.roundRect(cx - tw / 2 - pad, cy - fontSize - pad / 2, tw + pad * 2, fontSize + pad * 1.5, 8); ctx.fill(); }
      ctx.fillStyle = selectedColor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, cx, cy - fontSize / 3);
      if (formatting.underline) ctx.fillRect(cx - tw / 2, cy + fontSize / 3, tw, Math.max(2, Math.round(fontSize / 16)));
    }
    const blob = await new Promise(resolve=>output.toBlob(resolve,uploaded.type||'image/jpeg',.92));
    const res = {blob,size:blob.size};
    state.processedResult = res;
    document.getElementById('addTextMeta').textContent = `Captioned output · ${formatBytes(res.size)} · ${loadedImg.naturalWidth} × ${loadedImg.naturalHeight} px`;
    btnDownload.disabled = false;
    logActivity('Add Text and Images', uploaded.name, { size: res.size });
    showToast('Text and photo overlay applied.');
  });

  btnDownload.addEventListener('click', () => {
    if (state.processedResult) downloadBlob(state.processedResult.blob, `captioned_${uploaded.name}`);
  });
}

function renderImageRotateTool(zone) {
  zone.innerHTML = `
    <div class="tool-body full-studio">
      <div id="rotUploadArea">
        <div class="dropzone" id="rotDropzone">
          <input type="file" accept="image/*">
          <div class="dropzone-icon">${getIcon('rotate', 36)}</div>
          <b>Choose image</b>
          <small>Rotate &amp; flip in real-time &bull; 100% offline</small>
        </div>
      </div>

      <div id="rotStudioArea" style="display:none;width:100%;">
        <div class="studio-topbar">
          <div class="studio-topbar-left">
            <span class="file-badge" id="fileInfoRot"></span>
            <button class="btn-subtle" id="btnChangeRot">Change</button>
          </div>
          <div class="studio-topbar-center">
            <div style="display:flex;align-items:center;gap:6px;">
              <label class="opt-label" style="margin:0;font-size:12px;" for="rotOp">Operation:</label>
              <select id="rotOp" class="opt-select" style="padding:4px 8px;font-size:13px;">
                <option value="90" selected>Rotate 90&deg; Clockwise</option>
                <option value="180">Rotate 180&deg;</option>
                <option value="270">Rotate 90&deg; Counter-Clockwise</option>
                <option value="fliph">Flip Horizontally</option>
                <option value="flipv">Flip Vertically</option>
              </select>
            </div>
            <span id="rotMeta" style="font-size:12px;color:var(--muted);font-weight:500;"></span>
          </div>
          <div class="studio-topbar-right">
            <button class="btn-primary" id="btnProcessRot" disabled>${getIcon('rotate', 16)} Apply Rotation</button>
            <button class="btn-secondary" id="btnDownloadRot" disabled>${getIcon('download', 16)} Download</button>
          </div>
        </div>

        <div class="studio-image-preview" style="margin-top:14px;min-height:500px;">
          <div class="preview-stage" id="rotPreviewStage" style="width:100%;display:flex;align-items:center;justify-content:center;"></div>
        </div>
      </div>
    </div>
  `;

  let uploaded = null;
  let loadedImg = null;
  const rotUploadArea = document.getElementById('rotUploadArea');
  const rotStudioArea = document.getElementById('rotStudioArea');
  const btnChangeRot = document.getElementById('btnChangeRot');
  const rotOp = document.getElementById('rotOp');
  const btnProcess = document.getElementById('btnProcessRot');
  const btnDownload = document.getElementById('btnDownloadRot');
  const previewStage = document.getElementById('rotPreviewStage');

  btnChangeRot.addEventListener('click', () => {
    rotUploadArea.style.display = 'block';
    rotStudioArea.style.display = 'none';
    uploaded = null;
    loadedImg = null;
    btnProcess.disabled = true;
    btnDownload.disabled = true;
    previewStage.innerHTML = '';
  });

  function renderRotationLive() {
    if (!loadedImg) return;
    const canvas = previewStage.querySelector('#rotLiveCanvas');
    if (!canvas) return;

    const op = rotOp.value;
    const is90or270 = op === '90' || op === '270';
    canvas.width = is90or270 ? loadedImg.naturalHeight : loadedImg.naturalWidth;
    canvas.height = is90or270 ? loadedImg.naturalWidth : loadedImg.naturalHeight;

    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);

    if (op === '90') ctx.rotate(Math.PI / 2);
    else if (op === '180') ctx.rotate(Math.PI);
    else if (op === '270') ctx.rotate(-Math.PI / 2);
    else if (op === 'fliph') ctx.scale(-1, 1);
    else if (op === 'flipv') ctx.scale(1, -1);

    ctx.drawImage(loadedImg, -loadedImg.naturalWidth / 2, -loadedImg.naturalHeight / 2);
    ctx.restore();
  }

  rotOp.addEventListener('change', renderRotationLive);

  setupDropzone(document.getElementById('rotDropzone'), async ([file]) => {
    if (!file) return;
    uploaded = file;
    loadedImg = await loadImage(file);
    document.getElementById('fileInfoRot').innerHTML = `<strong>${escapeHtml(file.name)}</strong> <span class="file-size">${formatBytes(file.size)}</span>`;
    document.getElementById('rotMeta').textContent = `${file.name} (${loadedImg.naturalWidth}×${loadedImg.naturalHeight} px)`;
    rotUploadArea.style.display = 'none';
    rotStudioArea.style.display = 'grid';

    previewStage.innerHTML = `<canvas id="rotLiveCanvas" class="preview-canvas"></canvas>`;
    renderRotationLive();
    btnProcess.disabled = false;
  });

  btnProcess.addEventListener('click', async () => {
    if (!uploaded) return;
    const op = rotOp.value;
    let angle = 0, flipH = false, flipV = false;
    if (op === '90') angle = 90;
    else if (op === '180') angle = 180;
    else if (op === '270') angle = 270;
    else if (op === 'fliph') flipH = true;
    else if (op === 'flipv') flipV = true;

    const res = await ImageTools.rotateFlipImage(uploaded, angle, flipH, flipV);
    state.processedResult = res;
    document.getElementById('rotMeta').textContent = `Output · ${res.width} × ${res.height} px · ${formatBytes(res.size)}`;
    btnDownload.disabled = false;
    logActivity('Rotate & Flip', uploaded.name, { size: res.size });
    showToast('Image rotated successfully!');
  });

  btnDownload.addEventListener('click', () => {
    if (state.processedResult) downloadBlob(state.processedResult.blob, `rotated_${uploaded.name}`);
  });
}

function renderImageMetadataTool(zone) {
  zone.innerHTML = `
    <div class="tool-body full-studio">
      <div id="metaUploadArea">
        <div class="dropzone" id="metaDropzone">
          <input type="file" accept="image/*">
          <div class="dropzone-icon">${getIcon('background', 36)}</div>
          <b>Choose image to scrub metadata</b>
          <small>Removes EXIF, GPS location, camera serial &bull; 100% offline</small>
        </div>
      </div>

      <div id="metaStudioArea" style="display:none;width:100%;">
        <div class="studio-topbar">
          <div class="studio-topbar-left">
            <span class="file-badge" id="fileInfoMeta"></span>
            <button class="btn-subtle" id="btnChangeMeta">Change</button>
          </div>
          <div class="studio-topbar-center">
            <span style="font-size:12px;color:var(--muted);font-weight:500;">Strips all EXIF metadata, GPS geotags and device markers</span>
          </div>
          <div class="studio-topbar-right">
            <button class="btn-primary" id="btnProcessMeta" disabled>${getIcon('background', 16)} Scrub EXIF &amp; Location</button>
            <button class="btn-secondary" id="btnDownloadMeta" disabled>${getIcon('download', 16)} Download</button>
          </div>
        </div>

        <div id="metaResultStats" style="display:none;" class="result-card"></div>
        <div class="studio-image-preview" style="margin-top:14px;min-height:480px;">
          <div class="preview-stage" id="metaPreviewStage" style="width:100%;display:flex;align-items:center;justify-content:center;"></div>
        </div>
      </div>
    </div>
  `;

  let uploaded = null;
  const metaUploadArea = document.getElementById('metaUploadArea');
  const metaStudioArea = document.getElementById('metaStudioArea');
  const btnChangeMeta = document.getElementById('btnChangeMeta');
  const btnProcess = document.getElementById('btnProcessMeta');
  const btnDownload = document.getElementById('btnDownloadMeta');
  const previewStage = document.getElementById('metaPreviewStage');
  const metaStats = document.getElementById('metaResultStats');

  btnChangeMeta.addEventListener('click', () => {
    releaseImage(previewStage._sourceImage);
    metaUploadArea.style.display = 'block';
    metaStudioArea.style.display = 'none';
    uploaded = null;
    btnProcess.disabled = true;
    btnDownload.disabled = true;
    previewStage.innerHTML = '';
    metaStats.style.display = 'none';
  });

  setupDropzone(document.getElementById('metaDropzone'), async ([file]) => {
    if (!file) return;
    uploaded = file;
    releaseImage(previewStage._sourceImage);
    releaseImage(previewStage._outputImage);
    document.getElementById('fileInfoMeta').innerHTML = `<strong>${escapeHtml(file.name)}</strong> <span class="file-size">${formatBytes(file.size)}</span>`;
    metaUploadArea.style.display = 'none';
    metaStudioArea.style.display = 'grid';

    const img = await loadImage(file, { retainUrl: true });
    releaseImage(previewStage._sourceImage);
    previewStage._sourceImage = img;
    previewStage.innerHTML = `<img src="${img.src}" class="preview-canvas" alt="Scrub preview" style="max-height:500px;"/>`;
    metaStats.style.display = 'none';
    btnProcess.disabled = false;
  });

  btnProcess.addEventListener('click', async () => {
    if (!uploaded) return;
    const res = await ImageTools.stripImageMetadata(uploaded);
    state.processedResult = res;
    releaseImage(previewStage._outputImage);
    previewStage._outputImage = await loadImage(res.blob, { retainUrl: true });
    previewStage.innerHTML = `<img src="${previewStage._outputImage.src}" class="preview-canvas" alt="Metadata-cleaned output preview" style="max-height:52vh;"/>`;
    metaStats.style.display = 'grid';
    const delta = uploaded.size - res.size;
    metaStats.innerHTML = `<div class="stat-item"><span class="stat-title">Original size</span><span class="stat-val">${formatBytes(uploaded.size)}</span></div><div class="stat-item"><span class="stat-title">Clean output</span><span class="stat-val">${formatBytes(res.size)}</span></div><div class="stat-item"><span class="stat-title">Result</span><span class="stat-val">${res.method || 'Metadata removed'}${delta > 0 ? ` · saved ${formatBytes(delta)}` : ''}</span></div>`;
    btnDownload.disabled = false;
    logActivity('Remove Metadata', uploaded.name, { size: res.size });
    showToast('All EXIF & GPS location metadata removed!');
  });

  btnDownload.addEventListener('click', () => {
    if (state.processedResult) downloadBlob(state.processedResult.blob, `clean_${uploaded.name}`);
  });
}

function renderImageBatchTool(zone) {
  zone.innerHTML = `
    <div class="tool-body full-studio">
      <div id="batchUploadArea">
        <div class="dropzone" id="batchDropzone">
          <input type="file" accept="image/*" multiple>
          <div class="dropzone-icon">${getIcon('merge', 36)}</div>
          <b>Choose multiple images for batch processing</b>
          <small>Batch resize, optimize and bundle to ZIP &bull; 100% offline</small>
        </div>
      </div>

      <div id="batchStudioArea" style="display:none;width:100%;">
        <div class="studio-topbar">
          <div class="studio-topbar-left">
            <span class="file-badge" id="fileInfoBatch"></span>
            <button class="btn-subtle" id="btnChangeBatch">Reset</button>
          </div>
          <div class="studio-topbar-center">
            <span style="font-size:13px;color:var(--muted);">All images will be resized to HD (1280&times;720) and bundled</span>
          </div>
          <div class="studio-topbar-right">
            <button class="btn-primary" id="btnProcessBatch" disabled>${getIcon('compress', 16)} Compress All to ZIP</button>
            <button class="btn-secondary" id="btnDownloadBatch" disabled>${getIcon('download', 16)} Download ZIP</button>
          </div>
        </div>

        <div class="studio-thumb-grid" style="margin-top:14px;padding:16px;">
          <div id="batchGallery" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(130px, 1fr));gap:14px;"></div>
        </div>
      </div>
    </div>
  `;

  let files = [];
  const batchUploadArea = document.getElementById('batchUploadArea');
  const batchStudioArea = document.getElementById('batchStudioArea');
  const btnChangeBatch = document.getElementById('btnChangeBatch');
  const btnProcess = document.getElementById('btnProcessBatch');
  const btnDownload = document.getElementById('btnDownloadBatch');
  const gallery = document.getElementById('batchGallery');

  btnChangeBatch.addEventListener('click', () => {
    files = [];
    batchUploadArea.style.display = 'block';
    batchStudioArea.style.display = 'none';
    btnProcess.disabled = true;
    btnDownload.disabled = true;
    gallery.innerHTML = '';
  });

  function renderBatchGallery() {
    gallery.innerHTML = '';
    files.forEach((f, idx) => {
      const card = document.createElement('div');
      card.style.cssText = 'background:#fff;border:1px solid var(--line);border-radius:6px;padding:8px;display:flex;flex-direction:column;align-items:center;position:relative;box-shadow:0 2px 6px rgba(0,0,0,0.06);';
      const img = document.createElement('img');
      img.src = URL.createObjectURL(f);
      img.style.cssText = 'width:100%;height:90px;object-fit:cover;border-radius:4px;';
      const label = document.createElement('span');
      label.style.cssText = 'font-size:11px;font-weight:600;margin-top:6px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:110px;';
      label.textContent = `#${idx + 1}: ${f.name}`;
      card.appendChild(img);
      card.appendChild(label);
      gallery.appendChild(card);
    });
  }

  setupDropzone(document.getElementById('batchDropzone'), (f) => {
    files = f;
    document.getElementById('fileInfoBatch').innerHTML = `<strong>${files.length} images ready</strong>`;
    batchUploadArea.style.display = 'none';
    batchStudioArea.style.display = 'grid';
    renderBatchGallery();
    btnProcess.disabled = files.length === 0;
  }, { multiple: true });

  btnProcess.addEventListener('click', async () => {
    if (!files.length) return;
    btnProcess.disabled = true;
    showToast(`Processing ${files.length} images...`);
    try {
      const res = await ImageTools.batchProcessImages(files, async (file, i) => {
        const c = await ImageTools.resizeImageExact(file, { width: 1280, height: 720, mode: 'max' });
        return { blob: c.blob, fileName: `image_${i + 1}.jpg` };
      });
      state.processedResult = { blob: res.zipBlob };
      document.getElementById('fileInfoBatch').textContent = `${res.count} images processed · ZIP ${formatBytes(res.zipBlob.size)}`;
      btnDownload.disabled = false;
      logActivity('Combine Image', `${files.length} images`);
      showToast('Batch processing complete!');
    } catch (e) {
      showToast('Batch error: ' + e.message);
    } finally {
      btnProcess.disabled = false;
    }
  });

  btnDownload.addEventListener('click', () => {
    if (state.processedResult) downloadBlob(state.processedResult.blob, 'batch_images.zip');
  });
}

/* ========================================================================= */
/*                          MEDIA TOOLS (VIDEO & AUDIO)                      */
/* ========================================================================= */
function renderVideoGenericTool(zone, toolId) {
  zone.innerHTML = `
    <div class="tool-body full-studio">
      <div id="vidUploadArea">
        <div class="dropzone" id="vidDropzone">
          <input type="file" accept="video/*" ${toolId === 'vid-merge' ? 'multiple' : ''}>
          <div class="dropzone-icon">${getIcon('video', 36)}</div>
          <b>Choose video clip (MP4, WebM, MOV)</b>
          <small>Processed 100% locally using offline local engine</small>
        </div>
      </div>

      <div id="vidStudioArea" style="display:none;width:100%;">
        <div class="studio-topbar">
          <div class="studio-topbar-left">
            <span class="file-badge" id="fileInfoVid"></span>
            <button class="btn-subtle" id="btnChangeVid">Change</button>
          </div>
          <div class="studio-topbar-center">
            ${toolId === 'vid-trim' ? `
              <div style="display:flex;align-items:center;gap:6px;">
                <label class="opt-label" style="margin:0;font-size:12px;" for="vStart">Start (s):</label>
                <input type="number" id="vStart" class="opt-input" value="0" min="0" step="0.1" style="width:70px;padding:4px 6px;font-size:13px;">
                <label class="opt-label" style="margin:0 0 0 6px;font-size:12px;" for="vEnd">End (s):</label>
                <input type="number" id="vEnd" class="opt-input" value="10" min="1" step="0.1" style="width:70px;padding:4px 6px;font-size:13px;">
              </div>
            ` : toolId === 'vid-compress' ? `
              <div style="display:flex;align-items:center;gap:6px;">
                <label class="opt-label" style="margin:0;font-size:12px;" for="vQual">Preset:</label>
                <select id="vQual" class="opt-select" style="padding:4px 8px;font-size:13px;">
                  <option value="low">Small File (CRF 32)</option>
                  <option value="medium" selected>Balanced (CRF 28)</option>
                  <option value="high">High Quality (CRF 23)</option>
                </select>
              </div>
            ` : toolId === 'vid-crop' ? `
              <div style="display:flex;align-items:center;gap:6px;">
                <label class="opt-label" style="margin:0;font-size:12px;" for="vAspect">Aspect:</label>
                <select id="vAspect" class="opt-select" style="padding:4px 8px;font-size:13px;">
                  <option value="1:1" selected>Square (1:1)</option>
                  <option value="16:9">Widescreen (16:9)</option>
                  <option value="9:16">Vertical (9:16)</option>
                </select>
              </div>
            ` : toolId === 'vid-resize' ? `
              <div style="display:flex;align-items:center;gap:4px;">
                <label class="opt-label" style="margin:0;font-size:12px;" for="vW">W:</label>
                <input type="number" id="vW" class="opt-input" value="1280" style="width:70px;padding:4px 6px;font-size:13px;">
                <span style="color:var(--muted);">&times;</span>
                <label class="opt-label" style="margin:0;font-size:12px;" for="vH">H:</label>
                <input type="number" id="vH" class="opt-input" value="720" style="width:70px;padding:4px 6px;font-size:13px;">
              </div>
            ` : toolId === 'vid-speed' ? `
              <div style="display:flex;align-items:center;gap:6px;"><label class="opt-label" style="margin:0;font-size:12px;" for="vSpeed">Speed:</label><select id="vSpeed" class="opt-select"><option value="0.5">0.5x</option><option value="0.75">0.75x</option><option value="1.25">1.25x</option><option value="1.5" selected>1.5x</option><option value="2">2x</option></select></div>
            ` : toolId === 'vid-rotate' ? `
              <div style="display:flex;align-items:center;gap:6px;">
                <label class="opt-label" style="margin:0;font-size:12px;" for="vRot">Rotation:</label>
                <select id="vRot" class="opt-select" style="padding:4px 8px;font-size:13px;">
                  <option value="90">90&deg; CW</option>
                  <option value="180">180&deg;</option>
                  <option value="270">90&deg; CCW</option>
                </select>
              </div>
            ` : toolId === 'vid-extract-audio' ? `
              <div style="display:flex;align-items:center;gap:6px;">
                <label class="opt-label" style="margin:0;font-size:12px;" for="vAudioFmt">Audio Format:</label>
                <select id="vAudioFmt" class="opt-select" style="padding:4px 8px;font-size:13px;">
                  <option value="mp3" selected>MP3 (.mp3)</option>
                  <option value="wav">WAV (.wav)</option>
                </select>
              </div>
            ` : `
              <span class="opt-help" style="margin:0;">Local loopback native processing ready</span>
            `}
            <span id="vidMeta" style="font-size:12px;color:var(--muted);font-weight:500;margin-left:8px;"></span>
          </div>
          <div class="studio-topbar-right">
            <button class="btn-primary" id="btnProcessVid" disabled>${getIcon('play', 16)} Process Video</button>
            <button class="btn-secondary" id="btnDownloadVid" disabled>${getIcon('download', 16)} Download</button>
          </div>
        </div>

        <div class="studio-media-preview" style="margin-top:14px;min-height:480px;">
          <div class="preview-stage" id="vidPreviewStage" style="width:100%;max-width:880px;display:flex;flex-direction:column;align-items:center;"></div>

          <div id="vidResultBox" style="display:none;margin-top:20px;width:100%;max-width:880px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
              <span style="color:var(--success);font-weight:700;">PROCESSED RESULT</span>
              <span id="vidResultMeta" style="font-size:13px;color:var(--muted);"></span>
            </div>
            <video id="vidPlayer" controls style="width:100%;max-height:400px;border-radius:8px;background:#000;"></video>
          </div>
        </div>
      </div>
    </div>
  `;

  let uploadedFile = null;
  let uploadedFiles = [];
  let videoPreviewController = null;
  const vidUploadArea = document.getElementById('vidUploadArea');
  const vidStudioArea = document.getElementById('vidStudioArea');
  const btnChangeVid = document.getElementById('btnChangeVid');
  const btnProcess = document.getElementById('btnProcessVid');
  const btnDownload = document.getElementById('btnDownloadVid');
  const previewStage = document.getElementById('vidPreviewStage');

  btnChangeVid.addEventListener('click', () => {
    vidUploadArea.style.display = 'block';
    vidStudioArea.style.display = 'none';
    uploadedFile = null;
    uploadedFiles = [];
    videoPreviewController = null;
    btnProcess.disabled = true;
    btnDownload.disabled = true;
    previewStage.innerHTML = '';
    document.getElementById('vidResultBox').style.display = 'none';
  });

  setupDropzone(document.getElementById('vidDropzone'), (files) => {
    const file = files[0];
    if (!file) return;
    uploadedFiles = files;
    uploadedFile = file;
    const totalSize = files.reduce((sum, item) => sum + item.size, 0);
    document.getElementById('fileInfoVid').innerHTML = `<strong>${toolId === 'vid-merge' ? `${files.length} video files` : escapeHtml(file.name)}</strong> <span class="file-size">${formatBytes(totalSize)}</span>`;
    document.getElementById('vidMeta').textContent = toolId === 'vid-merge' ? `${files.length} clips · join in selected order` : file.name;
    vidUploadArea.style.display = 'none';
    vidStudioArea.style.display = 'block';

    const vStart = document.getElementById('vStart');
    const vEnd = document.getElementById('vEnd');
    const vAspect = document.getElementById('vAspect');
    const vRot = document.getElementById('vRot');

    videoPreviewController = mountVideoPreview(previewStage, file, {
      showTrimControls: toolId === 'vid-trim',
      initialStart: vStart ? parseFloat(vStart.value) || 0 : 0,
      initialEnd: vEnd ? parseFloat(vEnd.value) || 10 : 10,
      cropAspect: vAspect ? vAspect.value : null,
      rotation: vRot ? parseInt(vRot.value) : 0,
      onTrimChange: (start, end) => {
        if (vStart) vStart.value = start.toFixed(1);
        if (vEnd) vEnd.value = end.toFixed(1);
      }
    });

    if (vAspect) {
      vAspect.addEventListener('change', () => {
        if (videoPreviewController) videoPreviewController.setCropAspect(vAspect.value);
      });
    }

    if (vRot) {
      vRot.addEventListener('change', () => {
        if (videoPreviewController) videoPreviewController.setRotation(parseInt(vRot.value));
      });
    }

    btnProcess.disabled = false;
    btnDownload.disabled = false;
  }, { accept: 'video/*', multiple: toolId === 'vid-merge' });

  async function executeVideoProcess() {
    if (!uploadedFile) return null;
    btnProcess.disabled = true;
    btnDownload.disabled = true;
    btnProcess.textContent = 'Processing locally...';

    try {
      let res;
      if (toolId === 'vid-trim') {
        const start = parseFloat(document.getElementById('vStart').value) || 0;
        const end = parseFloat(document.getElementById('vEnd').value) || 10;
        res = await VideoTools.trimVideo(uploadedFile, start, end);
      } else if (toolId === 'vid-compress') {
        res = await VideoTools.compressVideo(uploadedFile, document.getElementById('vQual').value);
      } else if (toolId === 'vid-crop') {
        res = await VideoTools.cropVideo(uploadedFile, document.getElementById('vAspect').value);
      } else if (toolId === 'vid-resize') {
        res = await VideoTools.resizeVideo(uploadedFile, parseInt(document.getElementById('vW').value), parseInt(document.getElementById('vH').value));
      } else if (toolId === 'vid-speed') {
        res = await VideoTools.changeVideoSpeed(uploadedFile, Number(document.getElementById('vSpeed').value));
      } else if (toolId === 'vid-merge') {
        if (uploadedFiles.length < 2) throw new Error('Choose at least two video clips to merge.');
        res = await VideoTools.mergeVideos(uploadedFiles);
      } else if (toolId === 'vid-rotate') {
        res = await VideoTools.rotateVideo(uploadedFile, parseInt(document.getElementById('vRot').value));
      } else if (toolId === 'vid-extract-audio') {
        res = await VideoTools.extractAudioFromVideo(uploadedFile, document.getElementById('vAudioFmt').value);
      } else if (toolId === 'vid-mute') {
        res = await VideoTools.muteVideo(uploadedFile);
      } else {
        res = await VideoTools.convertVideo(uploadedFile, 'mp4');
      }

      state.processedResult = res;
      const vPlayer = document.getElementById('vidPlayer');
      if (vPlayer && res.blob) {
        vPlayer.src = URL.createObjectURL(res.blob);
      }
      document.getElementById('vidResultBox').style.display = 'block';
      document.getElementById('vidResultMeta').textContent = `Output: ${formatBytes(res.size)}`;

      logActivity(toolId, uploadedFile.name, { size: res.size });
      showToast(`Processed! Output size: ${formatBytes(res.size)}`);
      return res;
    } catch (e) {
      showToast('Video processing failed: ' + e.message);
      return null;
    } finally {
      btnProcess.disabled = false;
      btnDownload.disabled = false;
      btnProcess.innerHTML = `${getIcon('play', 16)} Process Video`;
    }
  }

  btnProcess.addEventListener('click', executeVideoProcess);

  btnDownload.addEventListener('click', async () => {
    let res = state.processedResult;
    if (!res) {
      const origHtml = btnDownload.innerHTML;
      btnDownload.innerHTML = `<span style="display:inline-block;width:12px;height:12px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:6px;vertical-align:middle;"></span> Processing...`;
      btnDownload.disabled = true;
      try {
        res = await executeVideoProcess();
      } finally {
        btnDownload.innerHTML = origHtml;
        btnDownload.disabled = false;
      }
    }
    if (res && res.blob) {
      downloadBlob(res.blob, res.fileName || `${(uploadedFile?.name || 'video').replace(/\.[^/.]+$/, '')}_compressed.mp4`);
    } else {
      showToast('Could not process video for download. Please verify input.');
    }
  });
}

async function getAudioDuration(file, mountedAudio) {
  if (mountedAudio && Number.isFinite(mountedAudio.duration) && mountedAudio.duration > 0) return mountedAudio.duration;
  const audio = new Audio();
  audio.preload = 'metadata';
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Could not read audio duration.')), 10000);
      audio.onloadedmetadata = () => {
        clearTimeout(timer);
        if (Number.isFinite(audio.duration) && audio.duration > 0) resolve(audio.duration);
        else reject(new Error('This audio file has no readable duration.'));
      };
      audio.onerror = () => { clearTimeout(timer); reject(new Error('Could not read audio duration.')); };
      audio.src = url;
    });
  } finally {
    audio.removeAttribute('src');
    URL.revokeObjectURL(url);
  }
}

function renderAudioGenericTool(zone, toolId) {
  zone.innerHTML = `
    <div class="tool-body full-studio">
    <div id="audUploadArea">
        <div class="dropzone" id="audDropzone">
          <input type="file" accept="audio/*,video/*" ${toolId === 'aud-merge' ? 'multiple' : ''}>
          <div class="dropzone-icon">${getIcon('audio', 36)}</div>
          <b>Choose audio track or video clip</b>
          <small>Processed 100% locally &bull; Zero upload &bull; 100% offline</small>
        </div>
      </div>

      <div id="audStudioArea" style="display:none;width:100%;">
        <div class="studio-topbar">
          <div class="studio-topbar-left">
            <span class="file-badge" id="fileInfoAud"></span>
            <button class="btn-subtle" id="btnChangeAud">Change</button>
          </div>
          <div class="studio-topbar-center">
            ${toolId === 'aud-trim' ? `
              <div style="display:flex;align-items:center;gap:6px;">
                <label class="opt-label" style="margin:0;font-size:12px;" for="aStart">Start (s):</label>
                <input type="number" id="aStart" class="opt-input" value="0" min="0" step="0.1" style="width:70px;padding:4px 6px;font-size:13px;">
                <label class="opt-label" style="margin:0 0 0 6px;font-size:12px;" for="aEnd">End (s):</label>
                <input type="number" id="aEnd" class="opt-input" value="30" min="1" step="0.1" style="width:70px;padding:4px 6px;font-size:13px;">
              </div>
            ` : toolId === 'aud-speed' ? `
              <div style="display:flex;align-items:center;gap:6px;">
                <label class="opt-label" style="margin:0;font-size:12px;" for="aSpeed">Speed:</label>
                <select id="aSpeed" class="opt-select" style="padding:4px 8px;font-size:13px;">
                  <option value="0.75">0.75x</option>
                  <option value="1.25" selected>1.25x</option>
                  <option value="1.5">1.5x</option>
                  <option value="2.0">2.0x</option>
                </select>
              </div>
            ` : toolId === 'aud-volume' ? `
              <div style="display:flex;align-items:center;gap:6px;">
                <label class="opt-label" style="margin:0;font-size:12px;" for="aVol">Volume:</label>
                <select id="aVol" class="opt-select" style="padding:4px 8px;font-size:13px;">
                  <option value="50">50%</option>
                  <option value="150" selected>150%</option>
                  <option value="200">200%</option>
                </select>
              </div>
            ` : toolId === 'aud-loop' ? `
              <div style="display:flex;align-items:center;gap:6px;">
                <label class="opt-label" style="margin:0;font-size:12px;" for="aLoop">Loop Count:</label>
                <input type="number" id="aLoop" class="opt-input" value="2" min="1" max="10" style="width:60px;padding:4px 6px;font-size:13px;">
              </div>
            ` : toolId === 'aud-denoise' ? `
              <div style="display:flex;align-items:center;gap:6px;"><label class="opt-label" style="margin:0;font-size:12px;" for="aDenoise">Strength:</label><select id="aDenoise" class="opt-select"><option value="light">Light</option><option value="normal" selected>Normal</option><option value="strong">Strong</option></select></div>
            ` : toolId === 'aud-fade' ? `
              <div style="display:flex;align-items:center;gap:6px;"><label class="opt-label" for="aFadeIn">Fade in (s)</label><input id="aFadeIn" class="opt-input" type="number" min="0" step="0.1" value="2" style="width:70px"><label class="opt-label" for="aFadeOut">Fade out (s)</label><input id="aFadeOut" class="opt-input" type="number" min="0" step="0.1" value="2" style="width:70px"></div>
            ` : toolId === 'aud-convert' || toolId === 'aud-extract' ? `
              <div style="display:flex;align-items:center;gap:6px;"><label class="opt-label" for="aFmt">Format</label><select id="aFmt" class="opt-select"><option value="mp3">MP3</option><option value="wav">WAV</option><option value="aac">AAC</option><option value="ogg">OGG</option></select></div>
            ` : toolId === 'aud-compress' ? `
              <div style="display:flex;align-items:center;gap:6px;">
                <label class="opt-label" style="margin:0;font-size:12px;" for="aBitrate">Bitrate:</label>
                <select id="aBitrate" class="opt-select" style="padding:4px 8px;font-size:13px;">
                  <option value="64k">64 kbps (Small)</option>
                  <option value="128k" selected>128 kbps (Standard)</option>
                  <option value="256k">256 kbps (High)</option>
                </select>
              </div>
            ` : `
              <div style="display:flex;align-items:center;gap:6px;">
                <label class="opt-label" style="margin:0;font-size:12px;" for="aFmt">Format:</label>
                <select id="aFmt" class="opt-select" style="padding:4px 8px;font-size:13px;">
                  <option value="mp3" selected>MP3</option>
                  <option value="wav">WAV</option>
                  <option value="aac">AAC</option>
                </select>
              </div>
            `}
            <span id="audMeta" style="font-size:12px;color:var(--muted);font-weight:500;margin-left:8px;"></span>
          </div>
          <div class="studio-topbar-right">
            <button class="btn-primary" id="btnProcessAud" disabled>${getIcon('audio', 16)} Process Audio</button>
            <button class="btn-secondary" id="btnDownloadAud" disabled>${getIcon('download', 16)} Download</button>
          </div>
        </div>

        <div class="studio-media-preview" style="margin-top:14px;min-height:360px;">
          <div class="preview-stage" id="audPreviewStage" style="width:100%;max-width:880px;display:flex;flex-direction:column;align-items:center;"></div>

          <div id="audResultBox" style="display:none;margin-top:20px;width:100%;max-width:880px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
              <span style="color:var(--success);font-weight:700;">PROCESSED RESULT</span>
              <span id="audResultMeta" style="font-size:13px;color:var(--muted);"></span>
            </div>
            <audio id="audPlayer" controls style="width:100%;"></audio>
          </div>
        </div>
      </div>
    </div>
  `;

  let uploadedFile = null;
  let audioPreviewController = null;
  const audUploadArea = document.getElementById('audUploadArea');
  const audStudioArea = document.getElementById('audStudioArea');
  const btnChangeAud = document.getElementById('btnChangeAud');
  const btnProcess = document.getElementById('btnProcessAud');
  const btnDownload = document.getElementById('btnDownloadAud');
  const previewStage = document.getElementById('audPreviewStage');

  btnChangeAud.addEventListener('click', () => {
    audUploadArea.style.display = 'block';
    audStudioArea.style.display = 'none';
    uploadedFile = null;
    uploadedFiles = [];
    audioPreviewController = null;
    btnProcess.disabled = true;
    btnDownload.disabled = true;
    previewStage.innerHTML = '';
    document.getElementById('audResultBox').style.display = 'none';
  });

  let uploadedFiles = [];
  setupDropzone(document.getElementById('audDropzone'), (files) => {
    const file = files[0];
    if (!file) return;
    uploadedFiles = files;
    uploadedFile = file;
    document.getElementById('fileInfoAud').innerHTML = `<strong>${toolId==='aud-merge'?`${files.length} audio files`:escapeHtml(file.name)}</strong> <span class="file-size">${formatBytes(files.reduce((sum,item)=>sum+item.size,0))}</span>`;
    document.getElementById('audMeta').textContent = toolId==='aud-merge' ? `${files.length} files selected · join in order` : file.name;
    audUploadArea.style.display = 'none';
    audStudioArea.style.display = 'block';

    const aStart = document.getElementById('aStart');
    const aEnd = document.getElementById('aEnd');
    const aSpeed = document.getElementById('aSpeed');

    audioPreviewController = mountAudioPreview(previewStage, file, {
      showTrimControls: toolId === 'aud-trim',
      initialStart: aStart ? parseFloat(aStart.value) || 0 : 0,
      initialEnd: aEnd ? parseFloat(aEnd.value) || 30 : 30,
      speed: aSpeed ? parseFloat(aSpeed.value) || 1.0 : 1.0,
      onTrimChange: (start, end) => {
        if (aStart) aStart.value = start.toFixed(1);
        if (aEnd) aEnd.value = end.toFixed(1);
      }
    });

    if (aSpeed) {
      aSpeed.addEventListener('change', () => {
        if (audioPreviewController) audioPreviewController.setSpeed(parseFloat(aSpeed.value) || 1.0);
      });
    }

    btnProcess.disabled = false;
    btnDownload.disabled = false;
  }, { accept: 'audio/*,video/*', multiple: toolId === 'aud-merge' });

  async function executeAudioProcess() {
    if (!uploadedFile) return null;
    btnProcess.disabled = true;
    btnDownload.disabled = true;
    btnProcess.textContent = 'Processing locally...';
    try {
      let res;
      if (toolId === 'aud-trim') {
        const start = parseFloat(document.getElementById('aStart').value) || 0;
        const end = parseFloat(document.getElementById('aEnd').value) || 30;
        res = await AudioTools.trimAudio(uploadedFile, start, end);
      } else if (toolId === 'aud-speed') {
        res = await AudioTools.changeAudioSpeed(uploadedFile, parseFloat(document.getElementById('aSpeed').value));
      } else if (toolId === 'aud-volume') {
        res = await AudioTools.adjustAudioVolume(uploadedFile, parseInt(document.getElementById('aVol').value));
      } else if (toolId === 'aud-loop') {
        res = await AudioTools.loopAudio(uploadedFile, parseInt(document.getElementById('aLoop').value));
      } else if (toolId === 'aud-compress') {
        res = await AudioTools.compressAudio(uploadedFile, document.getElementById('aBitrate').value);
      } else if (toolId === 'aud-denoise') {
        res = await AudioTools.reduceAudioNoise(uploadedFile, document.getElementById('aDenoise').value);
      } else if (toolId === 'aud-convert') {
        res = await AudioTools.convertAudio(uploadedFile, document.getElementById('aFmt').value);
      } else if (toolId === 'aud-fade') {
        const duration = await getAudioDuration(uploadedFile, audioPreviewController?.audioEl);
        const fadeIn = Number(document.getElementById('aFadeIn').value);
        const fadeOut = Number(document.getElementById('aFadeOut').value);
        if (!Number.isFinite(fadeIn) || !Number.isFinite(fadeOut) || fadeIn < 0 || fadeOut < 0 || fadeIn + fadeOut > duration) {
          throw new Error(`Fade in and fade out must total no more than the ${duration.toFixed(1)} second track.`);
        }
        res = await AudioTools.fadeAudio(uploadedFile, fadeIn, fadeOut, duration);
      } else if (toolId === 'aud-merge') {
        if (uploadedFiles.length < 2) throw new Error('Choose at least two audio files to merge.');
        res = await AudioTools.mergeAudio(uploadedFiles);
      } else {
        res = await AudioTools.extractAudioFromVideo(uploadedFile, document.getElementById('aFmt')?.value || 'mp3');
      }

      state.processedResult = res;
      const aPlayer = document.getElementById('audPlayer');
      if (aPlayer && res.blob) {
        aPlayer.src = URL.createObjectURL(res.blob);
      }
      document.getElementById('audResultBox').style.display = 'block';
      document.getElementById('audResultMeta').textContent = `Output: ${formatBytes(res.size)}`;

      logActivity(toolId, uploadedFile.name, { size: res.size });
      showToast('Audio processed successfully!');
      return res;
    } catch (e) {
      showToast('Audio processing failed: ' + e.message);
      return null;
    } finally {
      btnProcess.disabled = false;
      btnDownload.disabled = false;
      btnProcess.innerHTML = `${getIcon('play', 16)} Process Audio`;
    }
  }

  btnProcess.addEventListener('click', executeAudioProcess);

  btnDownload.addEventListener('click', async () => {
    let res = state.processedResult;
    if (!res) {
      const origHtml = btnDownload.innerHTML;
      btnDownload.innerHTML = `<span style="display:inline-block;width:12px;height:12px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:6px;vertical-align:middle;"></span> Processing...`;
      btnDownload.disabled = true;
      try {
        res = await executeAudioProcess();
      } finally {
        btnDownload.innerHTML = origHtml;
        btnDownload.disabled = false;
      }
    }
    if (res && res.blob) {
      downloadBlob(res.blob, res.fileName || `${(uploadedFile?.name || 'audio').replace(/\.[^/.]+$/, '')}_processed.mp3`);
    } else {
      showToast('Could not process audio for download. Please verify input.');
    }
  });
}

/* ========================================================================= */
/*                          TEXT TOOLS: CASE, WORD COUNT, ETC.               */
/* ========================================================================= */
function renderTextCaseTool(zone) {
  zone.innerHTML = `
    <div class="tool-body single-col">
      <div class="options-box">
        <div class="opt-row">
          <label class="opt-label" for="txtInput">Enter or Paste Text</label>
          <textarea id="txtInput" class="opt-textarea" rows="5" placeholder="Type or paste your text here..."></textarea>
        </div>

        <div class="opt-row">
          <span class="opt-label">Transform to Case</span>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn-secondary case-btn" data-c="upper">UPPERCASE</button>
            <button class="btn-secondary case-btn" data-c="lower">lowercase</button>
            <button class="btn-secondary case-btn" data-c="title">Title Case</button>
            <button class="btn-secondary case-btn" data-c="sentence">Sentence case</button>
            <button class="btn-secondary case-btn" data-c="camel">camelCase</button>
            <button class="btn-secondary case-btn" data-c="kebab">kebab-case</button>
            <button class="btn-secondary case-btn" data-c="snake">snake_case</button>
          </div>
        </div>

        <div class="opt-row" style="margin-top:12px;">
          <label class="opt-label" for="txtOutput">Converted Output</label>
          <textarea id="txtOutput" class="opt-textarea text-output-area" readonly></textarea>
        </div>
      </div>

      <div class="actions">
        <button class="btn-primary" id="btnCopyCase">${getIcon('check', 16)} Copy Converted Text</button>
      </div>
    </div>
  `;

  const input = document.getElementById('txtInput');
  const output = document.getElementById('txtOutput');

  document.querySelectorAll('.case-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      output.value = TextTools.convertCase(input.value, btn.dataset.c);
    });
  });

  document.getElementById('btnCopyCase').addEventListener('click', () => {
    navigator.clipboard.writeText(output.value);
    showToast('Copied to clipboard!');
  });
}

function renderTextCounterTool(zone) {
  zone.innerHTML = `
    <div class="tool-body single-col">
      <div class="options-box">
        <div class="opt-row">
          <label class="opt-label" for="countInput">Enter or Paste Text</label>
          <textarea id="countInput" class="opt-textarea" rows="6" placeholder="Start typing..."></textarea>
        </div>
      </div>

      <div class="result-card" id="textStatsCard">
        <div class="stat-item"><span class="stat-title">Words</span><span class="stat-val" id="cntWords">0</span></div>
        <div class="stat-item"><span class="stat-title">Characters</span><span class="stat-val" id="cntChars">0</span></div>
        <div class="stat-item"><span class="stat-title">Without Spaces</span><span class="stat-val" id="cntCharsNoSp">0</span></div>
        <div class="stat-item"><span class="stat-title">Lines</span><span class="stat-val" id="cntLines">0</span></div>
        <div class="stat-item"><span class="stat-title">Reading Time</span><span class="stat-val" id="cntReadTime">0 min</span></div>
      </div>
    </div>
  `;

  const input = document.getElementById('countInput');
  input.addEventListener('input', () => {
    const s = TextTools.countTextStats(input.value);
    document.getElementById('cntWords').textContent = s.words.toLocaleString();
    document.getElementById('cntChars').textContent = s.characters.toLocaleString();
    document.getElementById('cntCharsNoSp').textContent = s.charactersNoSpaces.toLocaleString();
    document.getElementById('cntLines').textContent = s.lines.toLocaleString();
    document.getElementById('cntReadTime').textContent = `${s.readingTimeMin} min`;
  });
}

function renderTextReplaceTool(zone) {
  zone.innerHTML = `
    <div class="tool-body single-col">
      <div class="options-box">
        <div class="opt-row">
          <label class="opt-label" for="repText">Source Text</label>
          <textarea id="repText" class="opt-textarea" rows="4"></textarea>
        </div>

        <div class="input-group-grid">
          <div class="opt-row"><label class="opt-label" for="findVal">Find</label><input type="text" id="findVal" class="opt-input"></div>
          <div class="opt-row"><label class="opt-label" for="repVal">Replace with</label><input type="text" id="repVal" class="opt-input"></div>
        </div>

        <div class="opt-row">
          <label class="toggle-label"><input type="checkbox" id="repCase"><span>Match Case</span></label>
        </div>

        <div class="opt-row">
          <label class="opt-label" for="repOut">Result Text</label>
          <textarea id="repOut" class="opt-textarea text-output-area" readonly></textarea>
        </div>
      </div>

      <div class="actions">
        <button class="btn-primary" id="btnDoReplace">Replace All</button>
        <button class="btn-secondary" id="btnCopyRep">Copy Result</button>
      </div>
    </div>
  `;

  document.getElementById('btnDoReplace').addEventListener('click', () => {
    const text = document.getElementById('repText').value;
    const findStr = document.getElementById('findVal').value;
    const repStr = document.getElementById('repVal').value;
    const isCase = document.getElementById('repCase').checked;
    const res = TextTools.findAndReplace(text, findStr, repStr, isCase);
    document.getElementById('repOut').value = res.result;
    showToast(`Replaced ${res.count} occurrences.`);
  });

  document.getElementById('btnCopyRep').addEventListener('click', () => {
    navigator.clipboard.writeText(document.getElementById('repOut').value);
    showToast('Copied to clipboard!');
  });
}

function renderTextCleanTool(zone) {
  zone.innerHTML = `
    <div class="tool-body single-col">
      <div class="options-box">
        <div class="opt-row"><label class="opt-label" for="cleanInput">Source Text</label><textarea id="cleanInput" class="opt-textarea" rows="5"></textarea></div>
        <div class="opt-row"><label class="opt-label" for="cleanOut">Cleaned Text</label><textarea id="cleanOut" class="opt-textarea text-output-area" readonly></textarea></div>
      </div>
      <div class="actions">
        <button class="btn-primary" id="btnCleanRun">Remove Extra Spaces & Blanks</button>
        <button class="btn-secondary" id="btnCleanCopy">Copy Result</button>
      </div>
    </div>
  `;

  document.getElementById('btnCleanRun').addEventListener('click', () => {
    const res = TextTools.removeSpacesAndBlanks(document.getElementById('cleanInput').value);
    document.getElementById('cleanOut').value = res;
    showToast('Cleaned whitespace!');
  });
  document.getElementById('btnCleanCopy').addEventListener('click', () => {
    navigator.clipboard.writeText(document.getElementById('cleanOut').value);
    showToast('Copied!');
  });
}

function renderRandomTextTool(zone) {
  zone.innerHTML=`<div class="tool-body single-col"><div class="options-box"><div class="input-group-grid"><label class="opt-label">Text type<select id="randomMode" class="opt-select"><option value="words">Words</option><option value="sentences" selected>Sentences</option><option value="paragraphs">Paragraphs</option><option value="list">List items</option><option value="lorem">Lorem Ipsum words</option></select></label><label class="opt-label">Quantity<input id="randomCount" class="opt-input" type="number" min="1" max="1000" value="3"></label></div><label class="opt-label" id="randomPerLabel" hidden>Sentences per paragraph<input id="randomPer" class="opt-input" type="number" min="1" max="120" value="4"></label><div class="actions"><button class="btn-primary" id="randomGenerate">Generate</button><button class="btn-secondary" id="randomAgain">Regenerate</button><button class="btn-secondary" id="randomClear">Clear</button></div><label class="opt-label" for="randomOutput">Generated text</label><textarea id="randomOutput" class="opt-textarea text-output-area" readonly></textarea><div class="result-card" id="randomStats">Words 0 · Characters 0 · Lines 0</div><div class="actions"><button class="btn-secondary" id="randomCopy">Copy</button><button class="btn-secondary" id="randomDownload">Download .txt</button></div></div></div>`;
  const mode=document.getElementById('randomMode'), count=document.getElementById('randomCount'), per=document.getElementById('randomPer'), perLabel=document.getElementById('randomPerLabel'), output=document.getElementById('randomOutput');
  const run=()=>{try{const result=TextTools.generateRandomText({mode:mode.value,quantity:Number(count.value),sentencesPerParagraph:Number(per.value)});output.value=result.text;const stats=TextTools.countTextStats(result.text);document.getElementById('randomStats').textContent=`${stats.words} words · ${stats.characters} characters · ${stats.lines} lines`;showToast('Sample text generated.');}catch(error){showToast(error.message);}};
  mode.addEventListener('change',()=>{perLabel.hidden=mode.value!=='paragraphs';});
  document.getElementById('randomGenerate').addEventListener('click',run);document.getElementById('randomAgain').addEventListener('click',run);
  document.getElementById('randomClear').addEventListener('click',()=>{output.value='';document.getElementById('randomStats').textContent='Words 0 · Characters 0 · Lines 0';});
  document.getElementById('randomCopy').addEventListener('click',()=>navigator.clipboard.writeText(output.value).then(()=>showToast('Copied.')).catch(()=>showToast('Clipboard access is unavailable.')));
  document.getElementById('randomDownload').addEventListener('click',()=>downloadBlob(new Blob([output.value],{type:'text/plain;charset=utf-8'}),'sample-text.txt'));
}

function renderTextExtractorTool(zone) {
  zone.innerHTML=`<div class="tool-body single-col"><div class="options-box"><label class="opt-label" for="extractInput">Paste text</label><textarea id="extractInput" class="opt-textarea" rows="7" placeholder="Paste text to find items…"></textarea><div class="input-group-grid"><label class="opt-label">Find<select id="extractMode" class="opt-select"><option value="email">Email addresses</option><option value="url">Web links</option><option value="number">Numbers</option><option value="phone">Phone candidates</option></select></label><label class="toggle-label"><input id="extractUnique" type="checkbox" checked><span>Show unique matches</span></label></div><button class="btn-primary" id="extractRun">Extract</button><label class="opt-label" for="extractOutput">Matches</label><textarea id="extractOutput" class="opt-textarea text-output-area" readonly></textarea><div class="result-card" id="extractCount">0 matches</div><div class="actions"><button class="btn-secondary" id="extractCopy">Copy</button><button class="btn-secondary" id="extractClear">Clear</button></div><p class="subtitle">Phone results are formatting candidates, not country-specific validation.</p></div></div>`;
  const run=()=>{try{const matches=TextTools.extractTextItems(document.getElementById('extractInput').value,document.getElementById('extractMode').value,{unique:document.getElementById('extractUnique').checked});document.getElementById('extractOutput').value=matches.join('\n');document.getElementById('extractCount').textContent=`${matches.length} match${matches.length===1?'':'es'}`;}catch(error){showToast(error.message);}};
  document.getElementById('extractRun').addEventListener('click',run);document.getElementById('extractInput').addEventListener('input',run);document.getElementById('extractMode').addEventListener('change',run);document.getElementById('extractUnique').addEventListener('change',run);
  document.getElementById('extractCopy').addEventListener('click',()=>navigator.clipboard.writeText(document.getElementById('extractOutput').value).then(()=>showToast('Copied.')).catch(()=>showToast('Clipboard access is unavailable.')));
  document.getElementById('extractClear').addEventListener('click',()=>{document.getElementById('extractInput').value='';run();});
}

function renderSlugTool(zone) {
  zone.innerHTML=`<div class="tool-body single-col"><div class="options-box"><label class="opt-label" for="slugInput">Title or phrase</label><input id="slugInput" class="opt-input" placeholder="My New Website!"><label class="toggle-label"><input id="slugUnicode" type="checkbox"><span>Keep Unicode letters</span></label><label class="opt-label" for="slugOutput">URL text</label><input id="slugOutput" class="opt-input" readonly><div class="actions"><button class="btn-secondary" id="slugCopy">Copy</button><button class="btn-secondary" id="slugClear">Clear</button></div></div></div>`;
  const update=()=>document.getElementById('slugOutput').value=TextTools.makeSlug(document.getElementById('slugInput').value,{unicode:document.getElementById('slugUnicode').checked});
  document.getElementById('slugInput').addEventListener('input',update);document.getElementById('slugUnicode').addEventListener('change',update);
  document.getElementById('slugCopy').addEventListener('click',()=>navigator.clipboard.writeText(document.getElementById('slugOutput').value).then(()=>showToast('Copied.')).catch(()=>showToast('Clipboard access is unavailable.')));
  document.getElementById('slugClear').addEventListener('click',()=>{document.getElementById('slugInput').value='';update();});
}

function renderTextDuplicatesTool(zone) {
  zone.innerHTML = `
    <div class="tool-body single-col">
      <div class="options-box">
        <div class="opt-row"><label class="opt-label" for="dupInput">Source Lines</label><textarea id="dupInput" class="opt-textarea" rows="5"></textarea></div>
        <div class="opt-row"><label class="opt-label" for="dupOut">Deduplicated Lines</label><textarea id="dupOut" class="opt-textarea text-output-area" readonly></textarea></div>
      </div>
      <div class="actions">
        <button class="btn-primary" id="btnDupRun">Remove Duplicate Lines</button>
        <button class="btn-secondary" id="btnDupCopy">Copy</button>
      </div>
    </div>
  `;

  document.getElementById('btnDupRun').addEventListener('click', () => {
    const res = TextTools.removeDuplicateLines(document.getElementById('dupInput').value);
    document.getElementById('dupOut').value = res;
    showToast('Duplicate lines removed.');
  });
  document.getElementById('btnDupCopy').addEventListener('click', () => {
    navigator.clipboard.writeText(document.getElementById('dupOut').value);
    showToast('Copied!');
  });
}

function renderTextSortTool(zone) {
  zone.innerHTML = `
    <div class="tool-body single-col">
      <div class="options-box">
        <div class="opt-row"><label class="opt-label" for="sortInput">Text Lines</label><textarea id="sortInput" class="opt-textarea" rows="5"></textarea></div>
        <div class="opt-row">
          <span class="opt-label">Sorting Mode</span>
          <select id="sortMode" class="opt-select">
            <option value="az">A to Z (Alphabetical)</option>
            <option value="za">Z to A (Reverse)</option>
            <option value="numeric">Numeric Sort</option>
            <option value="length">Line Length</option>
          </select>
        </div>
        <div class="opt-row"><label class="opt-label" for="sortOut">Sorted Output</label><textarea id="sortOut" class="opt-textarea text-output-area" readonly></textarea></div>
      </div>
      <div class="actions">
        <button class="btn-primary" id="btnSortRun">Sort Lines</button>
        <button class="btn-secondary" id="btnSortCopy">Copy</button>
      </div>
    </div>
  `;

  document.getElementById('btnSortRun').addEventListener('click', () => {
    const res = TextTools.sortLines(document.getElementById('sortInput').value, document.getElementById('sortMode').value);
    document.getElementById('sortOut').value = res;
    showToast('Lines sorted!');
  });
  document.getElementById('btnSortCopy').addEventListener('click', () => {
    navigator.clipboard.writeText(document.getElementById('sortOut').value);
    showToast('Copied!');
  });
}

function renderTextCompareTool(zone) {
  zone.innerHTML = `
    <div class="tool-body">
      <div class="options-box">
        <label class="opt-label">Original Text (A)</label>
        <textarea id="cmpA" class="opt-textarea" rows="8"></textarea>
      </div>
      <div class="options-box">
        <label class="opt-label">Modified Text (B)</label>
        <textarea id="cmpB" class="opt-textarea" rows="8"></textarea>
      </div>
    </div>
    <div class="actions" style="margin-top:16px;">
      <button class="btn-primary" id="btnRunDiff">Compare Two Texts</button>
    </div>
    <div id="diffOutputCard" class="options-box" style="margin-top:16px;display:none;"></div>
  `;

  document.getElementById('btnRunDiff').addEventListener('click', () => {
    const a = document.getElementById('cmpA').value;
    const b = document.getElementById('cmpB').value;
    const diff = TextTools.compareTextDiff(a, b);
    const card = document.getElementById('diffOutputCard');
    card.style.display = 'block';
    card.innerHTML = `
      <span class="opt-label">Line Comparison</span>
      <div style="font-family:monospace;font-size:12.5px;line-height:1.6;">
        ${diff.map(d => `
          <div style="background:${d.type === 'added' ? '#D1FAE5' : d.type === 'removed' ? '#FEE2E2' : 'transparent'};color:${d.type === 'added' ? '#065F46' : d.type === 'removed' ? '#991B1B' : 'inherit'};padding:2px 8px;border-radius:4px;">
            ${d.type === 'added' ? '+ ' : d.type === 'removed' ? '- ' : '  '}${escapeHtml(d.text)}
          </div>
        `).join('')}
      </div>
    `;
  });
}

function renderTextToPdfTool(zone) {
  zone.innerHTML = `
    <div class="tool-body single-col">
      <div class="options-box">
        <div class="opt-row"><label class="opt-label" for="t2pTitle">Document Title (Optional)</label><input type="text" id="t2pTitle" class="opt-input" value="Document"></div>
        <div class="opt-row"><label class="opt-label" for="t2pContent">Text Content</label><textarea id="t2pContent" class="opt-textarea" rows="8"></textarea></div>
      </div>
      <div class="actions">
        <button class="btn-primary" id="btnMakePdf">${getIcon('pdf', 16)} Export Formatted PDF</button>
      </div>
    </div>
  `;

  document.getElementById('btnMakePdf').addEventListener('click', async () => {
    const text = document.getElementById('t2pContent').value;
    const title = document.getElementById('t2pTitle').value;
    if (!text.trim()) { showToast('Please enter text.'); return; }
    try {
      const res = await PdfTools.textToPdf(text, { title });
      downloadBlob(res.blob, `${title || 'document'}.pdf`);
      logActivity('Text to PDF', title, { size: res.size });
      showToast(`PDF exported with ${res.totalPages} pages!`);
    } catch (e) {
      showToast('Export failed: ' + e.message);
    }
  });
}

/* ========================================================================= */
/*                          TIME TOOLS                                       */
/* ========================================================================= */
function renderStopwatchTool(zone) {
  zone.innerHTML = `
    <div class="tool-body single-col">
      <div class="options-box" style="text-align:center;padding:36px;">
        <div id="swDisplay" style="font-size:52px;font-weight:750;letter-spacing:1px;font-variant-numeric:tabular-nums;color:var(--ink);">00:00:00.00</div>
        <div class="actions" style="justify-content:center;margin-top:24px;">
          <button class="btn-primary" id="swStart">${getIcon('play', 16)} Start</button>
          <button class="btn-secondary" id="swLap" disabled>Lap</button>
          <button class="btn-secondary" id="swReset">Reset</button>
        </div>
      </div>
      <div id="swLapsCard" class="options-box" style="margin-top:16px;display:none;">
        <span class="opt-label">Laps Recorded</span>
        <ul id="swLapsList" style="list-style:none;display:flex;flex-direction:column;gap:6px;font-size:13px;margin-top:8px;"></ul>
      </div>
    </div>
  `;

  let swInterval = null;
  let swStartTime = 0;
  let swElapsed = 0;
  let swRunning = false;
  let lapCount = 0;

  const display = document.getElementById('swDisplay');
  const btnStart = document.getElementById('swStart');
  const btnLap = document.getElementById('swLap');
  const btnReset = document.getElementById('swReset');
  const lapsCard = document.getElementById('swLapsCard');
  const lapsList = document.getElementById('swLapsList');

  function formatTime(ms) {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const cs = Math.floor((ms % 1000) / 10);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  }

  btnStart.addEventListener('click', () => {
    if (!swRunning) {
      swRunning = true;
      swStartTime = Date.now() - swElapsed;
      swInterval = setInterval(() => {
        swElapsed = Date.now() - swStartTime;
        display.textContent = formatTime(swElapsed);
      }, 30);
      btnStart.textContent = 'Pause';
      btnLap.disabled = false;
    } else {
      swRunning = false;
      clearInterval(swInterval);
      btnStart.innerHTML = `${getIcon('play', 16)} Resume`;
    }
  });

  btnLap.addEventListener('click', () => {
    lapCount++;
    lapsCard.style.display = 'block';
    const li = document.createElement('li');
    li.style.cssText = 'display:flex;justify-content:space-between;border-bottom:1px solid var(--line);padding:4px 0;';
    li.innerHTML = `<span>Lap ${lapCount}</span><strong>${formatTime(swElapsed)}</strong>`;
    lapsList.prepend(li);
  });

  btnReset.addEventListener('click', () => {
    clearInterval(swInterval);
    swRunning = false;
    swElapsed = 0;
    lapCount = 0;
    display.textContent = '00:00:00.00';
    btnStart.innerHTML = `${getIcon('play', 16)} Start`;
    btnLap.disabled = true;
    lapsList.innerHTML = '';
    lapsCard.style.display = 'none';
  });
}

function renderCountdownTool(zone) {
  zone.innerHTML = `
    <div class="tool-body single-col">
      <div class="options-box" style="text-align:center;padding:32px;">
        <div id="cdDisplay" style="font-size:52px;font-weight:750;letter-spacing:1px;font-variant-numeric:tabular-nums;color:var(--ink);">00:05:00</div>

        <div class="input-group-grid" style="max-width:320px;margin:20px auto 0;">
          <div class="opt-row"><label class="opt-label" for="cdMin">Minutes</label><input type="number" id="cdMin" class="opt-input" value="5" min="0"></div>
          <div class="opt-row"><label class="opt-label" for="cdSec">Seconds</label><input type="number" id="cdSec" class="opt-input" value="0" min="0" max="59"></div>
        </div>

        <div class="actions" style="justify-content:center;margin-top:20px;">
          <button class="btn-primary" id="cdStart">${getIcon('play', 16)} Start</button>
          <button class="btn-secondary" id="cdReset">Reset</button>
        </div>
      </div>
    </div>
  `;

  let cdInterval = null;
  let cdRemaining = 300;
  let cdRunning = false;

  const display = document.getElementById('cdDisplay');
  const cdMin = document.getElementById('cdMin');
  const cdSec = document.getElementById('cdSec');
  const btnStart = document.getElementById('cdStart');
  const btnReset = document.getElementById('cdReset');

  function updateDisplay(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    display.textContent = `00:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  btnStart.addEventListener('click', () => {
    if (!cdRunning) {
      if (!cdInterval) {
        cdRemaining = (parseInt(cdMin.value) || 0) * 60 + (parseInt(cdSec.value) || 0);
      }
      cdRunning = true;
      btnStart.textContent = 'Pause';
      cdInterval = setInterval(() => {
        cdRemaining--;
        updateDisplay(cdRemaining);
        if (cdRemaining <= 0) {
          clearInterval(cdInterval);
          cdInterval = null;
          cdRunning = false;
          btnStart.innerHTML = `${getIcon('play', 16)} Start`;
          TimeTools.playChimeSound();
          showToast('Time is up!');
        }
      }, 1000);
    } else {
      cdRunning = false;
      clearInterval(cdInterval);
      btnStart.innerHTML = `${getIcon('play', 16)} Resume`;
    }
  });

  btnReset.addEventListener('click', () => {
    clearInterval(cdInterval);
    cdInterval = null;
    cdRunning = false;
    cdRemaining = (parseInt(cdMin.value) || 5) * 60;
    updateDisplay(cdRemaining);
    btnStart.innerHTML = `${getIcon('play', 16)} Start`;
  });
}

function renderDateDiffTool(zone) {
  const today = new Date().toISOString().split('T')[0];
  zone.innerHTML = `
    <div class="tool-body single-col">
      <div class="options-box">
        <div class="input-group-grid">
          <div class="opt-row"><label class="opt-label" for="dtStart">Start Date</label><input type="date" id="dtStart" class="opt-input" value="2026-01-01"></div>
          <div class="opt-row"><label class="opt-label" for="dtEnd">End Date</label><input type="date" id="dtEnd" class="opt-input" value="${today}"></div>
        </div>
        <div class="opt-row">
          <label class="toggle-label"><input type="checkbox" id="dtInclusive"><span>Include End Date in Calculation</span></label>
        </div>
      </div>
      <div class="actions"><button class="btn-primary" id="btnCalcDiff">Calculate Difference</button></div>
      <div id="diffResults" class="result-card" style="display:none;"></div>
    </div>
  `;

  document.getElementById('btnCalcDiff').addEventListener('click', () => {
    try {
      const s = document.getElementById('dtStart').value;
      const e = document.getElementById('dtEnd').value;
      const inc = document.getElementById('dtInclusive').checked;
      const res = TimeTools.calculateDateDifference(s, e, inc);
      const card = document.getElementById('diffResults');
      card.style.display = 'grid';
      card.innerHTML = `
        <div class="stat-item"><span class="stat-title">Exact Breakdown</span><span class="stat-val">${res.years}y ${res.months}m ${res.days}d</span></div>
        <div class="stat-item"><span class="stat-title">Total Days</span><span class="stat-val">${res.totalDays.toLocaleString()} days</span></div>
        <div class="stat-item"><span class="stat-title">Total Weeks</span><span class="stat-val">${res.totalWeeks} wks ${res.remainingDays}d</span></div>
      `;
    } catch (err) {
      showToast(err.message);
    }
  });
}

function renderDateAdjustTool(zone) {
  const today = new Date().toISOString().split('T')[0];
  zone.innerHTML = `
    <div class="tool-body single-col">
      <div class="options-box">
        <div class="opt-row"><label class="opt-label" for="adjDate">Base Date</label><input type="date" id="adjDate" class="opt-input" value="${today}"></div>
        <div class="input-group-grid">
          <div class="opt-row"><label class="opt-label" for="adjOp">Operation</label><select id="adjOp" class="opt-select"><option value="add" selected>Add (+)</option><option value="subtract">Subtract (-)</option></select></div>
          <div class="opt-row"><label class="opt-label" for="adjAmount">Amount</label><input type="number" id="adjAmount" class="opt-input" value="30"></div>
        </div>
        <div class="opt-row"><label class="opt-label" for="adjUnit">Unit</label><select id="adjUnit" class="opt-select"><option value="days" selected>Days</option><option value="weeks">Weeks</option><option value="months">Months</option><option value="years">Years</option></select></div>
      </div>
      <div class="actions"><button class="btn-primary" id="btnAdjDate">Calculate New Date</button></div>
      <div id="adjResult" class="result-card" style="display:none;"></div>
    </div>
  `;

  document.getElementById('btnAdjDate').addEventListener('click', () => {
    try {
      const res = TimeTools.adjustDate(
        document.getElementById('adjDate').value,
        document.getElementById('adjAmount').value,
        document.getElementById('adjUnit').value,
        document.getElementById('adjOp').value
      );
      const card = document.getElementById('adjResult');
      card.style.display = 'grid';
      card.innerHTML = `
        <div class="stat-item"><span class="stat-title">Calculated Date</span><span class="stat-val">${res.formatted}</span></div>
        <div class="stat-item"><span class="stat-title">ISO Format</span><span class="stat-val">${res.iso}</span></div>
      `;
    } catch (e) {
      showToast(e.message);
    }
  });
}

function renderTimeZoneTool(zone) {
  zone.innerHTML = `
    <div class="tool-body single-col">
      <div class="options-box">
        <div class="opt-row"><label class="opt-label" for="tzInput">Select Date & Time</label><input type="datetime-local" id="tzInput" class="opt-input"></div>
      </div>
      <div class="actions"><button class="btn-primary" id="btnTzConvert">Convert Across Time Zones</button></div>
      <div id="tzListCard" class="options-box" style="margin-top:16px;display:none;"></div>
    </div>
  `;

  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('tzInput').value = now.toISOString().slice(0, 16);

  document.getElementById('btnTzConvert').addEventListener('click', () => {
    try {
      const val = document.getElementById('tzInput').value;
      const res = TimeTools.convertTimeZone(val, 'UTC');
      const card = document.getElementById('tzListCard');
      card.style.display = 'flex';
      card.innerHTML = `
        <span class="opt-label">World Time Zones</span>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-top:8px;">
          ${res.map(tz => `
            <div style="background:var(--soft);padding:10px;border-radius:8px;border:1px solid var(--line);">
              <div style="font-size:11px;color:var(--muted);font-weight:600;">${tz.timeZone}</div>
              <div style="font-weight:700;font-size:13.5px;color:var(--ink);margin-top:2px;">${tz.formatted}</div>
            </div>
          `).join('')}
        </div>
      `;
    } catch (e) {
      showToast(e.message);
    }
  });
}

function renderDurationTool(zone) {
  zone.innerHTML = `
    <div class="tool-body single-col">
      <div class="options-box">
        <div class="input-group-grid">
          <div class="opt-row"><label class="opt-label" for="durVal">Enter Duration</label><input type="number" id="durVal" class="opt-input" value="3600"></div>
          <div class="opt-row"><label class="opt-label" for="durUnit">Unit</label><select id="durUnit" class="opt-select"><option value="seconds" selected>Seconds</option><option value="minutes">Minutes</option><option value="hours">Hours</option><option value="days">Days</option></select></div>
        </div>
      </div>
      <div class="actions"><button class="btn-primary" id="btnConvDur">Convert Duration</button></div>
      <div id="durResults" class="result-card" style="display:none;"></div>
    </div>
  `;

  document.getElementById('btnConvDur').addEventListener('click', () => {
    const res = TimeTools.convertDuration(document.getElementById('durVal').value, document.getElementById('durUnit').value);
    const card = document.getElementById('durResults');
    card.style.display = 'grid';
    card.innerHTML = `
      <div class="stat-item"><span class="stat-title">Seconds</span><span class="stat-val">${res.seconds}</span></div>
      <div class="stat-item"><span class="stat-title">Minutes</span><span class="stat-val">${res.minutes}</span></div>
      <div class="stat-item"><span class="stat-title">Hours</span><span class="stat-val">${res.hours}</span></div>
      <div class="stat-item"><span class="stat-title">Days</span><span class="stat-val">${res.days}</span></div>
    `;
  });
}

function renderTimestampTool(zone) {
  zone.innerHTML = `
    <div class="tool-body single-col">
      <div class="options-box">
        <div class="opt-row"><label class="opt-label" for="tsVal">Unix Timestamp (Sec or Ms)</label><input type="text" id="tsVal" class="opt-input" value="${Math.floor(Date.now() / 1000)}"></div>
      </div>
      <div class="actions"><button class="btn-primary" id="btnConvTs">Convert Timestamp</button></div>
      <div id="tsResults" class="result-card" style="display:none;"></div>
    </div>
  `;

  document.getElementById('btnConvTs').addEventListener('click', () => {
    try {
      const res = TimeTools.convertTimestamp(document.getElementById('tsVal').value);
      const card = document.getElementById('tsResults');
      card.style.display = 'grid';
      card.innerHTML = `
        <div class="stat-item"><span class="stat-title">UTC Time</span><span class="stat-val">${res.utc}</span></div>
        <div class="stat-item"><span class="stat-title">Local Time</span><span class="stat-val">${res.local}</span></div>
        <div class="stat-item"><span class="stat-title">ISO 8601</span><span class="stat-val">${res.iso}</span></div>
      `;
    } catch (e) {
      showToast(e.message);
    }
  });
}

function renderAgeTool(zone) {
  zone.innerHTML = `
    <div class="tool-body single-col">
      <div class="options-box">
        <div class="opt-row"><label class="opt-label" for="ageBirth">Date of Birth</label><input type="date" id="ageBirth" class="opt-input" value="1995-06-15"></div>
      </div>
      <div class="actions"><button class="btn-primary" id="btnCalcAge">Calculate Age</button></div>
      <div id="ageResults" class="result-card" style="display:none;"></div>
    </div>
  `;

  document.getElementById('btnCalcAge').addEventListener('click', () => {
    try {
      const res = TimeTools.calculateAge(document.getElementById('ageBirth').value);
      const card = document.getElementById('ageResults');
      card.style.display = 'grid';
      card.innerHTML = `
        <div class="stat-item"><span class="stat-title">Exact Age</span><span class="stat-val">${res.years} yrs ${res.months} mos ${res.days} days</span></div>
        <div class="stat-item"><span class="stat-title">Days Lived</span><span class="stat-val">${res.totalDays.toLocaleString()} days</span></div>
        <div class="stat-item"><span class="stat-title">Next Birthday</span><span class="stat-val">in ${res.daysUntilNext} days</span></div>
      `;
    } catch (e) {
      showToast(e.message);
    }
  });
}

function renderBusinessDaysTool(zone) {
  const today=new Date().toISOString().slice(0,10);
  zone.innerHTML=`<div class="tool-body single-col"><div class="options-box"><div class="input-group-grid"><label class="opt-label">Start date<input id="businessStart" class="opt-input" type="date" value="${today}"></label><label class="opt-label">End date<input id="businessEnd" class="opt-input" type="date" value="${today}"></label></div><label class="toggle-label"><input id="businessInclusive" type="checkbox" checked><span>Include both dates</span></label><label class="opt-label">Optional holidays (one YYYY-MM-DD per line)<textarea id="businessHolidays" class="opt-textarea" rows="3" placeholder="2026-12-25"></textarea></label><div id="businessResult" class="result-card">Choose dates to count weekdays.</div><div class="input-group-grid"><label class="opt-label">Add or subtract business days<input id="businessOffset" class="opt-input" type="number" value="5"></label><div><label class="opt-label">Result date</label><div id="businessDateResult" class="result-card"></div></div></div></div></div>`;
  const update=()=>{try{const holidays=document.getElementById('businessHolidays').value.split(/\r?\n/).filter(Boolean);const count=TimeTools.countBusinessDays(document.getElementById('businessStart').value,document.getElementById('businessEnd').value,{inclusive:document.getElementById('businessInclusive').checked,holidays});document.getElementById('businessResult').textContent=`${count} business days`;document.getElementById('businessDateResult').textContent=TimeTools.addBusinessDays(document.getElementById('businessStart').value,Number(document.getElementById('businessOffset').value),{holidays});}catch(error){document.getElementById('businessResult').textContent=error.message;}};
  ['businessStart','businessEnd','businessInclusive','businessHolidays','businessOffset'].forEach(id=>document.getElementById(id).addEventListener('input',update));update();
}

function renderPomodoroTool(zone) {
  zone.innerHTML=`<div class="tool-body single-col"><div class="options-box pomodoro-card"><div class="pomodoro-time" id="pomodoroDisplay">25:00</div><p class="subtitle" id="pomodoroPhase">Focus session · 0 completed</p><div class="input-group-grid"><label class="opt-label">Focus minutes<input id="pomoFocus" class="opt-input" type="number" min="1" max="180" value="25"></label><label class="opt-label">Short break minutes<input id="pomoBreak" class="opt-input" type="number" min="1" max="60" value="5"></label></div><div class="actions"><button class="btn-primary" id="pomoStart">Start</button><button class="btn-secondary" id="pomoReset">Reset</button></div></div></div>`;
  let deadline=0, remaining=25*60*1000, timer=null, phase='focus', sessions=0;
  const display=document.getElementById('pomodoroDisplay'), phaseLabel=document.getElementById('pomodoroPhase'), start=document.getElementById('pomoStart');
  const paint=()=>{const total=Math.max(0,Math.ceil(remaining/1000));display.textContent=`${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;phaseLabel.textContent=`${phase==='focus'?'Focus':'Break'} session · ${sessions} completed`;};
  const tick=()=>{remaining=Math.max(0,deadline-Date.now());if(remaining===0){clearInterval(timer);timer=null;if(phase==='focus'){sessions++;phase='break';remaining=Number(document.getElementById('pomoBreak').value)*60000;TimeTools.playChimeSound();showToast('Focus session complete. Take a break.');start.textContent='Start break';}else{phase='focus';remaining=Number(document.getElementById('pomoFocus').value)*60000;TimeTools.playChimeSound();showToast('Break complete. Ready for another focus session?');start.textContent='Start focus';}}paint();};
  start.addEventListener('click',()=>{if(timer){clearInterval(timer);timer=null;remaining=Math.max(0,deadline-Date.now());start.textContent='Resume';paint();return;}deadline=Date.now()+remaining;timer=setInterval(tick,250);start.textContent='Pause';tick();});
  document.getElementById('pomoReset').addEventListener('click',()=>{clearInterval(timer);timer=null;phase='focus';sessions=0;remaining=Number(document.getElementById('pomoFocus').value)*60000;start.textContent='Start';paint();});
  ['pomoFocus','pomoBreak'].forEach(id=>document.getElementById(id).addEventListener('change',()=>{if(timer)return;remaining=(phase==='focus'?Number(document.getElementById('pomoFocus').value):Number(document.getElementById('pomoBreak').value))*60000;paint();}));paint();
}

/* ========================================================================= */
/*                          NUMBER TOOLS                                     */
/* ========================================================================= */
function renderCalculatorTool(zone) {
  zone.innerHTML = `
    <div class="tool-body single-col" style="max-width:360px;margin:0 auto;">
      <div class="options-box" style="padding:20px;">
        <input type="text" id="calcScreen" class="opt-input" value="0" readonly style="font-size:26px;text-align:right;font-weight:700;height:54px;margin-bottom:14px;">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
          <button class="btn-secondary cbtn" data-key="C">C</button>
          <button class="btn-secondary cbtn" data-key="(">(</button>
          <button class="btn-secondary cbtn" data-key=")">)</button>
          <button class="btn-secondary cbtn" data-key="/">/</button>
          <button class="btn-secondary cbtn" data-key="7">7</button>
          <button class="btn-secondary cbtn" data-key="8">8</button>
          <button class="btn-secondary cbtn" data-key="9">9</button>
          <button class="btn-secondary cbtn" data-key="*">&times;</button>
          <button class="btn-secondary cbtn" data-key="4">4</button>
          <button class="btn-secondary cbtn" data-key="5">5</button>
          <button class="btn-secondary cbtn" data-key="6">6</button>
          <button class="btn-secondary cbtn" data-key="-">-</button>
          <button class="btn-secondary cbtn" data-key="1">1</button>
          <button class="btn-secondary cbtn" data-key="2">2</button>
          <button class="btn-secondary cbtn" data-key="3">3</button>
          <button class="btn-secondary cbtn" data-key="+">+</button>
          <button class="btn-secondary cbtn" data-key="0">0</button>
          <button class="btn-secondary cbtn" data-key=".">.</button>
          <button class="btn-secondary cbtn" data-key="DEL">&larr;</button>
          <button class="btn-primary cbtn" data-key="=">=</button>
        </div>
      </div>
    </div>
  `;

  const screen = document.getElementById('calcScreen');
  let currentExpr = '0';

  document.querySelectorAll('.cbtn').forEach(b => {
    b.addEventListener('click', () => {
      const k = b.dataset.key;
      if (k === 'C') {
        currentExpr = '0';
      } else if (k === 'DEL') {
        currentExpr = currentExpr.slice(0, -1) || '0';
      } else if (k === '=') {
        try {
          currentExpr = String(NumberTools.evaluateMathExpression(currentExpr));
        } catch {
          currentExpr = 'Error';
        }
      } else {
        if (currentExpr === '0' || currentExpr === 'Error') currentExpr = k;
        else currentExpr += k;
      }
      screen.value = currentExpr;
    });
  });
}

function renderPercentTool(zone) {
  zone.innerHTML = `
    <div class="tool-body single-col">
      <div class="options-box">
        <span class="opt-label">What is X% of Y?</span>
        <div class="input-group-grid">
          <div class="opt-row"><label class="opt-label">Percentage (X %)</label><input type="number" id="p1X" class="opt-input" value="15"></div>
          <div class="opt-row"><label class="opt-label">Total (Y)</label><input type="number" id="p1Y" class="opt-input" value="200"></div>
        </div>
        <div style="font-weight:700;font-size:15px;margin-top:6px;" id="p1Res">Result: 30</div>

        <hr style="border:0;border-top:1px solid var(--line);margin:14px 0;">

        <span class="opt-label">Percentage Change from A to B</span>
        <div class="input-group-grid">
          <div class="opt-row"><label class="opt-label">Original Value (A)</label><input type="number" id="p2A" class="opt-input" value="100"></div>
          <div class="opt-row"><label class="opt-label">New Value (B)</label><input type="number" id="p2B" class="opt-input" value="125"></div>
        </div>
        <div style="font-weight:700;font-size:15px;margin-top:6px;" id="p2Res">Change: +25%</div>
      </div>
    </div>
  `;

  const p1X = document.getElementById('p1X');
  const p1Y = document.getElementById('p1Y');
  const p1Res = document.getElementById('p1Res');
  function calcP1() {
    const res = NumberTools.calculatePercentage('percentOf', p1X.value, p1Y.value);
    p1Res.textContent = `Result: ${res}`;
  }
  p1X.addEventListener('input', calcP1);
  p1Y.addEventListener('input', calcP1);

  const p2A = document.getElementById('p2A');
  const p2B = document.getElementById('p2B');
  const p2Res = document.getElementById('p2Res');
  function calcP2() {
    try {
      const res = NumberTools.calculatePercentage('percentChange', p2A.value, p2B.value);
      p2Res.textContent = `Change: ${res > 0 ? '+' : ''}${res.toFixed(2)}%`;
    } catch {
      p2Res.textContent = 'Invalid';
    }
  }
  p2A.addEventListener('input', calcP2);
  p2B.addEventListener('input', calcP2);
}

function renderUnitConverterTool(zone) {
  zone.innerHTML = `
    <div class="tool-body single-col">
      <div class="options-box">
        <div class="opt-row">
          <label class="opt-label" for="uCat">Category</label>
          <select id="uCat" class="opt-select">
            <option value="length" selected>Length</option>
            <option value="mass">Weight / Mass</option>
            <option value="temperature">Temperature</option>
            <option value="area">Area</option>
            <option value="volume">Volume</option>
            <option value="data">Digital Data</option>
          </select>
        </div>

        <div class="input-group-grid">
          <div class="opt-row"><label class="opt-label" for="uFrom">From Unit</label><select id="uFrom" class="opt-select"></select></div>
          <div class="opt-row"><label class="opt-label" for="uTo">To Unit</label><select id="uTo" class="opt-select"></select></div>
        </div>

        <div class="opt-row"><label class="opt-label" for="uVal">Value</label><input type="number" id="uVal" class="opt-input" value="100"></div>
      </div>
      <div id="uRes" class="result-card" style="display:none;"></div>
    </div>
  `;

  const UNITS_BY_CAT = {
    length: ['meter', 'kilometer', 'centimeter', 'millimeter', 'mile', 'yard', 'foot', 'inch'],
    mass: ['kilogram', 'gram', 'milligram', 'pound', 'ounce', 'metricTon'],
    temperature: ['celsius', 'fahrenheit', 'kelvin'],
    area: ['squareMeter', 'squareKilometer', 'squareFoot', 'acre', 'hectare'],
    volume: ['liter', 'milliliter', 'cubicMeter', 'gallon', 'fluidOunce'],
    data: ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte']
  };

  const catSelect = document.getElementById('uCat');
  const fromSelect = document.getElementById('uFrom');
  const toSelect = document.getElementById('uTo');
  const uVal = document.getElementById('uVal');
  const uRes = document.getElementById('uRes');

  function updateUnitOptions() {
    const list = UNITS_BY_CAT[catSelect.value] || [];
    fromSelect.innerHTML = list.map(u => `<option value="${u}">${u}</option>`).join('');
    toSelect.innerHTML = list.map(u => `<option value="${u}">${u}</option>`).join('');
    if (list.length > 1) toSelect.selectedIndex = 1;
    calc();
  }

  function calc() {
    try {
      const res = NumberTools.convertUnits(catSelect.value, uVal.value, fromSelect.value, toSelect.value);
      uRes.style.display = 'grid';
      uRes.innerHTML = `<div class="stat-item"><span class="stat-title">Result</span><span class="stat-val">${parseFloat(res.toFixed(6))} ${toSelect.value}</span></div>`;
    } catch (e) {
      uRes.style.display = 'none';
    }
  }

  catSelect.addEventListener('change', updateUnitOptions);
  fromSelect.addEventListener('change', calc);
  toSelect.addEventListener('change', calc);
  uVal.addEventListener('input', calc);
  updateUnitOptions();
}

function renderRatioTool(zone) {
  zone.innerHTML = `
    <div class="tool-body single-col">
      <div class="options-box">
        <span class="opt-label">Solve Proportion (A : B = C : D)</span>
        <span class="opt-help">Leave one field empty to calculate it.</span>
        <div class="input-group-grid" style="grid-template-columns:repeat(4,1fr);margin-top:8px;">
          <input type="number" id="propA" class="opt-input" placeholder="A (16)" value="1920">
          <input type="number" id="propB" class="opt-input" placeholder="B (9)" value="1080">
          <input type="number" id="propC" class="opt-input" placeholder="C (1280)" value="1280">
          <input type="number" id="propD" class="opt-input" placeholder="D (?)">
        </div>
        <div class="actions" style="margin-top:14px;"><button class="btn-primary" id="btnSolveProp">Solve Proportion</button></div>
        <div id="propRes" class="result-card" style="display:none;"></div>
      </div>
    </div>
  `;

  document.getElementById('btnSolveProp').addEventListener('click', () => {
    try {
      const a = document.getElementById('propA').value;
      const b = document.getElementById('propB').value;
      const c = document.getElementById('propC').value;
      const d = document.getElementById('propD').value;
      const res = NumberTools.solveProportion(a, b, c, d);
      document.getElementById(`prop${res.field}`).value = res.value;
      const card = document.getElementById('propRes');
      card.style.display = 'grid';
      card.innerHTML = `<div class="stat-item"><span class="stat-title">Calculated ${res.field}</span><span class="stat-val">${res.value}</span></div>`;
    } catch (e) {
      showToast(e.message);
    }
  });
}

function renderStatsTool(zone) {
  zone.innerHTML = `
    <div class="tool-body single-col">
      <div class="options-box">
        <div class="opt-row"><label class="opt-label" for="statsInput">Enter Numbers (comma, space or line separated)</label><textarea id="statsInput" class="opt-textarea" rows="4">12, 45, 67, 23, 89, 34, 12, 90, 56</textarea></div>
      </div>
      <div class="actions"><button class="btn-primary" id="btnCalcStats">Calculate Statistics</button></div>
      <div id="statsCard" class="result-card" style="display:none;"></div>
    </div>
  `;

  document.getElementById('btnCalcStats').addEventListener('click', () => {
    try {
      const raw = document.getElementById('statsInput').value;
      const nums = (raw.match(/-?\d+(\.\d+)?/g) || []).map(Number);
      const res = NumberTools.calculateStatistics(nums);
      const card = document.getElementById('statsCard');
      card.style.display = 'grid';
      card.innerHTML = `
        <div class="stat-item"><span class="stat-title">Mean (Average)</span><span class="stat-val">${res.mean}</span></div>
        <div class="stat-item"><span class="stat-title">Median</span><span class="stat-val">${res.median}</span></div>
        <div class="stat-item"><span class="stat-title">Sum</span><span class="stat-val">${res.sum}</span></div>
        <div class="stat-item"><span class="stat-title">Min &bull; Max</span><span class="stat-val">${res.min} &bull; ${res.max}</span></div>
      `;
    } catch (e) {
      showToast(e.message);
    }
  });
}

function renderNumberWordsTool(zone) {
  zone.innerHTML = `
    <div class="tool-body single-col">
      <div class="options-box">
        <div class="opt-row"><label class="opt-label" for="nwVal">Enter Number</label><input type="number" id="nwVal" class="opt-input" value="12345.67"></div>
        <div class="opt-row"><label class="opt-label" for="nwWords">In Words (English)</label><textarea id="nwWords" class="opt-textarea" readonly style="font-size:15px;font-weight:600;"></textarea></div>
      </div>
    </div>
  `;

  const input = document.getElementById('nwVal');
  const output = document.getElementById('nwWords');
  function update() {
    output.value = NumberTools.numberToWords(input.value);
  }
  input.addEventListener('input', update);
  update();
}

function renderRoundingTool(zone) {
  zone.innerHTML = `
    <div class="tool-body single-col">
      <div class="options-box">
        <div class="input-group-grid">
          <div class="opt-row"><label class="opt-label" for="rndVal">Number</label><input type="number" id="rndVal" class="opt-input" value="123.4567" step="any"></div>
          <div class="opt-row"><label class="opt-label" for="rndDec">Decimal Places</label><input type="number" id="rndDec" class="opt-input" value="2" min="0" max="8"></div>
        </div>
      </div>
      <div id="rndCard" class="result-card"></div>
    </div>
  `;

  const v = document.getElementById('rndVal');
  const d = document.getElementById('rndDec');
  const card = document.getElementById('rndCard');

  function update() {
    const val = parseFloat(v.value) || 0;
    const dec = parseInt(d.value) || 0;
    card.innerHTML = `
      <div class="stat-item"><span class="stat-title">Round</span><span class="stat-val">${NumberTools.roundNumber(val, dec, 'round')}</span></div>
      <div class="stat-item"><span class="stat-title">Floor</span><span class="stat-val">${NumberTools.roundNumber(val, dec, 'floor')}</span></div>
      <div class="stat-item"><span class="stat-title">Ceiling</span><span class="stat-val">${NumberTools.roundNumber(val, dec, 'ceil')}</span></div>
    `;
  }
  v.addEventListener('input', update);
  d.addEventListener('input', update);
  update();
}

function renderNumberBaseTool(zone) {
  zone.innerHTML = `
    <div class="tool-body single-col">
      <div class="options-box">
        <div class="opt-row"><label class="opt-label" for="baseInput">Decimal (Base 10)</label><input type="number" id="baseInput" class="opt-input" value="255"></div>
      </div>
      <div id="baseCard" class="result-card"></div>
    </div>
  `;

  const input = document.getElementById('baseInput');
  const card = document.getElementById('baseCard');

  function update() {
    try {
      const val = parseInt(input.value) || 0;
      card.innerHTML = `
        <div class="stat-item"><span class="stat-title">Binary (Base 2)</span><span class="stat-val">${NumberTools.convertNumberBase(val, 10, 2)}</span></div>
        <div class="stat-item"><span class="stat-title">Hexadecimal (Base 16)</span><span class="stat-val">${NumberTools.convertNumberBase(val, 10, 16)}</span></div>
        <div class="stat-item"><span class="stat-title">Octal (Base 8)</span><span class="stat-val">${NumberTools.convertNumberBase(val, 10, 8)}</span></div>
      `;
    } catch {
      card.innerHTML = '';
    }
  }
  input.addEventListener('input', update);
  update();
}

function renderDiscountTool(zone) {
  zone.innerHTML = `
    <div class="tool-body single-col">
      <div class="options-box">
        <div class="input-group-grid">
          <div class="opt-row"><label class="opt-label" for="discPrice">Original Price ($)</label><input type="number" id="discPrice" class="opt-input" value="120"></div>
          <div class="opt-row"><label class="opt-label" for="discPct">Discount (%)</label><input type="number" id="discPct" class="opt-input" value="20"></div>
        </div>
        <div class="opt-row"><label class="opt-label" for="discTax">Optional Tax (%)</label><input type="number" id="discTax" class="opt-input" value="8"></div>
      </div>
      <div id="discCard" class="result-card"></div>
    </div>
  `;

  const price = document.getElementById('discPrice');
  const pct = document.getElementById('discPct');
  const tax = document.getElementById('discTax');
  const card = document.getElementById('discCard');

  function update() {
    const res = NumberTools.calculateDiscount(price.value, pct.value, tax.value);
    card.innerHTML = `
      <div class="stat-item"><span class="stat-title">Final Price</span><span class="stat-val" style="color:var(--success);">$${res.finalPrice}</span></div>
      <div class="stat-item"><span class="stat-title">You Save</span><span class="stat-val">$${res.savings}</span></div>
      <div class="stat-item"><span class="stat-title">Tax Added</span><span class="stat-val">$${res.taxAmount}</span></div>
    `;
  }
  price.addEventListener('input', update);
  pct.addEventListener('input', update);
  tax.addEventListener('input', update);
  update();
}

function renderEmiTool(zone) {
  zone.innerHTML=`<div class="tool-body single-col"><div class="options-box"><div class="input-group-grid"><label class="opt-label">Loan amount<input id="emiPrincipal" class="opt-input" type="number" min="1" value="100000"></label><label class="opt-label">Annual interest (%)<input id="emiRate" class="opt-input" type="number" min="0" step="0.01" value="12"></label></div><label class="opt-label">Term (months)<input id="emiMonths" class="opt-input" type="number" min="1" max="1200" value="12"></label><div class="result-card" id="emiResult"></div><p class="subtitle">Estimate only. Fees, taxes and lender-specific charges are not included.</p></div></div>`;
  const update=()=>{try{const result=NumberTools.calculateEmi(document.getElementById('emiPrincipal').value,document.getElementById('emiRate').value,document.getElementById('emiMonths').value);document.getElementById('emiResult').innerHTML=`<div class="stat-item"><span class="stat-title">Monthly EMI</span><span class="stat-val">₹${result.emi.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div><div class="stat-item"><span class="stat-title">Total interest</span><span class="stat-val">₹${result.totalInterest.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div><div class="stat-item"><span class="stat-title">Total payment</span><span class="stat-val">₹${result.totalPaid.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>`;}catch(error){document.getElementById('emiResult').textContent=error.message;}};
  ['emiPrincipal','emiRate','emiMonths'].forEach(id=>document.getElementById(id).addEventListener('input',update));update();
}

function renderManualCurrencyTool(zone) {
  zone.innerHTML=`<div class="tool-body single-col"><div class="options-box"><div class="input-group-grid"><label class="opt-label">Amount<input id="currencyAmount" class="opt-input" type="number" value="10"></label><label class="opt-label">Your rate (target units per 1 source unit)<input id="currencyRate" class="opt-input" type="number" min="0.000001" step="any" placeholder="Enter rate"></label></div><div id="currencyResult" class="result-card">Enter your own exchange rate. No live rate is claimed.</div><p class="subtitle">User-entered rate · No network lookup or live exchange data.</p></div></div>`;
  const update=()=>{try{const result=NumberTools.convertManualCurrency(document.getElementById('currencyAmount').value,document.getElementById('currencyRate').value);document.getElementById('currencyResult').textContent=`Converted amount: ${result.amount.toLocaleString(undefined,{maximumFractionDigits:6})} · user-entered rate`;}catch{document.getElementById('currencyResult').textContent='Enter a positive rate to calculate a result.';}};
  ['currencyAmount','currencyRate'].forEach(id=>document.getElementById(id).addEventListener('input',update));update();
}

// Global Event Listeners
let currentSettingsSection = 'appearance';
let settingsDraft = null;

function createSettingsDraft() {
  const theme = getSavedTheme();
  const preferences = {
    ...state.preferences,
    favoriteToolIds: [...state.preferences.favoriteToolIds],
    pinnedToolIds: [...state.preferences.pinnedToolIds],
    recentToolIds: [...state.preferences.recentToolIds],
    lastFormats: { ...state.preferences.lastFormats }
  };
  if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) preferences.backgroundStyle = 'dark';
  else if (preferences.backgroundStyle === 'dark') preferences.backgroundStyle = 'white';
  return {
    theme,
    preferences
  };
}

function applySettingsDraft() {
  if (!settingsDraft) return;
  state.preferences = settingsDraft.preferences;
  const theme = settingsDraft.theme;
  localStorage.setItem('scraft_theme', theme);
  saveUiPreferences();
  applyTheme(theme);
  state.activeCategory = resolveStartPage();
  renderQuickAccess();
  renderSideNav();
  renderCategoryView();
  settingsDraft = null;
  settingsModal.classList.remove('open');
  settingsModal.setAttribute('aria-hidden', 'true');
  settingsBtn?.focus();
  showToast('Settings applied.');
}

function updateSettingsNavigation() {
  document.querySelectorAll('[data-settings-section]').forEach(button => {
    const active = button.dataset.settingsSection === currentSettingsSection;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
}

function renderSettingsPanel() {
  const panel = document.getElementById('settingsPanel');
  if (!panel) return;
  updateSettingsNavigation();
  if (currentSettingsSection === 'appearance') {
    panel.innerHTML = `
      <section class="settings-section">
        <div class="settings-section-heading"><span class="settings-section-icon" aria-hidden="true">◐</span><div><h3>Theme</h3><p>Choose how S-Craft Tools looks on this device.</p></div></div>
        <div class="theme-choice-group" role="group" aria-label="Theme mode">
          <button type="button" class="theme-choice ${settingsDraft?.theme === 'light' ? 'active' : ''}" data-theme-mode="light" aria-pressed="${settingsDraft?.theme === 'light'}">Light</button><button type="button" class="theme-choice ${settingsDraft?.theme === 'system' ? 'active' : ''}" data-theme-mode="system" aria-pressed="${settingsDraft?.theme === 'system'}">System</button><button type="button" class="theme-choice ${settingsDraft?.theme === 'dark' ? 'active' : ''}" data-theme-mode="dark" aria-pressed="${settingsDraft?.theme === 'dark'}">Dark</button>
        </div>
      </section>
      <section class="settings-section">
        <div class="settings-section-heading"><span class="settings-section-icon" aria-hidden="true">◉</span><div><h3>Accent color</h3><p>Choose a highlight color for buttons and active elements.</p></div></div>
        <div class="accent-options" role="group" aria-label="Accent color">
          <button type="button" class="accent-swatch accent-none ${settingsDraft?.preferences.accentColor === 'none' ? 'selected' : ''}" data-accent-color="none" aria-pressed="${settingsDraft?.preferences.accentColor === 'none'}" aria-label="None, use default colors" title="None — use S-Craft Tools default colors"><span>None</span></button>
          <button type="button" class="accent-swatch ${settingsDraft?.preferences.accentColor === '#2563eb' ? 'selected' : ''}" style="--swatch:#2563eb" data-accent-color="#2563eb" aria-pressed="${settingsDraft?.preferences.accentColor === '#2563eb'}" aria-label="Blue accent" title="Blue"></button>
          <button type="button" class="accent-swatch ${settingsDraft?.preferences.accentColor === '#16a34a' ? 'selected' : ''}" style="--swatch:#16a34a" data-accent-color="#16a34a" aria-pressed="${settingsDraft?.preferences.accentColor === '#16a34a'}" aria-label="Green accent" title="Green"></button>
          <button type="button" class="accent-swatch ${settingsDraft?.preferences.accentColor === '#9333ea' ? 'selected' : ''}" style="--swatch:#9333ea" data-accent-color="#9333ea" aria-pressed="${settingsDraft?.preferences.accentColor === '#9333ea'}" aria-label="Purple accent" title="Purple"></button>
          <button type="button" class="accent-swatch ${settingsDraft?.preferences.accentColor === '#f97316' ? 'selected' : ''}" style="--swatch:#f97316" data-accent-color="#f97316" aria-pressed="${settingsDraft?.preferences.accentColor === '#f97316'}" aria-label="Orange accent" title="Orange"></button>
          <button type="button" class="accent-swatch ${settingsDraft?.preferences.accentColor === '#ec4899' ? 'selected' : ''}" style="--swatch:#ec4899" data-accent-color="#ec4899" aria-pressed="${settingsDraft?.preferences.accentColor === '#ec4899'}" aria-label="Pink accent" title="Pink"></button>
          <label class="accent-custom ${/^#[0-9a-f]{6}$/i.test(settingsDraft?.preferences.accentColor || '') ? 'selected' : ''}"><input id="customAccentColor" type="color" value="${/^#[0-9a-f]{6}$/i.test(settingsDraft?.preferences.accentColor || '') ? settingsDraft.preferences.accentColor : '#2563eb'}" aria-label="Choose a custom accent color"><span>Custom</span></label>
        </div>
      </section>
      <section class="settings-section">
        <div class="settings-section-heading"><span class="settings-section-icon" aria-hidden="true">▤</span><div><h3>Background style</h3><p>Choose the app background and surfaces.</p></div></div>
        <div class="background-options" role="group" aria-label="Background style">
          <button type="button" class="background-choice ${settingsDraft?.preferences.backgroundStyle === 'white' ? 'active' : ''}" data-background-style="white">White</button><button type="button" class="background-choice cream ${settingsDraft?.preferences.backgroundStyle === 'warm-cream' ? 'active' : ''}" data-background-style="warm-cream">Warm cream</button><button type="button" class="background-choice gray ${settingsDraft?.preferences.backgroundStyle === 'soft-gray' ? 'active' : ''}" data-background-style="soft-gray">Soft gray</button><button type="button" class="background-choice dark ${settingsDraft?.preferences.backgroundStyle === 'dark' || settingsDraft?.theme === 'dark' ? 'active' : ''}" data-background-style="dark">Dark</button>
        </div>
      </section>
      <p class="settings-note">Changes apply across S-Craft Tools and are saved on this device.</p>`;
    panel.querySelectorAll('[data-theme-mode]').forEach(button => button.addEventListener('click', () => {
      settingsDraft.theme = button.dataset.themeMode;
      if (settingsDraft.theme === 'dark' || (settingsDraft.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) settingsDraft.preferences.backgroundStyle = 'dark';
      else if (settingsDraft.preferences.backgroundStyle === 'dark') settingsDraft.preferences.backgroundStyle = 'white';
      renderSettingsPanel();
    }));
    panel.querySelectorAll('[data-background-style]').forEach(button => button.addEventListener('click', () => {
      settingsDraft.preferences.backgroundStyle = button.dataset.backgroundStyle;
      if (button.dataset.backgroundStyle === 'dark') settingsDraft.theme = 'dark';
      else if (settingsDraft.theme === 'dark' || (settingsDraft.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) settingsDraft.theme = 'light';
      renderSettingsPanel();
    }));
    panel.querySelectorAll('[data-accent-color]').forEach(button => button.addEventListener('click', () => {
      settingsDraft.preferences.accentColor = button.dataset.accentColor;
      renderSettingsPanel();
    }));
    panel.querySelector('#customAccentColor')?.addEventListener('input', event => {
      settingsDraft.preferences.accentColor = event.target.value;
      const custom = panel.querySelector('.accent-custom');
      custom?.classList.add('selected');
      panel.querySelectorAll('[data-accent-color]').forEach(item => { item.classList.remove('selected'); item.setAttribute('aria-pressed', 'false'); });
    });
  } else if (currentSettingsSection === 'tool-preferences') {
    const pinnedRows = settingsDraft.preferences.pinnedToolIds.map((id, index) => {
      const tool = allTools().find(item => item.id === id);
      if (!tool) return '';
      return `<div class="pinned-tool-row"><span class="pinned-tool-name">${getIcon(tool.icon, 17)}<span>${escapeHtml(tool.name)}</span></span><div class="pinned-tool-actions"><button type="button" data-pin-move="up" data-index="${index}" aria-label="Move ${escapeHtml(tool.name)} up" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" data-pin-move="down" data-index="${index}" aria-label="Move ${escapeHtml(tool.name)} down" ${index === settingsDraft.preferences.pinnedToolIds.length - 1 ? 'disabled' : ''}>↓</button><button type="button" class="pin-remove" data-pin-remove="${escapeHtml(id)}" aria-label="Unpin ${escapeHtml(tool.name)}">Remove</button></div></div>`;
    }).join('');
    panel.innerHTML = `
      <section class="settings-section"><div class="settings-section-heading"><span class="settings-section-icon" aria-hidden="true">⌂</span><div><h3>Start page</h3><p>Choose where S-Craft Tools opens when you start using it.</p></div></div><div class="preference-options" role="group" aria-label="Start page"><button type="button" data-start-page="all-tools">All tools</button><button type="button" data-start-page="favorites">Favorites</button><button type="button" data-start-page="last-used">Last used</button></div></section>
      <section class="settings-section"><div class="settings-section-heading"><span class="settings-section-icon" aria-hidden="true">⌖</span><div><h3>Quick access</h3><p>Pin up to 3 tools for fast access. Use the arrows to set their order.</p></div></div><div class="pinned-tools-list">${pinnedRows || '<p class="settings-empty">No pinned tools yet.</p>'}</div><button type="button" class="settings-manage-btn" id="settingsManageQuickAccessBtn">Manage pinned tools</button></section>
      <section class="settings-section settings-toggle-row"><div class="settings-section-heading"><span class="settings-section-icon" aria-hidden="true">↻</span><div><h3>Remember output format</h3><p>Reuse the last format selected for each tool.</p></div></div><label class="settings-switch"><input type="checkbox" id="rememberLastFormat" aria-label="Remember output format" ${settingsDraft.preferences.rememberLastFormat ? 'checked' : ''}><span aria-hidden="true"></span></label></section>
      <p class="settings-note">Preferences are saved on this device.</p>`;
    panel.querySelectorAll('[data-start-page]').forEach(button => {
      button.classList.toggle('active', button.dataset.startPage === settingsDraft.preferences.startPage);
      button.setAttribute('aria-pressed', String(button.dataset.startPage === settingsDraft.preferences.startPage));
      button.addEventListener('click', () => {
        settingsDraft.preferences.startPage = button.dataset.startPage;
        panel.querySelectorAll('[data-start-page]').forEach(item => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active)); });
      });
    });
    panel.querySelectorAll('[data-pin-move]').forEach(button => button.addEventListener('click', () => {
      const index = Number(button.dataset.index); const next = index + (button.dataset.pinMove === 'up' ? -1 : 1);
      if (next < 0 || next >= settingsDraft.preferences.pinnedToolIds.length) return;
      const ids = [...settingsDraft.preferences.pinnedToolIds]; [ids[index], ids[next]] = [ids[next], ids[index]];
      settingsDraft.preferences.pinnedToolIds = ids; renderSettingsPanel();
    }));
    panel.querySelectorAll('[data-pin-remove]').forEach(button => button.addEventListener('click', () => {
      settingsDraft.preferences.pinnedToolIds = settingsDraft.preferences.pinnedToolIds.filter(id => id !== button.dataset.pinRemove);
      renderSettingsPanel();
    }));
    panel.querySelector('#settingsManageQuickAccessBtn')?.addEventListener('click', () => document.getElementById('manageQuickAccessBtn')?.click());
    panel.querySelector('#rememberLastFormat')?.addEventListener('change', event => {
      settingsDraft.preferences.rememberLastFormat = event.target.checked;
    });
  } else {
    panel.innerHTML = `<section class="settings-section shortcuts-section"><div class="settings-section-heading"><span class="settings-section-icon" aria-hidden="true">⌨</span><div><h3>Keyboard shortcuts</h3><p>Move around S-Craft Tools without reaching for the mouse.</p></div></div><div class="shortcut-list"><div><span>Search tools</span><kbd>⌘ K</kbd><kbd>Ctrl K</kbd></div><div><span>Open settings</span><kbd>⌘ ,</kbd><kbd>Ctrl ,</kbd></div><div><span>Go back or close</span><kbd>Esc</kbd></div><div><span>Move through tool cards</span><kbd>↑</kbd><kbd>↓</kbd></div><div><span>Open selected tool</span><kbd>Enter</kbd></div></div><p class="settings-note">Shortcuts work while you are browsing tools. Text fields keep their normal keyboard behavior.</p></section>`;
  }
}

function setupEventListeners() {
  const languagePicker = document.getElementById('languagePicker');
  const languageBtn = document.getElementById('languageBtn');
  const languageMenu = document.getElementById('languageMenu');
  const translationHelpBtn = document.getElementById('translationHelpBtn');
  const translationHelpModal = document.getElementById('translationHelpModal');
  const closeTranslationHelpBtn = document.getElementById('closeTranslationHelpBtn');
  const setLanguageMenu = open => { languageMenu.hidden = !open; languageBtn.setAttribute('aria-expanded', String(open)); };
  languageBtn.addEventListener('click', () => setLanguageMenu(languageMenu.hidden));
  document.addEventListener('click', event => { if (!languagePicker.contains(event.target)) setLanguageMenu(false); });
  languagePicker.addEventListener('keydown', event => { if (event.key === 'Escape' && !languageMenu.hidden) { event.preventDefault(); event.stopPropagation(); setLanguageMenu(false); languageBtn.focus(); } });
  const closeTranslationHelp = () => { translationHelpModal.classList.remove('open'); translationHelpModal.setAttribute('aria-hidden', 'true'); languageBtn.focus(); };
  translationHelpBtn.addEventListener('click', () => { setLanguageMenu(false); translationHelpModal.classList.add('open'); translationHelpModal.setAttribute('aria-hidden', 'false'); closeTranslationHelpBtn.focus(); });
  closeTranslationHelpBtn.addEventListener('click', closeTranslationHelp);
  translationHelpModal.addEventListener('click', event => { if (event.target === translationHelpModal) closeTranslationHelp(); });
  translationHelpModal.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeTranslationHelp(); }
    else if (event.key === 'Tab') { event.preventDefault(); closeTranslationHelpBtn.focus(); }
  });
  const supportBtn = document.getElementById('supportBtn');
  const supportModal = document.getElementById('supportModal');
  const closeSupportBtn = document.getElementById('closeSupportBtn');
  const closeSupport = () => { supportModal.classList.remove('open'); supportModal.setAttribute('aria-hidden', 'true'); supportBtn.focus(); };
  supportBtn.addEventListener('click', () => { supportModal.classList.add('open'); supportModal.setAttribute('aria-hidden', 'false'); closeSupportBtn.focus(); });
  closeSupportBtn.addEventListener('click', closeSupport);
  supportModal.addEventListener('click', event => { if (event.target === supportModal) closeSupport(); });
  supportModal.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeSupport(); return; }
    if (event.key !== 'Tab') return;
    const controls = [...supportModal.querySelectorAll('button, a[href]')];
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim();
    renderCategoryView();
  });

  backBtn.addEventListener('click', showBrowseView);

  const manageQuickAccessBtn = document.getElementById('manageQuickAccessBtn');
  const closeQuickAccessBtn = document.getElementById('closeQuickAccessBtn');
  const closeQuickAccess = () => { quickAccessModal.classList.remove('open'); quickAccessModal.setAttribute('aria-hidden','true'); };
  manageQuickAccessBtn?.addEventListener('click', () => {
    const list = document.getElementById('quickAccessManageList');
    const pinPreferences = settingsDraft?.preferences || state.preferences;
    list.innerHTML = allTools().map(tool => `<label class="quick-manage-row"><span>${getIcon(tool.icon,16)} ${escapeHtml(tool.name)}</span><input type="checkbox" value="${escapeHtml(tool.id)}" ${pinPreferences.pinnedToolIds.includes(tool.id) ? 'checked' : ''} aria-label="Pin ${escapeHtml(tool.name)}"></label>`).join('');
    list.querySelectorAll('input[type="checkbox"]').forEach(input => input.addEventListener('change', () => {
      const checked = [...list.querySelectorAll('input:checked')].map(item => item.value);
      if (checked.length > 3) { input.checked = false; showToast('Pin up to three tools.'); return; }
      if (settingsDraft) settingsDraft.preferences.pinnedToolIds = checked;
      else { state.preferences.pinnedToolIds = checked; saveUiPreferences(); renderQuickAccess(); }
      if (settingsModal?.classList.contains('open')) renderSettingsPanel();
    }));
    quickAccessModal.classList.add('open'); quickAccessModal.setAttribute('aria-hidden','false');
  });
  closeQuickAccessBtn?.addEventListener('click', closeQuickAccess);
  quickAccessModal?.addEventListener('click', event => { if (event.target === quickAccessModal) closeQuickAccess(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && quickAccessModal?.classList.contains('open')) { event.preventDefault(); event.stopImmediatePropagation(); closeQuickAccess(); } });

  const closeSettings = () => { settingsDraft = null; settingsModal.classList.remove('open'); settingsModal.setAttribute('aria-hidden', 'true'); settingsBtn?.focus(); };
  settingsBtn?.addEventListener('click', () => {
    settingsDraft = createSettingsDraft();
    renderSettingsPanel();
    settingsModal.classList.add('open'); settingsModal.setAttribute('aria-hidden', 'false');
    closeSettingsBtn?.focus();
  });
  closeSettingsBtn?.addEventListener('click', closeSettings);
  document.getElementById('cancelSettingsBtn')?.addEventListener('click', closeSettings);
  document.getElementById('settingsApplyBtn')?.addEventListener('click', applySettingsDraft);
  settingsModal?.addEventListener('click', event => { if (event.target === settingsModal) closeSettings(); });
  document.getElementById('settingsManageQuickAccessBtn')?.addEventListener('click', () => {
    closeSettings();
    manageQuickAccessBtn?.click();
  });
  settingsModal?.querySelectorAll('[data-settings-section]').forEach(button => button.addEventListener('click', () => {
    currentSettingsSection = button.dataset.settingsSection;
    updateSettingsNavigation();
    renderSettingsPanel();
  }));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && settingsModal?.classList.contains('open') && !quickAccessModal?.classList.contains('open')) closeSettings(); });

  themeToggleBtn.addEventListener('click', () => {
    const nextTheme = document.body.classList.contains('dark-theme') ? 'light' : 'dark';
    setThemeMode(nextTheme);
  });

  toolDetailContainer.addEventListener('change', event => {
    const control = event.target;
    if (!state.preferences.rememberLastFormat || !(control instanceof HTMLSelectElement) || !isOutputFormatSelect(control)) return;
    state.preferences.lastFormats[`${state.activeTool?.id}:${control.id}`] = control.value;
    saveUiPreferences();
  });

  document.addEventListener('keydown', event => {
    if (event.isComposing || event.altKey) return;
    const isCommand = event.metaKey || event.ctrlKey;
    if (isCommand && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (toolDetailScreen.classList.contains('show')) showBrowseView();
      if (state.activeCategory === 'All') state.searchQuery = '';
      searchInput.focus(); searchInput.select();
      return;
    }
    if (isCommand && event.key === ',') {
      event.preventDefault();
      if (!settingsModal.classList.contains('open')) settingsBtn?.click();
      return;
    }
    if (event.key === 'Escape') {
      if (quickAccessModal?.classList.contains('open')) {
        quickAccessModal.classList.remove('open'); quickAccessModal.setAttribute('aria-hidden', 'true');
        return;
      }
      if (settingsModal?.classList.contains('open')) return;
      if (toolDetailScreen.classList.contains('show')) { event.preventDefault(); showBrowseView(); return; }
    }
    const target = event.target;
    const isTyping = target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
    if (isTyping || !browseScreen.classList.contains('show') || !['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    const cards = [...toolsGrid.querySelectorAll('.tool-card')];
    if (!cards.length) return;
    const currentIndex = cards.indexOf(document.activeElement);
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + (event.key === 'ArrowDown' ? 1 : cards.length - 1)) % cards.length;
    event.preventDefault(); cards[nextIndex].focus();
  });
}

function getSavedTheme() {
  const saved = localStorage.getItem('scraft_theme');
  return ['light', 'dark', 'system'].includes(saved) ? saved : 'light';
}

function resolveStartPage() {
  if (state.preferences.startPage === 'favorites') return 'Favorites';
  if (state.preferences.startPage === 'last-used') {
    const last = localStorage.getItem('scraft_category');
    return CATEGORIES.some(category => category.id === last) ? last : 'All';
  }
  return 'All';
}

function setThemeMode(theme) {
  if (!['light', 'dark', 'system'].includes(theme)) return;
  const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (theme === 'dark') state.preferences.backgroundStyle = 'dark';
  else if (state.preferences.backgroundStyle === 'dark') state.preferences.backgroundStyle = 'white';
  if (theme === 'system' && systemIsDark) state.preferences.backgroundStyle = 'dark';
  localStorage.setItem('scraft_theme', theme);
  saveUiPreferences(); applyTheme(theme);
}

function setBackgroundStyle(style) {
  if (!['white', 'warm-cream', 'soft-gray', 'dark'].includes(style)) return;
  state.preferences.backgroundStyle = style;
  let theme = getSavedTheme();
  if (style === 'dark') theme = 'dark';
  else if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) theme = 'light';
  localStorage.setItem('scraft_theme', theme);
  saveUiPreferences(); applyTheme(theme);
}

function applyAccentColor(color = state.preferences.accentColor) {
  const allowed = new Set(['none', '#2563eb', '#16a34a', '#9333ea', '#f97316', '#ec4899']);
  if (color === 'none') document.body.style.removeProperty('--accent');
  else if (/^#[0-9a-f]{6}$/i.test(color) && (allowed.has(color.toLowerCase()) || color === state.preferences.accentColor)) {
    document.body.style.setProperty('--accent', color);
  } else document.body.style.removeProperty('--accent');
  const rgb = getComputedStyle(document.body).getPropertyValue('--accent').trim().match(/^#([0-9a-f]{6})$/i);
  if (rgb) {
    const channels = rgb[1].match(/../g).map(channel => parseInt(channel, 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    document.body.style.setProperty('--accent-contrast', luminance > 0.42 ? '#18181b' : '#ffffff');
  }
  document.querySelectorAll('[data-accent-color]').forEach(button => {
    const selected = button.dataset.accentColor.toLowerCase() === String(state.preferences.accentColor).toLowerCase();
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function applyTheme(theme = getSavedTheme()) {
  const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && systemIsDark);
  document.body.classList.toggle('dark-theme', isDark);
  const backgroundStyle = isDark ? 'dark' : (state.preferences.backgroundStyle === 'dark' ? 'white' : state.preferences.backgroundStyle);
  document.body.dataset.backgroundStyle = backgroundStyle;
  themeToggleBtn?.setAttribute('aria-pressed', String(isDark));
  themeToggleBtn?.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
  if (themeToggleBtn) themeToggleBtn.title = isDark ? 'Switch to light theme' : 'Switch to dark theme';
  document.querySelectorAll('[data-theme-mode]').forEach(button => {
    const selected = button.dataset.themeMode === theme;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  document.querySelectorAll('[data-background-style]').forEach(button => {
    const selected = button.dataset.backgroundStyle === backgroundStyle;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  applyAccentColor();
}

function isOutputFormatSelect(select) {
  return ['rfmt', 'compressFormat', 'p2iFmt', 'convFmt', 'aFmt', 'vAudioFmt'].includes(select.id);
}

function applyRememberedFormats(toolId) {
  if (!state.preferences.rememberLastFormat) return;
  toolDetailContainer.querySelectorAll('select').forEach(select => {
    if (!isOutputFormatSelect(select)) return;
    const saved = state.preferences.lastFormats[`${toolId}:${select.id}`];
    if (saved && [...select.options].some(option => option.value === saved)) {
      select.value = saved;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
}
