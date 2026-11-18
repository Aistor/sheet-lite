# 13. 应用外壳：工具栏、编辑栏与品牌

> 状态：方案已定（2026-11-18），实施前评审；本文只描述目标设计与落地步骤，不代表已实现。
>
> 关联文档：[03 前端工程设计](03-frontend.md)、[07 命令、剪贴板、撤销重做与公式](07-editing-formula.md)、[10 分阶段实施计划](10-roadmap.md)、[12 架构决策记录](12-decisions.md)。

## 1. 现状与差距

### 1.1 当前布局

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

- **状态派生**：按钮激活态取自“当前选区解析后的样式”；选区包含多种值时显示混合态（按钮不高亮、下拉显示“—”）。
- **禁用与提示**：未实现能力（合并、公式、筛选、排序）保留按钮位置但禁用，`title`/tooltip 注明依赖阶段，避免用户误以为可用。
- **快捷键**：`Ctrl+Z`、`Ctrl+Y`/`Ctrl+Shift+Z`、`Ctrl+B`、`Ctrl+I`、`Ctrl+U`；快捷键与按钮共用同一命令入口。
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

```js
// SpreadsheetGrid 向外抛出的活动单元格信息
{
  address: 'A1' | 'A:A' | '1:1' | '全部',
  mode: 'cells' | 'rows' | 'columns' | 'all',
  row: number,          // cells 模式下的锚点；其他模式为 0
  col: number,
  rawInput: string,     // 权威输入；多选时为空串
  displayText: string,  // 格式化后的展示文本，仅用于提示
  valueType: 'text',
  editable: boolean     // 仅单格为 true
}

// 网格暴露给外壳的方法
applyInput(text)      // 走 SET_CELL 命令；空串删除单元格
undo() / redo()
canUndo / canRedo     // 或通过 history-change 事件推送
focusGrid()           // 提交后把焦点还给网格
```

- 现有 `active-change` 只返回地址字符串，UI-1 中升级为上述对象；`EditorPage` 同步修改。
- 外壳组件（`components/AppHeader.vue`、`FormatToolbar.vue`、`FormulaBar.vue`）**不得**直接访问 `SparseCellStore`、`SparseStyleStore` 或命令管理器；只通过 `EditorPage` 编排与网格公开 API 交互。
- 地址的唯一展示位是名称框；顶栏不再重复显示。

### 4.3 行为

- **单格**：显示 `rawInput`；进入编辑栏时，若网格内联编辑器未关闭，先提交内联编辑，保证同一时刻只有一个输入源。
- **多选/整行/整列/全表**：内容框禁用，显示占位提示（如“已选择 3 行 × 2 列”）；名称框显示范围。
- **提交**：`Enter` 提交并下移；`Tab` 提交并右移；`Esc` 恢复原值；失焦提交（与内联编辑器一致，避免丢数据）。
- **输入法**：组合期间不响应 `Enter`/`Esc`；与现有编辑器共用 composition 守卫。
- **撤销**：编辑栏提交同样进入 `SET_CELL` 命令，`Ctrl+Z` 可撤销，可被工具栏撤销按钮触发。
- **公式**：阶段 6 前内容框不解析 `=`，按普通文本保存；`fx` 与公式按钮禁用。
- **多行文本**：当前统一单行；`wrapText` 只影响画布渲染，编辑栏保持单行滚动。

## 5. Logo 与动画

### 5.1 资源

| 文件 | 用途 | 说明 |
|---|---|---|
| `frontend/public/sheetlite-high-resolution-logo.svg` | 静态品牌图 / favicon | 2000×2000 viewBox，内容区 1500×1500，配色 `#358051` / `#073106` |
| `frontend/public/sheetlite-animated-logo.svg` | 头部动画 logo | 同一图形，内嵌 CSS keyframes（`lm-fly` / `lm-pop` / `lm-rise` / `lm-fade`），自带 `prefers-reduced-motion` 降级 |

- 两个文件由用户提供，目前未被 Git 跟踪；实施 UI-1 时一并提交。
- SVG 无外部依赖，`<img>` 直接引用即可播放 CSS 动画，不需要额外 JS。

### 5.2 接入方式

- **AppHeader**：`<img src="/sheetlite-animated-logo.svg" width="48" height="48" alt="Sheet Lite">`，固定宽高避免 CLS；动画在页面加载时播放一次。
- **重播**：悬停/点击品牌区时通过改变 `key` 重新挂载 `<img>`（或临时切到静态图再切回），不修改 SVG 内容。
- **静态兜底**：当动画资源加载失败或用户偏好减少动态效果时使用 `sheetlite-high-resolution-logo.svg`；SVG 内部的媒体查询只处理动画，页面侧再用 `matchMedia('(prefers-reduced-motion: reduce)')` 选择静态图。
- **Favicon**：`index.html` 增加 `<link rel="icon" type="image/svg+xml" href="/sheetlite-high-resolution-logo.svg">`。
- **清晰度**：方形构图约 1500×1500 内容区，48px 高度在 2× 屏仍有余量；不要用 `<img>` 拉伸到非等比尺寸。
- **可读性**：logo 自带 “SHEETLITE” 字标，48px 下字标较小；若评审认为不可读，再从同一 SVG 裁出 icon-only 版本（仅 “S” 图形）用于头部，字标只在启动页/关于页使用。此项列为开放问题。

## 6. 实施阶段

### UI-1：外壳骨架与已有能力接入

- 新增 `components/AppHeader.vue`、`components/FormatToolbar.vue`、`components/FormulaBar.vue`，`EditorPage` 只负责组合与状态编排。
- 按 3.1 的 7 组顺序重排工具栏；已有能力（撤销/恢复、加粗/斜体、对齐、颜色、边框、数字格式）接入。
- 地址移入编辑栏；实现 `active-change` 对象与 `applyInput`。
- 接入 logo、动画、favicon；行/列隐藏入口迁到表头右键菜单或“更多”。
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
- Edge/CDP（按项目约定）：DOM 顺序与分组；地址位于编辑栏左侧；编辑栏输入 → 单元格更新 → 撤销恢复；logo 元素加载、动画资源可播放。

### 人工

- 工具栏在 1280 / 1440 / 1920 宽度下的换行/溢出表现。
- 动画在 `prefers-reduced-motion: reduce` 下不播放。
- 编辑栏与内联编辑焦点切换、IME 组合、Esc 取消。
- 表头右键菜单中的隐藏/显示行列。

## 8. 风险与开放问题

1. **合并单元格**语义复杂（锚点、重叠、行列插入删除、复制粘贴、撤销），不在 UI-1/2 内完成，需单独立项。
2. **筛选/排序**需要先定义“数据区域”和排序后的持久化语义，否则容易变成一次性 UI。
3. **字体可用性**：只使用系统字体（微软雅黑、宋体、Arial、Calibri 等），不引入 Web Font；跨平台渲染差异需在验收中记录。
4. **换行与行高**：首期在固定行高内裁剪；自动行高会牵动尺寸索引与滚动，需单独评估。
5. **旋转文本**不改命中矩形，编辑框保持水平；需要在验收中确认不产生错位。
6. **Logo 字标可读性**：48px 下 “SHEETLITE” 字标偏小，可能需要 icon-only 裁剪版；请评审确认。
7. **工具栏窄屏策略**：折叠阈值与“更多”菜单内容需要在实现时用真实宽度测试。
8. **图标命名**：`@vicons/material` 使用 `*Outlined` 后缀；实现时以实际导出为准，避免整包引入。

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
frontend/index.html                            # favicon
```
