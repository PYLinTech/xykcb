// 字体配置
const fontConfig = {
  'DingTalk-JinBuTi': 'DingTalk-JinBuTi.ttf',
  'MiSansVF': 'MiSansVF.ttf',
  'LXGWWenKaiScreen': 'LXGWWenKaiScreen.ttf',
  'PingFangSanSheng': 'PingFangSanShengTi.ttf'
};

// 加载字体
export async function loadFont(fontName) {
  if (fontName === 'system') {
    document.body.style.fontFamily = '';
    return;
  }
  const fileName = fontConfig[fontName] || 'DingTalk-JinBuTi.ttf';
  const font = await new FontFace(fontName, `url(/libraries/fonts/${fileName})`).load();
  document.fonts.add(font);
  document.body.style.fontFamily = fontName;
}

// 初始化加载字体
export async function initFont() {
  const fontName = localStorage.getItem('setting_font') || 'DingTalk-JinBuTi';
  await loadFont(fontName);
}
