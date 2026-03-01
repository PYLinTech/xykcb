import { showOverlay, hideOverlay } from '/index.js';
import { toast, hideToast } from '/assets/common/toast.js';
import { HalfRadioDialog } from '/assets/common/half_radio_dialog.js';
import { getI18n } from '/assets/init/languages.js';

const SCHOOL_API = 'https://api.pylin.cn/xykcb/get-support-school';
const SCHOOL_DATA_KEY = 'login_school_data';

const getSavedSchool = () => JSON.parse(localStorage.getItem(SCHOOL_DATA_KEY) || 'null');
const saveSchool = (school) => localStorage.setItem(SCHOOL_DATA_KEY, JSON.stringify(school));

const getSchoolLabel = (school) => getI18n('desc_key', school.desc_key);

const sortSchoolsById = (schools) =>
  [...schools].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

export async function loadLogin() {
  const response = await fetch('/assets/subpages/login/login.html');
  const html = await response.text();
  await showOverlay('login', html);

  const savedSchool = getSavedSchool();
  if (savedSchool) {
    document.getElementById('js_school_text').textContent = getSchoolLabel(savedSchool);
  }

  bindEvents();
}

function bindEvents() {
  document.getElementById('js_back_btn').addEventListener('click', hideOverlay);
  document.getElementById('js_school').addEventListener('click', handleSchoolClick);
}

async function handleSchoolClick() {
  toast.loading(getI18n('common', 'toastLoading'));

  const res = await fetch(SCHOOL_API);
  const data = await res.json();

  hideToast();

  if (data.success && data.data) {
    showSchoolDialog(data.data);
  } else {
    toast.warn(getI18n('login', 'toastLoadSchoolError'));
  }
}

function showSchoolDialog(schools) {
  const sortedData = sortSchoolsById(schools);
  const savedSchool = getSavedSchool();
  const selected = savedSchool?.desc_key ?? null;

  const options = sortedData.map(school => ({
    label: getSchoolLabel(school),
    value: school.desc_key
  }));

  HalfRadioDialog.show({
    title: getI18n('login', 'selectSchool'),
    options,
    selected,
    onChange: (value) => {
      const school = sortedData.find(s => s.desc_key === value);
      if (school) {
        saveSchool(school);
        document.getElementById('js_school_text').textContent = getSchoolLabel(school);
      }
    }
  });
}
