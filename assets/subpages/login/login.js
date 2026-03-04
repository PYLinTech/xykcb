import { showOverlay, hideOverlay } from '/index.js';
import { toast, hideToast } from '/assets/common/toast.js';
import { HalfRadioDialog } from '/assets/common/half_radio_dialog.js';
import { getI18n } from '/assets/init/languages.js';
import { API, fetchWithTimeout } from '/assets/common/api.js';

const LOGIN_USER_KEY = 'login_user';
const COURSE_DATA_KEY = 'course_data';

let currentSchool = null;

export const getSavedUser = () => JSON.parse(localStorage.getItem(LOGIN_USER_KEY) || 'null');
const saveUser = (school, account, password, isLoggedIn = true) => {
  localStorage.setItem(LOGIN_USER_KEY, JSON.stringify({ school, account, password, isLoggedIn }));
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
  const localStorageSchool = savedUser?.school;
  if (!currentSchool && localStorageSchool) {
    currentSchool = localStorageSchool;
  }
  if (currentSchool) {
    document.getElementById('js_school_text').textContent = getI18n('desc_key', currentSchool);
  }
  if (currentSchool === localStorageSchool && savedUser) {
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
  document.getElementById('js_toggle_password').addEventListener('click', togglePasswordVisibility);
}

function togglePasswordVisibility() {
  const passwordInput = document.getElementById('js_password');
  const toggleIcon = document.getElementById('js_toggle_password');
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    toggleIcon.classList.remove('ri-eye-off-line');
    toggleIcon.classList.add('ri-eye-line');
  } else {
    passwordInput.type = 'password';
    toggleIcon.classList.remove('ri-eye-line');
    toggleIcon.classList.add('ri-eye-off-line');
  }
}

async function handleSchoolClick() {
  toast.loading(getI18n('common', 'toastLoading'));

  const res = await fetchWithTimeout(API.getSupportSchool);
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

  const result = await fetchCourseData(currentSchool, account, password);
  if (result) {
    saveCourseData(result);
    saveUser(currentSchool, account, password);
    hideOverlay();
    // 登录成功后刷新课程页面
    window.dispatchEvent(new CustomEvent('login-success'));
  }
}

async function fetchCourseData(school, account, password, loadingKey = 'toastLoginLoading', successKey = 'loginSuccess') {
  toast.loading(getI18n('login', loadingKey));

  try {
    const res = await fetchWithTimeout(`${API.getCourseData}?school=${school}&account=${encodeURIComponent(account)}&password=${encodeURIComponent(password)}`);

    const result = await res.json();

    if (!result.success || !result.data) {
      const descKey = result.desc_key || '006';
      toast.warn(getI18n('desc_key', descKey));
      return null;
    }

    toast.success(getI18n('login', successKey));
    return result.data;

  } catch (error) {
    toast.warn(getI18n('desc_key', '006'));
    return null;
  }
}

export async function refreshCourseData() {
  const savedUser = getSavedUser();
  if (!savedUser?.school || !savedUser?.account || !savedUser?.password) {
    toast.warn(getI18n('login', 'errorAccountRequired'));
    return;
  }

  const result = await fetchCourseData(savedUser.school, savedUser.account, savedUser.password, 'toastRefreshLoading', 'refreshSuccess');
  if (result) {
    saveCourseData(result);
  }
}
