import { initFont } from '/assets/init/fonts.js';
import { initTheme } from '/assets/init/themes.js';
import { initLanguage } from '/assets/init/languages.js';
import { initWelcome } from '/assets/subpages/welcome/welcome.js';
import { initNotice } from '/assets/common/notice_dialog.js';

// 解析 App UA: xykcb_app/260303 (Platform/Android; Channel/Xiaomi;) 或 miniProgram
const ua = navigator.userAgent;
const webVersion = '260315';

// 解析操作系统: Android/iPhone(iOS)/Mac/macOS/Windows/Linux/HarmonyOS
const platformMap = { 'Android': 'Android', 'iPhone': 'iOS', 'iPad': 'iOS', 'Mac': 'macOS', 'Windows': 'Windows', 'Linux': 'Linux', 'HarmonyOS': 'HarmonyOS' };
const parsePlatform = (ua) => { const k = Object.keys(platformMap).find(k => ua.includes(k)); return k ? platformMap[k] : ''; };

// 匹配原生APP: xykcb_app/版本 (Platform/平台; Channel/渠道)
const nativeAppMatch = ua.match(/xykcb_app\/([\d.]+)(?:; Platform\/([^;]+))?(?:; Channel\/([^;]+))?/);
const isMiniProgram = ua.includes('miniProgram');

let appType, appVersion, appPlatform, appChannel;

if (nativeAppMatch) {
  appType = 'app';
  appVersion = nativeAppMatch[1] || '';
  appPlatform = nativeAppMatch[2] || '';
  appChannel = nativeAppMatch[3] || '';
} else if (isMiniProgram) {
  appType = 'miniapp';
  appVersion = webVersion;
  appChannel = 'WeChat';
  appPlatform = parsePlatform(ua);
} else {
  appType = 'web';
  appVersion = webVersion;
  appChannel = 'Web';
  appPlatform = parsePlatform(ua);
}

localStorage.setItem('setting_app_version', appVersion);
localStorage.setItem('setting_app_platform', appPlatform);
localStorage.setItem('setting_app_channel', appChannel);
localStorage.setItem('setting_app_type', appType);

// 并行初始化所有模块
// initWelcome 不是 async，需要用 Promise.resolve 包装
Promise.all([
  initFont(),
  initTheme(),
  initLanguage(),
  Promise.resolve(initWelcome()),
  Promise.resolve(initNotice())
]).catch(err => console.error('Init error:', err));
