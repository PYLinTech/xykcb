import { toast, hideToast } from '/assets/common/toast.js';
import { getI18n } from '/assets/init/languages.js';
import { API, fetchWithTimeout } from '/assets/common/api.js';

// 字体配置
const fontConfig = {
  'DingTalk-JinBuTi': 'DingTalk-JinBuTi.ttf',
  'MiSansVF': 'MiSansVF.ttf',
  'LXGWWenKaiScreen': 'LXGWWenKaiScreen.ttf',
  'PingFangSanSheng': 'PingFangSanShengTi.ttf',
  'ChildFunSans': 'ChildFunSans.ttf'
};

// IndexedDB 配置
const DB_NAME = 'font_cache';
const DB_VERSION = 260304;
const STORE_NAME = 'fonts';

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'name' });
      }
    };
  });
}

function getFontFromDB(fileName) {
  return new Promise(async (resolve, reject) => {
    const database = await openDB();
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(fileName);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result?.data);
  });
}

function saveFontToDB(fileName, data) {
  return new Promise(async (resolve, reject) => {
    const database = await openDB();
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ name: fileName, data });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// 加载字体
export async function loadFont(fontName, showToast = false) {
  if (fontName === 'system') {
    document.body.style.fontFamily = '';
    return;
  }
  const isApp = localStorage.getItem('setting_is_app') === 'true';
  if (showToast && !isApp) {
    toast.loading(getI18n('common', 'toastLoading'));
  }
  const fileName = fontConfig[fontName] || 'DingTalk-JinBuTi.ttf';

  // 尝试从缓存读取，除非 showToast=true（强制刷新）
  let arrayBuffer = showToast ? null : await getFontFromDB(fileName).catch(() => null);

  if (!arrayBuffer) {
    // 缓存没有或需要强制刷新，从网络下载
    const url = API.fontUrl(fileName);
    const response = await fetchWithTimeout(url);
    arrayBuffer = await response.arrayBuffer();
    // 存入缓存
    try {
      await saveFontToDB(fileName, arrayBuffer);
    } catch (e) {
      console.warn('Failed to cache font:', e);
    }
  }

  const font = await new FontFace(fontName, arrayBuffer).load();
  document.fonts.add(font);
  document.body.style.fontFamily = fontName;
  if (showToast && !isApp) {
    hideToast();
  }
}

// 初始化加载字体（不显示 toast）
export async function initFont() {
  const fontName = localStorage.getItem('setting_font') || 'DingTalk-JinBuTi';
  await loadFont(fontName, false);
}
