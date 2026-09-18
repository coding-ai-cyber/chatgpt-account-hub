# ChatGPT 账号管家品牌与发布资产设计

## 目标

将应用从面向开发者的 “Codex Switcher” 可见品牌调整为更直观的 “ChatGPT 账号管家 · ChatGPT Account Hub”，并将项目相关的在线文档、问题反馈和更新地址切换到用户自己的 GitHub 仓库：

`https://github.com/coding-ai-cyber/codex_switch`

同时重绘桌面应用图标，使 EXE、安装包、任务栏、托盘和设置页面保持一致，并延续当前浅色蓝紫渐变主题。

## 设计决策

### 1. 可见名称与兼容边界

- 中文显示名：`ChatGPT 账号管家`
- 英文副标题：`ChatGPT Account Hub`
- 应用窗口、托盘、侧栏、欢迎页、帮助页、设置页和 README 使用新的可见名称。
- Tauri/Rust 内部 crate 名、默认运行目标、localStorage 键、配置目录和事件名保留旧标识，避免升级后丢失已有账户与偏好数据。
- Tauri `productName`、窗口标题和安装包展示名称切换到新品牌；内部二进制/模块标识保持兼容，除非打包工具要求显示名同步。

### 2. GitHub 链接治理

新增集中式项目链接常量，至少包含：

- `PROJECT_REPO_URL`: 仓库主页
- `PROJECT_DOCS_URL`: 仓库 README/在线文档
- `PROJECT_ISSUES_URL`: 问题反馈
- `PROJECT_RELEASES_URL`: 最新发布页
- `PROJECT_UPDATE_MANIFEST_URL`: Tauri updater 的 `latest.json`

帮助页的在线文档和问题反馈按钮、更新检查使用的 updater endpoint、README 中的仓库/发布/克隆链接全部从上述地址派生或保持同源。README 中介绍 OpenAI Codex 的外部产品链接继续保留，不视作本项目链接。

### 3. 图标系统

以 `src-tauri/icons/logo.svg` 为矢量母版，采用 1024×1024 方形构图：

- 圆角浅蓝紫渐变底板，呼应默认主题。
- 白色聊天气泡轮廓中嵌入字母 `C`，表达 ChatGPT 使用场景与账户中心属性。
- 中心使用简洁星光/节点点缀，避免缩小后细节糊成一团。
- 不放小尺寸难以辨识的长文本，不复制 OpenAI 标志。

从 SVG 生成并替换 Tauri 所需 PNG、ICO、ICNS 和托盘资源，保留透明边缘和多尺寸清晰度。图标文件命名沿用现有 Tauri 配置路径，避免额外改动打包配置。

## 组件与数据流

1. `src/lib/links.ts` 提供项目链接常量。
2. `HelpPage` 读取文档/问题反馈链接。
3. `tauri.conf.json` updater endpoint 指向用户仓库的最新 manifest。
4. 品牌常量或翻译键提供中英文可见名称，React 页面、Tray 菜单和 Tauri 平台配置读取同一套文案。
5. SVG 母版经图标生成工具产生桌面和托盘资源，不改变账户数据或后端 IPC。

## 错误处理与兼容性

- 外部链接打开失败沿用现有系统浏览器错误处理。
- 更新检查失败沿用现有提示，不新增网络请求路径。
- 旧 localStorage 键和 `.codex-switcher` 配置目录不迁移、不删除。
- 图标生成失败时保留旧图标文件，只有全套资源生成并通过尺寸检查后才替换。

## 验收标准

- `rg` 检查后，在线文档、问题反馈、更新 endpoint、README 项目链接不再指向原项目。
- 可见 UI 不再显示 “Codex Switcher” 作为产品名；Codex 作为被管理的外部产品名称可在功能描述中保留。
- 旧配置、账户、主题和语言偏好仍可加载。
- `logo.svg`、PNG、ICO、ICNS、托盘图标均可被 Tauri 配置引用，透明边缘无明显锯齿。
- Node 单元测试、Playwright UI 测试、`pnpm build`、`cargo check` 通过。
- 重新生成 Windows EXE、MSI、NSIS；签名配置缺失时记录为发布环境事项，不影响未签名 EXE 的本地预览。
