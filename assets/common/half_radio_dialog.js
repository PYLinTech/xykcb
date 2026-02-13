// 半屏单选弹窗
const HalfRadioDialog = {
  show: function ({ title, options, selected, onChange }) {
    document.getElementById('halfRadioDialogWrap')?.remove();

    const items = options.map(opt =>
      `<label class="weui-cell weui-cell_active weui-check__label" style="background-color: var(--weui-BG-1)">
        <div class="weui-cell__bd"><p>${opt.label}</p></div>
        <div class="weui-cell__ft">
          <input type="radio" class="weui-check" name="half_radio" value="${opt.value}"${opt.value == selected ? ' checked' : ''}>
          <span class="weui-icon-checked"></span>
        </div>
      </label>`
    ).join('');

    const wrap = document.createElement('div');
    wrap.id = 'halfRadioDialogWrap';
    wrap.style.position = 'absolute';
    wrap.style.inset = '0';
    wrap.style.zIndex = '10000';
    wrap.innerHTML = `
      <div class="weui-mask"></div>
      <div class="weui-half-screen-dialog" style="background-color: var(--weui-BG-1)">
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
    document.body.appendChild(wrap);

    const dialog = wrap.querySelector('.weui-half-screen-dialog');
    const mask = wrap.querySelector('.weui-mask');

    const animate = (el, prop, start, end) => {
      el.style.transition = `${prop} 0.3s`;
      el.style[prop] = start;
      requestAnimationFrame(() => el.style[prop] = end);
    };

    animate(dialog, 'transform', 'translateY(100%)', 'translateY(0)');
    animate(mask, 'opacity', '0', '1');

    const close = () => {
      animate(dialog, 'transform', 'translateY(0)', 'translateY(100%)');
      animate(mask, 'opacity', '1', '0');
      setTimeout(() => wrap.remove(), 300);
    };

    mask.addEventListener('click', close);
    wrap.querySelector('#js_half_dialog_close').addEventListener('click', close);

    wrap.addEventListener('click', e => {
      const label = e.target.closest('.weui-check__label');
      if (label) {
        const radio = label.querySelector('.weui-check');
        if (radio) {
          radio.checked = true;
          onChange?.(radio.value);
          close();
        }
      }
    });
  }
};

export { HalfRadioDialog };
