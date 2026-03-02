import { translatePage, getI18n } from '/assets/init/languages.js';
import { loadLogin, getSavedUser } from '/assets/subpages/login/login.js';

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

    // 监听登录成功事件
    window.addEventListener('login-success', () => {
        updateLoginState(container);
    });

    // 点击去登录/重新登录按钮
    container.querySelector('#js_go_login').addEventListener('click', loadLogin);
}
