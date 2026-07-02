// 当前语言数据
let langData = null;
let initPromise = null;
const WECHAT_LANGUAGE_SYNC_TYPE = 'language';

function isMiniappEnvironment() {
  return String(localStorage.getItem('setting_app_type') || '').toLowerCase() === 'miniapp';
}

async function syncWechatMiniappLanguage(language) {
  if (!isMiniappEnvironment()) return;

  try {
    const miniProgram = (await window.xykcbWechatReady)?.miniProgram;
    miniProgram?.navigateTo({
      url: `/pages/redirect/redirect?${new URLSearchParams({
        type: WECHAT_LANGUAGE_SYNC_TYPE,
        target: language
      }).toString()}`
    });
  } catch (error) {
    console.warn('Failed to sync language to WeChat Mini Program', error);
  }
}

// 初始化语言
export async function initLanguage(lang) {
  // 防止重复初始化
  if (initPromise) return initPromise;

  const language = lang || localStorage.getItem('setting_language') || 'zh-cn';
  initPromise = (async () => {
    try {
      const response = await fetch(`/assets/languages/${language}/${language}.json`);
      langData = await response.json();
    } catch (error) {
      console.error(`Failed to load language: ${language}`, error);
    }
    translateIndex();
  })();

  return initPromise;
}

// 内部方法：翻译元素集合
async function translateElements(section, elements) {
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    const text = getI18n(section, key);
    if (text) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = text;
      } else {
        el.textContent = text;
      }
    }
  });
}

// 翻译 index 页面
async function translateIndex() {
  if (document.readyState === 'loading') {
    await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
  }
  const title = getI18n('index', 'xykcb');
  if (title && String(localStorage.getItem('setting_app_type') || '').toLowerCase() !== 'miniapp') {
    document.title = title;
  }
  await translateElements('index', document.querySelectorAll('[data-i18n]'));
}

// 翻译页面
export async function translatePage(value, container) {
  // 等待 langData 加载完成
  if (!initPromise) {
    await initLanguage();
  }
  await initPromise;

  const elements = container.querySelectorAll('[data-i18n]');
  const htmlElements = [];

  // 单次遍历处理所有元素
  for (const el of elements) {
    const key = el.getAttribute('data-i18n');
    if (key.endsWith('.html')) {
      htmlElements.push({ el, key });
    } else if (langData?.[value]?.[key]) {
      // 普通文本翻译
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = langData[value][key];
      } else {
        el.textContent = langData[value][key];
      }
    }
  }

  // 并行加载 HTML 文件
  await Promise.all(htmlElements.map(({ el, key }) => loadHtmlContent(el, key)));
}

async function loadHtmlContent(el, fileName) {
  const language = localStorage.getItem('setting_language') || 'zh-cn';
  try {
    const response = await fetch(`/assets/languages/${language}/${fileName}`);
    if (response.ok) {
      el.innerHTML = await response.text();
    }
  } catch (error) {
    console.error(`Failed to load ${fileName}`, error);
  }
}

// 获取翻译文本
export function getI18n(value, key) {
  return langData?.[value]?.[key] ?? '';
}

// 获取当前语言
export function getCurrentLang() {
  return localStorage.getItem('setting_language') || 'zh-cn';
}

// 语言切换回调
export async function onLanguageChange(value) {
  initPromise = null;
  await initLanguage(value);
  await syncWechatMiniappLanguage(value);
  import('/index.js').then(m => m.refreshSubpage?.());
}
