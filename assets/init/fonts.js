import { toast, hideToast } from '/assets/common/toast.js';
import { getI18n } from '/assets/init/languages.js';

// 字体配置
const fontConfig = {
  'DingTalk-JinBuTi': 'DingTalk-JinBuTi.ttf',
  'MiSansVF': 'MiSansVF.ttf',
  'LXGWWenKaiScreen': 'LXGWWenKaiScreen.ttf',
  'PingFangSanSheng': 'PingFangSanShengTi.ttf',
  'ChildFunSans': 'ChildFunSans.ttf'
};

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
  const font = await new FontFace(fontName, `url(/libraries/fonts/${fileName})`).load();
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
