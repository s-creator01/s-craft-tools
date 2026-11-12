// S Craft — Privacy-First Recent Activity Log
// Persists ONLY operation metadata (tool name, file name, timestamp, output status)
// NEVER stores raw file bytes or credentials. 100% local in browser localStorage.

const STORAGE_KEY = 'scraft_recent_activity_v1';
const MAX_ENTRIES = 20;

export function getRecentActivity() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function logActivity(toolName, fileName, meta = {}) {
  try {
    const list = getRecentActivity();
    const entry = {
      id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      tool: toolName,
      file: fileName || 'Direct Input',
      timestamp: new Date().toISOString(),
      summary: meta.summary || 'Completed',
      size: meta.size || null
    };

    // Prepend and limit count
    const updated = [entry, ...list.filter(x => !(x.tool === toolName && x.file === fileName))].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    renderRecentList();
  } catch (err) {
    console.warn('Could not save recent activity:', err);
  }
}

export function clearActivity() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    renderRecentList();
  } catch (err) {
    console.warn('Could not clear recent activity:', err);
  }
}

function timeAgo(dateString) {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function renderRecentList() {
  const container = document.getElementById('recentList');
  if (!container) return;

  const list = getRecentActivity();
  if (list.length === 0) {
    container.innerHTML = '<li class="recent-item" style="color:var(--muted);justify-content:center;padding:14px;">No recent operations yet. Your local activity will appear here.</li>';
    return;
  }

  container.innerHTML = list.map(item => `
    <li class="recent-item">
      <div class="recent-item-meta">
        <span class="recent-badge">${escapeHtml(item.tool)}</span>
        <strong style="color:var(--ink);">${escapeHtml(item.file)}</strong>
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="color:var(--muted);font-size:11.5px;">${timeAgo(item.timestamp)}</span>
      </div>
    </li>
  `).join('');
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m]);
}
