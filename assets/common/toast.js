// Toast 提示组件（完全自定义，不依赖 WeUI）

const TOAST_LAYER_ID = 'xykcb-toast-layer';
const STYLE_ID = 'xykcb-toast-style';

let toastHost = null;
let toastElement = null;
let leavingToastElement = null;
let hideTimer = null;
let removeTimer = null;
let styleInjected = false;
let toastVersion = 0;
let currentType = null;

const TOAST_CONFIG = {
    defaultDuration: 1200,
    animDuration: 200
};

const TOAST_ICONS = {
    success: 'ri-check-line',
    warn: 'ri-error-warning-fill',
    loading: 'ri-loader-4-line',
    text: ''
};

function injectStyle() {
    if (styleInjected || document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
        @keyframes xykcb-toast-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .xykcb-toast-host {
            position: absolute;
            inset: 0;
            pointer-events: none;
            overflow: visible;
            isolation: isolate;
        }
        .xykcb-toast {
            position: fixed;
            left: 50%;
            top: 46%;
            box-sizing: border-box;
            width: 144px;
            height: 144px;
            max-width: calc(100vw - 48px);
            padding: 22px 18px 20px;
            border-radius: 16px;
            border: 0;
            background: var(--weui-BG-4);
            color: var(--weui-WHITE);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 14px;
            text-align: center;
            pointer-events: none;
            opacity: 0;
            transform: translate(-50%, -50%) scale(.92);
            transition: transform ${TOAST_CONFIG.animDuration}ms ease, opacity ${TOAST_CONFIG.animDuration}ms ease;
            will-change: transform, opacity;
        }
        .xykcb-toast.is-visible {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }
        .xykcb-toast__icon-box {
            width: 46px;
            height: 46px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex: 0 0 auto;
            background: transparent;
        }
        .xykcb-toast__icon {
            display: block;
            width: 46px;
            height: 46px;
            line-height: 46px;
            font-size: 46px;
            font-weight: 400;
            color: currentColor;
        }
        .xykcb-toast__icon--loading {
            animation: xykcb-toast-spin .82s linear infinite;
        }
        .xykcb-toast__content {
            margin: 0;
            max-width: 100%;
            color: inherit;
            font-size: 15px;
            font-weight: 500;
            line-height: 1.42;
            letter-spacing: .01em;
            word-break: break-word;
        }
        .xykcb-toast--text {
            width: auto;
            min-width: 112px;
            max-width: min(340px, calc(100vw - 48px));
            height: auto;
            min-height: 112px;
            padding: 18px 20px;
            flex-direction: row;
            gap: 0;
        }
        .xykcb-toast--text .xykcb-toast__content {
            width: 100%;
            min-height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 15px;
            font-weight: 500;
            line-height: 1.42;
            text-align: center;
        }
    `;
    document.head.appendChild(style);
    styleInjected = true;
}

function normalizeType(type) {
    return TOAST_ICONS[type] !== undefined ? type : 'text';
}

function ensureToastLayer() {
    let layer = document.getElementById(TOAST_LAYER_ID);
    if (layer) return layer;

    layer = document.createElement('div');
    layer.id = TOAST_LAYER_ID;
    layer.className = 'xykcb-layer xykcb-toast-layer';
    layer.style.cssText = 'position:fixed;inset:0;z-index:9000;overflow:visible;background:transparent;pointer-events:none;';
    document.body.appendChild(layer);
    return layer;
}

function ensureToastHost() {
    if (toastHost && toastHost.isConnected) return toastHost;

    toastHost = document.createElement('div');
    toastHost.className = 'xykcb-toast-host';
    ensureToastLayer().appendChild(toastHost);
    return toastHost;
}

function fillToastElement(element, type, message) {
    element.className = `xykcb-toast xykcb-toast--${type}`;
    element.setAttribute('role', 'alert');
    element.setAttribute('aria-live', type === 'loading' ? 'polite' : 'assertive');
    element.textContent = '';

    const iconClass = TOAST_ICONS[type];
    if (iconClass) {
        const iconBox = document.createElement('span');
        iconBox.className = 'xykcb-toast__icon-box';

        const icon = document.createElement('i');
        icon.className = `xykcb-toast__icon ${iconClass}${type === 'loading' ? ' xykcb-toast__icon--loading' : ''}`;
        icon.setAttribute('aria-hidden', 'true');

        iconBox.appendChild(icon);
        element.appendChild(iconBox);
    }

    const content = document.createElement('p');
    content.className = 'xykcb-toast__content';
    content.textContent = message == null ? '' : String(message);
    element.appendChild(content);
}

function createToastElement(type, message) {
    const element = document.createElement('div');
    fillToastElement(element, type, message);
    return element;
}

function clearTimers() {
    if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
    }
    if (removeTimer) {
        clearTimeout(removeTimer);
        removeTimer = null;
    }
}

function clearLeavingToast() {
    if (leavingToastElement) {
        leavingToastElement.remove();
        leavingToastElement = null;
    }
}

function scheduleHide(type, duration) {
    if (type === 'loading') return;
    hideTimer = setTimeout(hideToast, duration);
}

function removeHostIfEmpty() {
    if (toastHost && toastHost.isConnected && !toastHost.childElementCount) {
        toastHost.remove();
    }
}

function showNewToast(type, message, version) {
    clearLeavingToast();
    toastElement = createToastElement(type, message);
    currentType = type;
    ensureToastHost().appendChild(toastElement);

    requestAnimationFrame(() => {
        if (version === toastVersion && toastElement) {
            toastElement.classList.add('is-visible');
        }
    });
}

function switchCurrentToast(type, message) {
    if (!toastElement) return;
    fillToastElement(toastElement, type, message);
    toastElement.classList.add('is-visible');
    currentType = type;
}

function reuseLeavingToast(type, message) {
    toastElement = leavingToastElement;
    leavingToastElement = null;
    fillToastElement(toastElement, type, message);
    toastElement.classList.add('is-visible');
    currentType = type;
}

export function showToast(type, message, duration = TOAST_CONFIG.defaultDuration) {
    injectStyle();
    clearTimers();

    const version = ++toastVersion;
    const normalizedType = normalizeType(type);

    if (toastElement && toastElement.isConnected) {
        switchCurrentToast(normalizedType, message);
    } else if (leavingToastElement && leavingToastElement.isConnected) {
        reuseLeavingToast(normalizedType, message);
    } else {
        showNewToast(normalizedType, message, version);
    }

    scheduleHide(normalizedType, duration);
}

export function hideToast() {
    if (!toastElement) return;

    clearTimers();
    const version = ++toastVersion;
    clearLeavingToast();

    const oldToast = toastElement;
    toastElement = null;
    leavingToastElement = oldToast;
    currentType = null;

    oldToast.classList.remove('is-visible');
    removeTimer = setTimeout(() => {
        if (version === toastVersion && leavingToastElement === oldToast) {
            oldToast.remove();
            leavingToastElement = null;
            removeHostIfEmpty();
            removeTimer = null;
        }
    }, TOAST_CONFIG.animDuration);
}

export const toast = {
    success: (message, duration) => showToast('success', message, duration),
    warn: (message, duration) => showToast('warn', message, duration),
    loading: (message) => showToast('loading', message),
    text: (message, duration) => showToast('text', message, duration)
};

window.toast = toast;
