const pageLoaders = {
  schedule: () => import('/assets/subpages/schedule/schedule.js').then(m => m.load),
  mine: () => import('/assets/subpages/mine/mine.js').then(m => m.load),
  settings: () => import('/assets/subpages/settings/settings.js').then(m => m.load)
};

const tabIconMap = {
  schedule: { line: 'ri-calendar-line', fill: 'ri-calendar-fill' },
  mine: { line: 'ri-user-line', fill: 'ri-user-fill' },
  settings: { line: 'ri-settings-line', fill: 'ri-settings-fill' }
};

const MAX_CACHE_SIZE = 3; // 最多缓存 3 个页面
const cache = new Map();
let current = null;
const container = document.getElementById('page-container');
const tabbar = document.getElementById('tabbar');

// 记录页面是否已加载过（用于区分首次打开和切换回来）
const pageLoaded = new Map();

function isFirstLoad(pageName) {
  if (!pageLoaded.has(pageName)) {
    pageLoaded.set(pageName, true);
    return true;
  }
  return false;
}

async function render(pageName) {
  const loader = cache.get(pageName) ?? await pageLoaders[pageName]();

  // 始终将当前页面移到最新位置（实现 LRU 缓存）
  cache.delete(pageName);
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(pageName, loader);

  const firstLoad = isFirstLoad(pageName);

  container.innerHTML = '';
  // 将是否首次加载的信息传递给页面
  container.dataset.firstLoad = firstLoad;
  loader(container);
}

function updateTabbar(pageName) {
  tabbar.querySelectorAll('.weui-tabbar__item').forEach(item => {
    const isActive = item.dataset.page === pageName;
    item.classList.toggle('weui-bar__item_on', isActive);
    const iconEl = item.querySelector('.weui-tabbar__icon i');
    const iconConfig = tabIconMap[item.dataset.page];
    if (iconEl && iconConfig) {
      iconEl.className = isActive ? iconConfig.fill : iconConfig.line;
    }
  });
}

export function refreshSubpage() {
  current && render(current);
}

async function switchPage(pageName) {
  current = pageName;
  updateTabbar(pageName);
  await render(pageName);
}

export async function showOverlay(pageName, html) {
  const overlay = document.getElementById('overlay');
  overlay.innerHTML = html;

  // 执行内联脚本
  for (const script of overlay.querySelectorAll('script')) {
    if (script.type === 'module') {
      const newScript = document.createElement('script');
      newScript.type = 'module';
      newScript.textContent = script.textContent;
      document.head.appendChild(newScript);
      document.head.removeChild(newScript);
    } else if (script.textContent) {
      new Function(script.textContent)();
    }
  }

  if (pageName) {
    const { translatePage } = await import('/assets/init/languages.js');
    await translatePage(pageName, overlay);
  }
  overlay.classList.add('show');
}

export function hideOverlay() {
  const overlay = document.getElementById('overlay');
  overlay.classList.remove('show');
}

document.addEventListener('DOMContentLoaded', () => {
  switchPage('schedule');
  tabbar.addEventListener('click', (e) => {
    const page = e.target.closest('.weui-tabbar__item')?.dataset.page;
    if (page) switchPage(page);
  });
});
