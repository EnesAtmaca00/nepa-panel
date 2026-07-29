// SORUN 2: Genel app-level state — localStorage helper'lar
// nepa_* prefix'i ile karışıklığı önle.

const PREFIX = "nepa_";

export function saveAppState(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.warn("saveAppState failed:", e);
  }
}

export function loadAppState(key, defaultValue = null) {
  try {
    const saved = localStorage.getItem(PREFIX + key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function clearAppState(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {}
}

// ===== SORUN 4: Global aktif işlem =====
// İşlem başladığında setActiveTask(...) çağrılır, bittiğinde clearActiveTask().
// Layout/TopBar bunu okur ve spinner gösterir.

const ACTIVE_TASK_EVENT = "nepa_active_task_changed";

export function setActiveTask({ tip, mesaj }) {
  const data = { tip, mesaj, basladi: Date.now() };
  saveAppState("aktifIslem", data);
  window.dispatchEvent(new CustomEvent(ACTIVE_TASK_EVENT, { detail: data }));
}

export function clearActiveTask() {
  clearAppState("aktifIslem");
  window.dispatchEvent(new CustomEvent(ACTIVE_TASK_EVENT, { detail: null }));
}

export function getActiveTask() {
  const t = loadAppState("aktifIslem");
  if (!t) return null;
  // 2 dakikadan eski stale taskleri temizle
  if (Date.now() - (t.basladi || 0) > 120000) {
    clearAppState("aktifIslem");
    return null;
  }
  return t;
}

export function subscribeActiveTask(callback) {
  const handler = (e) => callback(e.detail);
  window.addEventListener(ACTIVE_TASK_EVENT, handler);
  return () => window.removeEventListener(ACTIVE_TASK_EVENT, handler);
}