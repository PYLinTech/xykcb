// WeUI Dialog 弹窗组件

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

const Dialog = {
  /**
   * 显示 Dialog 弹窗
   * @param {Object} options
   * @param {string} options.style - 样式: '1'(有标题), '2'(无标题), '3'(按钮横向)
   * @param {string} options.title - 标题
   * @param {string} options.content - 内容
   * @param {Array<{text: string, type?: 'primary'|'warn'}>} options.buttons - 按钮数组（type: 'primary'|'warn'，留空为默认）
   * @param {boolean} [options.allowMaskClose=false] - 是否允许点击遮罩关闭
   * @param {Function} [options.onClose] - 关闭回调（返回按钮索引，遮罩关闭返回 -1）
   */
  show: function ({ style = '1', title, content, buttons, allowMaskClose = false, onClose }) {
    document.getElementById('weuiDialogWrap')?.remove();

    const config = {
      '1': { hasTitle: true, horizontalBtns: false },
      '2': { hasTitle: false, horizontalBtns: false },
      '3': { hasTitle: true, horizontalBtns: true }
    }[style] || { hasTitle: true, horizontalBtns: false };

    const buttonsHtml = buttons.map((btn, i) =>
      `<a role="button" class="weui-dialog__btn weui-dialog__btn_${btn.type || 'default'}" data-index="${i}">${btn.text}</a>`
    ).join('');

    const wrap = document.createElement('div');
    wrap.id = 'weuiDialogWrap';
    wrap.innerHTML = `
      <style>.weui-dialog_scrollable{display:flex;flex-direction:column;max-height:calc(100vh - 48px);max-height:calc(100dvh - 48px)}.weui-dialog_scrollable .weui-dialog__bd{min-height:0;overflow-y:auto;margin-bottom:0}.weui-dialog_scrollable .weui-dialog__bd>:last-child{margin-bottom:16px}.weui-dialog_btn-wrap .weui-dialog__ft{display:flex!important;flex-direction:row!important}.weui-dialog_btn-wrap .weui-dialog__btn{display:block!important;flex:1 1 0!important;width:auto!important;min-width:0!important}.weui-dialog_btn-wrap .weui-dialog__btn::after{border-left:1px solid var(--weui-DIALOG-LINE-COLOR)!important;border-top:0!important}.weui-dialog_btn-wrap .weui-dialog__btn:first-child::after{border-left:0!important}</style>
      <div class="weui-dialog weui-dialog_scrollable${config.horizontalBtns ? ' weui-dialog_btn-wrap' : ''}">
        ${config.hasTitle ? `<div class="weui-dialog__hd"><strong class="weui-dialog__title">${title}</strong></div>` : ''}
        <div class="weui-dialog__bd" style="display: block; justify-content: unset; align-items: unset; -webkit-box-pack: unset; -webkit-box-align: unset; flex-direction: unset; -webkit-flex-direction: unset;">${content}</div>
        <div class="weui-dialog__ft">${buttonsHtml}</div>
      </div>
    `;
    // 初始状态：透明、过渡、层级
    wrap.style.cssText = 'position: absolute; top: 0; right: 0; bottom: 0; left: 0; opacity: 0; transition: opacity 0.12s; pointer-events: none; display: flex; align-items: center; justify-content: center;';
    ensurePopupLayer().appendChild(wrap);
    const maskHandle = mask.show({
      onClick: () => { if (allowMaskClose) hide(-1); }
    });
    wrap.querySelector('.weui-dialog').style.pointerEvents = 'auto';

    const hide = (index = -1) => {
      maskHandle.close();
      wrap.style.opacity = '0';
      setTimeout(() => {
        wrap.remove();
        onClose?.(index);
      }, mask.duration);
    };

    // 淡入显示
    requestAnimationFrame(() => {
      wrap.style.opacity = '1';
    });

    // 事件委托
    wrap.addEventListener('click', e => {
      const btn = e.target.closest('.weui-dialog__btn');
      if (btn) hide(parseInt(btn.dataset.index));
    });
  }
};

export { Dialog };
