# TieZ 稳定重构总控计划

## 文档状态

- 状态：进行中
- 计划创建时间：2026-06-11
- 计划基线提交：`b309024a1c936d07dc8bc29b30411c91071bd673`
- 预计工时：26-40 单人工作日
- 实际工时：阶段 1 本次执行约 0.5 小时，不含人工回归
- 开始时间：阶段 1 于 2026-06-11 10:04:50 +08:00 开始
- 完成时间：待完成
- 依赖阶段：无
- 当前阶段：阶段 3 进行中
- 阻塞项：无

## 验证结果

- 计划文档结构检查：通过
- 阶段 1 实施前基线：`npm test` 22 个测试通过；`npx tsc --noEmit` 通过；`cargo test` 68 个测试通过
- 阶段 1 实施后门禁：`npm test` 26 个测试通过；`npx tsc --noEmit` 通过；`cargo test` 72 个测试通过；`cargo fmt --check` 与 `git diff --check` 通过
- 阶段 1 人工回归：用户于 2026-06-11 确认验收通过
- 阶段 2 自动化门禁：`npm test` 29 个测试通过；`npx tsc --noEmit` 与 `git diff --check` 通过；未修改 Rust 源码或依赖
- 阶段 2 人工回归：用户于 2026-06-11 确认验收通过
- 阶段 3 实施前构建：`npm run build` 通过；主 JS 767.48 kB，gzip 235.50 kB

## 相关提交

- 待记录

## 回滚方式

- 计划文档可通过删除 `docs/refactor/` 或回滚对应文档提交恢复。
- 代码实施阶段遵循后文的分阶段 `git revert` 规则。

## 遗留问题

- 既有 `password` 标签历史数据不进行重新对齐。

## 重构目标

- 保持现有功能、页面表现、Tauri IPC 参数、返回数据处理和数据库行为不变。
- 在提升工程化程度的同时降低项目理解成本和维护负担。
- 使用 `MemoryRouter` 统一主窗口内部导航。
- 使用 Zustand 管理跨组件 UI 状态和设置状态，降低 `App.tsx` 与 props 透传复杂度。
- 使用 Less 渐进整理组件样式，保留现有运行时主题能力。
- 集中管理 Tauri 命令、事件和设置键契约。
- 渐进拆分高复杂度组件和样式，避免大爆炸式重写。
- 每个阶段可独立验证、独立提交、独立回滚。

## 轻量化重构原则

本次重构的目标是让项目工程化的同时也要更轻。

1. 不为了抽象而抽象。
2. 不为了复用而提前封装。
3. 不引入新的公共库，除非能明显减少现有复杂度，并先说明收益和代价。
4. 不创建过多目录层级。
5. 不把简单函数拆成多个文件。
6. 不把只使用一次的逻辑抽成公共工具。
7. 不引入新的状态管理、请求库、样式方案或构建工具。
8. 不改变现有业务行为、接口数据结构和页面交互。
9. 不做无关命名调整、格式化调整或风格统一。
10. 优先删除无用代码、合并重复逻辑、收敛分散配置、简化调用链。

### 已批准例外

- `react-router-dom@7.17.0`、`zustand@5.0.14`、`less@4.6.4` 是本轮已经批准的三项例外。
- 除上述三项外，本轮不得新增状态管理、请求、样式、构建工具或公共库。
- 三项例外仅允许在已定义边界内使用，必须证明能够减少现有复杂度并记录收益、代价和构建影响。
- 任一例外的试点未降低复杂度、产生明显回归或扩大使用边界时，停止迁移并回滚对应提交。
- 轻量化原则约束阶段 2 及后续工作，不追溯修改已经完成的阶段 1 代码。

## 重构边界

### 本轮计划允许调整

- 主窗口内部导航。
- 前端设置状态和跨组件 UI 状态。
- Tauri IPC 前端调用契约的组织方式。
- 纯函数、重复预览逻辑和大型组件内部职责。
- 组件样式文件组织。
- Less 构建接入与组件样式的渐进迁移。
- 自动化测试和回归清单。
- 删除已确认无用的代码、合并确实重复的逻辑、收敛分散配置和简化调用链。

### 暂时不调整

- 数据库结构和迁移。
- Tauri IPC 命令名、参数名、返回结构和事件负载。
- 剪贴板监听、粘贴、加密、Win32 Hook 等核心 Rust 行为。
- 现有主题视觉设计。
- 历史分页缓存、详情 LRU 和紧凑预览窗口生命周期的状态归属。
- 已发现但未确认无用的依赖。
- 单次使用的简单逻辑、没有明确收益的抽象和无关命名、格式化或风格统一。
- 三项已批准例外之外的新公共依赖、状态管理、请求、样式或构建方案。

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

## 重构前基线数据

### 统计说明

- 统计时间：2026-06-11
- 基线提交：`1b601b6187c1525f895dea9c7517e5e855d6b3c5`
- 统计范围：`src/**/*.{ts,tsx,css}`、`src-tauri/src/**/*.rs`
- 排除范围：测试运行结果、资源文件、文档、配置、`node_modules`、`dist`、`build`、`coverage`、`.git` 等非源码内容
- 统计方式：使用 PowerShell 递归读取指定扩展名文件，按 UTF-8 文件实际行数统计；重构后必须使用相同范围和规则复算
- 过大文件定义：分别统计超过 300 行和超过 500 行的源码文件
- 明显重复逻辑定义：人工确认的重复逻辑簇数量，不按每次重复调用单独计数

### 核心指标

| 指标 | 重构前 | 说明 |
| --- | ---: | --- |
| 源码总行数 | 38,214 | 前端 21,562 行，Rust 16,652 行 |
| 源码文件数 | 155 | 前端 110 个，Rust 45 个 |
| 超过 300 行文件 | 35 | 反映职责过重文件数量 |
| 超过 500 行文件 | 25 | 反映高优先级拆分对象 |
| 依赖数量 | 27 | `dependencies` 17 项，`devDependencies` 10 项 |
| 明显重复逻辑数量 | 4 个逻辑簇 | IPC 调用、页面导航状态、设置同步、窗口聚焦调用 |

### 主要目录代码量

| 目录 | 文件数 | 行数 | 说明 |
| --- | ---: | ---: | --- |
| `src/features` | 23 | 8,534 | 前端业务组件和页面逻辑 |
| `src/shared` | 54 | 4,937 | 共享 hooks、工具和类型 |
| `src/styles` | 28 | 6,231 | 全局、组件和主题样式 |
| `src` 根目录 | 5 | 1,860 | 应用入口、编排和本地化 |
| `src-tauri/src/app` | 14 | 4,710 | Rust 命令和应用编排 |
| `src-tauri/src/infrastructure` | 12 | 4,171 | 仓储、Windows API 和加密 |
| `src-tauri/src/services` | 10 | 6,770 | 剪贴板及后台服务 |
| Rust 其他源码 | 9 | 1,001 | 领域模型和根级状态 |

补充前端结构指标：

- Components：20 个文件，8,263 行。
- Hooks：34 个文件，3,102 行。
- Shared lib/config/types：19 个文件，1,813 行。
- 当前没有独立 `store` 目录。

### 当前主要问题

| 类型 | 位置 | 说明 |
| --- | --- | --- |
| 过大文件 | `clipboard/utils.rs`、`TagManager.tsx`、`ClipboardItem.tsx` 等 | 最大文件 2,486 行；25 个文件超过 500 行 |
| 重复逻辑 | IPC、页面导航、设置同步、窗口聚焦 | 前端存在 77 处 `invoke`、16 处 `listen`，页面导航状态分散在约 11 个模块 |
| 样式冲突 | `tag-manager.css`、`settings.css`、`compact-mode.css` | CSS 中约 858 处 `!important`，全局覆盖风险较高 |
| 调用链复杂 | `App.tsx`、设置 hooks、剪贴板预览与紧凑窗口 | 状态、事件和窗口生命周期跨多个模块传递 |
| 无用代码 | 当前未确认 | 只记录候选，后续确认后才能删除 |

明显重复逻辑簇固定记录为：

1. Tauri `invoke/listen` 字符串和调用处理散落。
2. `showSettings/showTagManager/settingsSubpage` 页面状态与判断分散。
3. 设置加载、应用、同步和保存逻辑分散。
4. `activate_window_focus/focus_clipboard_window` 聚焦调用在多个组件重复。

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
| 1. 缺陷隔离 | [01-BASELINE-AND-DEFECTS.md](./01-BASELINE-AND-DEFECTS.md) | 已完成 | 1.5-2.5 天 | 本次执行约 0.5 小时，不含人工回归 | 阶段 0 |
| 2. IPC 契约 | [02-IPC-CONTRACTS.md](./02-IPC-CONTRACTS.md) | 已完成 | 2-3 天 | 本次执行约 0.2 小时，不含人工回归 | 阶段 1 |
| 3. 路由迁移 | [03-ROUTER-MIGRATION.md](./03-ROUTER-MIGRATION.md) | 进行中 | 2-3 天 | 待记录 | 阶段 2 |
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

- 当前重构项能够明确删除重复逻辑、收敛配置、缩短调用链或降低组件复杂度。
- 新增抽象后的总体理解成本不得高于原实现；无法证明收益的重构项从当前阶段移除或延期。
- 只使用一次的简单逻辑默认保留在原模块，不创建公共工具或额外目录层级。
- 不同时进行无关命名、格式化、风格统一或跨阶段整理。
- 除三项已批准例外外，没有新增依赖、状态管理、请求、样式或构建方案。
- 不改变业务行为、接口数据结构、页面交互和视觉表现。
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
| 过度抽象或文件碎片化 | 调用链变长、理解成本上升 | 实施前记录可量化收益，单次使用的简单逻辑保留原位 |
| 例外依赖扩大使用范围 | 项目复杂度和锁定成本上升 | 严格限制 React Router、Zustand、Less 的既定边界，试点失败即回滚 |
| 无关整理混入重构提交 | 回归定位困难、回滚范围扩大 | 禁止同时调整无关命名、格式和风格 |
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
| 2026-06-11 | `password` 纳入前后端内置敏感标签 | 统一模糊、标签保护和后端加密语义 |
| 2026-06-11 | 不重新对齐既有 `password` 标签历史数据 | 避免新增后台扫描和扩大阶段一风险 |
| 2026-06-11 | 轻量化原则作为阶段 2 及后续工作的全局默认约束 | 提升工程化程度时同步降低理解成本和维护负担 |
| 2026-06-11 | React Router、Zustand、Less 保留为三项已批准例外 | 已确认能够针对现有导航、状态和大型样式问题进行有限治理 |
