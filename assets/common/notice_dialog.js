// 远程公告配置地址
import { API_CONFIG } from '/assets/common/api.js';
import { mask } from '/assets/common/mask.js';
const NOTICE_API_URL = API_CONFIG.NOTICE_API_URL;
const POPUP_LAYER_ID = 'xykcb-popup-layer';

function ensurePopupLayer() {
    let layer = document.getElementById(POPUP_LAYER_ID);
    if (layer) return layer;
    layer = document.createElement('div');
    layer.id = POPUP_LAYER_ID;
    layer.className = 'xykcb-layer xykcb-popup-layer';
    layer.style.cssText = 'position:fixed;inset:0;z-index:7000;overflow:visible;background:transparent;pointer-events:none;';
    document.body.appendChild(layer);
    return layer;
}

const STYLES = `
.dialog-wrap { position: absolute; top: 0; right: 0; bottom: 0; left: 0; pointer-events: none; }
.dialog-actions { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.8); background: var(--weui-BG-1); border-radius: 12px; padding: 20px; min-width: 240px; max-width: 90vw; max-height: 80vh; box-sizing: border-box; display: flex; flex-direction: column; opacity: 0; transition: opacity 0.24s, transform 0.24s; pointer-events: auto; }
.dialog-actions.active { opacity: 1; transform: translate(-50%, -50%) scale(1); }
.dialog-header { position: relative; font-size: 16px; color: var(--weui-FG-0); margin-bottom: 16px; font-weight: 500; flex-shrink: 0; }
.dialog-close { position: absolute; right: 0; top: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 20px; color: var(--weui-FG-1); }
.dialog-body { font-size: 14px; color: var(--weui-FG-0); line-height: 1.5; white-space: pre-wrap; overflow-y: auto; max-height: 60vh; padding-right: 5px; }
.dialog-body.options { white-space: normal; }
`;

let styleInjected = false;

function injectStyles() {
    if (styleInjected) return;
    styleInjected = true;
    document.head.appendChild(Object.assign(document.createElement('style'), { id: 'dialogStyles', textContent: STYLES }));
}

function createDialog({ id, title, content, maskClosable = false, bodyClass = '', onClose = () => {}, onClick = () => {} }) {
    injectStyles();
    document.getElementById(id)?.remove();

    const wrap = document.createElement('div');
    wrap.id = id;
    wrap.className = 'dialog-wrap';
    wrap.innerHTML = `
        <div class="dialog-actions">
            <div class="dialog-header">${title}<i class="dialog-close ri-close-line"></i></div>
            <div class="dialog-body scrollbar-enabled${bodyClass ? ' ' + bodyClass : ''}">${content}</div>
        </div>
    `;
    ensurePopupLayer().appendChild(wrap);

    const actions = wrap.querySelector('.dialog-actions');
    const closeBtn = wrap.querySelector('.dialog-close');
    const maskHandle = mask.show({ onClick: () => { if (maskClosable) close(); } });

    // 强制重绘确保样式应用后再触发动画
    wrap.offsetHeight;
    requestAnimationFrame(() => {
        actions.classList.add('active');
    });

    const close = () => {
        maskHandle.close();
        actions.classList.remove('active');
        setTimeout(() => wrap.remove() || onClose(), 240);
    };

    closeBtn.onclick = close;
    if (onClick) wrap.onclick = e => { if (onClick(e, close) === false) e.stopPropagation(); };

    return { wrap, close };
}

async function loadNoticeConfig() {
    try {
        const res = await fetch(NOTICE_API_URL);
        return await res.json();
    } catch (e) {
        console.error('Failed to load notice config:', e);
        return null;
    }
}

export async function initNotice() {
    const config = await loadNoticeConfig();
    if (!config?.enabled) return;

    const stored = localStorage.getItem('notice_latest');
    if (stored && parseInt(stored) >= parseInt(config.latest)) return;

    showNotice(config.title, config.content, false, () => localStorage.setItem('notice_latest', config.latest));
}

export function showNotice(title, content, maskClosable = true, onClose = () => {}) {
    createDialog({ id: 'noticeDialogWrap', title, content, maskClosable, onClose });
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
            if (opt) { close(); onChange(opt.dataset.value); }
        }
    });
}
