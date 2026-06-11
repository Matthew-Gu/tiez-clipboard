# 阶段 2：Tauri IPC 契约集中化

- 状态：已完成
- 预计工时：2-3 单人工作日
- 实际工时：本次执行约 0.2 小时，不含人工回归
- 开始时间：2026-06-11 11:01:43 +08:00
- 完成时间：实现于 2026-06-11 11:13:05 +08:00 完成；用户于 2026-06-11 确认人工验收通过
- 依赖阶段：阶段 1
- 阻塞项：无

## 目标

- 集中管理前端使用的 Tauri 命令名、事件名、设置键和参数类型。
- 保持现有 Rust 命令、参数、返回数据与事件负载完全不变。

## 执行清单

- [x] 统计重复、高频且容易写错的命令名、事件名和设置键，仅对这些契约建立常量。
- [x] 仅在能够合并重复参数处理或错误处理时建立薄 service，不为每个命令机械创建 service。
- [x] 为高频命令定义请求与返回类型。
- [x] 优先迁移设置、历史分页和窗口导航调用。
- [x] 按业务域逐步替换散落的字符串调用。
- [x] 禁止 service 内引入业务状态或 UI 逻辑。
- [x] 单次使用且参数清晰的 `invoke/listen` 默认保留原位。
- [x] 不新增请求库或其他公共依赖。
- [x] 补充关键 IPC 请求参数的契约测试。
- [x] 执行桌面端人工回归并关闭阶段。

## 兼容要求

- 不修改命令名、参数名、大小写和可选参数行为。
- 不修改事件名与事件 payload。
- 不修改错误字符串处理方式。
- 不在本阶段修改 Rust 业务实现。
- 新增契约模块必须缩短调用链或收敛至少两处真实重复，否则不实施。

## 验证结果

- `npm test`：通过，29 个测试。
- `npx tsc --noEmit`：通过。
- `cargo test`：不适用，阶段二未修改 Rust 源码。
- `git diff --check`：通过。
- IPC 参数对照检查：通过；计划内旧命令字符串已收敛，保留的静态字符串监听仅有 Tauri 内建 `tauri://blur` 与 `tauri://focus`。
- 依赖检查：通过；`package.json` 与锁文件未修改。
- Rust 与配置边界检查：通过；未修改 Rust 源码，用户的 `src-tauri/tauri.conf.json` 改动未纳入阶段提交。
- 轻量化验收：通过；仅新增 `src/shared/ipc/`，没有机械 service、一次性公共工具或新增依赖。
- 人工回归：用户于 2026-06-11 确认验收通过。

### 人工回归清单

- [x] 设置能够加载、保存并响应 `settings-changed`。
- [x] 历史首页、搜索、向前和向后分页行为不变。
- [x] 复制、打开、删除和固定操作不变。
- [x] 标签管理的剪贴板刷新事件不变。
- [x] 主窗口聚焦、快捷键和紧凑预览事件行为不变。

## 相关提交

- `cd244d6` `docs: start ipc contract refactor phase`
- `9b66675` `refactor: add tauri ipc contracts`
- `70f3915` `refactor: migrate settings ipc contracts`
- `ed60b0d` `refactor: migrate clipboard and history ipc contracts`
- `3728543` `refactor: migrate window and event ipc contracts`

## 回滚方式

- 按业务域拆分提交，任一 service 迁移可独立回滚到直接 `invoke/listen`。

## 遗留问题

- 无。
