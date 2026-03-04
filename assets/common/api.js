// API 地址统一管理

const BASE_URL = 'https://api.pylin.cn/xykcb';
const CDN_URL = '/libraries';

export const API = {
  // 获取支持的学校列表
  getSupportSchool: `${BASE_URL}/get-support-school`,

  // 获取课程数据
  getCourseData: `${BASE_URL}/get-course-data`,

  // 获取学校支持的功能列表
  getSupportFunction: (school) => `${BASE_URL}/get-support-function?school=${school}`,

  // 字体CDN
  fontUrl: (fileName) => `${CDN_URL}/fonts/${fileName}`
};

// 带超时的 fetch
const TIMEOUT = 30000;
export const fetchWithTimeout = (url, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timeout));
};
