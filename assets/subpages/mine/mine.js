import { translatePage } from '/assets/init/languages.js';
import { loadLogin } from '/assets/subpages/login/login.js';

// 我的页
export async function load(container) {
    const response = await fetch('/assets/subpages/mine/mine.html');
    const html = await response.text();
    container.innerHTML = html;
    document.getElementById('js_not_logged_in').addEventListener('click', loadLogin);
    document.getElementById('js_go_login').addEventListener('click', loadLogin);
    await translatePage('mine', container);
}
