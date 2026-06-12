# 阶段 6：跨组件 UI 状态迁移

- 状态：实现完成，待人工验收
- 预计工时：3-5 单人工作日
- 实际工时：本次执行约 0.1 小时，不含人工回归
- 开始时间：2026-06-12 09:30:55 +08:00
- 完成时间：实现于 2026-06-12 09:35:51 +08:00 完成
- 依赖阶段：阶段 5
- 阻塞项：无

## 目标

- 将跨组件 UI 状态迁移到 `useUiStore`。
- 简化 `App.tsx` 编排和组件 props，同时保持列表和快捷键行为不变。
- 迁移前构建体积：主 JS 778.61 kB，gzip 240.77 kB。

## 执行顺序

- [x] 迁移搜索、输入法组合状态和类型筛选。
- [x] 迁移列表选择与键盘模式。
- [x] 迁移标签编辑和敏感内容显示状态。
- [x] 迁移设置折叠状态。
- [x] 使用细粒度 selector，避免订阅完整 Store。
- [x] 收窄 AppHeader、AppMainContent 和剪贴板渲染器 props。
- [x] 保留历史、分页、详情缓存和加载状态在现有 hooks。
- [x] 保留单组件状态和只使用一次的交互状态在原组件。
- [x] 删除已迁移的 `useAppState` 字段和中间 setter 透传。

## 验收场景

- 搜索、标签搜索、类型筛选和输入法组合行为不变。
- 上下键选择、Enter 粘贴、Escape 行为不变。
- 标签添加、删除、建议和编辑取消行为不变。
- 敏感内容显示与隐藏行为不变。
- 组件只订阅所需状态。
- Store 仅包含确实跨组件共享的状态，迁移后 props 透传和中间 setter 数量减少。

## 验证结果

- Store 测试：通过；覆盖搜索、组合输入、筛选、列表选择、键盘模式、标签编辑、敏感内容显示、设置折叠、函数式更新、selector 和 reset 新容器。
- `npm test`：通过，48 个测试。
- `npx tsc --noEmit`：通过。
- `npm run build`：通过。
- `git diff --check`：通过。
- 迁移后构建体积：主 JS 778.58 kB，gzip 240.85 kB；相较迁移前主 JS 减少 0.03 kB，gzip 增加 0.08 kB。
- 状态边界检查：通过；生产代码已接入 `useUiStore`，`AppState` 不再包含已迁移字段，不存在无 selector 的整 Store 订阅。
- 保留边界检查：通过；首页列表快照、历史分页、加载状态和独立高级设置窗口未迁移到 UI Store。
- 无效状态清理：完成；删除未使用的 `winClipboardDisabled`、`showHotkeyHint` 及被忽略的 bootstrap 入参。
- Rust、样式与依赖检查：通过；未修改 Rust、样式或依赖。
- 主窗口人工回归：待执行。
- 轻量化验收：通过；未为局部状态增加 Store 字段或额外抽象，组件使用原子 selector。

## 相关提交

- `docs: start ui state migration`
- `refactor: migrate search ui state to zustand`
- `refactor: migrate list selection ui state to zustand`
- `refactor: migrate tag and settings ui state to zustand`
- `refactor: complete ui state migration`

## 回滚方式

- 每个状态域独立迁移。
- 若出现交互回归，仅回滚对应状态域提交。

## 遗留问题

- 桌面端人工验收尚未执行；重点覆盖搜索与输入法、类型筛选、路由往返后的搜索保留、键盘选择、标签编辑、敏感内容显示、设置折叠与首页滚动恢复。
