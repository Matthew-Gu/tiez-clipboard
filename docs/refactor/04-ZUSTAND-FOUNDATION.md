# 阶段 4：Zustand 基础设施

- 状态：未开始
- 预计工时：2-3 单人工作日
- 实际工时：待记录
- 开始时间：待记录
- 完成时间：待记录
- 依赖阶段：阶段 3
- 阻塞项：无

## 目标

- 引入 `zustand@5.0.14`，建立设置和 UI 状态的明确边界。
- 本阶段只建立 Store 与适配结构，不一次迁移全部状态。

## 执行清单

- [ ] 单独安装并提交 `zustand@5.0.14`。
- [ ] 创建 `useSettingsStore` 和 `useUiStore`。
- [ ] 定义初始状态、纯 action 和常用 selector。
- [ ] 为 Store 初始状态、action 和重置行为补充测试。
- [ ] 建立设置服务与 Store 同步 hook 的职责边界。
- [ ] 确认未启用 `persist`、Immer 和 devtools middleware。
- [ ] 确认 Store 中不保存回调、Promise、窗口对象或预览生命周期对象。
- [ ] 记录依赖引入前后的构建产物体积。

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

## 验证结果

- Store 单元测试：待执行
- `npm test`：待执行
- `npx tsc --noEmit`：待执行
- `npm run build`：待执行

## 相关提交

- `chore: add zustand dependency`
- `refactor: add settings and ui stores`

## 回滚方式

- Store 基础提交不得移除原状态；可直接回滚而不影响现有行为。

## 遗留问题

- 待记录

