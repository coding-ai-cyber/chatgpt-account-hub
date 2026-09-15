# Force-close Flow Localization Design

## Goal

将 Codex 进程关闭/强制关闭流程中的所有用户可见提示接入现有中英文翻译体系，并完成正式 Windows 构建与核心功能验收。

## Scope

本次工作包含四个连续阶段：

1. 修复 `useForceCloseCodexProcesses` 中的英文硬编码提示。
2. 生成并验证正式 Windows 构建产物。
3. 手动验收语言切换、账户管理、用量、托盘和 Codex 关闭/重开流程。
4. 清理本轮产生的诊断/计划文件，保留用户已有改动并整理 Git 提交。

不改变账户存储格式、OAuth 流程、后端 API 协议或现有关闭策略。

## Approaches Considered

### Recommended: Pure message formatter

新增一个纯函数模块，将关闭结果映射为翻译键、插值参数和错误标记。Hook 负责执行后端操作，App 负责提供 `t`，消息模块只负责决定应该显示哪条翻译。

优点：分支逻辑可独立测试；中英文完整句子由字典负责；避免在 Hook 中拼接英文片段。代价是新增一个小模块和一组翻译键。

### Inline translation inside the hook

让 Hook 直接接收 `t`，在每个分支内调用翻译键。

优点是改动文件少。缺点是异步流程、状态判断和文案选择耦合在一起，分支覆盖测试更困难。

### Structured result rendered by App

Hook 只返回结构化关闭结果，由 App 统一渲染提示。

边界最清晰，但会扩大现有 Hook 与 App 的接口改动，超出本次文案修复的必要范围。

## Architecture

新增 `src/lib/forceCloseMessages.ts`，导出纯函数 `getForceCloseMessage`。函数接收关闭结果状态、关闭前进程数、关闭后剩余进程数和关闭方式，返回：

```ts
{
  key: TranslationKey;
  params?: TranslationParams;
  isError: boolean;
}
```

`useForceCloseCodexProcesses` 新增 `t: Translate` 参数，调用 `getForceCloseMessage` 后通过既有 `showToast(t(key, params), isError)` 显示提示。所有完整句子放入 `src/lib/i18n.tsx` 的英文和中文字典，中文句子不依赖英文复数或片段拼接。

覆盖以下结果：无法确认关闭、没有目标进程、全部关闭、部分关闭、关闭未生效以及后端调用异常。

## Testing

新增 `tests/forceCloseMessages.test.ts`，直接测试纯函数的每个结果分支，确认返回正确的翻译键、数量参数和错误标记。测试先以当前缺失实现的状态运行，确认红灯，再写最小实现使其变绿。

保留并运行现有前端测试、生产构建和 Rust 测试。语言字典测试继续验证中英文键集合一致，并新增检查确保强制关闭消息模块使用翻译键而非英文硬编码。

## Release and Acceptance

使用 `pnpm tauri:win build` 生成正式 Windows 产物，从 `src-tauri/target/release/bundle/` 识别安装包或 EXE，并启动实际发布产物验证。开发版依赖 Vite 服务，不作为正式交付验证依据。

手动验收清单：

- 默认中文显示；切换英文后主界面、设置、托盘菜单同步变化。
- 重启后语言选择保持不变。
- 添加、切换、重命名、删除账户流程可用。
- 用量刷新、预热、导入/导出流程可用。
- 托盘打开主窗口、退出和显示模式可用。
- Codex 正常关闭、强制关闭、切换后重开以及失败提示均显示正确语言。
- 更新器界面至少能正确显示检查、可用更新、重启和错误状态。

## Data and Safety Boundaries

账户配置和 OAuth 数据只通过现有应用流程读写。验收导入/导出时使用临时测试文件；不删除用户账户数据。清理阶段只处理本轮创建的诊断产物和计划文件，WebView2 备份保留到用户确认后再处理。

## Success Criteria

- 强制关闭流程不再包含用户可见的英文硬编码提示。
- 新增回归测试覆盖全部消息分支，并与现有测试一起通过。
- 正式 Windows 构建成功，发布产物可启动。
- 手动验收清单全部完成，或明确记录外部依赖导致的项目外阻塞项。
- Git 工作区中只保留明确的源代码、测试、文档和用户已有改动。
