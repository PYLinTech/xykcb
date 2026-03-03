import { translatePage, getI18n, getCurrentLang } from '/assets/init/languages.js';
import { loadLogin, getSavedUser } from '/assets/subpages/login/login.js';
import { showOverlay, hideOverlay } from '/index.js';
import { toast, hideToast } from '/assets/common/toast.js';

// 加载功能列表
async function loadFunctions(container) {
    const savedUser = getSavedUser();
    if (!savedUser?.school || savedUser.isLoggedIn === false) return;

    try {
        const response = await fetch(`https://api.pylin.cn/xykcb/get-support-function?school=${savedUser.school}`);
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
                showOverlay(null, html);
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

    // 监听登录成功事件
    window.addEventListener('login-success', () => {
        updateLoginState(container);
        loadFunctions(container);
    });

    // 点击去登录/重新登录按钮
    container.querySelector('#js_go_login').addEventListener('click', loadLogin);
}
