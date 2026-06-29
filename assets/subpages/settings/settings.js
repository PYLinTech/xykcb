import { translatePage, getI18n, onLanguageChange } from '/assets/init/languages.js';
import { HalfRadioDialog } from '/assets/common/half_radio_dialog.js';
import { Dialog } from '/assets/common/dialog.js';
import { toast, hideToast } from '/assets/common/toast.js';
import { loadFont } from '/assets/init/fonts.js';
import { applyTheme, applyColor } from '/assets/init/themes.js';

const defaults = {
  language: 'zh-cn',
  theme: 'system',
  font: 'DingTalk-JinBuTi',
  color: 'appleGreen',
  showWeekend: 'true',
  showTeacher: 'true',
  showBorder: 'true',
  showLargeSection: 'true',
  autoUpdate: 'false'
};

const i18nKeys = {
  language: { title: 'selectLanguage', options: ['langZhCn', 'langEn'] },
  theme: { title: 'selectTheme', options: ['themeSystem', 'themeLight', 'themeDark'] },
  font: { title: 'selectFont', options: ['fontSystem', 'fontDingTalk', 'fontMiSans', 'fontLXGW', 'fontPFSST', 'fontChildFunSans'] },
  color: { title: 'selectColor', options: ['colorAppleGreen', 'colorVividYellow', 'colorDreamyPurple', 'colorIceBlue', 'colorSheerPink', 'colorDistantCyan', 'colorFreedomOrange'] }
};

const optionValues = {
  language: ['zh-cn', 'en'],
  theme: ['system', 'light', 'dark'],
  font: ['system', 'DingTalk-JinBuTi', 'MiSansVF', 'LXGWWenKaiScreen', 'PingFangSanSheng', 'ChildFunSans'],
  color: ['appleGreen', 'vividYellow', 'dreamyPurple', 'iceBlue', 'sheerPink', 'distantCyan', 'freedomOrange']
};

const switchConfig = ['showWeekend', 'showTeacher', 'showBorder', 'showLargeSection', 'autoUpdate'];

function getConfig() {
  return {
    language: {
      default: defaults.language,
      title: getI18n('settings', i18nKeys.language.title),
      options: optionValues.language.map((v, i) => ({
        value: v,
        label: getI18n('settings', i18nKeys.language.options[i])
      }))
    },
    theme: {
      default: defaults.theme,
      title: getI18n('settings', i18nKeys.theme.title),
      options: optionValues.theme.map((v, i) => ({
        value: v,
        label: getI18n('settings', i18nKeys.theme.options[i])
      }))
    },
    font: {
      default: defaults.font,
      title: getI18n('settings', i18nKeys.font.title),
      options: optionValues.font.map((v, i) => ({
        value: v,
        label: getI18n('settings', i18nKeys.font.options[i])
      }))
    },
    color: {
      default: defaults.color,
      title: getI18n('settings', i18nKeys.color.title),
      options: optionValues.color.map((v, i) => ({
        value: v,
        label: getI18n('settings', i18nKeys.color.options[i])
      }))
    }
  };
}

function getLabel(key, value) {
  const map = {
    language: { 'zh-cn': 'langZhCn', en: 'langEn' },
    theme: { system: 'themeSystem', light: 'themeLight', dark: 'themeDark' },
    font: { system: 'fontSystem', 'DingTalk-JinBuTi': 'fontDingTalk', MiSansVF: 'fontMiSans', 'LXGWWenKaiScreen': 'fontLXGW', PingFangSanSheng: 'fontPFSST', ChildFunSans: 'fontChildFunSans' },
    color: { appleGreen: 'colorAppleGreen', vividYellow: 'colorVividYellow', dreamyPurple: 'colorDreamyPurple', iceBlue: 'colorIceBlue', sheerPink: 'colorSheerPink', distantCyan: 'colorDistantCyan', freedomOrange: 'colorFreedomOrange' }
  };
  return getI18n('settings', map[key][value]);
}

const getSetting = key => localStorage.getItem(`setting_${key}`) ?? defaults[key];
const saveSetting = (key, value) => localStorage.setItem(`setting_${key}`, value);
const idMap = { language: 'lang', theme: 'theme', font: 'font', color: 'color' };

const waitFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
const getAppInfoParts = () => [
  localStorage.getItem('setting_app_version') ? `v${localStorage.getItem('setting_app_version')}` : '',
  localStorage.getItem('setting_app_channel') || '',
  localStorage.getItem('setting_app_platform') || ''
].filter(Boolean);

async function clearUserDataAndExit() {
  toast.loading(getI18n('settings', 'clearingData'));
  await waitFrame();
  localStorage.clear();
  hideToast();
  window.location.href = 'https://www.pylin.cn/';
}

function showAgreementCancelDialog(agreementSwitch) {
  Dialog.show({
    style: '3',
    title: getI18n('settings', 'continueConfirmTitle'),
    content: `<p class="settings-agreement-dialog-content">${getI18n('settings', 'continueConfirmContent')}</p>`,
    buttons: [
      { text: getI18n('settings', 'back') },
      { text: getI18n('settings', 'continue'), type: 'warn' }
    ],
    onClose: (index) => {
      if (index === 1) {
        clearUserDataAndExit();
        return;
      }
      agreementSwitch.checked = true;
    }
  });
}

function canOpenAppSettings() {
  return typeof window.XykcbAndroidSystemUi?.openAppSettings === 'function';
}

function isNativeAppRuntime() {
  return localStorage.getItem('setting_app_type') === 'app';
}

function openAppSettings() {
  if (canOpenAppSettings()) window.XykcbAndroidSystemUi.openAppSettings();
}

export async function load(container) {
  const config = getConfig();
  const response = await fetch('/assets/subpages/settings/settings.html');
  container.innerHTML = await response.text();
  await translatePage('settings', container);

  // APP 版专属设置入口。环境类型由 assets/init/init.js 统一写入。
  const appSettingsSection = container.querySelector('#js_app_settings_section');
  const appSettingsCell = container.querySelector('#js_cell_app_hd, #js_cell_app_bd, #js_cell_app_ft')?.closest('.weui-cell');
  if (isNativeAppRuntime() && appSettingsSection && appSettingsCell) {
    appSettingsSection.style.display = '';
    appSettingsCell.addEventListener('click', openAppSettings);
  }

  Object.keys(config).forEach(key => {
    const id = idMap[key];
    container.querySelector(`#js_cell_${id}_ft`).textContent = getLabel(key, getSetting(key));
  });

  Object.keys(config).forEach(key => {
    const id = idMap[key];
    container.querySelector(`#js_cell_${id}_hd, #js_cell_${id}_bd, #js_cell_${id}_ft`).closest('.weui-cell')
      .addEventListener('click', () => {
        const freshConfig = getConfig();
        HalfRadioDialog.show({
          title: freshConfig[key].title,
          options: freshConfig[key].options,
          selected: getSetting(key),
          onChange: async (value) => {
            saveSetting(key, value);
            container.querySelector(`#js_cell_${id}_ft`).textContent = getLabel(key, value);
            if (key === 'language') await onLanguageChange(value);
            if (key === 'font') await loadFont(value, true);
            if (key === 'theme') await applyTheme(value);
            if (key === 'color') await applyColor(value);
          }
        });
      });
  });

  // 初始化开关状态
  switchConfig.forEach(key => {
    const switchEl = container.querySelector(`#js_switch_${key.replace('show', '').toLowerCase()}`);
    if (switchEl) {
      switchEl.checked = getSetting(key) === 'true';
      switchEl.addEventListener('change', () => {
        saveSetting(key, switchEl.checked.toString());
      });
    }
  });

  // 水印开关
  const watermarkSwitch = container.querySelector('#js_switch_watermark');
  if (watermarkSwitch) {
    watermarkSwitch.checked = (localStorage.getItem('setting_watermarkEnabled') ?? 'true') === 'true';
    watermarkSwitch.addEventListener('change', () => {
      localStorage.setItem('setting_watermarkEnabled', watermarkSwitch.checked.toString());
    });
    const switchBox = watermarkSwitch.closest('.weui-switch-cp');
    if (switchBox) {
      switchBox.addEventListener('click', (e) => {
        e.stopPropagation();
        watermarkSwitch.checked = !watermarkSwitch.checked;
        watermarkSwitch.dispatchEvent(new Event('change'));
      });
    }
  }

  // 水印输入框
  const watermarkInput = container.querySelector('#js_input_watermark');
  if (watermarkInput) {
    watermarkInput.value = localStorage.getItem('setting_watermark') ?? '';
    watermarkInput.addEventListener('blur', () => {
      localStorage.setItem('setting_watermark', watermarkInput.value);
    });
  }

  // 用户协议与隐私政策开关
  const agreementSwitch = container.querySelector('#js_switch_agreement');
  if (agreementSwitch) {
    agreementSwitch.checked = true;
    agreementSwitch.addEventListener('change', () => {
      if (!agreementSwitch.checked) {
        showAgreementCancelDialog(agreementSwitch);
      }
    });
  }

  // 渲染版本信息: v版本 · 渠道 · 平台
  container.querySelector('#js_app_version').textContent = getAppInfoParts().join(' · ');
  const appChannelEl = container.querySelector('#js_app_channel');
  const appPlatformEl = container.querySelector('#js_app_platform');
  if (appChannelEl) appChannelEl.textContent = '';
  if (appPlatformEl) appPlatformEl.textContent = '';
}
