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
