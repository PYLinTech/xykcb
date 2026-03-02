import { showOverlay, hideOverlay } from '/index.js';
import { toast, hideToast } from '/assets/common/toast.js';
import { HalfRadioDialog } from '/assets/common/half_radio_dialog.js';
import { getI18n } from '/assets/init/languages.js';

const COURSE_API = 'https://api.pylin.cn/xykcb/get-course-data';
const SCHOOL_API = 'https://api.pylin.cn/xykcb/get-support-school';
const LOGIN_USER_KEY = 'login_user';
const COURSE_DATA_KEY = 'course_data';
const TIMEOUT_MS = 30000;

let currentSchool = null;

const getSavedUser = () => JSON.parse(localStorage.getItem(LOGIN_USER_KEY) || 'null');
const saveUser = (school, account, password) => {
  localStorage.setItem(LOGIN_USER_KEY, JSON.stringify({ school, account, password }));
};
const saveCourseData = (data) => {
  localStorage.setItem(COURSE_DATA_KEY, JSON.stringify(data));
};

const sortSchoolsById = (schools) =>
  [...schools].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

function showError(cellId, message) {
  const cell = document.getElementById(cellId);
  const tips = document.getElementById('js_login_tips');
  cell.classList.add('weui-cell_warn');
  tips.textContent = message;
  tips.style.display = 'block';
}

function clearError() {
  document.querySelectorAll('.weui-cell_warn').forEach(el => {
    el.classList.remove('weui-cell_warn');
  });
  document.getElementById('js_login_tips').style.display = 'none';
}

function handleInput() {
  clearError();
}

export async function loadLogin() {
  const response = await fetch('/assets/subpages/login/login.html');
  const html = await response.text();
  await showOverlay('login', html);

  const savedUser = getSavedUser();
  if (!currentSchool && savedUser?.school) {
    currentSchool = savedUser.school;
  }
  if (currentSchool) {
    document.getElementById('js_school_text').textContent = getI18n('desc_key', currentSchool);
  }
  if (savedUser) {
    document.getElementById('js_username').value = savedUser.account || '';
    document.getElementById('js_password').value = savedUser.password || '';
  }

  bindEvents();
}

function bindEvents() {
  document.getElementById('js_back_btn').addEventListener('click', hideOverlay);
  document.getElementById('js_school_cell').addEventListener('click', handleSchoolClick);
  document.getElementById('js_login_btn').addEventListener('click', handleLogin);
  document.getElementById('js_username').addEventListener('input', handleInput);
  document.getElementById('js_password').addEventListener('input', handleInput);
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
  const selected = currentSchool;

  const options = sortedData.map(school => ({
    label: getI18n('desc_key', school.desc_key),
    value: school.desc_key
  }));

  HalfRadioDialog.show({
    title: getI18n('login', 'selectSchool'),
    options,
    selected,
    onChange: (value) => {
      if (value) {
        currentSchool = value;
        document.getElementById('js_school_text').textContent = getI18n('desc_key', value);
        clearError();
      }
    }
  });
}

async function handleLogin() {
  const account = document.getElementById('js_username').value.trim();
  const password = document.getElementById('js_password').value;

  clearError();

  if (!currentSchool) {
    showError('js_school_cell', getI18n('login', 'errorSchoolRequired'));
    return;
  }
  if (!account) {
    showError('js_username_cell', getI18n('login', 'errorAccountRequired'));
    return;
  }
  if (!password) {
    showError('js_password_cell', getI18n('login', 'errorPasswordRequired'));
    return;
  }

  toast.loading(getI18n('login', 'toastLoginLoading'));

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(`${COURSE_API}?school=${currentSchool}&account=${encodeURIComponent(account)}&password=${encodeURIComponent(password)}`, {
      signal: controller.signal
    });
    clearTimeout(timeout);

    const result = await res.json();

    if (!result.success || !result.data) {
      const descKey = result.desc_key || '006';
      toast.warn(getI18n('desc_key', descKey));
      return;
    }

    saveCourseData(result.data);
    saveUser(currentSchool, account, password);
    toast.success(getI18n('login', 'loginSuccess'));
    hideOverlay();

  } catch (error) {
    toast.warn(getI18n('desc_key', '006'));
  }
}
