import { translatePage, getI18n, onLanguageChange } from '/assets/init/languages.js';
import { HalfRadioDialog } from '/assets/common/half_radio_dialog.js';
import { loadFont } from '/assets/init/fonts.js';
import { applyTheme } from '/assets/init/themes.js';

const defaults = {
  language: 'zh-cn',
  theme: 'system',
  font: 'DingTalk-JinBuTi'
};

const i18nKeys = {
  language: { title: 'selectLanguage', options: ['langZhCn', 'langEn'] },
  theme: { title: 'selectTheme', options: ['themeSystem', 'themeLight', 'themeDark'] },
  font: { title: 'selectFont', options: ['fontSystem', 'fontDingTalk', 'fontMiSans', 'fontLXGW'] }
};

const optionValues = {
  language: ['zh-cn', 'en'],
  theme: ['system', 'light', 'dark'],
  font: ['system', 'DingTalk-JinBuTi', 'MiSansVF', 'LXGWWenKaiScreen']
};

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
    }
  };
}

function getLabel(key, value) {
  const map = {
    language: { 'zh-cn': 'langZhCn', en: 'langEn' },
    theme: { system: 'themeSystem', light: 'themeLight', dark: 'themeDark' },
    font: { system: 'fontSystem', 'DingTalk-JinBuTi': 'fontDingTalk', MiSansVF: 'fontMiSans', 'LXGWWenKaiScreen': 'fontLXGW' }
  };
  return getI18n('settings', map[key][value]);
}

const getSetting = key => localStorage.getItem(`setting_${key}`) ?? defaults[key];
const saveSetting = (key, value) => localStorage.setItem(`setting_${key}`, value);
const idMap = { language: 'lang', theme: 'theme', font: 'font' };

export async function load(container) {
  const config = getConfig();
  const response = await fetch('/assets/subpages/settings/settings.html');
  container.innerHTML = await response.text();
  await translatePage('settings', container);

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
            if (key === 'font') await loadFont(value);
            if (key === 'theme') await applyTheme(value);
          }
        });
      });
  });
}
