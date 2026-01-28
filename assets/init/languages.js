// 当前语言数据
let langData = null;

// 初始化语言
export async function initLanguage(lang) {
  const language = lang || localStorage.getItem('setting_language') || 'zh-cn';
  try {
    const response = await fetch(`/assets/languages/${language}.json`);
    langData = await response.json();
  } catch (error) {
    console.error(`Failed to load language: ${language}`, error);
  }
  translateIndex();
}

// 内部方法：翻译元素集合
async function translateElements(section, elements) {
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    const text = getI18n(section, key);
    if (text) el.textContent = text;
  });
}

// 翻译 index 页面
async function translateIndex() {
  if (document.readyState === 'loading') {
    await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
  }
  const title = getI18n('index', 'title');
  if (title) document.title = title;
  await translateElements('index', document.querySelectorAll('[data-i18n]'));
}

// 翻译页面
export async function translatePage(value, container) {
  if (!langData || !langData[value]) return;
  await translateElements(value, container.querySelectorAll('[data-i18n]'));
}

// 获取翻译文本
export function getI18n(value, key) {
  return langData?.[value]?.[key] ?? '';
}

// 语言切换回调
export async function onLanguageChange(value) {
  await initLanguage(value);
  import('/index.js').then(m => m.refreshSubpage?.());
}
