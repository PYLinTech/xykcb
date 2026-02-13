import { showOverlay, hideOverlay } from '/index.js';
import { HalfRadioDialog } from '/assets/common/half_radio_dialog.js';

const welcomeVersion = 260209;

export function initWelcome() {
  const localWelcomeVersion = localStorage.getItem('localWelcomeVersion');
  if (!localWelcomeVersion || Number(localWelcomeVersion) < welcomeVersion) {
    loadWelcome();
  }
}

async function loadWelcome() {
  const response = await fetch('/assets/subpages/welcome/welcome.html');
  const html = await response.text();
  await showOverlay('welcome', html);
  bindEvents();
}

function bindEvents() {
  document.getElementById('js_agree_btn').addEventListener('click', agree);
  document.getElementById('js_disagree_btn').addEventListener('click', disagree);
  document.getElementById('js_lang_btn').addEventListener('click', showLanguageSelector);
}

function agree() {
  localStorage.setItem('localWelcomeVersion', welcomeVersion);
  hideOverlay();
}

function disagree() {
  console.log('xykcb:exit');
  window.location.href = 'https://www.pylin.cn';
}

function showLanguageSelector() {
  const currentLang = localStorage.getItem('setting_language') || 'zh-cn';
  HalfRadioDialog.show({
    title: '选择语言',
    options: [
      { label: '简体中文', value: 'zh-cn' },
      { label: 'English', value: 'en' }
    ],
    selected: currentLang,
    onChange: async (value) => {
      localStorage.setItem('setting_language', value);
      const { onLanguageChange } = await import('/assets/init/languages.js');
      await onLanguageChange(value);
      loadWelcome();
    }
  });
}
