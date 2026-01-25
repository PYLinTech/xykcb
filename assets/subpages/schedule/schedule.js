// 课程页
export async function load(container) {
    const response = await fetch('./assets/subpages/schedule/schedule.html');
    const html = await response.text();
    container.innerHTML = html;
}
