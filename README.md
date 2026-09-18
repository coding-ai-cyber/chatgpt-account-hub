<p align="center">
  <img src="src-tauri/icons/logo.svg" alt="ChatGPT 账号管家" width="128" height="128">
</p>

<h1 align="center">ChatGPT 账号管家</h1>

<p align="center">
  一款用于管理多个 ChatGPT 账号的桌面应用<br>
  支持账号切换、用量监控、定时保活与系统托盘操作
</p>

<div align="center">

[加入社区](https://discord.gg/4QzyJTC3S)

</div>

## 功能

- **多账号管理**：添加、重命名、隐藏账号标识，导入、导出和管理多个账号。
- **快速切换**：从主窗口、系统托盘菜单或托盘弹窗快速切换当前账号。
- **用量统计**：查看账号的生命周期用量、每日用量、近期活动、连续使用情况和常用集成。
- **额度监控**：查看当前 5 小时周期、周周期、剩余额度、重置时间、余额和订阅到期时间。
- **手动重置额度**：显示可用的手动重置额度和最近到期时间，并在临近到期时提醒。
- **自动保活**：手动、按周期或按指定时间向账号发送最小请求，保持用量周期活跃。
- **系统托盘**：在托盘中切换账号、查看额度、刷新数据、打开主窗口或退出应用。
- **托盘显示模式**：支持图标加百分比、纯文字百分比和隐藏托盘图标。
- **窗口显示设置**：在 macOS 上选择保留 Dock 图标或仅使用菜单栏模式。
- **切换恢复**：检测正在运行的相关桌面进程，在切换受阻时提供恢复操作。
- **两种登录方式**：支持浏览器授权登录，也支持导入已有登录凭据文件。

## 安装

### 下载发行版

前往 [GitHub 最新发行版](https://github.com/coding-ai-cyber/chatgpt-account-hub/releases/latest)
下载 Windows 安装程序：

- **Windows x64**：`ChatGPT 账号管家_*_x64-setup.exe`

这是已经打包好的 Windows 安装程序，安装后即可直接运行，不需要另外安装
Node.js、pnpm、Rust 或 Python 等开发环境。安装程序会自动处理应用运行所需的
Windows WebView2 组件。

### 从源码构建

如果你只是使用软件，不需要准备开发环境。只有从源码构建时才需要：

- [Node.js](https://nodejs.org/) 18 或更高版本
- [pnpm](https://pnpm.io/)
- [Rust](https://rustup.rs/)

```bash
git clone https://github.com/coding-ai-cyber/chatgpt-account-hub.git
cd chatgpt-account-hub
pnpm install
pnpm tauri dev
pnpm tauri build
```

Windows PowerShell 或命令提示符中请使用：

```bash
pnpm tauri:win dev
pnpm tauri:win build
```

构建完成后，安装包位于 `src-tauri/target/release/bundle/`。

## 使用说明

### 账号切换

在主窗口添加账号后，可从账号列表选择当前账号。切换前应用会保存当前账号的最新登录状态，
并在检测到相关桌面进程运行时提示先关闭进程，以减少切换失败和登录状态过期的情况。

### 用量与额度

账号卡片会显示 5 小时周期和周周期的额度信息。OAuth 账号还可以展开用量统计面板，
查看今日、近 7 天、近 30 天、连续使用、最长任务、令牌活动和常用集成等数据。

### 自动保活

- **手动保活**：为单个账号或全部账号立即发送一次最小请求。
- **周期保活**：在额度周期重置后自动执行，周额度耗尽时自动跳过。
- **定时保活**：设置每天的执行时间，例如 `08:00`、`13:00` 和 `18:00`。

定时任务每 30 秒检查一次，每个设置时间每天只执行一次。设备睡眠期间错过的时间点不会在
恢复后补执行，避免账号在非预期时间产生请求。

## 自动更新

应用启动时会检查 GitHub 最新发行版。发现新的签名更新包后，应用会显示更新提示，
并支持直接在应用内完成更新。

## 版本发布

使用版本脚本同步更新应用版本号：

```bash
# 指定版本
pnpm version:bump 0.2.1

# 按语义化版本递增
pnpm version:patch
pnpm version:minor
pnpm version:major

# 创建发布提交和标签
pnpm release patch

# 创建并推送发布
pnpm release patch -- --push
pnpm release patch -- --push --note "修复账号切换问题"
```

## 免责声明

本项目用于帮助用户管理自己拥有或合法使用的多个账号。请妥善保管登录凭据，
遵守相关服务的使用条款，不要共享账号或凭据。

使用本软件产生的账号、凭据、请求和数据由使用者自行负责。

## 反馈与贡献

- [提交问题](https://github.com/coding-ai-cyber/chatgpt-account-hub/issues)
- [查看源代码](https://github.com/coding-ai-cyber/chatgpt-account-hub)
- [参与讨论](https://github.com/coding-ai-cyber/chatgpt-account-hub/discussions)
