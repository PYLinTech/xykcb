import { initFont } from '/assets/init/fonts.js';
import { initTheme } from '/assets/init/themes.js';
import { initLanguage } from '/assets/init/languages.js';
import { initWelcome } from '/assets/subpages/welcome/welcome.js';

// 解析 App UA: xykcb_app/260303 (Platform/Android; Channel/Xiaomi;)
const ua = navigator.userAgent;
const isApp = ua.includes('xykcb_app');

if (isApp) {
  const versionMatch = ua.match(/xykcb_app\/([\d.]+)/);
  const platformMatch = ua.match(/Platform\/([^;]+)/);
  const channelMatch = ua.match(/Channel\/([^;]+)/);

  localStorage.setItem('setting_app_version', versionMatch ? versionMatch[1] : '');
  localStorage.setItem('setting_app_platform', platformMatch ? platformMatch[1] : '');
  localStorage.setItem('setting_app_channel', channelMatch ? channelMatch[1] : '');
} else {
  localStorage.setItem('setting_app_version', '');
  localStorage.setItem('setting_app_platform', '');
  localStorage.setItem('setting_app_channel', '');
}

localStorage.setItem('setting_is_app', isApp ? 'true' : 'false');

// 并行初始化所有模块
// initWelcome 不是 async，需要用 Promise.resolve 包装
Promise.all([
  initFont(),
  initTheme(),
  initLanguage(),
  Promise.resolve(initWelcome())
]).catch(err => console.error('Init error:', err));
