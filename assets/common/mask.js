// 全局遮罩管理服务

const MASK_ID = 'xykcb_global_mask';
const MASK_LAYER_ID = 'xykcb-mask-layer';
const STYLE_ID = 'xykcb_global_mask_style';
const ANIM_DURATION = 120;

let maskEl = null;
let activeToken = null;
let activeOptions = {};
let hideTimer = null;
let visible = false;
let tokenSeed = 0;

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
#${MASK_ID} {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,.5);
  opacity: 0;
  pointer-events: auto;
  transition: opacity ${ANIM_DURATION}ms ease;
  will-change: opacity;
}
#${MASK_ID}.xykcb-mask--visible { opacity: 1; }
`;
  document.head.appendChild(style);
}

function ensureLayer() {
  let layer = document.getElementById(MASK_LAYER_ID);
  if (layer) return layer;

  layer = document.createElement('div');
  layer.id = MASK_LAYER_ID;
  layer.className = 'xykcb-layer xykcb-mask-layer';
  layer.style.cssText = 'position:fixed;inset:0;z-index:5000;overflow:visible;background:transparent;pointer-events:none;';
  document.body.appendChild(layer);
  return layer;
}

function ensureMask() {
  injectStyle();
  if (maskEl && maskEl.isConnected) return maskEl;

  maskEl = document.createElement('div');
  maskEl.id = MASK_ID;
  maskEl.addEventListener('click', event => {
    if (event.target !== maskEl) return;
    activeOptions.onClick?.(event);
  });
  ensureLayer().appendChild(maskEl);
  return maskEl;
}

function createController(token, el) {
  return {
    token,
    get element() { return el; },
    close: () => hide(token),
    setClickHandler: onClick => {
      if (activeToken === token) activeOptions.onClick = onClick;
    }
  };
}

function show(options = {}) {
  const token = ++tokenSeed;
  activeToken = token;
  activeOptions = options || {};

  const el = ensureMask();
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }

  if (!visible) {
    visible = true;
    el.classList.remove('xykcb-mask--visible');
    el.offsetHeight;
    requestAnimationFrame(() => {
      if (activeToken === token) el.classList.add('xykcb-mask--visible');
    });
  } else {
    el.classList.add('xykcb-mask--visible');
  }

  return createController(token, el);
}

function hide(token = activeToken) {
  if (!maskEl || !visible) return;
  if (token !== activeToken) return;

  const options = activeOptions;
  activeToken = null;
  activeOptions = {};
  visible = false;
  maskEl.classList.remove('xykcb-mask--visible');

  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    hideTimer = null;
    if (!visible && maskEl) {
      maskEl.remove();
      maskEl = null;
      options.onClose?.();
    }
  }, ANIM_DURATION);
}

export const mask = { show, hide, duration: ANIM_DURATION };
export { show, hide };
