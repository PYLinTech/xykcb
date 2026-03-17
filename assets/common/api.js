// API 地址统一管理

const CONFIG = {
  // API 基础地址
  BASE_URL: 'https://api.pylin.cn/xykcb',
  // CDN 地址
  CDN_URL: '/libraries',
  // Web/小程序版本号
  WEB_VERSION: '2603171520',
  // 外部跳转链接
  EXIT_URL: 'https://www.pylin.cn',
  // 公告配置地址
  NOTICE_API_URL: 'https://api.pylin.cn/xykcb_notice.json',
  // 请求超时时间
  TIMEOUT: 30000
};

// API 接口地址
const API = {
  getSupportSchool: `${CONFIG.BASE_URL}/get-support-school`,
  getCourseData: `${CONFIG.BASE_URL}/get-course-data`,
  getSupportFunction: (school) => `${CONFIG.BASE_URL}/get-support-function?school=${school}`,
  fontUrl: (fileName) => `${CONFIG.CDN_URL}/fonts/${fileName}`
};

// 带超时的 fetch
export const fetchWithTimeout = (url, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timeout));
};

export const API_CONFIG = CONFIG;
export { API };
