# 阶段 0-1：基线与缺陷隔离

- 状态：阶段 0-1 已完成，人工验收通过
- 预计工时：2.5-4 单人工作日
- 实际工时：阶段 1 本次执行约 0.5 小时，不含人工回归
- 开始时间：阶段 1 于 2026-06-11 10:04:50 +08:00 开始
- 完成时间：阶段 0-1 于 2026-06-11 完成
- 依赖阶段：无
- 阻塞项：无

## 目标

- 固化重构前可观察行为和自动化基线。
- 将现有业务缺陷与结构重构分离，避免后续无法判断回归来源。

## 执行清单

- [x] 记录主窗口、标签、设置、高级设置、紧凑预览窗口的人工回归清单。
- [x] 为设置运行时映射和敏感标签判断补充特征测试。
- [x] 验证并修复粘贴音效设置错误写入 `delete_after_paste` 状态。
- [x] 确认 `password` 属于后端加密敏感标签。
- [x] 统一前后端内置敏感标签行为。
- [x] 重新运行全部自动化基线检查并记录结果。
- [x] 执行桌面端人工回归清单。
- [x] 人工回归通过后将阶段 1 标记为已完成。

## 已知缺陷候选

1. Rust 设置命令处理 `app.sound_paste_enabled` 时疑似更新了 `delete_after_paste` 状态。
2. 前端将 `password` 视为敏感标签，但后端加密标签仅包含 `sensitive` 和 `密码`。

## 验证结果

- 实施前基线：
  - `npm test`：通过，22 个测试。
  - `npx tsc --noEmit`：通过。
  - `cargo test`：通过，68 个 Rust 测试。
- 实施后自动化门禁：
  - `npm test`：通过，26 个测试。
  - `npx tsc --noEmit`：通过。
  - `cargo test`：通过，72 个 Rust 测试。
  - `cargo fmt --check`：通过。
  - `git diff --check`：通过。
- 人工行为回归：用户于 2026-06-11 确认阶段一已验收。

### 人工回归清单

- [x] 主窗口、标签管理、设置、高级设置和紧凑预览可正常进入与返回。
- [x] 切换粘贴音效后，“粘贴后自动删除”设置值和运行行为不变化。
- [x] `password` 标签条目显示敏感模糊和显示按钮。
- [x] `password` 标签不能在标签管理中重命名或删除。
- [x] 新建或重新编辑为 `password` 标签的条目按敏感条目加密处理。
- [x] `sensitive` 和 `密码` 原有行为保持不变。

## 修改范围

- 从设置运行时映射中移除 `app.sound_paste_enabled -> delete_after_paste` 错误更新；设置持久化路径保持不变。
- 新增可测试的设置运行时映射辅助逻辑及 Rust 单测。
- 前后端内置敏感标签统一为 `sensitive`、`密码`、`password`，判断均不区分大小写。
- 默认标签初始化使用 `INSERT OR IGNORE` 加入 `password`。
- 前端使用统一敏感标签常量和判断函数，覆盖首页内置标签、条目模糊、敏感标识和标签保护。
- 未引入 Zustand、React Router、Less 或其他新依赖。

## 相关提交

- `3ea0b28` `fix: correct paste sound setting state mapping`
- `af0ed56` `fix: align sensitive tag behavior`
- `1b601b6` `docs: update refactor progress and lightweight principles`

## 回滚方式

- 测试提交可独立保留。
- 每个缺陷使用独立提交，通过 `git revert <commit>` 单独回滚。

## 遗留问题

- 既有 `password` 标签历史数据未重新对齐；未重置 `db.sensitive_alignment_done`，未新增后台扫描或对齐版本。
