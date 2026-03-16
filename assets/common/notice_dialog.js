const STYLES = `
.dialog-wrap { position: fixed; inset: 0; z-index: 11111; pointer-events: none; }
.dialog-mask { position: absolute; inset: 0; background: rgba(0,0,0,0.5); opacity: 0; transition: opacity 0.2s; pointer-events: auto; }
.dialog-mask.active { opacity: 1; }
.dialog-actions { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.8); background: var(--weui-BG-1); border-radius: 12px; padding: 20px; min-width: 240px; max-height: 80vh; display: flex; flex-direction: column; opacity: 0; transition: opacity 0.2s, transform 0.2s; pointer-events: auto; }
.dialog-actions.active { opacity: 1; transform: translate(-50%, -50%) scale(1); }
.dialog-header { position: relative; font-size: 16px; color: var(--weui-FG-0); margin-bottom: 16px; font-weight: 500; flex-shrink: 0; }
.dialog-close { position: absolute; right: 0; top: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 20px; color: var(--weui-FG-1); }
.dialog-body { font-size: 14px; color: var(--weui-FG-0); line-height: 1.5; white-space: pre-wrap; overflow-y: auto; max-height: 60vh; }
.dialog-body.options { white-space: normal; }
`;

function injectStyles() {
    if (document.getElementById('dialogStyles')) return;
    const style = document.createElement('style');
    style.id = 'dialogStyles';
    style.textContent = STYLES;
    document.head.appendChild(style);
}

function createDialog({ id, title, content, maskClosable = false, bodyClass = '', onClose = () => {}, onClick = () => {} }) {
    injectStyles();
    document.getElementById(id)?.remove();

    const wrap = document.createElement('div');
    wrap.id = id;
    wrap.className = 'dialog-wrap';
    if (id === 'noticeDialogWrap') wrap.style.zIndex = '11111';

    wrap.innerHTML = `
        <div class="dialog-mask"></div>
        <div class="dialog-actions">
            <div class="dialog-header">${title}<i class="dialog-close ri-close-line"></i></div>
            <div class="dialog-body${bodyClass ? ' ' + bodyClass : ''}">${content}</div>
        </div>
    `;

    document.body.appendChild(wrap);

    const mask = wrap.querySelector('.dialog-mask');
    const actions = wrap.querySelector('.dialog-actions');

    requestAnimationFrame(() => mask.classList.add('active') || actions.classList.add('active'));

    const close = () => {
        mask.classList.remove('active');
        actions.classList.remove('active');
        setTimeout(() => wrap.remove() || onClose(), 200);
    };

    wrap.querySelector('.dialog-close').addEventListener('click', close);
    if (maskClosable) mask.addEventListener('click', close);
    if (onClick) {
        wrap.addEventListener('click', (e) => {
            const result = onClick(e, close);
            if (result === false) return;
        });
    }

    return { wrap, close };
}

async function loadNoticeConfig() {
    try {
        const res = await fetch('https://api.pylin.cn/xykcb_notice.json');
        return await res.json();
    } catch (e) {
        console.error('Failed to load notice config:', e);
        return null;
    }
}

export async function initNotice() {
    const noticeConfig = await loadNoticeConfig();
    if (!noticeConfig || !noticeConfig.enabled) return;

    const storedLatest = localStorage.getItem('notice_latest');
    if (storedLatest && parseInt(storedLatest) >= parseInt(noticeConfig.latest)) return;

    showNotice(noticeConfig.title, noticeConfig.content, false, () => {
        localStorage.setItem('notice_latest', noticeConfig.latest);
    });
}

export function showNotice(title, content, maskClosable = true, onClose = () => {}) {
    createDialog({
        id: 'noticeDialogWrap',
        title,
        content,
        maskClosable,
        onClose
    });
}

export function showExportDialog({ title, options, onChange = () => {}, maskClosable = true }) {
    const optionsHtml = options.map(opt =>
        `<div class="weui-btn weui-btn_default dialog-option" data-value="${opt.value}">${opt.label}</div>`
    ).join('');

    createDialog({
        id: 'exportDialogWrap',
        title,
        content: optionsHtml,
        bodyClass: 'options',
        maskClosable,
        onClick: (e, close) => {
            const opt = e.target.closest('.dialog-option');
            if (opt) {
                e.stopPropagation();
                close();
                onChange(opt.dataset.value);
            }
        }
    });
}
