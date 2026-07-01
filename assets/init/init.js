import { initFont } from '/assets/init/fonts.js';
import { initTheme } from '/assets/init/themes.js';
import { initLanguage } from '/assets/init/languages.js';
import { initWelcome } from '/assets/subpages/welcome/welcome.js';
import { API_CONFIG } from '/assets/common/api.js';

// 统一解析运行环境。Android APP 的环境由原生层通过 UA / bridge 从源头提供，业务页面只读取这里落库后的结果。
const ua = navigator.userAgent;
const webVersion = API_CONFIG.WEB_VERSION;

// 解析操作系统: Android/iPhone(iOS)/Mac(macOS)/Windows/Linux/HarmonyOS
const platformMap = { Android: 'Android', iPhone: 'iOS', iPad: 'iOS', Mac: 'macOS', Windows: 'Windows', Linux: 'Linux', HarmonyOS: 'HarmonyOS' };
const parsePlatform = (sourceUa) => {
  const key = Object.keys(platformMap).find(k => sourceUa.includes(k));
  return key ? platformMap[key] : '';
};

const readJson = (value) => {
  if (!value || typeof value !== 'string') return {};
  try { return JSON.parse(value); } catch (e) { return {}; }
};

const readNativeBridgeEnv = () => {
  try {
    const getter = window.XykcbAndroidSystemUi?.getAppEnvironment;
    return typeof getter === 'function' ? readJson(getter.call(window.XykcbAndroidSystemUi)) : {};
  } catch (e) {
    return {};
  }
};

// 匹配原生 APP UA:
// xykcb_app/260628 (Platform/Android; Channel/Xiaomi;)
// xykcb_app/260628; Platform/Android; Channel/Xiaomi
const nativeAppMatch = ua.match(/xykcb_app\/([\w.-]+)/);
const nativePlatformMatch = ua.match(/Platform\/([^;)]+)/);
const nativeChannelMatch = ua.match(/Channel\/([^;)]+)/);
const bridgeEnv = readNativeBridgeEnv();
const explicitEnv = window.__XYKCB_APP_ENV__ || {};
const nativeEnv = { ...bridgeEnv, ...explicitEnv };
const isNativeApp = nativeEnv.type === 'app' || !!nativeAppMatch;
const isMiniProgram = ua.includes('miniProgram');

let appType, appVersion, appPlatform, appChannel;

if (isNativeApp) {
  appType = 'app';
  appVersion = nativeEnv.version || nativeEnv.versionCode || nativeAppMatch?.[1] || localStorage.getItem('setting_app_version') || webVersion;
  appPlatform = nativeEnv.platform || nativePlatformMatch?.[1] || localStorage.getItem('setting_app_platform') || parsePlatform(ua) || 'Android';
  appChannel = nativeEnv.channel || nativeChannelMatch?.[1] || localStorage.getItem('setting_app_channel') || 'Android';
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

function loadWechatJSSDK() {
  if (appChannel !== 'WeChat') return Promise.resolve(null);
  if (window.wx?.miniProgram) return Promise.resolve(window.wx);

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js';
    script.async = true;
    script.onload = () => resolve(window.wx || null);
    script.onerror = () => reject(new Error('Failed to load WeChat JSSDK'));
    document.head.appendChild(script);
  });
}

window.xykcbWechatReady = loadWechatJSSDK();

// 并行初始化所有模块
// initWelcome 不是 async，需要用 Promise.resolve 包装
Promise.all([
  initFont(),
  initTheme(),
  initLanguage(),
  window.xykcbWechatReady,
  Promise.resolve(initWelcome())
]).catch(err => console.error('Init error:', err));
