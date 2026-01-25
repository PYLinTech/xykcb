// 我的页
export async function load(container) {
    const response = await fetch('./assets/subpages/mine/mine.html');
    const html = await response.text();
    container.innerHTML = html;
}
