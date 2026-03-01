import { showOverlay, hideOverlay } from '/index.js';
import { toast, hideToast } from '/assets/common/toast.js';
import { HalfRadioDialog } from '/assets/common/half_radio_dialog.js';
import { getI18n } from '/assets/init/languages.js';

const SCHOOL_API = 'https://api.pylin.cn/xykcb/get-support-school';
let currentSchoolId = null;

export async function loadLogin() {
  const response = await fetch('/assets/subpages/login/login.html');
  const html = await response.text();
  await showOverlay('login', html);

  document.getElementById('js_back_btn').addEventListener('click', hideOverlay);

  // 绑定学校选择点击事件
  document.getElementById('js_school').addEventListener('click', handleSchoolClick);
}

async function handleSchoolClick() {
  toast.loading(getI18n('common', 'toastLoading'));

  try {
    const res = await fetch(SCHOOL_API);
    const data = await res.json();

    hideToast();

    if (data.success && data.data) {
      const language = localStorage.getItem('setting_language') || 'zh-cn';
      const nameKey = language === 'en' ? 'name_en' : 'name_zhcn';

      // 按 id 升序排列
      const sortedData = [...data.data].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

      const options = sortedData.map(school => ({
        label: school[nameKey],
        value: school.id
      }));

      HalfRadioDialog.show({
        title: getI18n('login', 'selectSchool'),
        options: options,
        selected: currentSchoolId,
        onChange: (value) => {
          currentSchoolId = value;
          const selected = sortedData.find(s => s.id === value);
          if (selected) {
            document.getElementById('js_school_text').textContent = selected[nameKey];
          }
        }
      });
    }
  } catch (error) {
    hideToast();
    toast.warn(getI18n('login', 'toastLoadSchoolError'));
  }
}
