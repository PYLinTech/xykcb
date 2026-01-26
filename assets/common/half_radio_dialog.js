// 半屏单选弹窗
const HalfRadioDialog = {
  show: function ({ title, options, selected, onChange }) {
    document.getElementById('halfRadioDialogWrap')?.remove();

    const items = options.map(opt =>
      `<label class="weui-cell weui-cell_active weui-check__label">
        <div class="weui-cell__bd"><p>${opt.label}</p></div>
        <div class="weui-cell__ft">
          <input type="radio" class="weui-check" name="half_radio" value="${opt.value}"${opt.value === selected ? ' checked' : ''}>
          <span class="weui-icon-checked"></span>
        </div>
      </label>`
    ).join('');

    const wrap = document.createElement('div');
    wrap.id = 'halfRadioDialogWrap';
    wrap.innerHTML = `
      <div class="weui-mask"></div>
      <div class="weui-half-screen-dialog">
        <div class="weui-half-screen-dialog__hd">
          <div class="weui-half-screen-dialog__hd__main">
            <strong class="weui-half-screen-dialog__title">${title}</strong>
          </div>
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
    wrap.addEventListener('click', e => {
      const radio = e.target.closest('.weui-check');
      if (radio) {
        radio.checked = true;
        onChange?.(radio.value);
        close();
      }
    });
  }
};

export { HalfRadioDialog };
