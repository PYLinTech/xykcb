// WeUI Dialog 弹窗组件

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
      <div class="weui-mask"></div>
      <div class="weui-dialog${config.horizontalBtns ? ' weui-dialog_btn-wrap' : ''}">
        ${config.hasTitle ? `<div class="weui-dialog__hd"><strong class="weui-dialog__title">${title}</strong></div>` : ''}
        <div class="weui-dialog__bd" style="display: block; justify-content: unset; align-items: unset; -webkit-box-pack: unset; -webkit-box-align: unset; flex-direction: unset; -webkit-flex-direction: unset;">${content}</div>
        <div class="weui-dialog__ft">${buttonsHtml}</div>
      </div>
    `;
    // 初始状态：透明、过渡、层级
    wrap.style.cssText = 'position: fixed; inset: 0; opacity: 0; transition: opacity 0.2s; z-index: 5000;';
    document.body.appendChild(wrap);

    const hide = (index = -1) => {
      wrap.style.opacity = '0';
      setTimeout(() => {
        wrap.remove();
        onClose?.(index);
      }, 200);
    };

    // 淡入显示
    requestAnimationFrame(() => {
      wrap.style.opacity = '1';
    });

    // 事件委托
    wrap.addEventListener('click', e => {
      const btn = e.target.closest('.weui-dialog__btn');
      if (btn) hide(parseInt(btn.dataset.index));
      else if (allowMaskClose && e.target.classList.contains('weui-mask')) hide();
    });
  }
};

export { Dialog };
