# 03. 前端工程设计

## 1. 目录结构

```text
frontend/
├── public/                     # 品牌 SVG：静态 logo、动画 logo、favicon
├── src/
│   ├── app/                    # 应用初始化、路由守卫、全局插件
│   ├── pages/                  # 工作簿列表、编辑器页面
│   ├── components/             # 应用外壳：AppHeader、FormatToolbar、FormulaBar
│   ├── api/                    # HTTP client 与 API 封装
│   ├── stores/                 # Pinia：用户、工作簿导航等应用状态
│   └── spreadsheet/
│       ├── core/               # 纯领域模型、类型/接口、事件定义
│       ├── store/              # 稀疏单元格、样式、行列尺寸、合并区域存储
│       ├── viewport/           # 滚动状态、可视范围、overscan、冻结区视口
│       ├── layout/             # 逻辑坐标/像素坐标转换、尺寸索引
│       ├── rendering/          # Canvas 绘制、绘制缓存、脏区管理
│       ├── interaction/        # 鼠标/键盘/输入法、焦点、选区交互
│       ├── commands/           # 命令定义、执行、撤销重做
│       ├── clipboard/          # TSV/HTML/内部格式复制粘贴
│       ├── formula/            # 公式引擎适配、依赖与重算调度
│       ├── persistence/        # API 适配、加载保存、revision 与冲突状态
│       ├── collaboration/      # 未来协作协议适配，不承载首期实现
│       └── __tests__/
├── tests/manual/               # 浏览器端人工验收清单
├── package.json
└── vite.config.js
```

目录是职责边界，不要求每个目录首期都创建完整实现。禁止为了“结构完整”提前堆放空类或无实际用途的抽象。

## 2. 前端核心模块边界

核心原则：**模型保存事实，命令表达变更，交互产生意图，渲染只读模型，持久化负责与服务端同步。**

模块边界采用“依赖抽象、不依赖实现”的原则：`core` 定义领域模型和值对象，并声明内核需要的存储能力契约；`store` 提供这些契约的具体实现；组合根负责创建具体实现并注入。`core` 不得导入或实例化 `store` 中的任何具体类。

| 模块 | 唯一职责 | 允许依赖 | 禁止事项 |
|---|---|---|---|
| `core` | Workbook/Worksheet 等领域模型；基础值对象、坐标/范围契约、领域事件契约，以及内核所需的存储端口（port）契约 | JavaScript 标准能力；自身定义的契约 | 不导入 `store` 实现、Vue、Pinia、Canvas、DOM、HTTP、Naive UI、具体公式库；不实例化基础设施对象 |
| `store` | 稀疏单元格、样式、尺寸、合并区域的读写与索引 | `core` 的值对象和契约（仅类型/JSDoc 契约依赖，或实现其约定） | 不处理鼠标键盘、不绘制、不请求 API、不自行决定业务权限；不反向要求 `core` 了解其实现细节 |
| `viewport` | 根据滚动偏移、容器尺寸和冻结区计算可视范围及缓冲区 | `core` 坐标/范围契约、`layout` 的几何查询能力 | 不修改单元格数据、不管理选区、不直接绘制 |
| `layout` | 逻辑行列与像素坐标互转、尺寸累计与反查、合并区域几何计算 | `core` 坐标/范围及只读查询契约 | 不依赖具体 Store 类；不读写 DOM、不监听全局事件、不改变模型 |
| `rendering` | 将模型快照和视口绘制为 Canvas；管理脏区、绘制缓存 | `core` 查询契约、注入的只读数据查询端口、`viewport`、`layout` | 不写业务数据、不执行命令、不请求 API、不承担交互状态真相 |
| `interaction` | 将鼠标、键盘、输入法事件解释为选区变化或用户意图；管理活动编辑器 | `viewport`、`layout`、`commands`、`clipboard`、`core` 契约 | 不直接拼 SQL/API、不绕过命令层修改模型、不把每格做成 Vue 组件 |
| `commands` | 定义并执行可验证的业务变更；提供撤销/重做及变更结果 | `core` 模型/端口契约、注入的存储端口、`formula` 的计算端口 | 不依赖具体 Store 类、Canvas/DOM/Naive UI；不直接发 HTTP 请求 |
| `clipboard` | 内部剪贴板格式及 TSV/HTML 转换、粘贴范围解析 | `core` 的坐标/范围契约、`commands` | 不直接修改 Store；不信任外部 HTML；不负责网络保存 |
| `formula` | 公式解析、依赖管理、计算调度及第三方引擎适配 | `core` 公式/坐标契约、注入的只读数据查询端口 | 不直接依赖具体 Store 类；不使用 `eval`；不控制 UI；不把计算缓存当作权威输入 |
| `persistence` | API DTO 转换、分块加载/保存、revision、operationId、保存状态与冲突处理 | `core` 契约、`commands` 的变更输出、`api` | 不绕过命令层直接改模型；不让 HTTP 细节渗入核心模块 |
| `collaboration` | 未来把本地命令映射到远端操作、处理协作协议 | `commands` 的稳定操作契约、`persistence` 的协议抽象 | 首期不引入 CRDT/WebSocket；不直接操作渲染器 |

### 2.1 依赖方向

箭头表示“左侧可以依赖右侧”。其中 `core` 是内核依赖的稳定契约层，**不依赖任何具体基础设施实现**；`store` 实现 `core` 声明的存储端口；组合根是唯一负责将具体实现装配到内核的位置。

```text
                         spreadsheet 组合根
                 （createSpreadsheetEngine / app 装配层）
                    │ 创建实例、注入依赖、连接事件
          ┌─────────┼──────────┬───────────────┐
          ▼         ▼          ▼               ▼
        core      store    commands       viewport / layout
          ▲         │          │               │
          └─────────┘          └──────┬────────┘
             store 实现 core 契约     │
                                      ▼
                interaction / rendering / formula / persistence
                       依赖 core 契约及注入的端口
```

具体约束：

1. `core` 定义存储端口契约，例如 `CellStorePort`、`StyleStorePort`、`DimensionStorePort`、`MergeStorePort`。这些契约描述能力和输入输出，不暴露 `Map`、分块结构等实现细节。
2. `store` 实现上述契约，例如 `SparseCellStore`。它可以使用 `Map`、分块 Map 或其他数据结构，但这些实现选择不得泄漏到 `core` 的公开契约中。
3. `core` 中的 `WorksheetModel` 通过构造参数接收端口实例；不得在构造函数、字段初始化器或方法中 `new SparseCellStore()`。
4. `commands`、`formula`、`rendering`、`layout` 等模块通过参数接收所需端口，只依赖端口语义，不导入具体 `store` 实现。
5. 组合根（建议集中在 `spreadsheet/createSpreadsheetEngine.js`，也可由应用装配层调用该工厂）可以同时导入 `core`、`store` 和其他具体模块，并负责实例化、注入和连接订阅。除组合根外，页面和业务模块不得各自重复创建底层 Store。
6. `store` 对 `core` 的依赖仅用于遵循契约。JavaScript 项目可用 JSDoc `import()` 类型引用表达接口约束，不要求为运行时接口引入额外依赖；如需运行时校验，应使用轻量契约校验，不得形成反向依赖。
7. 若模块之间出现循环依赖，应提取稳定的契约/事件到 `core`，或由组合根编排；禁止通过动态 import、共享全局对象或反向导入具体实现绕过边界。

建议的依赖关系摘要：

| 发起模块 | 可以依赖 | 不允许依赖 |
|---|---|---|
| `core` | JavaScript 标准能力、`core` 内部契约 | `store`、`commands`、Vue、DOM、Canvas、HTTP |
| `store` | `core` 值对象与端口契约 | `commands`、`rendering`、`interaction`、Vue、DOM |
| `commands` | `core` 契约；通过注入使用 Store/Formula 端口 | `store` 具体类、Canvas、DOM、HTTP |
| `layout` / `viewport` | `core` 坐标契约及注入的尺寸/合并查询端口 | `store` 具体类、Vue、DOM |
| `rendering` | `core` 查询契约、注入的只读查询端口、`layout`、`viewport` | `store` 具体类、`commands` 的写入能力、HTTP |
| `interaction` | `core`、`layout`、`viewport`、`commands`、`clipboard` | Store 具体类、直接数据写入 |
| `formula` | `core`、注入的只读查询/计算结果端口 | Store 具体类、UI、DOM |
| `persistence` | `core`、`commands` 输出契约、`api` | Store 具体类、渲染/交互模块 |
| 组合根 | 上述模块的具体实现 | 业务规则本身（组合根只装配，不承载领域逻辑） |

### 2.2 存储端口与依赖注入示例

以下示例表达依赖方向和接口语义，方法可随实现演进，但不得改变“抽象由 core 定义、实现由 store 提供、实例由组合根注入”的原则。

```js
// core/contracts/storage.js
/**
 * @typedef {Object} CellStorePort
 * @property {(row: number, col: number) => CellRecord | undefined} get
 * @property {(row: number, col: number, cell: CellRecord) => void} set
 * @property {(row: number, col: number) => void} delete
 * @property {(range: Range) => Iterable<CellRecord>} entriesInRange
 */

// core/worksheet-model.js
export class WorksheetModel {
  /**
   * @param {{ id: string, name: string, rowCount: number,
   *   columnCount: number, cellStore: CellStorePort,
   *   styleStore: StyleStorePort, rowHeights: DimensionStorePort,
   *   columnWidths: DimensionStorePort, mergeStore: MergeStorePort }} options
   */
  constructor(options) {
    this.id = options.id;
    this.name = options.name;
    this.rowCount = options.rowCount;
    this.columnCount = options.columnCount;
    this.cellStore = options.cellStore;
    this.styleStore = options.styleStore;
    this.rowHeights = options.rowHeights;
    this.columnWidths = options.columnWidths;
    this.mergeStore = options.mergeStore;
  }
}

// store/sparse-cell-store.js
export class SparseCellStore {
  // 实现 core/contracts/storage.js 中约定的 CellStorePort 能力
}

// spreadsheet/createSpreadsheetEngine.js（组合根）
export function createSpreadsheetEngine(options) {
  const cellStore = new SparseCellStore();
  const styleStore = new SparseStyleStore();
  const rowHeights = new DimensionStore();
  const columnWidths = new DimensionStore();
  const mergeStore = new MergeStore();

  const worksheet = new WorksheetModel({
    ...options.worksheet,
    cellStore,
    styleStore,
    rowHeights,
    columnWidths,
    mergeStore,
  });

  return createEngineServices({ worksheet, cellStore, styleStore, rowHeights,
    columnWidths, mergeStore });
}
```

注意：上例中的 `createEngineServices` 代表组合根继续装配命令、渲染、交互等服务的步骤，不要求在 M0 提前实现。目录或文件尚不存在时，不要为了匹配示例提前创建空文件。

### 2.3 跨模块变更契约

- 用户编辑、清空、粘贴、格式修改、行列插入删除等变更统一转换为 `Command`。
- 命令执行前校验坐标、范围、合并约束及必要的业务规则；执行后返回明确的变更结果（受影响范围、变更单元格、是否需要重算等）。
- `Store` 只提供契约约定的数据读写能力，不自行广播 UI 事件。由命令或模型层在一次变更成功后发布领域变更通知。
- `Renderer` 订阅变更通知，将受影响范围标记为 dirty；必要时先全量重绘，后续再基于基准测试优化脏区绘制。
- `Formula` 接收变更范围并更新依赖/重算，计算结果通过受控接口写入可重建的计算缓存；公式原始输入仍是权威数据。
- `Persistence` 订阅已提交的命令结果，生成带 `operationId`、`baseRevision` 的操作 DTO；服务端确认后推进已保存 revision。
- `Interaction` 管理临时选区和编辑状态，但不得将未提交的编辑内容伪装成模型已保存数据。

建议先定义以下最小接口，具体命名可随实现调整，但语义应保持稳定：

```js
// Command 的语义示意，不是要求照搬的最终 API
{
  id: 'set-cell-values',
  execute(context) {},       // 通过 context 注入的端口执行，返回变更结果
  undo(context) {},
  serialize() {}             // 可持久化的操作描述
}

// 变更结果示意
{
  affectedRanges: [],
  changedCells: [],
  formulaDirty: true,
  structural: false
}
```

### 2.4 状态归属

- Pinia：用户信息、工作簿列表、当前工作簿 ID、页面级工具栏状态、对话框状态。
- Spreadsheet Core：工作簿/工作表领域数据、领域事件；选区、编辑会话、命令历史、视口与保存协调状态由各自内核模块管理，不应全部塞进领域模型。
- Canvas：只保留绘制缓存、脏区等可重建状态，不作为业务数据源。
- DOM 编辑器：只承载当前活动单元格的输入交互；提交后通过命令写入模型。
- 不将百万行单元格放入深层 Vue 响应式对象。通过 `shallowRef`、事件订阅或显式版本号通知页面更新。

### 2.5 应用外壳与内核的交互

- 应用外壳组件（`components/AppHeader.vue`、`FormatToolbar.vue`、`FormulaBar.vue`）由 `EditorPage` 组合，只负责展示与意图收集；不得直接访问 `SparseCellStore`、`SparseStyleStore` 或命令管理器。
- 外壳通过 `SpreadsheetGrid` 暴露的事件与方法与内核交互：活动单元格信息（地址、选区模式、`rawInput`、可编辑性）、`applyInput`、`undo/redo`、`history-change`。所有写入仍走命令层。
- 单元格地址统一显示在编辑栏左侧的名称框；编辑栏显示原始输入，格式化展示由渲染层负责。
- 图标统一使用 `@vicons/material` 的具名导入（按需打包）；品牌资源放在 `public/`，动画遵循 `prefers-reduced-motion`。
- 工具栏分组、编辑栏行为与分阶段落地的详细规格见 [13 应用外壳](13-ui-shell.md)。

## 3. 核心模型示例

领域模型只接收由组合根注入的存储端口，不负责选择或创建具体存储实现：

```js
export class WorkbookModel {
  constructor({ id, revision = 0, worksheets = [] }) {
    this.id = id;
    this.revision = revision;
    this.worksheets = new Map(worksheets.map((sheet) => [sheet.id, sheet]));
  }
}

export class WorksheetModel {
  constructor({
    id,
    name,
    rowCount,
    columnCount,
    cellStore,
    styleStore,
    rowHeights,
    columnWidths,
    mergeStore,
  }) {
    this.id = id;
    this.name = name;
    this.rowCount = rowCount;
    this.columnCount = columnCount;
    this.cellStore = cellStore;
    this.styleStore = styleStore;
    this.rowHeights = rowHeights;
    this.columnWidths = columnWidths;
    this.mergeStore = mergeStore;
  }
}
```

`WorksheetModel` 不得出现 `new SparseCellStore()`、`new SparseStyleStore()` 等具体实现实例化。具体实现由 `spreadsheet/createSpreadsheetEngine.js`（或应用装配层）创建后注入。存储端口契约见“2.2 存储端口与依赖注入示例”。

这只是边界示意；`SparseCellStore` 不应以完整二维数组实现。单元格可用 `Map`/分块 Map 存储非空值，具体结构由基准测试决定。

## 4. 单元格数据结构

建议区分用户输入、公式、计算结果与样式：

```js
{
  row: 12,
  col: 3,
  rawInput: '=SUM(A1:A10)',
  valueType: 'formula',
  calculatedValue: 42,
  styleId: 7
}
```

持久化字段不必完全照搬这个运行时对象。运行时对象可以包含缓存字段；数据库只保存可恢复的权威状态和必要计算缓存。

## 5. Canvas + DOM 编辑层

Canvas 适合绘制大量可见单元格，但不适合直接承载文本输入。推荐：

- Canvas：网格线、单元格显示文本、背景、边框、选区、合并区域。
- DOM 编辑层：当前活动单元格的 input/textarea/contenteditable。
- Naive UI：工具栏、右键菜单、格式对话框、名称框、提示。
- 无障碍：键盘焦点、ARIA 标签、屏幕阅读器行为需要专门设计。

不要在滚动时重建整个应用组件树。将滚动、选区和绘制更新限制在表格内核的局部更新机制中。

## 6. 虚拟化与坐标

- 行列使用逻辑索引，避免把所有行列实例化为对象。
- 固定行高/列宽时，坐标映射可直接计算。
- 支持可变尺寸时，使用前缀和或 Fenwick Tree（树状数组）等结构进行位置查询和尺寸更新。
- 绘制范围为可视区域 + 少量 overscan。
- 处理浏览器最大滚动尺寸：必要时采用滚动位置重定位/分段滚动，不把单一 DOM 高度当作无限坐标空间。
- 合并单元格影响命中测试和绘制区域，需要在可视区域查询时包含跨边界合并块。

## 7. 前端模块开发验收

新增或修改核心模块时，PR/任务交付至少说明：

1. 模块职责是否变化，是否新增跨模块依赖。
2. 输入/输出契约、事件或命令是否变化。
3. 是否存在绕过命令层写 Store、渲染层写业务数据、核心层依赖 Vue/DOM/HTTP 的情况。
4. 对应单元测试和集成测试覆盖了哪些边界；未覆盖项明确列出。
5. 对性能敏感路径提供可复现的数据规模、浏览器/设备、操作步骤、耗时与内存结果。

## 8. 前端状态与响应式

Pinia 仅管理工作簿列表、当前工作簿 ID、工具栏状态、保存状态等应用级状态。不要把百万行的单元格都放进深层 Vue 响应式对象。

核心模型应提供事件/订阅接口；渲染器按受影响区域刷新。必要时使用 `shallowRef` 或轻量事件总线连接 Vue 页面与核心模型。

## 9. 错误与保存状态

UI 至少区分：

- `saved`：当前 revision 已确认保存
- `saving`：存在未确认写操作
- `conflict`：服务端 revision 不匹配
- `offline`：网络不可用
- `error`：不可恢复或需要用户操作的错误

不要把“本地已显示”误认为“服务器已保存”。用户离开页面前，对未确认操作应提示或提供重试机制。

## 10. 依赖管理与开发命令

使用 **Yarn Classic 1.22.22** 作为唯一的前端包管理器，并将 `yarn.lock` 纳入版本控制。不得混用 npm、pnpm 或 Yarn Berry；不启用 Plug'n'Play。

在 `frontend/package.json` 中声明包管理器版本：

```json
{
  "packageManager": "yarn@1.22.22"
}
```

本地与 CI 均固定使用 Yarn 1.22.22。安装依赖时使用冻结锁文件模式，避免安装过程静默改写 `yarn.lock`：

```bash
# 在 frontend/ 目录执行
yarn --version
yarn install --frozen-lockfile
yarn dev
yarn lint
yarn test
yarn build
```

以上脚本需在 `package.json` 中按实际配置定义；未配置的脚本不能直接假定存在。提交依赖变更时，应使用 Yarn 1.22.22 更新并提交 `yarn.lock`。CI 必须执行 `yarn install --frozen-lockfile`。

## 11. 编码规范

- JavaScript 使用 ESLint + Prettier；复杂公共接口写 JSDoc。
- 模块使用 ES Modules。
- 避免大型单文件组件；编辑器页面只编排组件与生命周期。
- 对坐标、范围、命令和 API DTO 定义统一的命名约定。
- 使用 Vitest 覆盖可自动化的逻辑与模块集成测试。
- 不引入 Playwright 或其他浏览器自动化框架；输入法 composition 事件、系统剪贴板权限、浏览器差异及完整业务流程通过 `tests/manual/` 中的人工验收清单验证，并记录浏览器、操作系统和结果。
