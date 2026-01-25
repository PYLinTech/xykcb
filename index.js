// 页面加载器映射
const pageLoaders = {
    schedule: () => import('/assets/subpages/schedule/schedule.js').then(m => m.load),
    mine: () => import('/assets/subpages/mine/mine.js').then(m => m.load),
    settings: () => import('/assets/subpages/settings/settings.js').then(m => m.load)
};

// 已加载页面的 loader 缓存
const pageCache = new Map();

// DOM 元素缓存
const container = document.getElementById('page-container');
const tabbar = document.getElementById('tabbar');

async function switchPage(pageName) {
    if (pageName === pageCache.get('current')) return;

    pageCache.set('current', pageName);

    // 更新 tabbar 状态
    tabbar.querySelectorAll('.weui-tabbar__item').forEach(item => {
        item.classList.toggle('weui-bar__item_on', item.dataset.page === pageName);
    });

    // 加载或切换页面
    if (!pageCache.has(pageName)) {
        const loader = await pageLoaders[pageName]();
        pageCache.set(pageName, loader);
    }

    // 清除并重新渲染
    container.innerHTML = '';
    pageCache.get(pageName)(container);
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    switchPage('schedule');

    tabbar.addEventListener('click', (e) => {
        const item = e.target.closest('.weui-tabbar__item');
        if (item?.dataset.page) {
            switchPage(item.dataset.page);
        }
    });
});
