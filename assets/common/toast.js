// Toast 提示组件

let toastContainer = null;
let toastElement = null;
let hideTimer = null;

// Toast 配置
const TOAST_CONFIG = {
    zIndex: 10010,
    defaultDuration: 2000,
    fadeDuration: 200
};

// Toast 图标配置
const TOAST_ICONS = {
    success: 'weui-icon-success-no-circle weui-icon_toast',
    warn: 'weui-icon-warn weui-icon_toast',
    loading: 'weui-primary-loading weui-icon_toast',
    text: ''
};

// 初始化容器
function initContainer() {
    if (toastContainer) return;
    toastContainer = document.createElement('div');
    toastContainer.id = 'js_toast_container';
    Object.assign(toastContainer.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        zIndex: String(TOAST_CONFIG.zIndex),
        pointerEvents: 'none'
    });
    document.body.appendChild(toastContainer);
}

// 创建 Toast 元素
function createToastElement(type, message) {
    const element = document.createElement('div');
    element.setAttribute('role', 'alert');
    Object.assign(element.style, {
        opacity: '0',
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: String(TOAST_CONFIG.zIndex),
        transition: `opacity ${TOAST_CONFIG.fadeDuration}ms`
    });

    // 遮罩层
    const mask = document.createElement('div');
    mask.className = 'weui-mask_transparent';
    element.appendChild(mask);

    // 包装器
    const wrp = document.createElement('div');
    wrp.className = 'weui-toast__wrp';
    element.appendChild(wrp);

    // 内容
    const content = document.createElement('div');
    content.className = 'weui-toast';
    content.innerHTML = `
        <i class="${TOAST_ICONS[type]}"></i>
        <p class="weui-toast__content">${message}</p>
    `;
    wrp.appendChild(content);

    return element;
}

// 显示 Toast
export function showToast(type, message, duration = TOAST_CONFIG.defaultDuration) {
    initContainer();
    clearHideTimer();

    // 移除已存在的 toast
    if (toastElement) {
        toastElement.remove();
        toastElement = null;
    }

    toastElement = createToastElement(type, message);
    toastContainer.appendChild(toastElement);

    // 淡入
    requestAnimationFrame(() => {
        toastElement.style.opacity = '1';
    });

    // 自动关闭（非 loading 类型）
    if (type !== 'loading') {
        hideTimer = setTimeout(hideToast, duration);
    }
}

// 隐藏 Toast
export function hideToast() {
    if (!toastElement) return;

    toastElement.style.opacity = '0';
    setTimeout(() => {
        if (toastElement) {
            toastElement.remove();
            toastElement = null;
        }
    }, TOAST_CONFIG.fadeDuration);

    clearHideTimer();
}

// 清除隐藏定时器
function clearHideTimer() {
    if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
    }
}

// 便捷调用
export const toast = {
    success: (message, duration) => showToast('success', message, duration),
    warn: (message, duration) => showToast('warn', message, duration),
    loading: (message) => showToast('loading', message),
    text: (message, duration) => showToast('text', message, duration)
};
