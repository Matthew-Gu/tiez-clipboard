# 阶段 8：Less 接入、样式隔离与债务清理

- 状态：实现完成，待人工回归
- 预计工时：4-7 单人工作日
- 实际工时：本次执行约 0.3 小时，不含人工回归
- 开始时间：2026-06-12 20:30:31 +08:00
- 完成时间：实现于 2026-06-12 20:45:58 +08:00 完成；人工回归待确认
- 依赖阶段：阶段 7
- 阻塞项：无

## 目标

- 降低大型 CSS 文件和高优先级覆盖带来的视觉回归风险。
- 接入 Less，并以组件域为单位渐进迁移复杂样式。
- 清理已确认的历史债务，但不擅自删除依赖或改变主题视觉。

## 执行顺序

- [x] 精确安装 `less@4.6.4`；按用户要求未创建提交。
- [x] 确认 Vite 可编译 `.less`，未增加额外 Less 插件或配置。
- [x] 记录 Less 接入前后的构建时间、最终 CSS 体积和安装包构建结果。
- [x] 建立组件样式 Less 入口，保留原有样式加载顺序。
- [x] 选择独立 Toast 样式作为迁移试点。
- [x] 试点编译 CSS 文件哈希与体积均保持不变。
- [x] 按组件职责拆分 `settings.css`。
- [x] 按组件职责拆分 `tag-manager.css`。
- [x] 将 `TagManager.tsx` 中 1231 行运行时样式按职责提取到后主题 Less 入口。
- [x] 未使用 Less 嵌套，避免改变选择器语义。
- [x] 未创建 Less mixin 或编译期变量。
- [x] 评估 `!important`；未找到可在无人工视觉回归条件下证明安全的删除项，全部保留。
- [x] 保持主题 Token 与主题文件职责不变。
- [x] 检查并更新过期主题文档引用。
- [x] 记录依赖引用情况；正式依赖均有源码引用，未删除依赖。
- [x] 未删除历史文件；富文本残留继续留在独立任务中。

## 兼容要求

- 不改变现有主题视觉。
- 不使用 Less 编译期变量替代运行时 CSS Variables。
- 不启用 CSS Modules，不修改现有类名。
- `base.css` 与 `styles/themes/*.css` 首轮保持原生 CSS。
- Less 选择器嵌套深度建议不超过三层。
- 不修改类名与 DOM 的同时重写样式。
- 不进行全量 `.css` 到 `.less` 的机械转换。
- 不为使用一次的样式片段创建变量或 mixin。
- 每次仅调整一个组件域。
- 未使用依赖清理必须单独提交。

## 验收场景

- 六套主题在亮色和暗色模式下可读。
- 主窗口、标签管理、设置和弹窗没有布局变化。
- hover、active、selected、focus 状态保持可见。
- Less 接入后的最终 CSS 体积没有异常增长。
- Less 编译不会改变主题样式加载顺序。

## 验证结果

- `npm test`：通过，48 个测试。
- `npx tsc --noEmit`：通过。
- `npm run build`：通过；最终构建耗时 8.79 秒。
- Less 接入前基线：构建耗时 8.14 秒；CSS 125,384 B；主 JS 753,218 B。
- Toast 试点：编译 CSS 文件哈希保持 `index-DKqESKtm.css`，体积保持 125,384 B。
- 样式提取后：CSS 151,602 B；主 JS 702,660 B；CSS 增长来自原运行时样式转为静态资源，CSS 与 JS 合计减少 24,340 B。
- Less 迁移前后关键选择器对照：通过；`settings.css`、全局 `tag-manager.css` 和 `TagManager.tsx` 运行时样式均通过逐行重组一致性检查。
- `npm run tauri:build`：Rust release 应用构建通过，生成 `tiez-app.exe` 9,314,304 B；NSIS 工具下载因 `Peer disconnected` 失败，未生成安装包，无法记录安装包体积。
- `npm audit --audit-level=moderate`：发现 5 个既有工具链漏洞（2 中危、3 高危）；`npm audit --omit=dev` 发现 1 个既有中危漏洞。本阶段不升级或替换依赖。
- 主题矩阵人工回归：待执行
- 轻量化验收：通过；未新增插件、嵌套、变量或 mixin，`TagManager.tsx` 从 1498 行降至 265 行。

## 相关提交

- `chore: add less preprocessor dependency`
- `refactor: migrate component styles to less`
- `refactor: isolate settings and tag manager styles`
- 经确认后：`chore: remove confirmed unused dependencies`

## 回滚方式

- Less 依赖接入与样式迁移使用独立提交。
- 每个组件域样式独立提交。
- 视觉回归时回滚对应样式提交，不修改组件逻辑。
- Less 试点失败时回滚迁移提交；依赖可在确认无其他使用后单独回滚。

## 遗留问题

- 六套主题亮色与暗色模式的人工视觉回归待执行。
- NSIS 工具下载失败，安装包体积待网络恢复后补测。
- `src/styles/components/rich-text-preview.css`、`src/styles/themes/dark.css` 中对应覆盖和 `src/shared/lib/repairHtmlFragment.ts` 属于独立富文本移除任务，本阶段未修改。
- 现有样式仍包含 684 个 `!important`；在没有逐主题视觉证据前不做风险删除。
