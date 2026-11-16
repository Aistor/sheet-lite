# Sheet Lite

面向业务数据录入、查看和轻量分析的 Web 表格。交互参考 Google Sheets / Excel 的常用能力，但核心网格自研，不依赖成熟 Excel 网格组件。

- 前端：Vue 3 + JavaScript + Vite + Yarn Classic 1.22.22 + Naive UI（外围 UI）+ Canvas 2D（自研网格）
- 后端：JDK 21 + Spring Boot 4 + Maven 3.9.9 + MyBatis-Plus + MySQL 8.x
- 约束：稀疏存储、视口级读取/绘制、命令驱动的数据变更、revision + operationId 乐观并发

## 当前阶段

阶段 0：需求和工程基线。本仓库已完成文档与工程骨架，尚不包含网格渲染、编辑、命令、公式等业务实现。

- [x] `docs/` 项目文档与 ADR
- [x] 前端骨架（Vite + Vue 3 + ESLint + Vitest，核心坐标/范围契约与单测）
- [x] 后端骨架（Spring Boot 4 + JDK 21 + 统一响应/异常 + traceId + 健康检查）
- [x] 根目录 `README.md`、`.gitignore`、`.editorconfig`
- [x] MySQL `sheet_lite` 库按 `V001__init_schema.sql` 初始化，结构与基线一致（11 张 `sl_*` 表、无 `schema_version`、`utf8mb4_0900_ai_ci`、表/列注释齐全）
- [ ] CI 门禁（`origin` 远端已建立，尚未配置流水线）

## 目录结构

```text
sheet-lite/
├── frontend/                 # Vue 3 应用与表格内核
│   ├── src/
│   │   ├── pages/            # 页面
│   │   ├── spreadsheet/      # 表格内核（当前只有 core 的坐标/范围契约）
│   │   └── styles.css
│   └── tests/manual/         # 浏览器人工验收清单
├── backend/                  # Spring Boot 服务（本机 Maven，无 Wrapper）
│   ├── src/main/java/com/example/sheetlite/
│   └── src/main/resources/
│       ├── application.yml           # 通用配置，不含凭据
│       ├── application-local.yml     # 本地数据源覆盖，已被 .gitignore 忽略
│       ├── application-local.example.yml  # 本地配置模板
│       └── db/migration/V001__init_schema.sql
├── docs/                     # 架构、模块契约、API 与阶段计划
├── .dsh/skills/              # 仓库级 Skill（随仓库提交）
├── .editorconfig
└── .gitignore
```

## 环境要求

| 依赖 | 版本 | 说明 |
|---|---|---|
| Node.js | >= 22.12（本机 24.x） | 前端构建 |
| Yarn | 1.22.22 | 唯一前端包管理器，不要混用 npm/pnpm/Yarn Berry |
| JDK | 21 | 后端编译与运行基线 |
| Maven | 3.9.9 | 本机安装并配置 `mvn` 命令；项目不使用 Maven Wrapper |
| MySQL | 8.x | 本机或独立环境，不使用 Docker |

## 快速开始

### 前端

```bash
cd frontend
yarn --version                # 必须输出 1.22.22
yarn install --frozen-lockfile
yarn dev                      # http://localhost:5173
```

### 后端

```bash
cd backend
mvn -version                 # 确认 Maven 3.9.9、JDK 21
mvn spring-boot:run          # http://localhost:8080
curl http://localhost:8080/api/health
```

后端启动不强制要求数据库可达（连接池延迟初始化），但数据库相关功能需要正确凭据。

`application.yml` 只保留公共配置，数据源默认值放在 `backend/src/main/resources/application-local.yml`。该文件被 `.gitignore` 的 `*local.yml` 忽略，新环境以同目录的 `application-local.example.yml` 为模板创建，或直接用环境变量提供连接参数。

### 数据库

开发阶段数据库由 AI 助手接手管理，删除类操作需仓库所有者授权。

```bash
# 只读核验（凭据通过环境变量或客户端 option file 提供，不写入仓库）
mysql --host=127.0.0.1 --port=3306 --user=<user> --database=sheet_lite \
  -e "SHOW TABLES LIKE 'sl_%';"
```

预期 11 张业务表（`sl_workbook`、`sl_worksheet`、`sl_cell` 等，详见 `docs/05-database-mybatis-plus.md`），不包含 `schema_version`。

## 配置与环境变量

数据源默认值放在未入库的 `application-local.yml`，环境变量可覆盖；仓库内不保存任何凭据：

| 变量 | 取值来源 | 说明 |
|---|---|---|
| `SPRING_DATASOURCE_URL` | `application-local.yml`，可被环境变量覆盖 | 默认指向本机 `sheet_lite` |
| `SPRING_DATASOURCE_USERNAME` | `application-local.yml`，可被环境变量覆盖 | 本地开发账号 |
| `SPRING_DATASOURCE_PASSWORD` | `application-local.yml`，可被环境变量覆盖 | 禁止提交到 Git |
| `SERVER_PORT` | `8080` | 服务端口 |
| `SPRING_PROFILES_ACTIVE` | `local` | 默认本地开发配置 |

前端开发态通过 Vite 代理把 `/api` 转发到 `http://localhost:8080`。

## 常用命令

| 位置 | 命令 | 说明 |
|---|---|---|
| `frontend/` | `yarn dev` | 启动开发服务器 |
| `frontend/` | `yarn test` | 运行 Vitest 单测 |
| `frontend/` | `yarn lint` | ESLint 检查 |
| `frontend/` | `yarn build` | 生产构建 |
| `backend/` | `mvn test` | 运行后端测试 |
| `backend/` | `mvn spring-boot:run` | 本地启动 |
| `backend/` | `mvn package` | 打包可执行 jar |

## 工程约定

- 前端统一 Yarn Classic 1.22.22，提交 `yarn.lock`；不迁移 TypeScript。
- 核心网格自研 Canvas + DOM 编辑层；禁止完整二维数组、每格 Vue 组件或 DOM。
- 前端模块边界以 `docs/03-frontend.md` 为准：渲染层不写业务数据，变更走命令层，`core` 不依赖 Vue/DOM/HTTP。
- 后端 Controller 不直接访问 Mapper；批量单元格路径使用自定义 Mapper/XML/批量 SQL。
- 数据库不使用迁移框架或 `schema_version`；`V001__init_schema.sql` 仅作初始结构基线。
- 不引入 Docker / Docker Compose / Dockerfile。
- 密钥、`.env`、备份文件不提交到 Git。

## 文档

- [文档导航](docs/README.md)
- [项目目标与范围](docs/01-project-scope.md)
- [总体架构与技术选型](docs/02-architecture.md)
- [分阶段实施计划](docs/10-roadmap.md)
- [开发环境、构建与部署](docs/11-devops.md)
- [架构决策记录](docs/12-decisions.md)

## 已知限制

- 阶段 0 基线，`src/spreadsheet` 仅有坐标/范围纯函数，尚无渲染、选区、编辑、命令与持久化。
- `backend/` 目前只有健康检查与统一错误结构，没有工作簿/单元格 API。
- 本地数据源默认值在 `backend/src/main/resources/application-local.yml`，该文件已被忽略；新环境需要自行创建或改用环境变量。应用默认延迟建立连接池，数据库不可达时服务仍可启动，问题会在首次真实 SQL 时暴露。
- 已配置 `origin` 远端（`master` 跟踪 `origin/master`），但尚无 CI 工作流；当前质量门禁通过本地脚本（`yarn lint` / `yarn test` / `yarn build` / `mvn test`）执行。
