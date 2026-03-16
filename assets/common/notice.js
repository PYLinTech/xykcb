const STYLES = `
#noticeDialogWrap { position: fixed; inset: 0; z-index: 11111; pointer-events: none; }
.notice-mask { position: absolute; inset: 0; background: rgba(0,0,0,0.5); opacity: 0; transition: opacity 0.2s; pointer-events: auto; }
.notice-mask.active { opacity: 1; }
.notice-actions { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.8); background: var(--weui-BG-1); border-radius: 12px; padding: 20px; min-width: 240px; max-height: 80vh; display: flex; flex-direction: column; opacity: 0; transition: opacity 0.2s, transform 0.2s; pointer-events: auto; }
.notice-actions.active { opacity: 1; transform: translate(-50%, -50%) scale(1); }
.notice-header { position: relative; font-size: 16px; color: var(--weui-FG-0); margin-bottom: 16px; font-weight: 500; flex-shrink: 0; }
.notice-close { position: absolute; right: 0; top: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 20px; color: var(--weui-FG-1); }
.notice-body { font-size: 14px; color: var(--weui-FG-0); line-height: 1.5; white-space: pre-wrap; overflow-y: auto; max-height: 60vh; }
`;

async function loadNoticeConfig() {
  try {
    const res = await fetch('https://api.pylin.cn/xykcb_notice.json');
    return await res.json();
  } catch (e) {
    console.error('Failed to load notice config:', e);
    return null;
  }
}

function injectStyles() {
  if (document.getElementById('noticeDialogStyles')) return;
  const style = document.createElement('style');
  style.id = 'noticeDialogStyles';
  style.textContent = STYLES;
  document.head.appendChild(style);
}

function showNoticeDialog(title, content, maskClosable = false) {
  injectStyles();
  document.getElementById('noticeDialogWrap')?.remove();

  const wrap = document.createElement('div');
  wrap.id = 'noticeDialogWrap';

  wrap.innerHTML = `
    <div class="notice-mask"></div>
    <div class="notice-actions">
      <div class="notice-header">${title}<i class="notice-close ri-close-line"></i></div>
      <div class="notice-body">${content}</div>
    </div>
  `;

  document.body.appendChild(wrap);

  const mask = wrap.querySelector('.notice-mask');
  const actions = wrap.querySelector('.notice-actions');
  const closeBtn = wrap.querySelector('.notice-close');

  requestAnimationFrame(() => mask.classList.add('active') || actions.classList.add('active'));

  const close = () => {
    mask.classList.remove('active');
    actions.classList.remove('active');
    setTimeout(() => wrap.remove(), 200);
  };

  closeBtn.addEventListener('click', close);
  if (maskClosable) {
    mask.addEventListener('click', close);
  }
}

// 初始化公告弹窗（由 init.js 调用，不支持遮罩关闭）
export async function initNotice() {
  const noticeConfig = await loadNoticeConfig();
  if (!noticeConfig || !noticeConfig.enabled) return;
  showNoticeDialog(noticeConfig.title, noticeConfig.content, false);
}

// 外部调用方法（可传入标题、内容、是否支持遮罩关闭）
export function showNotice(title, content, maskClosable = true) {
  showNoticeDialog(title, content, maskClosable);
}
