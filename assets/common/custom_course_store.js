const STORAGE_KEY = 'schedule_custom_courses';

let storeCache = null;

function getSchoolId() {
  try {
    const raw = localStorage.getItem('login_user');
    return raw ? JSON.parse(raw)?.school || '' : '';
  } catch {
    return '';
  }
}

function loadStoreObject() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

function ensureList(store, schoolId, termId) {
  if (!store[schoolId]) store[schoolId] = {};
  if (!Array.isArray(store[schoolId][termId])) store[schoolId][termId] = [];
  return store[schoolId][termId];
}

function forEachItem(store, callback) {
  for (const schoolId of Object.keys(store)) {
    const termMap = store[schoolId] || {};
    for (const termId of Object.keys(termMap)) {
      const list = termMap[termId];
      if (!Array.isArray(list)) continue;
      for (let index = 0; index < list.length; index++) {
        const result = callback(list[index], list, index, termId, schoolId);
        if (result !== undefined) return result;
      }
    }
  }
  return undefined;
}

function normalizeNumberArray(value) {
  const nums = Array.isArray(value)
    ? value.map(n => parseInt(n, 10)).filter(n => !Number.isNaN(n))
    : [];
  return [...new Set(nums)].sort((a, b) => a - b);
}

export function loadCustomCourseStore() {
  if (!storeCache) storeCache = loadStoreObject();
  return storeCache;
}

export function saveCustomCourseStore(store, detail = {}) {
  const safeStore = store && typeof store === 'object' ? store : {};
  localStorage.setItem(STORAGE_KEY, JSON.stringify(safeStore));
  storeCache = safeStore;
  window.dispatchEvent(new CustomEvent('custom-courses-changed', { detail }));
}

export function getCustomCourseItems() {
  const items = [];
  forEachItem(loadCustomCourseStore(), item => { items.push(item); });
  return items;
}

export function getCustomCourseItem(id) {
  return forEachItem(loadCustomCourseStore(), item => item.id === id ? item : undefined) || null;
}

export function upsertCustomCourseItem(item) {
  const valid = normalizeCustomCourseItem(item);
  const schoolId = getSchoolId();
  const termId = valid.termId;
  if (!schoolId || !termId) return;

  const store = loadCustomCourseStore();
  const list = ensureList(store, schoolId, termId);
  const index = list.findIndex(i => i.id === valid.id);
  if (index >= 0) list[index] = valid;
  else list.push(valid);
  saveCustomCourseStore(store, { termId });
}

export function deleteCustomCourseItem(id) {
  const store = loadCustomCourseStore();
  const deletedTermId = forEachItem(store, (item, list, index, termId) => {
    if (item.id !== id) return undefined;
    list.splice(index, 1);
    return termId;
  });
  if (deletedTermId) saveCustomCourseStore(store, { termId: deletedTermId });
}

export function normalizeCustomCourseItem(item) {
  const type = item.type === 'override' ? 'override' : 'add';
  return {
    id: String(item.id || ''),
    type,
    targetHash: type === 'override' ? String(item.targetHash || '') : '',
    termId: String(item.termId || ''),
    name: String(item.name || ''),
    location: String(item.location || ''),
    teacher: String(item.teacher || ''),
    weeks: normalizeNumberArray(item.weeks),
    weekday: Math.max(0, Math.min(7, parseInt(item.weekday, 10) || 0)),
    sections: normalizeNumberArray(item.sections),
    updatedAt: Date.now()
  };
}

export function createCustomCourseId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
