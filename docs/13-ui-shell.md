# 13. 应用外壳：工具栏、编辑栏与品牌

> 状态：UI-1 已实施（2026-11-18）；UI-2～UI-4 待实施。本文保留目标设计与 §10 的实施记录。
>
> 关联文档：[03 前端工程设计](03-frontend.md)、[07 命令、剪贴板、撤销重做与公式](07-editing-formula.md)、[10 分阶段实施计划](10-roadmap.md)、[12 架构决策记录](12-decisions.md)。

## 0. 已确认决策（2026-11-18）

1. **品牌**：保留 `sheetlite-animated-logo.svg` 与 `sheetlite-high-resolution-logo.svg` 原样；另生成 `sheetlite-logo-mark.svg`，只保留图案、不含 “SHEETLITE” 字标，用于页头/favicon。
2. **编辑栏**：确认采用**失焦提交**，与内联编辑器保持一致，避免切换焦点时丢失输入。
3. **合并单元格**：按 UI-4 独立阶段推进，先完成 `MergeStore`、合并命令与几何，再启用工具栏按钮。
4. **筛选/排序**：放到后续数据处理阶段，依赖持久化与“数据区域”语义，不在 UI-1 内启用。

## 1. 现状与差距

### 1.1 当前布局

> 下面记录的是 UI-1 实施前的布局，保留作为改造依据；UI-1 后的实际布局见 §10。

```text
┌─ Header ───────────────────────────────────────────────┐
│ Sheet Lite  [阶段标签]  [A1]                操作提示    │
├─ Toolbar（单行）───────────────────────────────────────┤
│ B I │ 左 中 右 │ 数字格式 │ 文字色板 │ 填充色板 │       │
│ 全部边框 外框 无边框 │ 隐藏行 隐藏列 显示行 显示列      │
├─ Grid ─────────────────────────────────────────────────┤
│ Canvas 网格 + 滚动容器                                 │
└────────────────────────────────────────────────────────┘
```

- 单元格地址 `A1` 目前位于顶栏；编辑栏（formula bar）不存在。
- 工具栏是单行平铺，未按 Excel 式分组，也没有撤销/恢复、字体字号、下划线等入口。
- `frontend/public/` 下已有 `sheetlite-animated-logo.svg` 与 `sheetlite-high-resolution-logo.svg`，但尚未接入页面。
- 两个 SVG 当前未被 Git 跟踪；实施方案时一并提交。

### 1.2 能力现状

| 能力 | 现状 | 代码位置 |
|---|---|---|
| 撤销/重做 | 命令栈已具备，快捷键 `Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z`；**无工具栏按钮** | `commands/commandManager.js`、`SpreadsheetGrid.vue` |
| 加粗/斜体 | 已实现 | `core/style.js`、`gridRenderer.js` |
| 水平对齐 | 已实现左/中/右 | 同上 |
| 文本色/填充色 | 已实现，含紧凑色板 | `EditorPage.vue` |
| 边框 | 已实现全部/外框/无框；整行整列只作用于已有单元格 | `commands/setRangeStyleCommand.js`、`setCellsStyleCommand.js` |
| 数字格式 | 常规/数值/百分比/日期（下拉） | `core/format.js` |
| 表头选区 | 整行/整列/全表，支持拖拽 | `core/selection.js` |
| 行高列宽/隐藏 | 已实现（拖拽 + 工具栏按钮） | `layout/gridLayout.js`、`SparseDimensionStore` |
| 字体、字号 | 未实现；渲染固定 13px | `gridRenderer.js` |
| 下划线、删除线 | 未实现 | `core/style.js` |
| 垂直对齐、换行、旋转 | 未实现 | - |
| 小数位增减 | 未实现；数值固定 2 位、百分比 0–2 位 | `core/format.js` |
| 格式刷 | 未实现 | - |
| 合并单元格 | 未实现；无 MergeStore / 合并几何 | `docs/06-grid-engine.md` §7 |
| 公式 | 未实现；仅有阶段 6 的适配计划 | `docs/07-editing-formula.md` |
| 筛选/排序 | 未实现；无数据表抽象 | - |

## 2. 目标布局

```text
┌─ AppHeader（60px）─────────────────────────────────────┐
│ [animated logo 48×48]  Sheet Lite        保存状态/帮助  │
├─ FormatToolbar（40px，可换行/溢出）─────────────────────┤
│ 组1 │ 组2 │ 组3 │ 组4 │ 组5 │ 组6 │ 组7                │
├─ FormulaBar（36px）────────────────────────────────────┤
│ [A1 / A:A / 1:1 / 全部]  [fx]  [ 原始输入……………… ]      │
├─ Grid（flex:1）────────────────────────────────────────┤
│ Canvas 网格                                            │
└────────────────────────────────────────────────────────┘
```

- 地址从顶栏移入编辑栏左侧；顶栏只保留品牌、阶段标识和保存状态。
- 编辑栏位于工具栏下方、网格上方，高度固定，不参与网格滚动。
- 高度可用 CSS 变量统一维护：`--app-header-h: 60px`、`--app-toolbar-h: 40px`、`--app-formula-h: 36px`。

## 3. 工具栏规格

### 3.1 分组与顺序

从左到右固定为 7 组，组间用分隔线（`NDivider vertical`）区分：

1. 撤销、恢复、格式刷
2. 字体、字号、增大字号、减小字号
3. 加粗、斜体、下划线、删除线、文本颜色
4. 填充颜色、边框、合并单元格
5. 水平对齐、垂直对齐、文本换行、文本旋转
6. 数字格式、百分比、增加小数位数、减小小数位数、公式
7. 筛选、排序

### 3.2 控件清单

图标统一使用 `@vicons/material` 的 **Outlined** 具名导入（按需打包，禁止整包引入）。图标名以当前已安装的 0.13.0 实际导出为准。

| # | 控件 | 类型 | 图标（示例） | 行为 | 状态 | 阶段 |
|---|---|---|---|---|---|---|
| 1 | 撤销 | 按钮 | `UndoOutlined` | `undo()`；`Ctrl+Z` | 无历史时禁用 | UI-1 |
| 2 | 恢复 | 按钮 | `RedoOutlined` | `redo()`；`Ctrl+Y` / `Ctrl+Shift+Z` | 无重做时禁用 | UI-1 |
| 3 | 格式刷 | 切换按钮 | `FormatPaintOutlined` | 复制当前活动单元格解析后的样式；进入一次性套用模式，点击/框选目标应用；`Esc` 退出 | 阶段 3 之后 | UI-3 |
| 4 | 字体 | 下拉 | `TextFieldsOutlined` | `style.fontFamily`；系统字体列表 | 多选时显示混合态 | UI-2 |
| 5 | 字号 | 数字选择 | `FormatSizeOutlined` | `style.fontSize`，8–72 | 同上 | UI-2 |
| 6 | 增大字号 | 按钮 | `TextIncreaseOutlined` | 字号 +1（按常用档位） | 到达上限禁用 | UI-2 |
| 7 | 减小字号 | 按钮 | `TextDecreaseOutlined` | 字号 −1 | 到达下限禁用 | UI-2 |
| 8 | 加粗 | 切换按钮 | `FormatBoldOutlined` | `style.bold` | 已实现，改为按选区混合态更新 | UI-1 |
| 9 | 斜体 | 切换按钮 | `FormatItalicOutlined` | `style.italic` | 已实现 | UI-1 |
| 10 | 下划线 | 切换按钮 | `FormatUnderlinedOutlined` | `style.underline` | 新增样式字段 | UI-2 |
| 11 | 删除线 | 切换按钮 | `StrikethroughSOutlined` | `style.strike` | 新增样式字段 | UI-2 |
| 12 | 文本颜色 | 色板按钮 | `FormatColorTextOutlined` | `style.textColor` | 已实现，改为弹出式色板 | UI-1 |
| 13 | 填充颜色 | 色板按钮 | `FormatColorFillOutlined` | `style.backgroundColor` | 已实现 | UI-1 |
| 14 | 边框 | 菜单 | `BorderAllOutlined` / `BorderOuterOutlined` / `BorderClearOutlined` | 全部/外框/无框 | 已实现；整行整列仅作用于已有单元格 | UI-1 |
| 15 | 合并单元格 | 菜单 | `MergeTypeOutlined` | 合并/取消合并 | 依赖 MergeStore、合并渲染与命令，UI-4 前禁用并提示 | UI-4 |
| 16 | 水平对齐 | 按钮组 | `FormatAlignLeftOutlined` / `Center` / `Right` / `Justify` | `style.align` | 左中右已实现；两端对齐待 UI-2 | UI-1 |
| 17 | 垂直对齐 | 菜单 | `VerticalAlignTopOutlined` / `Center` / `Bottom` | `style.verticalAlign` | 新增样式字段 | UI-2 |
| 18 | 文本换行 | 切换按钮 | `WrapTextOutlined` | `style.wrapText` | 新增；自动行高另行评估 | UI-2 |
| 19 | 文本旋转 | 菜单 | `RotateRightOutlined` | 0° / 45° / −45° / 90° | 新增；编辑框保持水平 | UI-2 |
| 20 | 数字格式 | 下拉 | `NumbersOutlined` | 常规/数值/日期（百分比独立按钮） | 已有下拉，改为图标+下拉 | UI-1 |
| 21 | 百分比 | 切换按钮 | `PercentOutlined` | 设置 `numberFormat = percent` | 已有格式能力，补按钮 | UI-2 |
| 22 | 增加小数位 | 按钮 | `AddOutlined` | `decimals + 1`（上限 6） | 新增 `decimals` 字段 | UI-2 |
| 23 | 减小小数位 | 按钮 | `RemoveOutlined` | `decimals − 1`（下限 0） | 同上 | UI-2 |
| 24 | 公式 | 切换按钮 | `FunctionsOutlined` | 插入 `=` 并进入公式输入；显示 `fx` 状态 | 依赖公式引擎（阶段 6），在此之前禁用 | 阶段 6 |
| 25 | 筛选 | 按钮 | `FilterAltOutlined` | 对当前数据区域启用筛选 | 依赖数据区域与筛选模型，禁用 | 阶段 7 |
| 26 | 排序 | 按钮 | `SortOutlined` | 升序/降序排序 | 依赖排序命令，禁用 | 阶段 7 |

### 3.3 交互规则

- **状态派生**：按钮激活态取自“当前选区解析后的样式”。对布尔切换项，选区所有单元格均为 true 时显示激活，均为 false 时显示未激活，值不一致时显示混合态；混合态不得伪装成普通未激活。下拉框优先显示活动单元格的有效值；选区内值不一致时显示“—”或“混合”。空白单元格按默认样式参与聚合。
- **状态模型**：控件至少区分默认、激活、混合、禁用、执行中和错误状态。执行中状态用于防止重复触发；错误状态应提供可理解的失败反馈，不得仅静默恢复默认样式。
- **禁用与提示**：未实现能力（合并、公式、筛选、排序）保留按钮位置但禁用，`title`/tooltip 注明依赖阶段，避免用户误以为可用。
- **快捷键**：使用平台修饰键抽象：Windows/Linux 使用 `Ctrl`，macOS 使用 `Meta`。对应撤销、恢复、加粗、斜体、下划线快捷键分别为 `Mod+Z`、`Mod+Y` / `Mod+Shift+Z`、`Mod+B`、`Mod+I`、`Mod+U`；快捷键与按钮共用同一命令入口。
- **快捷键焦点保护**：当焦点位于文本输入、下拉选择等可编辑控件，或 IME 正在 composition 时，不得截获与输入冲突的快捷键；仅在应用明确拥有快捷键焦点时处理。需要阻止浏览器默认行为时，只对已识别且确实由应用处理的快捷键调用 `preventDefault`。
- **历史状态**：网格通过 `history-change` 事件向工具栏推送 `{ canUndo, canRedo }`；按钮据此启用。
- **窄屏**：工具栏允许 `flex-wrap`；空间不足时按从右到左的优先级把第 6、7 组折叠进“更多”菜单，前 5 组保持顺序。
- **行/列隐藏入口**：新规格不再把“隐藏行/列、显示行/列”放在工具栏；改为行/列头右键菜单（UI-1 同步迁移），避免破坏规定的 7 组顺序。若右键菜单未就绪，暂放“更多”菜单中。

## 4. 编辑栏（FormulaBar）

### 4.1 组成

| 区域 | 宽度 | 说明 |
|---|---|---|
| 名称框 | 96px | 显示 `A1`、`A:A`、`1:1`、`全部`；只读展示（后续可支持输入跳转） |
| `fx` | 32px | 公式入口预留；公式引擎接入前禁用 |
| 内容输入 | flex:1 | 单行输入；显示**原始输入**（`rawInput`），不显示格式化后的文本 |

### 4.2 与网格的契约

新增/调整以下接口（具体命名实现时可微调，语义固定）：

```ts
// SpreadsheetGrid 向外抛出的活动选区信息；坐标为 0-based，range 使用半开区间
interface ActiveSelectionChange {
  address: string; // 例如 A1、A1:C10、A:A、1:1、全部
  mode: 'cells' | 'rows' | 'columns' | 'all';
  selectionKind: 'single-cell' | 'range' | 'rows' | 'columns' | 'all';
  range: { // 当前选区；endRow/endCol 不包含
    startRow: number;
    endRow: number;
    startCol: number;
    endCol: number;
  };
  activeCell: { row: number; col: number }; // 0-based 活动单元格锚点
  rawInput: string | null; // 单格原始输入；空单元格为 ''，非单格选区为 null
  displayText: string | null; // 单格格式化展示文本；仅用于提示
  valueType: 'text' | 'number' | 'date' | 'boolean' | 'formula' | 'error' | null;
  editable: boolean; // 仅单格选区为 true；空单元格仍可编辑
}
```

`range` 的统一语义：单格为 1×1；整行范围覆盖该工作表的全部列；整列范围覆盖全部行；全表范围覆盖工作表逻辑上限。所有 `end*` 均为开区间边界。`activeCell` 是稳定锚点，不代表整个选区。

网格暴露给外壳的方法：

```ts
applyInput(text: string): void; // 走 SET_CELL 命令；空串删除单元格
undo(): void;
redo(): void;
canUndo: boolean;
canRedo: boolean; // 或通过 history-change 事件推送
focusGrid(): void; // 提交后把焦点还给网格
```

- 现有 `active-change` 只返回地址字符串，UI-1 中升级为上述对象；`EditorPage` 同步修改。
- 外壳组件（`components/AppHeader.vue`、`FormatToolbar.vue`、`FormulaBar.vue`）**不得**直接访问 `SparseCellStore`、`SparseStyleStore` 或命令管理器；只通过 `EditorPage` 编排与网格公开 API 交互。
- 地址的唯一展示位是名称框；顶栏不再重复显示。

### 4.3 行为

- **单格**：显示 `rawInput`；空单元格显示空字符串但仍可编辑。进入编辑栏时，若网格内联编辑器未关闭，先通过统一编辑会话提交或取消，保证同一时刻只有一个输入源。
- **多选/整行/整列/全表**：内容框禁用，显示占位提示（如“已选择 3 行 × 2 列”）；名称框显示范围。此时 `rawInput` / `displayText` 为 `null`，不得用空字符串混淆“多选”和“单格内容为空”。
- **提交**：`Enter` 提交并下移；`Tab` 提交并右移；`Esc` 恢复原值；**失焦提交（已确认）**，与内联编辑器一致。提交成功后才允许执行依赖新值的后续命令；提交失败时保留输入并展示错误，不移动活动单元格。
- **焦点切换**：FormulaBar、网格内联编辑器共用唯一编辑会话和提交入口。点击工具栏时，先提交当前编辑会话，再执行工具栏命令；不得让 `blur` 与按钮 `click` 各自提交一次。实现可在工具栏指针按下阶段触发统一 `commitActiveEdit`，并确保提交失败时取消后续命令。
- **输入法**：`compositionstart` 至 `compositionend` 期间不响应 `Enter`/`Esc` 提交或取消；与现有编辑器共用 composition 守卫。失焦发生在 composition 期间时，延后提交至 composition 结束，不能提交半成品。
- **撤销**：编辑栏提交同样进入 `SET_CELL` 命令，平台 `Mod+Z` 可撤销，可被工具栏撤销按钮触发。一次编辑会话最多产生一次提交命令；取消不产生历史记录。
- **公式**：阶段 6 前内容框不解析 `=`，按普通文本保存；`fx` 与公式按钮禁用。
- **多行文本**：当前统一单行；`wrapText` 只影响画布渲染，编辑栏保持单行滚动。

### 4.4 编辑会话状态机

```text
Idle → Editing → Committing → Idle
          │           └─失败→ Editing（保留输入）
          └─Esc→ Cancelled → Idle
```

- `Idle`：没有活动编辑会话。
- `Editing`：FormulaBar 或网格内联编辑器拥有唯一输入会话；二者不可同时处于编辑态。
- `Committing`：通过同一命令入口提交；成功后关闭会话，失败则保留原输入和编辑态。
- `Cancelled`：恢复会话开始时的原始值，不产生命令历史，再返回 `Idle`。
- `Enter` / `Tab` / 失焦均请求同一个提交函数；重复触发必须合并为同一次提交。
- `Esc` 优先取消当前编辑会话；IME composition 期间由 composition 守卫拦截。
- 点击工具栏的命令必须等待提交结果；提交失败时不执行后续格式/历史命令。

## 5. Logo 与动画

### 5.1 资源

| 文件 | 用途 | 说明 |
|---|---|---|
| `frontend/public/sheetlite-high-resolution-logo.svg` | 原始静态品牌图 / 启动页 / About | 2000×2000 viewBox，内容区 1500×1500，配色 `#358051` / `#073106`；保持原样不修改 |
| `frontend/public/sheetlite-animated-logo.svg` | 原始动画品牌图 | 同一图形，内嵌 CSS keyframes（`lm-fly` / `lm-pop` / `lm-rise` / `lm-fade`），自带 `prefers-reduced-motion` 降级；保持原样不修改 |
| `frontend/public/sheetlite-logo-mark.svg` | 页头品牌标记 / favicon | **新增**：从静态 logo 裁剪，只保留“S + 表格”图案，移除 “SHEETLITE” 字标 |

- 原有两个 SVG 由用户提供且不修改；`sheetlite-logo-mark.svg` 为派生资源，实施 UI-1 时生成并提交。
- 裁剪方式：以静态 SVG 的内容区为源，保留图案分组，删除字标路径，把 `viewBox` 收紧到图案包围盒（大致 `x=250..1250`、`y=250..1250`，实施时用可视化确认，避免留下大片透明边）。
- 三个文件均由 Vite 从 `public/` 直接提供，无外部依赖；动画由 SVG 内嵌 CSS 播放，不需要额外 JS。

### 5.2 接入方式

- **AppHeader**：左侧 `sheetlite-logo-mark.svg`（32–36px 方形）+ 文本 “Sheet Lite”。图案在 32px 下仍清晰，字标不再挤压进小尺寸。
- **启动动画**：首次加载时可显示一次非阻塞覆盖层（居中 180–220px 的原动画 logo，约 1.2s 后淡出），让 “SHEETLITE” 字标可读；动画不得延迟应用初始化、网格挂载或首次可交互时间。可用 `sessionStorage` 去重，但访问存储失败时必须直接降级，不得阻断启动。
- **减少动态效果**：`prefers-reduced-motion: reduce` 时跳过启动动画，直接显示页头 mark；SVG 内部已有动画降级，页面侧再做一次判断。
- **降级**：动画资源加载失败时回退到 `sheetlite-high-resolution-logo.svg` 的静态展示；静态资源也失败时保留文字品牌，不影响进入应用。
- **Favicon**：`index.html` 使用 `sheetlite-logo-mark.svg`（小尺寸下更清晰）；原始高分辨率 logo 用于 About/分享图等场景。
- **清晰度**：固定宽高（`width`/`height` 属性 + CSS）避免 CLS；2× 屏下 mark 使用矢量渲染。
- **可访问性**：`alt="Sheet Lite"`；启动覆盖层不抢焦点，淡出后移除；动画不循环。

## 5.3 样式字段与默认值（UI-2）

以下是 UI-2 的目标样式契约，不代表当前代码已经支持这些字段。默认值应由 `core/style.js` 的规范化函数统一提供，持久化时省略默认值；渲染、工具栏状态推导和样式哈希必须使用同一套规范化结果。

| 字段 | 类型 | 默认值 | 约束与语义 |
|---|---|---|---|
| `fontFamily` | `string \| null` | `null` | `null` 表示继承应用默认系统字体栈；只允许受控的系统字体选项，不接受任意 CSS 字符串 |
| `fontSize` | `number` | `13` | 整数，范围 8–72 px；字号增减按工具栏定义的步进执行 |
| `underline` | `boolean` | `false` | 下划线 |
| `strike` | `boolean` | `false` | 删除线 |
| `verticalAlign` | `top \| middle \| bottom` | `middle` | 单元格内容垂直对齐 |
| `wrapText` | `boolean` | `false` | 是否在单元格内换行；UI-2 首期不自动改变行高 |
| `rotation` | `0 \| 45 \| -45 \| 90` | `0` | 文本绘制角度；编辑器保持水平，命中矩形不随文字旋转 |
| `decimals` | `number \| null` | `null` | `null` 表示采用对应 `numberFormat` 的默认精度；整数 0–6 表示显式小数位覆盖 |

`decimals` 只对 `number` 与 `percent` 数字格式生效；`general` 与 `date` 忽略该字段。百分比的默认显示精度沿用当前格式化规则（0–2 位）；用户显式设置 `decimals` 后覆盖默认精度。切换到不适用的格式时可以保留该样式值，但格式化器不得将其应用于日期或常规文本。样式字段扩展必须同步更新规范化、合并、哈希、渲染和测试。

## 6. 实施阶段

### UI-1：外壳骨架与已有能力接入（已完成 2026-11-18）

- 新增 `components/AppHeader.vue`、`components/FormatToolbar.vue`、`components/FormulaBar.vue`，`EditorPage` 只负责组合与状态编排。
- 按 3.1 的 7 组顺序重排工具栏；已有能力（撤销/恢复、加粗/斜体、对齐、颜色、边框、数字格式）接入。
- 地址移入编辑栏；实现 `active-change` 对象与 `applyInput`。
- 新增 icon-only `sheetlite-logo-mark.svg` 并接入页头（mark + “Sheet Lite” 文本）；原始动画 logo 用于首次启动 splash（`sessionStorage` 去重、reduced-motion 跳过），favicon 使用 mark；行/列隐藏入口迁到表头右键菜单或“更多”。
- 产出：布局与顺序符合规格，编辑栏可读写单格，按钮状态随选区更新。

### UI-2：样式模型扩展

- `core/style.js` 增加 `fontFamily`、`fontSize`、`underline`、`strike`、`verticalAlign`、`wrapText`、`rotation`、`decimals`。
- 渲染器支持字体/字号、下划线/删除线、垂直对齐、换行（固定行高内裁剪）、旋转（单元格中心旋转，编辑框保持水平）。
- 数字格式扩展小数位：`numberFormat` 保持类型枚举，新增 `decimals`；增加/减小按钮修改小数位。
- 同步更新 `formatCellText`、样式测试与工具栏按钮。

### UI-3：格式刷

- 复制活动单元格的解析样式为补丁；点击目标单元格/区域后一次性应用；`Esc` 退出。
- 目标为整行/整列/全表时复用分层样式命令。
- 需要明确的视觉反馈（按钮激活、光标 crosshair）。

### UI-4：合并单元格

- 引入 `MergeStore`、`MERGE_CELLS`/`UNMERGE_CELLS` 命令、锚点语义、重叠校验、选区/渲染/命中测试适配。
- 工具栏“合并单元格”按钮从禁用转为可用。
- 该阶段独立于 UI-1/2，先完成模型与几何再做 UI。

### 依赖其他阶段

- **公式**：阶段 6 的 `FormulaEngine` 适配层完成后，启用公式按钮与 `fx`。
- **筛选/排序**：需要数据区域识别与排序命令；建议放在阶段 7（导入导出与性能）附近，作为数据处理能力的一部分。

## 7. 验收标准

### 自动化

- 单测：样式扩展字段的规范化/合并；小数位格式化；编辑栏状态推导（单格/多选/整行/整列/全表）；格式刷状态机。
- 组件/集成：工具栏分组顺序、按钮启用/混合态；`active-change` 负载；编辑栏提交调用 `SET_CELL`。
- Edge/CDP（按项目约定）：DOM 顺序与分组；地址位于编辑栏左侧；编辑栏输入 → 单元格更新 → 撤销恢复；页头 mark 加载、启动动画可播放且 reduced-motion 下跳过。

### 人工

- 工具栏在 1280 / 1440 / 1920 宽度下的换行/溢出表现。
- 动画在 `prefers-reduced-motion: reduce` 下不播放。
- 编辑栏与内联编辑焦点切换、IME 组合、Esc 取消。
- 表头右键菜单中的隐藏/显示行列。

## 8. 风险与开放问题

1. **合并单元格**：已确认按 UI-4 独立阶段推进；锚点、重叠、行列插入删除、复制粘贴与撤销仍需在 UI-4 设计评审时定稿。
2. **筛选/排序**：已确认放到后续数据处理阶段；需要先定义“数据区域”和排序后的持久化语义，否则容易变成一次性 UI。
3. **字体可用性**：只使用系统字体（微软雅黑、宋体、Arial、Calibri 等），不引入 Web Font；跨平台渲染差异需在验收中记录。
4. **换行与行高**：首期在固定行高内裁剪；自动行高会牵动尺寸索引与滚动，需单独评估。
5. **旋转文本**不改命中矩形，编辑框保持水平；需要在验收中确认不产生错位。
6. **工具栏窄屏策略**：折叠阈值与“更多”菜单内容需要在实现时用真实宽度测试。
7. **图标命名**：`@vicons/material` 使用 `*Outlined` 后缀；实现时以实际导出为准，避免整包引入。

## 9. 预计改动文件（实施时）

```text
frontend/src/components/AppHeader.vue          # 新增
frontend/src/components/FormatToolbar.vue      # 新增
frontend/src/components/FormulaBar.vue         # 新增
frontend/src/pages/EditorPage.vue              # 组合外壳、迁移地址
frontend/src/spreadsheet/SpreadsheetGrid.vue   # active-change 负载、applyInput/undo/redo、history-change
frontend/src/spreadsheet/core/style.js         # 字体/字号/下划线/删除线/垂直对齐/换行/旋转/小数位
frontend/src/spreadsheet/core/format.js        # decimals
frontend/src/spreadsheet/rendering/gridRenderer.js
frontend/src/spreadsheet/commands/*            # 格式刷/合并（后续阶段）
frontend/src/__tests__/*                       # 纯函数测试
frontend/index.html                            # favicon（mark）
frontend/public/sheetlite-logo-mark.svg        # 新增：从静态 logo 裁剪，仅图案、无字标
```

## 10. UI-1 实施记录（2026-11-18）

### 10.1 实际布局

```text
AppHeader 56px：mark(32) + Sheet Lite + 阶段标签/提示
FormatToolbar：7 组，窄屏自动换行；末尾“更多”承载隐藏/显示行列
FormulaBar 36px：名称框(96) + fx(32) + 原始输入(flex)
Grid：flex:1
```

实测高度：header 57、toolbar 41、formula 37；网格从 y≈147 开始（1500×900 视口）。

### 10.2 已落地

- 新增 `components/AppHeader.vue`、`FormatToolbar.vue`、`FormulaBar.vue`、`AppSplash.vue`；`App.vue` 组合页面与启动动画。
- 工具栏按 7 组顺序接入：撤销/恢复（带 `canUndo/canRedo` 状态）、加粗/斜体、水平对齐、文本色/填充色、边框、数字格式；未实现项（字体/字号/下划线/删除线/垂直对齐/换行/旋转/小数位/格式刷/合并/公式/筛选/排序）保留禁用按钮与阶段 tooltip。
- 编辑栏与网格契约：
  - `active-change` 返回对象：`address`、`mode`、`selectionKind`、半开区间 `range`、`activeCell`、`rawInput`（多选为 `null`）、`displayText`、`valueType`、`editable`。
  - 网格暴露 `applyInput`、`commitActiveEdit`、`moveActive`、`focusGrid`、`undo/redo`，并通过 `history-change` 推送历史状态。
  - 编辑栏支持 Enter 提交下移、Tab 提交右移、Esc 取消、失焦提交、IME 组合守卫；点击工具栏前先提交唯一编辑会话。
- 品牌：`sheetlite-logo-mark.svg` 从静态 logo 裁剪（viewBox `424 287 1150 1150`），页头 32px，favicon 使用 mark；启动动画 1.2s 后淡出并移除，`sessionStorage` 去重，reduced-motion、存储异常、资源加载失败均安全降级。
- 行/列隐藏入口从工具栏迁移到“更多”菜单。

### 10.3 验证

- `yarn test`：114 个用例通过；`yarn lint`、`yarn build` 通过。
- Edge/CDP 实测：
  - 7 组顺序为 history/font/text/fill/align/number/data，名称框位于编辑栏左侧且顶栏不再显示地址。
  - 编辑栏输入 `123` + Enter → A1=123、活动单元格 A2；撤销清空、恢复还原。
  - 编辑栏输入后点击工具栏 → 先提交文本再执行加粗（A1=456 且 bold）。
  - 失焦提交：编辑栏改为 `789` 后点击 B2 → A1=789，选区 B2。
  - A1:B2 选区的 `active-change.range = {startRow:0,endRow:2,startCol:0,endCol:2}`，`rawInput=null`、`editable=false`。
  - splash 可见后自动移除；reduced-motion 下不出现且不写 sessionStorage。
  - “更多 → 隐藏行/显示行”将行高在 0 与 24 之间切换。

### 10.4 已知限制 / UI-1 未覆盖

- UI-2 的样式控件当前为禁用占位；公式、合并、筛选、排序保持禁用。
- 编辑栏不实时镜像内联编辑器的逐字输入；聚焦编辑栏时会先提交内联编辑（保持唯一输入源）。
- 工具栏窄屏采用换行，尚未实现“更多”折叠策略；隐藏/显示行列已放入“更多”。
- 启动动画按会话去重，同一标签页刷新不会重复播放。

