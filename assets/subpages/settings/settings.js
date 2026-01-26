import { HalfRadioDialog } from '/assets/common/half_radio_dialog.js';

// 默认配置
const defaultSettings = {
  language: 'zh-cn',
  theme: 'system',
  font: 'DingTalk-JinBuTi'
};

// 映射配置
const configMap = {
  language: {
    'zh-cn': '简体中文',
    en: 'English'
  },
  theme: {
    system: '跟随系统',
    light: '浅色模式',
    dark: '深色模式'
  },
  font: {
    'DingTalk-JinBuTi': '钉钉进步体'
  }
};

// 获取设置
function getSetting(key) {
  return localStorage.getItem(`setting_${key}`) || defaultSettings[key];
}

// 保存设置
function saveSetting(key, value) {
  localStorage.setItem(`setting_${key}`, value);
}

// 设置页
export async function load(container) {
  const response = await fetch('/assets/subpages/settings/settings.html');
  const html = await response.text();
  container.innerHTML = html;

  // 初始化显示
  container.querySelector('#js_cell_lang_ft').textContent = configMap.language[getSetting('language')];
  container.querySelector('#js_cell_theme_ft').textContent = configMap.theme[getSetting('theme')];
  container.querySelector('#js_cell_font_ft').textContent = configMap.font[getSetting('font')];

  // 语言选项
  container.querySelector('#js_cell_lang_hd, #js_cell_lang_bd, #js_cell_lang_ft').closest('.weui-cell')
    .addEventListener('click', () => {
      HalfRadioDialog.show({
        title: '选择语言',
        options: [
          { value: 'zh-cn', label: '简体中文' },
          { value: 'en', label: 'English' }
        ],
        selected: getSetting('language'),
        onChange: (value) => {
          saveSetting('language', value);
          container.querySelector('#js_cell_lang_ft').textContent = configMap.language[value];
        }
      });
    });

  // 主题选项
  container.querySelector('#js_cell_theme_hd, #js_cell_theme_bd, #js_cell_theme_ft').closest('.weui-cell')
    .addEventListener('click', () => {
      HalfRadioDialog.show({
        title: '选择主题',
        options: [
          { value: 'system', label: '跟随系统' },
          { value: 'light', label: '浅色模式' },
          { value: 'dark', label: '深色模式' }
        ],
        selected: getSetting('theme'),
        onChange: (value) => {
          saveSetting('theme', value);
          container.querySelector('#js_cell_theme_ft').textContent = configMap.theme[value];
        }
      });
    });

  // 字体选项
  container.querySelector('#js_cell_font_hd, #js_cell_font_bd, #js_cell_font_ft').closest('.weui-cell')
    .addEventListener('click', () => {
      HalfRadioDialog.show({
        title: '选择字体',
        options: [
          { value: 'DingTalk-JinBuTi', label: '钉钉进步体' }
        ],
        selected: getSetting('font'),
        onChange: (value) => {
          saveSetting('font', value);
          container.querySelector('#js_cell_font_ft').textContent = configMap.font[value];
        }
      });
    });
}
