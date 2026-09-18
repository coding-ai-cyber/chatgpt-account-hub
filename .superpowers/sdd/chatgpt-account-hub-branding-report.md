# ChatGPT 账号管家品牌发布验证报告

日期：2026-09-16
分支：`codex/default-theme-dashboard-polish`

## 实施提交

- `d609d3c` — 将项目链接切换至 `https://github.com/coding-ai-cyber/codex_switch`
- `de9ea02..c244fd2` — 完成可见品牌改名为“ChatGPT 账号管家 · ChatGPT Account Hub”
- `aeeeaee` — 生成并接入新的应用、安装包、任务栏及托盘图标
- `3809485` — 将 WiX 安装包语言固定为 `zh-CN`，并更新 5 张受品牌文字影响的 Windows UI 截图基线

内部 crate、可执行文件名、配置目录及兼容性测试继续保留 `codex-switcher`/`Codex Switcher` 标识，符合已确认的升级兼容边界。

## 自动化验证

| 命令 | 结果 |
| --- | --- |
| `node --experimental-strip-types --test tests/*.test.ts` | 通过，64/64 |
| `pnpm test:ui` | 通过，37/37 |
| `pnpm build` | 通过，TypeScript 成功；Vite 转换 91 个模块 |
| `pnpm test:dashboard` | 通过，15/15 |
| `pnpm test:theme` | 通过，3/3，13 套皮肤仍受支持 |
| `cargo check --manifest-path src-tauri/Cargo.toml` | 通过；仅有 6 条既有 unused/dead-code 警告 |

Playwright 首次运行时，5 张批准截图各出现约 0.01% 的像素差异。逐图检查确认差异只位于侧栏品牌文字由 `Codex S...` 变更为 `ChatGPT ...` 的区域；更新这 5 张基线后，使用原命令复跑 37/37 通过。

## 旧地址与旧可见名称扫描

执行：

```powershell
rg -n "github\.com/Lampese/codex-switcher|Codex Switcher" src src-tauri README.md package.json public
```

- 旧仓库 URL：0 处。
- 保留的 `Codex Switcher`：3 处，均为内部兼容标识，不是可见产品品牌：
  - `src-tauri/src/types.rs:1` — Rust 核心类型模块注释。
  - `src-tauri/src/lib.rs:1` — Rust crate 模块注释。
  - `src-tauri/src/commands/process.rs:1111` — Windows 旧快捷方式名排除逻辑的测试输入。

## Windows 打包

正式执行 `pnpm tauri:win build`。品牌中文名与 WiX 默认 `en-US` 代码页不兼容，初次 WiX `light.exe` 无法生成 MSI；使用 `zh-CN` 诊断配置验证成功后，在 `src-tauri/tauri.conf.json` 持久化：

```json
"wix": {
  "language": "zh-CN"
}
```

随后正式完整构建成功生成 EXE、中文 MSI 和 NSIS。由于配置了 updater 公钥但环境中没有 `TAURI_SIGNING_PRIVATE_KEY`，命令在所有 bundle 生成完成后按预期以退出码 1 停在 updater 签名阶段。

构建还报告既有警告：二进制中未找到 `__TAURI_BUNDLE_TYPE`，因此 updater 插件可能无法区分 MSI/NSIS 包类型。该提示不影响本次三个未签名本地产物的生成与启动验证，但发布前应升级/对齐 Tauri crate 与 CLI 后复核 updater 流程。

## 发布产物

| 产物 | 大小（字节） | SHA-256 |
| --- | ---: | --- |
| `D:\项目\Codex Switcher\.worktrees\default-theme-dashboard-polish\src-tauri\target\release\codex-switcher.exe` | 24,871,424 | `6E9CB1787FAB57E897C0DFD05256CE71DC2CA94C6D8E44DDB860F8F58ACE1FEE` |
| `D:\项目\Codex Switcher\.worktrees\default-theme-dashboard-polish\src-tauri\target\release\bundle\msi\ChatGPT 账号管家_0.2.18_x64_zh-CN.msi` | 228,663,296 | `3BBB89F31ECFCD2EC06B9983D08B6BD5F41EAC517498C116AAA2DAFC3C5E655B` |
| `D:\项目\Codex Switcher\.worktrees\default-theme-dashboard-polish\src-tauri\target\release\bundle\nsis\ChatGPT 账号管家_0.2.18_x64-setup.exe` | 228,282,523 | `DCCE39DE4E3904ED2A5514D5EE0BE163D15D51CE255501025F6CCE99677664E6` |

EXE 文件名保留内部兼容名；安装包展示名称及运行窗口均使用新品牌。

## EXE 启动验证

- 进程 ID：`12968`
- 窗口标题：`ChatGPT 账号管家`
- 主窗口句柄：`30870424`
- 响应状态：`True`
- 可执行路径与上表 EXE 一致

程序已保持运行，便于直接查看新品牌与图标效果。

## 发布前事项

1. 配置 `TAURI_SIGNING_PRIVATE_KEY` 后重新运行正式打包，生成 updater 签名文件。
2. 处理并复核 `__TAURI_BUNDLE_TYPE` 警告，验证自动更新能够正确识别 MSI/NSIS 包类型。
