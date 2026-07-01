import { translatePage, getI18n, getCurrentLang } from '/assets/init/languages.js';
import { loadLogin, getSavedUser } from '/assets/subpages/login/login.js';
import { showOverlay, hideOverlay } from '/index.js';
import { toast, hideToast } from '/assets/common/toast.js';
import { API, fetchWithTimeout } from '/assets/common/api.js';

// 暴露到全局供动态加载的脚本调用
window.hideOverlay = hideOverlay;

let loginSuccessHandler = null;
let functionsLoadSeq = 0;
const WECHAT_FUNCTION_TYPES = ['wechat_miniapp', 'wechat_link'];

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

function getFunctionTarget(func) {
    const target = String(func.target || '').toLowerCase();
    return target === 'new' ? 'new' : 'self';
}

function getFunctionType(func) {
    return String(func.type || '').toLowerCase();
}

function isWechatEnvironment() {
    const channel = String(localStorage.getItem('setting_app_channel') || '').toLowerCase();
    return channel === 'wechat';
}

function shouldShowFunction(func) {
    return !WECHAT_FUNCTION_TYPES.includes(getFunctionType(func)) || isWechatEnvironment();
}

function isLinkFunction(func) {
    return getFunctionType(func) === 'link';
}

function isWechatFunction(func) {
    return WECHAT_FUNCTION_TYPES.includes(getFunctionType(func));
}

function showJumpFailed() {
    toast.warn(getI18n('mine', 'jumpFailed'));
}

function openFunctionLink(func) {
    if (getFunctionTarget(func) === 'new') {
        const opened = window.open(func.url, '_blank', 'noopener,noreferrer');
        if (!opened) showJumpFailed();
    } else {
        window.location.href = func.url;
    }
}

function openWechatFunction(func) {
    const type = getFunctionType(func);
    const params = new URLSearchParams({ type, target: func.url || '' });
    const redirectUrl = `/pages/redirect/redirect?${params.toString()}`;
    const navigateTo = window.wx?.miniProgram?.navigateTo;
    if (typeof navigateTo !== 'function') {
        showJumpFailed();
        return;
    }
    navigateTo({ url: redirectUrl, fail: showJumpFailed });
}

// 加载功能列表
async function loadFunctions(container) {
    const seq = ++functionsLoadSeq;
    const savedUser = getSavedUser();
    const grid = container.querySelector('#js_functions_grid');
    const panel = container.querySelector('#js_functions_panel');

    if (grid) grid.innerHTML = '';
    if (panel) panel.style.display = 'none';

    if (!savedUser?.school || savedUser.isLoggedIn === false || !grid || !panel) return;

    try {
        const response = await fetchWithTimeout(API.getSupportFunction(savedUser.school));
        const result = await response.json();
        const latestUser = getSavedUser();
        if (seq !== functionsLoadSeq || latestUser?.school !== savedUser.school || latestUser?.account !== savedUser.account) return;
        if (!result.success || !result.data?.length) return;

        // 先过滤再排序，避免仅特定环境显示的功能在其他环境留下空位
        const functions = result.data
            .filter(shouldShowFunction)
            .sort((a, b) => a.id.localeCompare(b.id));

        if (!functions.length) return;

        const lang = getCurrentLang();

        for (const func of functions) {
            const label = func[lang] || func['zh-cn'] || func.en;
            const item = document.createElement('a');
            item.className = 'weui-grid';
            item.href = isLinkFunction(func) ? func.url : 'javascript:;';
            if (isLinkFunction(func) && getFunctionTarget(func) === 'new') {
                item.target = '_blank';
                item.rel = 'noopener noreferrer';
            }
            item.innerHTML = `
                <div class="weui-grid__icon">
                    <i class="ri-function-line" style="font-size: 28px; color: var(--weui-FG-0);"></i>
                </div>
                <p class="weui-grid__label"></p>
            `;
            item.querySelector('.weui-grid__label').textContent = label;
            item.addEventListener('click', async (event) => {
                event.preventDefault();
                if (isLinkFunction(func)) {
                    openFunctionLink(func);
                    return;
                }
                if (isWechatFunction(func)) {
                    openWechatFunction(func);
                    return;
                }

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
                        <div class="overlay-content scrollbar-enabled">${html}</div>
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

    if (!accountIcon || !accountTitle || !accountDesc || !loginBtnText) return;

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

async function refreshMinePage(container) {
    updateLoginState(container);
    await loadFunctions(container);
}

// 我的页
export async function load(container) {
    const response = await fetch('/assets/subpages/mine/mine.html');
    const html = await response.text();
    container.innerHTML = html;
    await translatePage('mine', container);

    if (loginSuccessHandler) {
        window.removeEventListener('login-success', loginSuccessHandler);
    }

    loginSuccessHandler = () => {
        refreshMinePage(container);
    };

    window.addEventListener('login-success', loginSuccessHandler);

    // 初始化账号信息和功能列表
    await refreshMinePage(container);

    // 点击去登录/重新登录按钮
    container.querySelector('#js_go_login').addEventListener('click', loadLogin);
}
