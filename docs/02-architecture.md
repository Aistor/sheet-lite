# 02. 总体架构与技术选型

## 1. 总体结构

```text
Browser
├── Vue 3 + JavaScript + Vite
├── Naive UI（菜单、对话框、工具栏、表单）
├── Spreadsheet Core（与 Vue 解耦）
│   ├── Workbook/Worksheet model
│   ├── Sparse CellStore / StyleStore
│   ├── Selection / Layout / Viewport
│   ├── Canvas Renderer + DOM Editor
│   ├── Commands / Clipboard / Undo-Redo
│   └── Formula Adapter
└── REST API
    ↓
Spring Boot 4
├── Controller（协议与参数校验）
├── Application Service（事务与用例编排）
├── Domain（命令、权限、版本语义）
├── Mapper（MyBatis-Plus + 自定义 XML/SQL）
├── MySQL
└── 后续：对象存储、任务队列、WebSocket/CRDT
```

## 2. 推荐技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| 前端 | Vue 3、JavaScript、Vite、Yarn Classic 1.22.22 | 不强制 TypeScript；使用 JSDoc、ESLint 提高可维护性；依赖统一由 Yarn 1.22.22 管理 |
| UI 外围 | Naive UI | 仅工具栏、弹窗、菜单、提示等 |
| 网格绘制 | Canvas 2D | 网格线、文字、选区、填充柄等 |
| 单元格编辑 | HTML input/textarea 或 contenteditable 层 | 保留输入法、选择文本、可访问性 |
| 前端状态 | Pinia（应用级）+ 核心模型 | 不把每个单元格都变成响应式对象 |
| 前端测试 | Vitest | 单元测试及可在测试环境中验证的模块集成测试；不引入 Playwright 等浏览器自动化框架 |
| 后端 | **JDK 21**、Spring Boot 4 | 使用本机 Maven 3.9.9；项目不使用 Maven Wrapper |
| ORM | MyBatis-Plus | 元数据和常规 CRUD；高吞吐单元格路径自定义 SQL |
| 数据库 | MySQL 8.x | InnoDB、事务、索引、备份与恢复 |
| 数据库管理 | AI 助手接手（开发阶段） | 个人开发，可用 Navicat/命令行；变更前备份，删除需授权；不要求迁移框架或执行器 |
| API 文档 | Springdoc/OpenAPI（确认与 Boot 版本兼容后） | 自动生成 API 文档 |
| 公式 | HyperFormula 评估适配层 | 先验证许可证、函数覆盖、容量和性能 |
| 协作（未来） | Yjs 或自研操作日志方案 | 需要先定义结构性编辑和冲突语义 |

项目 Java 版本固定为 JDK 21。Spring Boot 4 及 MyBatis-Plus、数据库驱动、Springdoc、测试库等第三方依赖的具体版本，须在创建工程时验证兼容性后锁定；不要长期写死未经验证的最新小版本。前端统一使用 **Yarn Classic 1.22.22**，通过 `package.json` 的 `packageManager: "yarn@1.22.22"` 声明版本，并提交 `yarn.lock`；安装依赖使用 `yarn install --frozen-lockfile`。项目不采用 Docker / Docker Compose 作为开发或部署前置条件。

## 3. 分层约束

### 前端

- `core` 不导入 Vue、Pinia、Canvas 或网络请求模块。
- `rendering` 读取模型快照，不拥有业务数据真相。
- `interaction` 把鼠标/键盘事件转成命令或选区变更。
- `persistence` 负责 API 适配、缓存与保存状态，不绕过命令层直接修改模型。
- `formula` 通过统一接口适配具体公式库，避免全项目绑定某一实现。

### 后端

- Controller 不直接调用 Mapper。
- Service/Application 层组织事务、权限和版本检查。
- Mapper 只负责持久化映射，不承载复杂业务规则。
- 单元格批量写入不能简单循环调用 `save()`。
- DTO、Entity、Command、Response 分离；避免把数据库实体直接作为外部 API 契约。

## 4. 关键数据流

1. 用户操作被解析为命令。
2. 命令校验坐标、范围和权限上下文。
3. 前端先应用可安全乐观更新的本地变更。
4. 命令被序列化为操作 DTO，携带 `operationId` 和 `baseRevision`。
5. 后端验证用户、工作簿权限、版本与操作范围。
6. 在事务中持久化数据并推进 revision。
7. 返回新 revision 和规范化后的结果。
8. 前端确认、回滚或按冲突策略重新加载。

## 5. 可扩展性边界

- 单体模块化优先，首期不拆微服务。
- 单元格数据量增长后，先优化批量 SQL、分块读取、索引和快照；再考虑缓存或异步任务。
- 大型 XLSX 导入导出使用异步任务和流式处理。
- 协作上线前，必须有操作日志保留策略、重放/快照机制和权限模型。
