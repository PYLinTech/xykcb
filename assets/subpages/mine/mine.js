import { translatePage, getI18n, getCurrentLang } from '/assets/init/languages.js';
import { loadLogin, getSavedUser } from '/assets/subpages/login/login.js';
import { showOverlay, hideOverlay } from '/index.js';
import { toast, hideToast } from '/assets/common/toast.js';
import { API, fetchWithTimeout } from '/assets/common/api.js';

// 暴露到全局供动态加载的脚本调用
window.hideOverlay = hideOverlay;

// 远程功能弹窗模板样式
const OVERLAY_STYLE = `
<style>
    #js_grades_wrp { height: 100vh; display: flex; flex-direction: column; background: var(--weui-BG-1); }
    .overlay-header { flex-shrink: 0; height: 60px; display: flex; align-items: center; justify-content: center; background: var(--weui-BG-1); }
    .overlay-title { font-size: 18px; font-weight: 600; color: var(--weui-FG-0); }
    .overlay-close { position: absolute; right: 16px; width: 32px; height: 32px; border-radius: 50%; background: var(--weui-FG-5); display: flex; align-items: center; justify-content: center; cursor: pointer; }
    .overlay-close .ri-close-line { color: var(--weui-FG-0); font-size: 16px; }
    .overlay-content { flex: 1; padding: 16px; overflow: auto; }
</style>`;

// 加载功能列表
async function loadFunctions(container) {
    const savedUser = getSavedUser();
    if (!savedUser?.school || savedUser.isLoggedIn === false) return;

    try {
        const response = await fetchWithTimeout(API.getSupportFunction(savedUser.school));
        const result = await response.json();
        if (!result.success || !result.data?.length) return;

        // 按id排序
        const functions = result.data.sort((a, b) => a.id.localeCompare(b.id));

        const grid = container.querySelector('#js_functions_grid');
        const panel = container.querySelector('#js_functions_panel');
        const lang = getCurrentLang();

        // 先清空现有功能
        grid.innerHTML = '';

        for (const func of functions) {
            const label = func[lang] || func['zh-cn'] || func.en;
            const item = document.createElement('a');
            item.className = 'weui-grid';
            item.href = 'javascript:;';
            item.innerHTML = `
                <div class="weui-grid__icon">
                    <i class="ri-function-line" style="font-size: 28px; color: var(--weui-FG-0);"></i>
                </div>
                <p class="weui-grid__label">${label}</p>
            `;
            item.addEventListener('click', async () => {
                toast.loading(getI18n('common', 'toastLoading'));
                const res = await fetch(func.url);
                const html = await res.text();
                hideToast();

                // 构建带框架的 HTML
                const title = func[lang] || func['zh-cn'] || func.en;
                const wrappedHtml = `${OVERLAY_STYLE}
                    <div id="js_grades_wrp">
                        <div class="overlay-header">
                            <span class="overlay-title">${title}</span>
                            <div class="overlay-close" id="overlayClose"><i class="ri-close-line"></i></div>
                        </div>
                        <div class="overlay-content">${html}</div>
                    </div>
                    <script>document.getElementById('overlayClose').onclick = window.hideOverlay;</script>`;
                showOverlay(null, wrappedHtml);
            });
            grid.appendChild(item);
        }

        panel.style.display = 'block';
    } catch (e) {
        console.error('Failed to load functions:', e);
    }
}

function updateLoginState(container) {
    const savedUser = getSavedUser();
    const isLoggedIn = savedUser?.isLoggedIn !== false;

    const accountIcon = container.querySelector('#js_account_icon');
    const accountTitle = container.querySelector('#js_account_title');
    const accountDesc = container.querySelector('#js_account_desc');
    const loginBtnText = container.querySelector('#js_login_btn_text');

    if (isLoggedIn && savedUser) {
        // 已登录状态
        accountIcon.className = 'ri-emotion-happy-line';
        accountIcon.style.color = 'var(--weui-BRAND)';
        accountTitle.textContent = savedUser.account || '';
        accountDesc.textContent = getI18n('desc_key', savedUser.school);
        loginBtnText.setAttribute('data-i18n', 'reLogin');
        loginBtnText.textContent = getI18n('mine', 'reLogin');
    } else {
        // 未登录状态
        accountIcon.className = 'ri-error-warning-line';
        accountIcon.style.color = '#fa5151';
        accountTitle.setAttribute('data-i18n', 'notLoggedIn');
        accountTitle.textContent = getI18n('mine', 'notLoggedIn');
        accountDesc.setAttribute('data-i18n', 'loginPrompt');
        accountDesc.textContent = getI18n('mine', 'loginPrompt');
        loginBtnText.setAttribute('data-i18n', 'goLogin');
        loginBtnText.textContent = getI18n('mine', 'goLogin');
    }
}

// 我的页
export async function load(container) {
    const response = await fetch('/assets/subpages/mine/mine.html');
    const html = await response.text();
    container.innerHTML = html;
    await translatePage('mine', container);

    // 初始化登录状态显示
    updateLoginState(container);

    // 加载功能列表
    await loadFunctions(container);

    // 监听登录成功事件（使用 once 防止重复绑定）
    window.addEventListener('login-success', () => {
        updateLoginState(container);
        loadFunctions(container);
    }, { once: true });

    // 点击去登录/重新登录按钮
    container.querySelector('#js_go_login').addEventListener('click', loadLogin);
}
