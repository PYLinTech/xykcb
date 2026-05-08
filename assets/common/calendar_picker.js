// 日期选择器弹窗组件

import { getI18n } from '/assets/init/languages.js';
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

const CSS = `
.calendar-picker-wrap .weui-half-screen-dialog {
  background-color: var(--weui-BG-1);
}
.calendar-nav {
  display: grid;
  grid-template-columns: 34px 136px 34px;
  align-items: center;
  justify-content: center;
  column-gap: 14px;
  padding: 12px 16px 0;
}
.calendar-nav-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 34px;
  cursor: pointer;
  border-radius: 50%;
}
.calendar-nav-btn i {
  font-size: 20px;
}
.calendar-year-month {
  width: 136px;
  font-size: 17px;
  text-align: center;
  white-space: nowrap;
}
.calendar-nav-btn--prev {
  justify-self: end;
}
.calendar-nav-btn--next {
  justify-self: start;
}
.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 16px 16px 0;
}
.calendar-weekday {
  text-align: center;
  font-size: 12px;
  color: var(--weui-FG-1);
}
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: repeat(6, 44px);
  padding: 0 16px 16px;
}
.calendar-day {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 15px;
}
.calendar-day-inner {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}
.calendar-day--highlight .calendar-day-inner {
  background-color: var(--weui-BRAND);
  color: #fff;
}
.calendar-actions {
  padding: 0 16px 8px;
  display: flex;
  flex-direction: column;
}
.calendar-actions .weui-btn {
  margin-top: 8px;
}
.calendar-actions .weui-btn:first-child {
  margin-top: 0;
}
`;

const injectCSS = () => {
  if (document.getElementById('calendar-picker-css')) return;
  const style = document.createElement('style');
  style.id = 'calendar-picker-css';
  style.textContent = CSS;
  document.head.appendChild(style);
};

const CONFIG = {
  animDuration: 240,
  weekDayKeys: ['weekday1', 'weekday2', 'weekday3', 'weekday4', 'weekday5', 'weekday6', 'weekday7'],
};

const formatDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const CalendarPicker = {
  show: function ({ initialDate, onChange, onClose, allowMaskClose = true }) {
    injectCSS();
    document.getElementById('calendarPickerWrap')?.remove();

    const today = new Date();
    const todayStr = formatDate(today);
    const parsed = initialDate ? initialDate.split('-') : null;
    let currentYear = parsed ? parseInt(parsed[0]) : today.getFullYear();
    let currentMonth = parsed ? parseInt(parsed[1]) : today.getMonth() + 1;

    const wrap = document.createElement('div');
    wrap.id = 'calendarPickerWrap';
    wrap.className = 'calendar-picker-wrap';

    const renderCalendar = (year, month, selected) => {
      const daysInMonth = new Date(year, month, 0).getDate();
      const firstDay = new Date(year, month - 1, 1).getDay();
      const startOffset = firstDay === 0 ? 6 : firstDay - 1;
      const monthStr = String(month).padStart(2, '0');

      const html = [];
      for (let i = 0; i < startOffset; i++) {
        html.push('<div></div>');
      }
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${monthStr}-${String(day).padStart(2, '0')}`;
        const isSelected = dateStr === selected;
        const isToday = dateStr === todayStr;
        const isHighlight = isSelected || (isToday && !selected);
        html.push(`
          <div class="calendar-day ${isHighlight ? 'calendar-day--highlight' : ''}" data-date="${dateStr}">
            <span class="calendar-day-inner tap-active">${day}</span>
          </div>
        `);
      }
      return html.join('');
    };

    const getYearMonthText = (y, m) =>
      getI18n('common', 'yearMonth').replace('{year}', y).replace('{month}', m);

    wrap.innerHTML = `
      <div class="weui-half-screen-dialog calendar-picker-dialog">
        <div class="weui-half-screen-dialog__hd">
          <div class="weui-half-screen-dialog__hd__main">
            <strong class="weui-half-screen-dialog__title">${getI18n('common', 'selectDate')}</strong>
          </div>
          <i class="weui-half-screen-dialog__close ri-close-line calendar-close-btn" style="font-size: 20px; cursor: pointer;"></i>
        </div>
        <div class="weui-half-screen-dialog__bd">
          <div class="calendar-nav">
            <div class="calendar-nav-btn calendar-nav-btn--prev tap-active">
              <i class="ri-arrow-left-s-line"></i>
            </div>
            <div class="calendar-year-month">${getYearMonthText(currentYear, currentMonth)}</div>
            <div class="calendar-nav-btn calendar-nav-btn--next tap-active">
              <i class="ri-arrow-right-s-line"></i>
            </div>
          </div>
          <div class="calendar-weekdays">
            ${CONFIG.weekDayKeys.map(k => `<div class="calendar-weekday">${getI18n('common', k)}</div>`).join('')}
          </div>
          <div class="calendar-grid">${renderCalendar(currentYear, currentMonth, initialDate)}</div>
          <div class="calendar-actions">
            <a role="button" href="javascript:" class="weui-btn weui-btn_primary" data-action="today">${getI18n('common', 'today')}</a>
          </div>
        </div>
      </div>
    `;

    wrap.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
    ensurePopupLayer().appendChild(wrap);

    const dialog = wrap.querySelector('.weui-half-screen-dialog');
    dialog.style.pointerEvents = 'auto';
    const yearMonthEl = wrap.querySelector('.calendar-year-month');
    const gridEl = wrap.querySelector('.calendar-grid');

    const updateDisplay = () => {
      yearMonthEl.textContent = getYearMonthText(currentYear, currentMonth);
      gridEl.innerHTML = renderCalendar(currentYear, currentMonth, initialDate);
    };

    let closed = false;

    // 与 HalfRadioDialog 保持一致：半屏弹窗从底部滑入/滑出，仅使用 transform。
    dialog.style.transform = 'translateY(100%)';
    dialog.style.transition = `transform ${CONFIG.animDuration / 1000}s`;

    const maskHandle = mask.show({
      onClick: () => { if (allowMaskClose) close('cancel'); }
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!closed) dialog.style.transform = 'translateY(0)';
      });
    });

    const close = (action, date) => {
      if (closed) return;
      closed = true;
      if (action === 'confirm' && date) onChange?.(date);
      onClose?.();
      maskHandle.close();
      dialog.style.transform = 'translateY(100%)';
      setTimeout(() => {
        wrap.remove();
      }, CONFIG.animDuration);
    };

    const changeMonth = (delta) => {
      currentMonth += delta;
      if (currentMonth < 1) {
        currentMonth = 12;
        currentYear--;
      } else if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
      updateDisplay();
    };

    wrap.addEventListener('click', e => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action === 'today') {
        close('confirm', todayStr);
        return;
      }
      if (e.target.closest('.calendar-close-btn')) {
        close('cancel');
        return;
      }
      if (e.target.closest('.calendar-nav-btn--prev')) {
        changeMonth(-1);
        return;
      }
      if (e.target.closest('.calendar-nav-btn--next')) {
        changeMonth(1);
        return;
      }
      const dayEl = e.target.closest('.calendar-day');
      if (dayEl) {
        close('confirm', dayEl.dataset.date);
      }
    });

  }
};

export { CalendarPicker };
