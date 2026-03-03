# 小雨课程表 (Xiaoyu Schedule)

Copyright 2026 重庆沛雨霖科技有限公司 (PYLinTech)
Contact: PYLinTech@163.com


## 项目简介

小雨课程表，给移动端一个最佳的使用体验。

## 技术依赖

本项目使用了以下开源库：

| 库 | 描述 | 链接 |
|---|---|---|
| **WeUI** | 微信原生设计规范组件库 | [https://github.com/Tencent/weui](https://github.com/Tencent/weui) |
| **RemixIcon** | 开源图标库 | [https://github.com/Remix-Design/RemixIcon](https://github.com/Remix-Design/RemixIcon) |

## 项目结构

```
xykcb/
├── index.html           # 主页面（入口）
├── index.js             # 页面路由/切换逻辑
├── index.css            # 全局样式
├── assets/
│   ├── common/
│   │   └── half_radio_dialog.js    # 半屏单选弹窗组件
│   ├── init/
│   │   ├── init.js                 # 初始化入口
│   │   ├── fonts.js                # 字体加载（钉钉进步体/MiSans/霞鹜文楷）
│   │   ├── themes.js               # 主题管理（浅色/深色/跟随系统）
│   │   └── languages.js            # 国际化配置
│   └── subpages/
│       ├── login/                  # 登录页面（待开发）
│       ├── mine/mine.html/js       # 我的页面
│       ├── schedule/schedule.html/js # 课程页面
│       ├── settings/settings.html/js # 设置页面（语言/主题/字体）
│       └── welcome/                # 欢迎页面（待开发）
└── libraries/
    ├── fonts/          # 字体文件（.ttf）
    ├── remixicon/      # 图标字体
    └── weui/           # WeUI CSS 组件库
```

### 功能概览

| 模块 | 功能 |
|------|------|
| **路由** | 底部 Tabbar 切换（课程/我的/设置），动态加载 |
| **主题** | 浅色/深色/跟随系统，使用 WeUI 变量 |
| **字体** | 4种字体可选：系统/钉钉进步体/MiSans/霞鹜文楷 |
| **弹窗** | 半屏单选对话框，动画效果 |
| **设置** | 语言切换、主题切换、字体切换（持久化到 localStorage） |

### 技术栈

- **UI 框架**：WeUI（微信小程序风格）
- **图标**：RemixIcon
- **模块化**：ES6 Module
- **持久化**：localStorage

## 许可证

本项目采用 Apache License 2.0 许可证开源。
详细内容请参阅 [LICENSE](LICENSE) 文件。

第三方开源库的许可证信息请参阅 [NOTICE](NOTICE) 文件。

---

## 组件详解

### 1. 初始化模块 (`/assets/init/`)

初始化模块负责应用启动时的核心配置，在 `init.js` 中按顺序调用以下初始化函数：

#### 1.1 字体加载 (`fonts.js`)
- **功能**：动态加载自定义字体，支持本地字体文件异步加载
- **支持的字体**：
  - `DingTalk-JinBuTi`（钉钉进步体）
  - `MiSansVF`（MiSans）
  - `LXGWWenKaiScreen`（霞鹜文楷）
  - `PingFangSanSheng`（平方三生体）
  - `ChildFunSans`（游趣体）
- **加载优化**：
  - 页面首次加载不显示 loading toast
  - 用户手动切换字体时显示 loading toast
  - App 环境下不显示 loading toast（更流畅体验）
- **API**：
  - `loadFont(fontName, showToast?)` - 加载指定字体，showToast 控制是否显示加载提示
  - `initFont()` - 从 localStorage 读取上次保存的字体设置并加载（无提示）

#### 1.2 App UA 解析 (`init.js`)
- **功能**：检测 WebView 环境并解析 App 信息
- **UA 格式**：`xykcb_app/260303 (Platform/Android; Channel/Xiaomi;)`
- **解析内容**：
  - 版本号 (version)：如 `260303`
  - 平台 (platform)：如 `Android`、`iOS`
  - 渠道 (channel)：如 `Xiaomi`、`AppStore`
- **存储键名**：
  - `setting_is_app` - 是否为 App 环境 (`true`/`false`)
  - `setting_app_version` - App 版本号
  - `setting_app_platform` - App 平台
  - `setting_app_channel` - App 渠道

#### 1.3 主题管理 (`themes.js`)
- **功能**：管理系统主题（浅色/深色/跟随系统）和品牌颜色
- **主题模式**：`system`（跟随系统）、`light`（浅色）、`dark`（深色）
- **品牌颜色**：7种颜色可选（苹果绿、活力黄、梦幻紫、冰晶蓝、薄纱粉、远山青、自由橙）
- **API**：
  - `applyTheme(theme)` - 应用主题模式
  - `applyColor(color)` - 应用品牌颜色
  - `initTheme()` - 初始化主题和颜色
  - `initColor()` - 初始化颜色

#### 1.4 国际化 (`languages.js`)
- **功能**：支持多语言切换，动态加载语言包
- **支持语言**：`zh-cn`（简体中文）、`en`（English）
- **语言包结构**：JSON 格式，按页面模块划分（如 `index`、`schedule`、`settings` 等）
- **API**：
  - `initLanguage(lang?)` - 初始化语言，优先使用指定语言或 localStorage 保存的语言
  - `translatePage(value, container)` - 翻译指定容器的元素
  - `getI18n(value, key)` - 获取翻译文本
  - `onLanguageChange(value)` - 语言切换回调

#### 1.5 欢迎页 (`/assets/subpages/welcome/welcome.js`)
- **功能**：首次使用时显示欢迎页/用户协议，支持版本控制和语言选择
- **流程**：检查 localStorage 中的版本号，首次访问或版本更新时显示欢迎页

### 2. 通用组件 (`/assets/common/`)

#### 2.1 半屏单选弹窗 (`half_radio_dialog.js`)
- **功能**：从屏幕底部滑出的单选对话框
- **特性**：
  - 使用 WeUI 半屏对话框样式
  - 平滑滑入滑出动画（300ms）
  - 点击遮罩或关闭按钮关闭
  - 支持默认选中项
- **API**：`HalfRadioDialog.show({ title, options, selected, onChange })`

#### 2.2 标准对话框 (`dialog.js`)
- **功能**：居中显示的模态对话框
- **样式变体**：
  - `style: '1'` - 有标题，按钮纵向排列
  - `style: '2'` - 无标题，按钮纵向排列
  - `style: '3'` - 有标题，按钮横向排列
- **API**：`Dialog.show({ style, title, content, buttons, allowMaskClose, onClose })`

#### 2.3 Toast 提示 (`toast.js`)
- **功能**：轻量级反馈提示
- **类型**：`success`（成功）、`warn`（警告）、`loading`（加载中）、`text`（纯文本）
- **特性**：自动消失（除 loading），支持自定义时长
- **API**：
  - `showToast(type, message, duration)`
  - `toast.success(msg, duration)` / `toast.warn(msg, duration)` / `toast.loading(msg)` / `toast.text(msg, duration)`

#### 2.4 日期选择器 (`calendar_picker.js`)
- **功能**：从底部滑出的日历选择器
- **特性**：
  - 月份切换（支持跨年）
  - 今日快捷按钮
  - 高亮显示今天和选中日期
  - 支持禁用遮罩关闭
- **API**：`CalendarPicker.show({ initialDate, onChange, onClose, allowMaskClose })`

#### 2.5 课程数据解析器 (`course_parser.js`)
- **功能**：解析和管理课程数据
- **加载模式**：`local`（本地存储）、`online`（在线加载）、`merge`（合并加载）
- **API**：
  - `loadCourse(url, mode)` - 加载课程数据
  - `getAvailableSemesters()` - 获取所有可用学期
  - `getSemesterConfig(semesterId)` - 获取学期配置
  - `getCourses(semesterId)` - 获取学期课程
  - `getCoursesByWeek(semesterId, week)` - 获取指定周课程
  - `getCoursesByDate(semesterId, dateStr)` - 获取指定日期课程
  - `getWeekDates(semesterId, week)` - 获取周次日期
  - `getCurrentSemesterAndWeek()` - 获取当前学期和周次
  - `searchCourses(semesterId, keyword)` - 搜索课程
  - `formatWeeks(weeks)` - 格式化周次数组

### 3. 子页面模块 (`/assets/subpages/`)

#### 3.1 课程页面 (`schedule/`)
- **功能**：展示课程表，支持三种视图
- **视图模式**：
  - `dayView` - 日视图：按日期展示单日课程
  - `weekView` - 周视图：按周展示课程网格
  - `semesterView` - 学期视图：按课程卡片展示
- **功能特性**：
  - 学期/周次选择
  - 课程详情弹窗
  - 周末/教师/边框显示设置
  - 刷新重新加载
- **数据源**：从 JSON 文件加载课程数据

#### 3.2 设置页面 (`settings/`)
- **功能**：应用设置管理
- **设置项**：
  - 语言切换（中文/英文）
  - 主题切换（跟随系统/浅色/深色）
  - 字体切换（系统/钉钉进步体/MiSans/霞鹜文楷/平方三生体）
  - 品牌颜色选择（7种颜色：苹果绿、活力黄、梦幻紫、冰晶蓝、薄纱粉、远山青、自由橙）
  - 周末显示开关
  - 教师显示开关
  - 边框显示开关
- **持久化**：所有设置保存到 localStorage

#### 3.3 我的页面 (`mine/`)
- **功能**：用户个人信息入口
- **特性**：登录后展示用户信息（待开发）

#### 3.4 登录页面 (`login/`)
- **功能**：用户登录认证（待开发）

---

## 启动流程链

### 完整启动流程

```
用户打开 index.html
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  1. 浏览器解析 HTML                                          │
│     - 加载 WeUI CSS                                         │
│     - 加载 RemixIcon 图标字体                                │
│     - 加载 index.css 全局样式                                │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  2. 执行 init.js（初始化入口模块）                            │
│     ├─ UA 解析       → 检测 App 环境并解析版本/平台/渠道    │
│     ├─ initFont()    → 加载保存的字体（按需显示 toast）     │
│     ├─ initTheme()   → 应用保存的主题和颜色                 │
│     ├─ initLanguage()→ 加载保存的语言包                     │
│     └─ initWelcome() → 检查并显示欢迎页                      │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  3. 执行 index.js（路由/页面切换）                            │
│     - 等待 DOMContentLoaded                                 │
│     - 首次加载 schedule 页面（默认）                          │
│     - 绑定底部导航栏点击事件                                 │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  4. 欢迎页流程（首次访问或版本更新）                          │
│     - fetch welcome.html                                    │
│     - 显示协议内容 overlay                                   │
│     - 用户选择语言/同意协议后                                │
│     - 保存版本号到 localStorage                             │
│     - 隐藏 overlay                                          │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  5. 课程页面加载流程                                         │
│     - fetch schedule.html                                   │
│     - translatePage() 翻译页面                               │
│     - loadCourse() 加载课程数据 JSON                         │
│     - getCurrentSemesterAndWeek() 获取当前学期和周次          │
│     - renderSchedule() 渲染课程视图                         │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
    用户可见课程页面
```

### 页面切换流程

```
用户点击底部导航栏
    │
    ▼
switchPage(pageName)
    │
    ├─ 更新 current 状态
    ├─ updateTabbar() 更新底部导航高亮
    ├─ render() 加载页面
    │   ├─ 从缓存获取或动态 import(pageLoader)
    │   ├─ 清空 page-container
    │   └─ 调用页面 load(container) 方法
    │
    ▼
    新页面渲染完成
```

### 各页面详细加载流程

#### 课程页面 (schedule)

```
schedule.js → load(container)
    │
    ├─ fetch(schedule.html) 获取HTML
    │
    ├─ translatePage('schedule', container) 翻译页面
    │
    ├─ 检查登录状态 (getSavedUser)
    │   ├─ 已登录 → loadCourse('merge') 加载课程数据
    │   │   └─ 从 API 获取或从 localStorage 读取
    │   └─ 未登录 → 显示登录提示
    │
    ├─ 获取当前学期和周次 (getCurrentSemesterAndWeek)
    │
    ├─ updateCurrentSemester() 更新学期显示
    ├─ updateContentView() 更新视图显示 (日/周/学期)
    ├─ updateCurrentWeek() 更新周次显示
    │
    ├─ renderSchedule(container) 渲染课程
    │   ├─ 日视图 → renderDayView()
    │   ├─ 周视图 → renderWeekView()
    │   └─ 学期视图 → renderSemesterView()
    │
    └─ 绑定点击事件 (事件委托)
        ├─ 学期选择器 → HalfRadioDialog
        ├─ 周次选择器 → HalfRadioDialog
        ├─ 视图选择器 → HalfRadioDialog
        └─ 刷新按钮 → refreshCourseData()
```

#### 设置页面 (settings)

```
settings.js → load(container)
    │
    ├─ fetch(settings.html) 获取HTML
    │
    ├─ translatePage('settings', container) 翻译页面
    │
    ├─ 初始化设置项显示
    │   ├─ 语言设置 (language)
    │   ├─ 主题设置 (theme: system/light/dark)
    │   ├─ 字体设置 (font)
    │   ├─ 颜色设置 (color)
    │   ├─ 周末显示 (showWeekend)
    │   ├─ 教师显示 (showTeacher)
    │   └─ 边框显示 (showBorder)
    │
    └─ 绑定点击事件
        └─ 点击设置项 → HalfRadioDialog.show() 或 开关切换
```

#### 我的页面 (mine)

```
mine.js → load(container)
    │
    ├─ fetch(mine.html) 获取HTML
    │
    ├─ translatePage('mine', container) 翻译页面
    │
    ├─ updateLoginState() 更新登录状态显示
    │   ├─ 已登录 → 显示账号和学校
    │   └─ 未登录 → 显示"未登录"提示
    │
    ├─ loadFunctions(container) 加载功能列表
    │   └─ fetch(API) → 获取学校支持的功能
    │
    └─ 绑定点击事件
        └─ 去登录/重新登录按钮 → loadLogin()
```

### Overlay 弹层加载机制

```
showOverlay(pageName, html)
    │
    ├─ overlay.innerHTML = html
    │
    ├─ 查找并加载外部脚本
    │   └─ script[src] → 创建新 script 标签添加到 head
    │
    ├─ 如果有 pageName
    │   └─ translatePage(pageName, overlay) 翻译页面
    │
    └─ overlay.classList.add('show') 显示弹层

hideOverlay()
    └─ overlay.classList.remove('show') 隐藏弹层
```

### 登录流程

```
loadLogin() 加载登录页
    │
    ├─ fetch(login.html) 获取HTML
    │
    ├─ showOverlay('login', html) 显示登录弹层
    │
    ├─ 检查已保存用户 → 填充账号密码
    │
    └─ 绑定表单事件

用户点击登录 → handleLogin()
    │
    ├─ 验证输入 (学校/账号/密码)
    │
    ├─ fetchCourseData(school, account, password)
    │   └─ POST → API: https://api.pylin.cn/xykcb/get-course-data
    │
    ├─ saveCourseData(result) → localStorage
    ├─ saveUser() → localStorage
    │
    ├─ hideOverlay() 关闭登录页
    │
    └─ window.dispatchEvent('login-success')
        └─ 各页面监听并刷新数据
```

### 事件通信机制

```javascript
// 登录成功时派发事件
window.dispatchEvent(new CustomEvent('login-success'));

// 页面监听事件刷新数据
window.addEventListener('login-success', async () => {
    const loaded = await loadCourse('merge');
    // 更新页面...
});
```

### 数据存储

| 键名 | 用途 |
|------|------|
| `login_user` | 当前登录用户信息 |
| `course_data` | 课程数据缓存 |
| `setting_language` | 语言设置 |
| `setting_theme` | 主题设置 |
| `setting_font` | 字体设置 |
| `setting_color` | 颜色设置 |
| `setting_showWeekend` | 显示周末 |
| `setting_showTeacher` | 显示教师 |
| `setting_showBorder` | 显示边框 |
| `localWelcomeVersion` | 欢迎页版本 |
| `setting_is_app` | 是否为 App 环境 |
| `setting_app_version` | App 版本号 |
| `setting_app_platform` | App 平台 (Android/iOS) |
| `setting_app_channel` | App 渠道 |
| `setting_user_agent` | 浏览器 User-Agent |

### 设置变更流程

```
用户在设置页点击设置项
    │
    ▼
HalfRadioDialog.show() 显示选择弹窗
    │
    ▼
用户选择新值
    │
    ├─ 保存到 localStorage
    ├─ 更新页面显示
    └─ 执行变更回调
        ├─ 语言 → onLanguageChange() → 重新加载语言包 → refreshSubpage()
        ├─ 字体 → loadFont() → 应用新字体
        ├─ 主题 → applyTheme() → 修改 body data-weui-theme
        └─ 颜色 → applyColor() → 修改 CSS 变量
```

---

## 数据流

### 课程数据流

```
课程 JSON 文件
    │
    ▼
loadCourse(url, mode) → course_parser.js
    │
    ├─ local 模式：从 localStorage 读取
    ├─ online 模式：从 URL fetch
    └─ merge 模式：合并 local + online
    │
    ▼
存储到 courseData 全局变量
    │
    ▼
各 API 方法提供查询
(getCourses, getCoursesByWeek, getCoursesByDate...)
    │
    ▼
schedule.js 调用渲染函数
(renderDayView, renderWeekView, renderSemesterView)
```

### 语言数据流

```
语言 JSON 文件 (zh-cn.json / en.json)
    │
    ▼
initLanguage() / onLanguageChange()
    │
    ▼
存储到 langData 全局变量
    │
    ▼
translatePage(value, container)
    │
    ├─ 查找所有 [data-i18n] 元素
    ├─ 从 langData[value][key] 获取翻译
    └─ 更新元素文本/占位符
```
