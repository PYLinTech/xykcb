/**
 * 微信数据分析工具 (WeData/微信分析)
 * 支持微信小程序分析、公众号网页分析
 */

/**
 * 初始化微信分析 SDK
 * @param {Object} param 配置参数
 * @param {string} param.maskMode 隐私模式: 'all-mask' | 'no-mask'
 * @param {boolean} param.recordCanvas 是否采集 canvas
 * @param {string} param.projectId 项目 ID
 * @param {boolean} param.iframe 是否采集 iframe 页面
 * @param {boolean} param.console 是否采集 console 错误
 * @param {boolean} param.network 是否采集网络错误
 */
export async function initWedata(param = {}) {
  // 默认配置
  const defaultParam = {
    maskMode: 'no-mask',
    recordCanvas: false,
    projectId: 'wxc7d66f0f80d04243-JfGB7OFgk-g1M9OA',
    iframe: false,
    console: true,
    network: true
  };

  const config = { ...defaultParam, ...param };

  // 检测是否支持 ES Module
  const supportESModule = 'noModule' in document.createElement('script');

  // 选择对应版本的 SDK
  const SCRIPT_URLs = [
    supportESModule
      ? 'https://dev.weixin.qq.com/platform-console/proxy/assets/tel/px.min.js'
      : 'https://dev.weixin.qq.com/platform-console/proxy/assets/tel/px.es5.min.js'
  ];

  // 记录启动时间
  sessionStorage.setItem('wxobs_start_timestamp', String(Date.now()));

  // 加载最快可用的脚本
  try {
    const fastestUrl = await Promise.race(
      SCRIPT_URLs.map(url => loadScript(url))
    );

    // 启动 SDK
    if (window.__startPX) {
      window.__startPX(config);
      console.log('[Wedata] Initialized with projectId:', config.projectId);
    }
  } catch (error) {
    console.error('[Wedata] Error loading scripts:', error);
  }
}

/**
 * 动态加载脚本
 * @private
 */
function loadScript(url) {
  return new Promise((resolve, reject) => {
    const scriptEle = document.createElement('script');
    scriptEle.type = 'text/javascript';
    scriptEle.async = true;
    scriptEle.src = url;
    scriptEle.onload = () => resolve(url);
    scriptEle.onerror = () => reject(new Error(`Script load error: ${url}`));
    document.head.appendChild(scriptEle);
  });
}

// 默认导出
export default { initWedata };
