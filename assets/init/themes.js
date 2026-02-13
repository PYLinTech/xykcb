// 主题配置
const themeConfig = {
  system: 'system',
  light: 'light',
  dark: 'dark'
};

// 颜色配置
const colorConfig = {
  appleGreen: { main: '#07c160', bg90: '#e1f5d8', bg100: '#c8e6c9', bg110: '#b2dfdb', bg130: '#a5d6a7' },
  vividYellow: { main: '#ffc107', bg90: '#fff8e1', bg100: '#ffecb3', bg110: '#ffe0b2', bg130: '#ffe082' },
  dreamyPurple: { main: '#9c27b0', bg90: '#f3e5f5', bg100: '#e1bee7', bg110: '#ce93d8', bg130: '#ce93d8' },
  iceBlue: { main: '#03a9f4', bg90: '#e1f5fe', bg100: '#b3e5fc', bg110: '#81d4fa', bg130: '#4fc3f7' },
  sheerPink: { main: '#ff4081', bg90: '#fce4ec', bg100: '#f8bbd0', bg110: '#f48fb1', bg130: '#f06292' },
  distantCyan: { main: '#009688', bg90: '#e0f2f1', bg100: '#b2dfdb', bg110: '#80cbc4', bg130: '#4db6ac' },
  freedomOrange: { main: '#ff5722', bg90: '#fbe9e7', bg100: '#ffccbc', bg110: '#ffab91', bg130: '#ff8a65' }
};

// 应用主题
export async function applyTheme(theme) {
  const body = document.body;
  if (theme === 'system') {
    body.removeAttribute('data-weui-theme');
  } else {
    body.setAttribute('data-weui-theme', theme);
  }
}

// 应用颜色
export async function applyColor(color) {
  const body = document.body;
  const colorData = colorConfig[color] || colorConfig.appleGreen;
  body.style.setProperty('--weui-BRAND', colorData.main);
  body.style.setProperty('--weui-BRAND-100', colorData.main);
  body.style.setProperty('--weui-BRAND-120', colorData.main);
  body.style.setProperty('--weui-BRAND-80', colorData.main);
  body.style.setProperty('--weui-BRAND-90', colorData.main);
  body.style.setProperty('--weui-BRAND-170', colorData.main);
  body.style.setProperty('--weui-BRAND-BG-90', colorData.bg90);
  body.style.setProperty('--weui-BRAND-BG-100', colorData.bg100);
  body.style.setProperty('--weui-BRAND-BG-110', colorData.bg110);
  body.style.setProperty('--weui-BRAND-BG-130', colorData.bg130);
}

// 初始化颜色
export async function initColor() {
  const color = localStorage.getItem('setting_color') || 'appleGreen';
  await applyColor(color);
}

// 初始化主题
export async function initTheme() {
  const theme = localStorage.getItem('setting_theme') || themeConfig.system;
  await applyTheme(theme);
  await initColor();
}
