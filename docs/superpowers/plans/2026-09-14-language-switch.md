# 中英文切换 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 为 Codex Switcher 增加中文和英文切换，默认中文，并让主窗口、托盘窗口及应用自定义菜单共享持久化语言设置。

**Architecture:** 在 Rust 的 AppSettings 中保存 language，通过 Tauri/Web 命令读写；前端用轻量翻译字典和 LanguageProvider 为两个 React 入口提供 t() 与语言状态。语言保存成功后触发 app-settings-changed，主窗口、托盘弹窗和原生自定义菜单刷新。

**Tech Stack:** React 19, TypeScript 5.8, Vite 7, Tauri 2, Rust 2021, Node built-in test runner, Cargo tests.

## Global Constraints

- 首次启动及没有 language 字段的旧配置默认使用 zh-CN。
- 支持的语言值只有 zh-CN 和 en；读取其他值时回退到 zh-CN。
- 使用项目内置翻译字典，不引入第三方国际化依赖。
- 翻译覆盖主窗口、设置弹窗、账户卡片、添加账户、导入导出、用量统计、Warm-up、错误提示、更新提示、托盘弹窗和应用自定义托盘菜单。
- 不改动账户凭据、OAuth、用量接口、Warm-up 业务和账户切换逻辑。
- 操作系统提供的原生编辑菜单继续使用系统语言。
- 每个任务按测试先行、实现、验证、提交的顺序执行。

## File Map

- 新增 src/lib/language.ts：语言类型、默认值、规范化和 locale 映射。
- 新增 src/lib/i18n.tsx：翻译字典、参数插值、React provider 和 hook。
- 新增 tests/language.test.ts：前端语言域测试。
- 修改 src/main.tsx、src/tray-main.tsx：给两个 React 入口挂载 provider。
- 修改 src/App.tsx、src/TrayMenu.tsx 及 src/components/*.tsx：接入 t()，替换可见文本。
- 修改 src/lib/platform.ts：接入语言相关的用户可见错误和本地化辅助。
- 修改 src-tauri/src/types.rs：持久化 AppSettings.language。
- 新增 src-tauri/src/i18n.rs：原生菜单文本字典。
- 修改 src-tauri/src/commands/window.rs、src-tauri/src/web.rs、src-tauri/src/lib.rs：提供 Tauri/Web 语言命令。
- 修改 src-tauri/src/app_menu.rs、src-tauri/src/tray.rs：使用当前语言构建原生菜单。
- 新增及修改测试，不改变账户和业务接口的测试数据契约。

## Task 1: 建立前端语言域和翻译 provider

**Files**

- Create src/lib/language.ts
- Create src/lib/i18n.tsx
- Create tests/language.test.ts

- [ ] 先写测试，覆盖默认值、合法值、非法值回退、locale 映射，以及中英文 key 集合一致。

测试必须验证以下接口：

- Language 只能是 zh-CN 或 en。
- DEFAULT_LANGUAGE 等于 zh-CN。
- parseLanguage(undefined)、parseLanguage(null)、parseLanguage('') 和未知字符串返回 zh-CN。
- parseLanguage('zh-CN') 与 parseLanguage('en') 返回对应值。
- languageLocale('zh-CN') 返回 zh-CN，languageLocale('en') 返回 en-US。
- translations.zh-CN 与 translations.en 的 key 集合完全一致。

运行：
~~~text
node --experimental-strip-types --test tests/language.test.ts
~~~
预期：在实现缺失时测试失败，并指出待创建的语言模块。

- [ ] 创建 src/lib/language.ts，提供以下精确接口：

~~~ts
export type Language = 'zh-CN' | 'en';
export const DEFAULT_LANGUAGE: Language = 'zh-CN';
export const LANGUAGE_STORAGE_KEY = 'codex-switcher-language';
export function parseLanguage(value: string | null | undefined): Language;
export function languageLocale(language: Language): 'zh-CN' | 'en-US';
~~~

parseLanguage 只接受两个支持值，其余输入回退到 DEFAULT_LANGUAGE。

- [ ] 创建 src/lib/i18n.tsx，提供以下接口：

~~~ts
export type TranslationParams = Record<string, string | number>;
export type Translate = (key: TranslationKey, params?: TranslationParams) => string;
export function LanguageProvider(props: { children: React.ReactNode }): JSX.Element;
export function useLanguage(): {
  language: Language;
  setLanguage: (language: Language) => Promise<void>;
  t: Translate;
};
~~~

实现要求：

- English 字典作为完整 key 来源，Chinese 字典必须使用相同的 TranslationKey 集合。
- 支持 {name}、{count}、{message}、{reset}、{warmed}、{failed} 和 {date} 形式的插值。
- provider 初始使用 localStorage 中的值，没有值时使用 zh-CN。
- Tauri 环境挂载时调用 get_language；调用失败时保留当前值。
- setLanguage 先调用 set_language，再更新 React 状态和 localStorage；调用失败时保留旧语言并将错误抛出给设置弹窗处理。
- 在 Tauri 环境监听 app-settings-changed，收到事件后重新读取 get_language。
- 对未命中的 key 回退到 English 文本，避免界面显示空白。
- 字典覆盖 File/Edit/View 等自定义菜单之外的所有 React 可见文本；原生菜单由 Task 5 处理。

- [ ] 重新运行前端语言测试，预期退出码为 0。
- [ ] 提交：
~~~text
git add tests/language.test.ts src/lib/language.ts src/lib/i18n.tsx
git commit -m "feat: add frontend language domain"
~~~

## Task 2: 在 Rust 中持久化语言并暴露命令

**Files**

- Modify src-tauri/src/types.rs
- Modify src-tauri/src/commands/window.rs
- Modify src-tauri/src/web.rs
- Modify src-tauri/src/lib.rs

- [ ] 先在 src-tauri/src/types.rs 写 Rust 单元测试，覆盖 AppLanguage 的默认值、非法值回退和双向字符串映射。

必须验证：

- AppLanguage::default() 是 ZhCn。
- AppLanguage::parse('zh-CN')、AppLanguage::parse('en') 成功。
- AppLanguage::parse('invalid') 返回 None。
- AppLanguage::from_setting('invalid') 回退到 ZhCn。
- as_str() 对两个枚举值分别返回 zh-CN 和 en。

运行：
~~~powershell
cmd.exe /d /s /c 'call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 && set "PATH=C:\Users\Administrator\.cargo\bin;%PATH%" && cargo test --manifest-path src-tauri/Cargo.toml language_tests'
~~~
预期：实现前测试失败或找不到新增测试，随后由实现使其通过。

- [ ] 在 types.rs 增加 AppLanguage 枚举及方法：

~~~rust
pub enum AppLanguage { ZhCn, En }
impl AppLanguage {
    pub fn parse(value: &str) -> Option<Self>;
    pub fn from_setting(value: &str) -> Self;
    pub fn as_str(self) -> &'static str;
}
~~~

为 AppLanguage 实现 Default，默认 ZhCn。给 AppSettings 增加 language: String，并为 serde 提供默认函数，使旧 settings.json 缺失该字段时得到 zh-CN；AppSettings::default() 也必须写入 zh-CN。

- [ ] 在 window.rs 增加：

~~~rust
#[tauri::command]
pub fn get_language() -> String;
pub fn persist_language(language: &str) -> Result<AppLanguage, String>;
#[tauri::command]
pub fn set_language(app: AppHandle, language: String) -> Result<(), String>;
~~~

get_language 读取 settings.json 并将非法存量值规范化为 zh-CN。persist_language 校验支持值、更新 AppSettings.language 并保存。set_language 调用 persist_language，随后刷新 app_menu 和 tray，使原生菜单与托盘同步。

- [ ] 在 lib.rs 注册 get_language 和 set_language Tauri commands。
- [ ] 在 web.rs 增加 LanguageArgs { language: String }，并在 /api/invoke 的命令匹配中加入：

~~~rust
'get_language' => 返回 commands::get_language()；
'set_language' => 解析 LanguageArgs，调用 commands::window::persist_language()，返回空 JSON；
~~~

Web 路径不能依赖 AppHandle；Tauri 路径负责菜单刷新，Web 路径由前端 provider 在下次读取时同步。

- [ ] 运行 focused Rust 测试和完整 Rust 测试：

~~~powershell
cmd.exe /d /s /c 'call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 && set "PATH=C:\Users\Administrator\.cargo\bin;%PATH%" && cargo test --manifest-path src-tauri/Cargo.toml language_tests'
cmd.exe /d /s /c 'call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 && set "PATH=C:\Users\Administrator\.cargo\bin;%PATH%" && cargo test --manifest-path src-tauri/Cargo.toml'
~~~
预期：两条命令均退出码为 0。

- [ ] 提交：
~~~text
git add src-tauri/src/types.rs src-tauri/src/commands/window.rs src-tauri/src/web.rs src-tauri/src/lib.rs
git commit -m "feat: persist application language"
~~~

## Task 3: 接入两个 React 入口和设置弹窗

**Files**

- Modify src/main.tsx
- Modify src/tray-main.tsx
- Modify src/components/SettingsModal.tsx

- [ ] 在两个入口用 LanguageProvider 包裹现有 StrictMode 内容，确保主窗口和托盘窗口各自拥有独立但共享后端设置的 provider。
- [ ] 在 SettingsModal 中使用 useLanguage()，添加“语言 / Language”选择框，选项为中文和 English，默认值由 provider 提供。
- [ ] 语言切换时禁用选择框，等待 setLanguage 完成；成功后立即刷新当前窗口；失败时保留旧值并显示现有错误区域的翻译文本。
- [ ] 设置弹窗自身的标题、按钮、显示模式标签和错误提示同时改用 t()，保证用户在切换语言后整个弹窗一致。
- [ ] 运行：
~~~text
pnpm build
~~~
预期：TypeScript/Vite 构建退出码为 0。
- [ ] 提交：
~~~text
git add src/main.tsx src/tray-main.tsx src/components/SettingsModal.tsx
git commit -m "feat: add language selector to settings"
~~~

## Task 4: 本地化 React 主界面、托盘弹窗和错误提示

**Files**

- Modify src/App.tsx
- Modify src/TrayMenu.tsx
- Modify src/components/AccountCard.tsx
- Modify src/components/AccountUsageStats.tsx
- Modify src/components/AddAccountModal.tsx
- Modify src/components/ResetCreditsMenu.tsx
- Modify src/components/UpdateChecker.tsx
- Modify src/components/UsageBar.tsx
- Modify src/lib/platform.ts

- [ ] 先用 rg 建立完整可见文本清单，逐项迁移，不触碰命令名、事件名、localStorage key、账户字段和 API 返回值。

~~~text
rg -n '>[A-Za-z]|title="|aria-label="|placeholder="|"[A-Z][A-Za-z ]+"' src/App.tsx src/TrayMenu.tsx src/components src/lib/platform.ts
~~~

- [ ] 在 App.tsx 中接入 useLanguage()，替换导航、账户状态、按钮、菜单、模态框、空状态、确认文本、toast、Warm-up 状态、更新提示和 aria-label/title。动态文本使用 t(key, params)，账户名称、错误消息和计数作为参数传入。
- [ ] 在 AccountCard、AccountUsageStats、AddAccountModal、UpdateChecker、UsageBar 和 SettingsModal 中接入同一 t()，保留纯计算、回调签名和现有业务状态。
- [ ] 在 ResetCreditsMenu 中保留 resetCredits.ts 的纯函数和数据筛选；“No expiry”“Expiry unavailable”、单个/多个 reset 等只在渲染层翻译，不把翻译后的文本写入业务数据。
- [ ] 在 TrayMenu 中翻译 Loading、No accounts configured、Session、Weekly、Reset、today、last 7 days、Dock、Show、Menu Bar、Open Codex Switcher、Quit 等文本，并使用 languageLocale(language) 传给 Intl.DateTimeFormat。
- [ ] 在 platform.ts 中仅翻译用户可见的文件选择、导入导出和调用失败错误；底层 command/event 名称保持原样。
- [ ] 运行前端现有测试、语言测试和构建：

~~~text
node --experimental-strip-types --test tests/language.test.ts tests/desktopReopen.test.ts tests/codexClosePreference.test.ts tests/resetCredits.test.ts
pnpm build
~~~

预期：测试和构建均退出码为 0，且无 TypeScript 类型错误。
- [ ] 提交：
~~~text
git add src/App.tsx src/TrayMenu.tsx src/components src/lib/platform.ts
git commit -m "feat: localize React interface"
~~~

## Task 5: 本地化原生托盘和应用自定义菜单

**Files**

- Create src-tauri/src/i18n.rs
- Modify src-tauri/src/lib.rs
- Modify src-tauri/src/app_menu.rs
- Modify src-tauri/src/tray.rs

- [ ] 先在 i18n.rs 写测试，至少验证 menu_text(AppLanguage::ZhCn, MenuTextKey::Tray) 为托盘中文标题、menu_text(AppLanguage::En, MenuTextKey::Tray) 为英文标题，并验证 Quit 在两种语言都有对应文本。
- [ ] 创建 MenuTextKey 枚举和 menu_text(language, key) 函数，集中维护以下自定义菜单文案：Tray、IconAndSession、HourlyAndWeekly、Hidden、DockIcon、ShowInDock、MenuBarOnly、ReopenCodexAfterForceClose、Settings、Window、Help、File、Edit、View、NoAccountsConfigured、OpenCodexSwitcher、Quit。
- [ ] 在 lib.rs 注册 i18n 模块。
- [ ] 在 app_menu.rs::refresh 中读取并规范化 AppSettings.language，所有自定义 Submenu、CheckMenuItem 和 MenuItem 使用 menu_text；PredefinedMenuItem 的系统编辑命令继续使用 Tauri 系统文本。
- [ ] 在 tray.rs 中对 No accounts configured、Open Codex Switcher、Quit 以及 Dock 相关自定义菜单使用 menu_text；账户名称、统计数字和动态日期继续使用数据值。
- [ ] 运行完整 Rust 测试和前端构建：

~~~powershell
cmd.exe /d /s /c 'call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 && set "PATH=C:\Users\Administrator\.cargo\bin;%PATH%" && cargo test --manifest-path src-tauri/Cargo.toml'
~~~
~~~text
pnpm build
~~~

预期：全部退出码为 0。
- [ ] 提交：
~~~text
git add src-tauri/src/i18n.rs src-tauri/src/lib.rs src-tauri/src/app_menu.rs src-tauri/src/tray.rs
git commit -m "feat: localize native menus"
~~~

## Task 6: 集成验收和回归验证

**Files**

- No source changes expected; only verification and, if a test exposes an integration defect, a focused fix in the owning task.

- [ ] 检查工作树、最近提交和 diff，确认没有凭据、auth.json、账户数据或构建产物被纳入提交。
- [ ] 运行完整前端验证：

~~~text
node --experimental-strip-types --test tests/*.test.ts
pnpm build
~~~

- [ ] 在 Visual Studio 开发环境中运行完整 Rust 验证：

~~~powershell
cmd.exe /d /s /c 'call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 && set "PATH=C:\Users\Administrator\.cargo\bin;%PATH%" && cargo test --manifest-path src-tauri/Cargo.toml'
~~~

- [ ] 用现有 Tauri 开发命令做手工验收：

~~~text
pnpm tauri:win dev
~~~

验收顺序：

1. 首次打开设置弹窗，语言值显示为中文。
2. 选择 English，确认设置弹窗、主窗口按钮/状态/提示、托盘弹窗和自定义原生菜单变为英文。
3. 选择中文，确认所有上述界面恢复中文。
4. 重启应用，确认最后选择的语言保持不变。
5. 检查旧 settings.json 缺失 language 字段时，应用仍以中文启动，并且保存一次设置后写入 zh-CN。
6. 检查账户切换、OAuth 添加、用量刷新、Warm-up、reset credits 和托盘刷新行为与改动前一致。

- [ ] 最终确认测试命令均为退出码 0，工作树只包含预期文档或源代码变更，并在交付消息中链接设计文档和实现计划。

