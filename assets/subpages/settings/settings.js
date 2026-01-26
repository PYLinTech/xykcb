import { HalfRadioDialog } from '/assets/common/half_radio_dialog.js';
import { loadFont } from '/assets/init/fonts.js';
import { applyTheme } from '/assets/init/themes.js';

// 配置
const settingsConfig = {
  language: {
    default: 'zh-cn',
    title: '选择语言',
    options: [
      { value: 'zh-cn', label: '简体中文' },
      { value: 'en', label: 'English' }
    ]
  },
  theme: {
    default: 'system',
    title: '选择主题',
    options: [
      { value: 'system', label: '跟随系统' },
      { value: 'light', label: '浅色模式' },
      { value: 'dark', label: '深色模式' }
    ]
  },
  font: {
    default: 'DingTalk-JinBuTi',
    title: '选择字体',
    options: [
      { value: 'system', label: '系统' },
      { value: 'DingTalk-JinBuTi', label: '钉钉进步体' },
      { value: 'MiSansVF', label: 'MiSans' },
      { value: 'LXGWWenKaiScreen', label: '霞鹜文楷' }
    ]
  }
};

// 标签映射
const labelMap = {
  language: { 'zh-cn': '简体中文', en: 'English' },
  theme: { system: '跟随系统', light: '浅色模式', dark: '深色模式' },
  font: { system: '系统', 'DingTalk-JinBuTi': '钉钉进步体', MiSansVF: 'MiSans', 'LXGWWenKaiScreen': '霞鹜文楷' }
};

// 获取/保存设置
const getSetting = key => localStorage.getItem(`setting_${key}`) || settingsConfig[key].default;
const saveSetting = (key, value) => localStorage.setItem(`setting_${key}`, value);

// ID 映射
const idMap = { language: 'lang', theme: 'theme', font: 'font' };

// 设置页
export async function load(container) {
  const response = await fetch('/assets/subpages/settings/settings.html');
  container.innerHTML = await response.text();

  // 初始化显示
  Object.keys(settingsConfig).forEach(key => {
    const id = idMap[key];
    container.querySelector(`#js_cell_${id}_ft`).textContent = labelMap[key][getSetting(key)];
  });

  // 绑定点击事件
  Object.keys(settingsConfig).forEach(key => {
    const id = idMap[key];
    container.querySelector(`#js_cell_${id}_hd, #js_cell_${id}_bd, #js_cell_${id}_ft`).closest('.weui-cell')
      .addEventListener('click', () => {
        const config = settingsConfig[key];
        HalfRadioDialog.show({
          title: config.title,
          options: config.options,
          selected: getSetting(key),
          onChange: (value) => {
            saveSetting(key, value);
            container.querySelector(`#js_cell_${id}_ft`).textContent = labelMap[key][value];
            if (key === 'font') loadFont(value);
            if (key === 'theme') applyTheme(value);
          }
        });
      });
  });
}
