# 阶段 4：Zustand 基础设施

- 状态：已完成
- 预计工时：2-3 单人工作日
- 实际工时：本次执行约 0.1 小时
- 开始时间：2026-06-11 14:46:07 +08:00
- 完成时间：2026-06-11 14:51:16 +08:00
- 依赖阶段：阶段 3
- 阻塞项：无

## 目标

- 引入 `zustand@5.0.14`，建立设置和 UI 状态的明确边界。
- 本阶段只建立 Store 与适配结构，不一次迁移全部状态。

## 执行清单

- [x] 单独安装并提交 `zustand@5.0.14`。
- [x] 仅创建 `useSettingsStore` 和 `useUiStore`，不得按组件或页面继续拆分 Store。
- [x] 定义初始状态、纯 action 和常用 selector。
- [x] 为 Store 初始状态、action 和重置行为补充测试。
- [x] 建立设置服务与 Store 同步 hook 的职责边界。
- [x] 确认未启用 `persist`、Immer 和 devtools middleware。
- [x] 确认 Store 中不保存回调、Promise、窗口对象或预览生命周期对象。
- [x] 确认单组件状态、一次性状态和已有稳定 hook 状态不进入 Store。
- [x] 记录依赖引入前后的构建产物体积。

## 状态边界

### Settings Store

- 设置值、设置加载状态。
- 默认应用、安装应用、数据目录。

### UI Store

- 搜索、筛选、选择、键盘模式。
- 设置折叠、标签编辑、敏感内容显示。

### 保留现状

- 历史分页和详情缓存。
- 紧凑预览窗口生命周期。
- Toast 与确认弹窗回调。
- 单组件内部状态和只使用一次的 UI 状态。

## 验证结果

- Store 单元测试：通过；覆盖初始状态、直接值与函数式 action、重置、可变容器新实例、selector 和排除边界。
- `npm test`：通过，42 个测试。
- `npx tsc --noEmit`：通过。
- `npm run build`：通过。
- `git diff --check`：通过。
- Zustand 引入前构建体积：主 JS 801.00 kB，gzip 247.29 kB
- Zustand 引入后构建体积：主 JS 801.00 kB，gzip 247.29 kB；Store 未接入生产代码，体积不变
- 依赖检查：通过；仅新增固定版本 `zustand@5.0.14` 及其锁文件依赖。
- 运行时边界检查：通过；生产代码未导入 Store，现有 `useAppState`、设置 hooks、IPC 和 DOM 副作用链路未修改。
- Store 边界检查：通过；仅有 Settings/UI 两个 Store，排除历史分页、加载状态、弹窗回调、录制过程、窗口和预览生命周期对象。
- 轻量化验收：通过；完整定义未来迁移边界，但未迁移状态或新增中间适配层。

## 相关提交

- `chore: add zustand dependency`
- `refactor: add settings and ui stores`

## 回滚方式

- Store 基础提交不得移除原状态；可直接回滚而不影响现有行为。

## 遗留问题

- Store 尚未接入生产代码；设置与 UI 状态迁移分别留待阶段五、六。
