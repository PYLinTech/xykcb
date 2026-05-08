// 半屏单选弹窗

import { mask } from '/assets/common/mask.js';

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

const HalfRadioDialog = {
  show: function ({ title, options, selected, onChange }) {
    const DIALOG_ID = 'halfRadioDialogWrap';
    document.getElementById(DIALOG_ID)?.remove();

    // 生成选项列表
    const items = options.map(opt => `
      <label class="weui-cell weui-cell_active weui-check__label" style="background-color: var(--weui-BG-1)">
        <div class="weui-cell__bd"><p>${opt.label}</p></div>
        <div class="weui-cell__ft">
          <input type="radio" class="weui-check" name="half_radio" value="${opt.value}"${opt.value === selected ? ' checked' : ''}>
          <span class="weui-icon-checked"></span>
        </div>
      </label>`
    ).join('');
    const scrollbarClass = options.length > 12 ? ' scrollbar-enabled' : '';

    // 创建弹窗容器
    const wrap = document.createElement('div');
    wrap.id = DIALOG_ID;
    wrap.style.cssText = 'position: absolute; top: 0; right: 0; bottom: 0; left: 0; pointer-events: none;';
    wrap.innerHTML = `
      <div class="weui-half-screen-dialog${scrollbarClass}" style="background-color: var(--weui-BG-1)">
        <div class="weui-half-screen-dialog__hd">
          <div class="weui-half-screen-dialog__hd__main">
            <strong class="weui-half-screen-dialog__title">${title}</strong>
          </div>
          <i class="weui-half-screen-dialog__close ri-close-line" id="js_half_dialog_close" style="font-size: 20px; cursor: pointer;"></i>
        </div>
        <div class="weui-half-screen-dialog__bd">
          <div class="weui-cells weui-cells_radio">${items}</div>
        </div>
      </div>
    `;
    ensurePopupLayer().appendChild(wrap);

    // 缓存 DOM 引用
    const dialog = wrap.querySelector('.weui-half-screen-dialog');
    const bd = wrap.querySelector('.weui-half-screen-dialog__bd');
    const closeBtn = wrap.querySelector('#js_half_dialog_close');
    dialog.style.pointerEvents = 'auto';

    // 滑入动画
    dialog.style.transform = 'translateY(100%)';
    dialog.style.transition = 'transform 0.24s';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        dialog.style.transform = 'translateY(0)';
      });
    });

    // 滚动到选中项
    if (selected) {
      setTimeout(() => {
        const checkedInput = wrap.querySelector('.weui-check:checked');
        if (checkedInput) {
          const label = checkedInput.closest('.weui-check__label');
          if (label) {
            const labelTop = label.offsetTop;
            const labelHeight = label.offsetHeight;
            const bdHeight = bd.clientHeight;
            bd.scrollTop = Math.max(0, labelTop - (bdHeight - labelHeight) / 2);
          }
        }
      }, 0);
    }

    // 关闭弹窗
    const maskHandle = mask.show({ onClick: () => close() });

    const close = () => {
      maskHandle.close();
      dialog.style.transform = 'translateY(100%)';
      setTimeout(() => wrap.remove(), 240);
    };

    // 绑定事件
    closeBtn.addEventListener('click', close);

    wrap.addEventListener('click', e => {
      const label = e.target.closest('.weui-check__label');
      if (label) {
        const radio = label.querySelector('.weui-check');
        radio.checked = true;
        onChange?.(radio.value);
        close();
      }
    });
  }
};

export { HalfRadioDialog };
