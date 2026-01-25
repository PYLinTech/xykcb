// 设置页
export async function load(container) {
    const response = await fetch('./assets/subpages/settings/settings.html');
    const html = await response.text();
    container.innerHTML = html;
}
