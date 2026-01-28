const pageLoaders = {
  schedule: () => import('/assets/subpages/schedule/schedule.js').then(m => m.load),
  mine: () => import('/assets/subpages/mine/mine.js').then(m => m.load),
  settings: () => import('/assets/subpages/settings/settings.js').then(m => m.load)
};

const cache = new Map();
let current = null;
const container = document.getElementById('page-container');
const tabbar = document.getElementById('tabbar');

async function render(pageName) {
  const loader = cache.get(pageName) ?? await pageLoaders[pageName]();
  cache.set(pageName, loader);
  container.innerHTML = '';
  loader(container);
}

function updateTabbar(pageName) {
  tabbar.querySelectorAll('.weui-tabbar__item').forEach(item => {
    item.classList.toggle('weui-bar__item_on', item.dataset.page === pageName);
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

export async function showOverlay(html) {
  const overlay = document.getElementById('overlay');
  overlay.innerHTML = html;
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
