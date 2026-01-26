// 主题配置
const themeConfig = {
  system: 'system',
  light: 'light',
  dark: 'dark'
};

// 应用主题
export function applyTheme(theme) {
  const body = document.body;
  if (theme === 'system') {
    body.removeAttribute('data-weui-theme');
  } else {
    body.setAttribute('data-weui-theme', theme);
  }
}

// 初始化主题
export function initTheme() {
  const theme = localStorage.getItem('setting_theme') || themeConfig.system;
  applyTheme(theme);
}
