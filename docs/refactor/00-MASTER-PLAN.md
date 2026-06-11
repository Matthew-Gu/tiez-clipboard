# TieZ 稳定重构总控计划

## 文档状态

- 状态：进行中
- 计划创建时间：2026-06-11
- 计划基线提交：`b309024a1c936d07dc8bc29b30411c91071bd673`
- 预计工时：26-40 单人工作日
- 实际工时：待记录
- 开始时间：待开始
- 完成时间：待完成
- 依赖阶段：无
- 当前阶段：阶段 0 已完成，代码实施未开始
- 阻塞项：无

## 验证结果

- 计划文档结构检查：通过
- 代码实施验证：尚未开始

## 相关提交

- 待记录

## 回滚方式

- 计划文档可通过删除 `docs/refactor/` 或回滚对应文档提交恢复。
- 代码实施阶段遵循后文的分阶段 `git revert` 规则。

## 遗留问题

- 阶段 1 开始前，需要再次确认敏感标签最终业务定义。

## 重构目标

- 保持现有功能、页面表现、Tauri IPC 参数、返回数据处理和数据库行为不变。
- 使用 `MemoryRouter` 统一主窗口内部导航。
- 使用 Zustand 管理跨组件 UI 状态和设置状态，降低 `App.tsx` 与 props 透传复杂度。
- 使用 Less 渐进整理组件样式，保留现有运行时主题能力。
- 集中管理 Tauri 命令、事件和设置键契约。
- 渐进拆分高复杂度组件和样式，避免大爆炸式重写。
- 每个阶段可独立验证、独立提交、独立回滚。

## 重构边界

### 本轮计划允许调整

- 主窗口内部导航。
- 前端设置状态和跨组件 UI 状态。
- Tauri IPC 前端调用契约的组织方式。
- 纯函数、重复预览逻辑和大型组件内部职责。
- 组件样式文件组织。
- Less 构建接入与组件样式的渐进迁移。
- 自动化测试和回归清单。

### 暂时不调整

- 数据库结构和迁移。
- Tauri IPC 命令名、参数名、返回结构和事件负载。
- 剪贴板监听、粘贴、加密、Win32 Hook 等核心 Rust 行为。
- 现有主题视觉设计。
- 历史分页缓存、详情 LRU 和紧凑预览窗口生命周期的状态归属。
- 已发现但未确认无用的依赖。

## 已确认架构决策

### 路由

- 依赖：`react-router-dom@7.17.0`。
- 主窗口使用 `MemoryRouter`。
- 多窗口入口继续由 `?window=compact-preview` 和 `?window=advanced-settings` 识别。
- 主窗口固定路由：

| 路径 | 页面 |
| --- | --- |
| `/` | 剪贴板历史 |
| `/tags` | 标签管理 |
| `/settings` | 设置首页 |
| `/settings/advanced` | 高级设置 |
| 未知路径 | 重定向到 `/` |

- 路由是页面导航唯一真相，不在 Zustand 中保留重复页面状态。
- 高级设置返回 `/settings`；标签管理和设置首页返回 `/`。
- 收到 `focus-search-input` 时先导航到 `/`，再聚焦搜索框。
- 标签管理被禁用时访问 `/tags` 自动重定向 `/`。

### Zustand

- 依赖：`zustand@5.0.14`。
- `useSettingsStore` 管理设置值、加载状态、默认应用、安装应用和数据目录。
- `useUiStore` 管理搜索、筛选、列表选择、键盘模式、设置折叠状态、标签编辑状态和敏感内容显示状态。
- Store action 保持纯状态更新。
- Tauri `invoke` 和 `listen` 保留在 service 或同步 hook 中。
- 不使用 Zustand `persist`、Immer 或 devtools middleware。
- 不迁移历史分页缓存、详情 LRU、紧凑预览生命周期和包含回调的弹窗状态。
- Tauri 各窗口拥有独立 JS 上下文，通过 `settings-changed` 事件同步设置。

### Less

- 开发依赖：`less@4.6.4`，仅作为 Vite 样式预处理器使用。
- 原生方案：继续维护现有原生 CSS、CSS Variables 和手工选择器嵌套。
- 引入原因：大型组件样式文件层级复杂，使用 Less 嵌套、拆分和复用能力可降低维护成本。
- 使用边界：优先用于组件样式；不启用 CSS Modules，不引入额外 Less 插件。
- 主题约束：运行时主题值继续使用 CSS Variables；不得使用 Less 编译期变量替代主题 Token。
- 迁移方式：按组件域渐进迁移，不进行全量 `.css` 转 `.less`。
- 暂时保留：`base.css`、`styles/themes/*.css` 和现有主题自动加载方式。
- 收益：改善大型样式文件结构，减少重复选择器前缀，便于组件样式拆分。
- 风险：选择器嵌套可能增加优先级，编译结果可能产生视觉差异。
- 体积与性能：Less 仅在构建期运行，不增加运行时代码；开发依赖安装体积约 2.5 MB，最终 CSS 体积应保持接近迁移前水平。
- 业务影响：不得改变现有 DOM、类名、主题 Token 和视觉表现。

## 当前基线

- 前端：React 19、TypeScript、Vite 7。
- 桌面端：Tauri 2、Rust、SQLite，仅支持 Windows 10/11。
- 前端源码：约 108 个 TS/TSX/CSS 文件，21,525 行。
- Rust 源码：约 45 个文件，16,589 行。
- 前端 Tauri 调用：约 77 处 `invoke`、25 处 `listen`。
- 高复杂度前端文件：
  - `TagManager.tsx`：约 2,005 行。
  - `ClipboardItem.tsx`：约 1,852 行。
  - `App.tsx`：约 823 行。
  - `ClipboardSettingsGroup.tsx`：约 746 行。
- 样式风险：约 858 处 `!important`，大型样式集中在设置、标签管理和紧凑模式。

### 已执行的基线验证

| 检查 | 结果 | 日期 |
| --- | --- | --- |
| `npm test` | 22 个前端测试通过 | 2026-06-11 |
| `npx tsc --noEmit` | 通过 | 2026-06-11 |
| `cargo test` | 68 个 Rust 测试通过 | 2026-06-11 |
| `git status --short --branch` | 基线检查时工作区干净 | 2026-06-11 |

## 阶段进度

| 阶段 | 文档 | 状态 | 预计工时 | 实际工时 | 依赖 |
| --- | --- | --- | ---: | ---: | --- |
| 0. 文档与基线 | [01-BASELINE-AND-DEFECTS.md](./01-BASELINE-AND-DEFECTS.md) | 已完成 | 1-1.5 天 | 仅完成计划与基线审计 | 无 |
| 1. 缺陷隔离 | [01-BASELINE-AND-DEFECTS.md](./01-BASELINE-AND-DEFECTS.md) | 未开始 | 1.5-2.5 天 | 待记录 | 阶段 0 |
| 2. IPC 契约 | [02-IPC-CONTRACTS.md](./02-IPC-CONTRACTS.md) | 未开始 | 2-3 天 | 待记录 | 阶段 1 |
| 3. 路由迁移 | [03-ROUTER-MIGRATION.md](./03-ROUTER-MIGRATION.md) | 未开始 | 2-3 天 | 待记录 | 阶段 2 |
| 4. Zustand 基础 | [04-ZUSTAND-FOUNDATION.md](./04-ZUSTAND-FOUNDATION.md) | 未开始 | 2-3 天 | 待记录 | 阶段 3 |
| 5. 设置迁移 | [05-SETTINGS-MIGRATION.md](./05-SETTINGS-MIGRATION.md) | 未开始 | 4-6 天 | 待记录 | 阶段 4 |
| 6. UI 状态迁移 | [06-UI-STATE-MIGRATION.md](./06-UI-STATE-MIGRATION.md) | 未开始 | 3-5 天 | 待记录 | 阶段 5 |
| 7. 组件拆分 | [07-COMPONENT-SPLITTING.md](./07-COMPONENT-SPLITTING.md) | 未开始 | 6-9 天 | 待记录 | 阶段 6 |
| 8. Less、样式与清理 | [08-STYLES-AND-CLEANUP.md](./08-STYLES-AND-CLEANUP.md) | 未开始 | 4-7 天 | 待记录 | 阶段 7 |
| 9. 回归收尾 | [09-REGRESSION-CLOSEOUT.md](./09-REGRESSION-CLOSEOUT.md) | 未开始 | 2-3 天 | 待记录 | 阶段 8 |

## 推荐提交顺序

1. `docs: add stable refactor execution plan`
2. `test: capture current settings and navigation behavior`
3. `fix: correct paste sound setting state mapping`
4. `fix: align sensitive tag behavior`
5. `refactor: centralize tauri command contracts`
6. `chore: add zustand and react router dependencies`
7. `refactor: migrate main window navigation to memory router`
8. `refactor: add settings and ui stores`
9. `refactor: migrate settings state to zustand`
10. `refactor: migrate shared ui state to zustand`
11. `refactor: simplify app orchestration`
12. `refactor: split clipboard and tag components`
13. `chore: add less preprocessor dependency`
14. `refactor: migrate component styles to less`
15. `refactor: isolate component styles`
16. `test: complete refactor regression coverage`
17. `docs: close stable refactor plan`

## 阶段门禁

进入下一阶段前必须满足：

- 当前阶段执行清单全部完成，或遗留项已明确延期并说明原因。
- `npx tsc --noEmit` 通过。
- `npm test` 通过。
- 涉及 Rust 改动时，`cargo test` 通过。
- `git diff` 中没有无关改动。
- 阶段文档记录验证结果、相关提交和实际工时。

## 回滚规则

- 每个实现提交只处理一个行为边界。
- 路由迁移与 Zustand 迁移不得放在同一提交。
- 设置迁移按设置组分批进行。
- 组件拆分先移动代码并保持行为，再做内部整理。
- 不在重构提交中修改 IPC 协议或数据库结构。
- 阶段验证失败时，标记为“阻塞”，记录失败证据，并停止进入下一阶段。
- 使用 `git revert <commit>` 回滚对应阶段，不使用破坏性重置。

## 风险清单

| 风险 | 影响 | 规避方式 |
| --- | --- | --- |
| 页面状态与路由同时存在 | 页面状态不一致、返回行为异常 | 路由迁移完成后删除对应布尔页面状态 |
| Store 过度膨胀 | 重渲染与维护成本上升 | 分为 Settings/UI Store，组件使用 selector |
| 设置存在多条写入路径 | 本地状态与 Rust 状态不一致 | 集中设置服务和同步 hook，逐组迁移 |
| 多窗口状态无法内存共享 | 独立窗口显示过期设置 | 保留 `settings-changed` 事件同步 |
| 富文本预览逻辑重复且复杂 | 主列表与紧凑预览表现不一致 | 先提取纯函数并补测试，再拆组件 |
| CSS 全局覆盖较多 | 视觉回归 | 每次仅迁移一个组件并执行主题矩阵检查 |
| Less 嵌套增加选择器优先级 | 局部样式覆盖关系变化 | 限制嵌套深度，迁移前后比较编译 CSS 与主题矩阵 |
| 核心桌面行为依赖人工回归 | 自动测试无法覆盖 Windows 行为 | 最终阶段执行安装版和便携版人工检查 |

## 进度维护规则

- 每次开始阶段时填写开始时间、负责人和预计工时。
- 每次完成工作项时更新执行清单。
- 每次验证后记录命令、结果和日期。
- 阶段完成时记录实际工时、完成时间和提交 SHA。
- 阻塞超过一个工作日时，在总控计划风险清单中增加记录。
- 计划调整必须记录原因，不直接覆盖原始决策。

## 决策记录

| 日期 | 决策 | 原因 |
| --- | --- | --- |
| 2026-06-11 | 主窗口采用 MemoryRouter | 适合 Tauri 内部导航，不与多窗口查询参数冲突 |
| 2026-06-11 | Zustand 第一轮仅迁移设置与跨组件 UI 状态 | 降低历史缓存和预览生命周期迁移风险 |
| 2026-06-11 | 独立高级设置窗口暂时保留 | 避免破坏潜在外部入口，复用同一设置业务层 |
| 2026-06-11 | 两个已知缺陷在重构前独立修复 | 区分行为修复与结构重构，便于回滚 |
| 2026-06-11 | 当前未使用依赖暂不删除 | 需要单独确认运行时和历史用途 |
| 2026-06-11 | 接入 `less@4.6.4`，仅渐进迁移组件样式 | 改善大型组件样式维护，同时保护现有主题运行时能力 |
