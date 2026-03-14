// 导出选择弹窗

const STYLES = `
#exportDialogWrap { position: fixed; inset: 0; z-index: 10000; pointer-events: none; }
.export-mask { position: absolute; inset: 0; background: rgba(0,0,0,0.5); opacity: 0; transition: opacity 0.2s; pointer-events: auto; }
.export-mask.active { opacity: 1; }
.export-actions { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.8); background: var(--weui-BG-1); border-radius: 12px; padding: 20px; min-width: 240px; max-height: 80vh; overflow-y: auto; opacity: 0; transition: opacity 0.2s, transform 0.2s; pointer-events: auto; }
.export-actions.active { opacity: 1; transform: translate(-50%, -50%) scale(1); }
.export-title { position: relative; font-size: 16px; color: var(--weui-FG-0); margin-bottom: 16px; font-weight: 500; }
.export-close { position: absolute; right: 0; top: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 20px; color: var(--weui-FG-1); }
`;

function injectStyles() {
    if (document.getElementById('exportDialogStyles')) return;
    const style = document.createElement('style');
    style.id = 'exportDialogStyles';
    style.textContent = STYLES;
    document.head.appendChild(style);
}

/**
 * 显示导出选择弹窗
 * @param {Object} options
 * @param {string} options.title - 弹窗标题
 * @param {Array<{value: string, label: string}>} options.options - 选项列表
 * @param {Function} [options.onChange] - 选项选择回调
 */
export function showExportDialog({ title, options, onChange = () => {} }) {
    injectStyles();
    document.getElementById('exportDialogWrap')?.remove();

    const wrap = document.createElement('div');
    wrap.id = 'exportDialogWrap';

    const optionsHtml = options.map(opt =>
        `<div class="weui-btn weui-btn_default export-option" data-value="${opt.value}">${opt.label}</div>`
    ).join('');

    wrap.innerHTML = `
        <div class="export-mask"></div>
        <div class="export-actions">
            <div class="export-title">${title}<i class="export-close ri-close-line"></i></div>
            ${optionsHtml}
        </div>
    `;

    document.body.appendChild(wrap);

    const mask = wrap.querySelector('.export-mask');
    const actions = wrap.querySelector('.export-actions');
    let isClosed = false;

    // 淡入动画
    requestAnimationFrame(() => mask.classList.add('active') || actions.classList.add('active'));

    const close = (callback) => {
        if (isClosed) return;
        isClosed = true;
        mask.classList.remove('active');
        actions.classList.remove('active');
        setTimeout(() => wrap.remove() || callback?.(), 200);
    };

    // 事件绑定
    wrap.addEventListener('click', (e) => {
        const opt = e.target.closest('.export-option');
        if (opt) {
            e.stopPropagation();
            close(() => onChange(opt.dataset.value));
        } else if (e.target.classList.contains('export-mask') || e.target.classList.contains('export-close')) {
            close();
        }
    });
}
