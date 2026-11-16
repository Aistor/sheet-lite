# 11. 开发环境、构建与部署

> 范围：本项目仅面向个人本地开发；共享/生产部署不在当前范围，相关小节仅作未来参考。

## 1. 仓库布局

```text
sheet-lite/
├── frontend/
├── backend/
├── docs/
├── .editorconfig
├── .gitignore
└── README.md
```

## 2. 本地开发依赖

- Git
- Node.js LTS
- Yarn Classic **1.22.22**（项目唯一的前端包管理器）
- **JDK 21**
- Maven **3.9.9**（本机安装并配置 `mvn` 命令）
- MySQL 8.x（在本机或独立数据库环境安装并运行）

Node.js 使用受支持的 LTS 版本；Yarn 固定为 **Classic 1.22.22**，并在 `frontend/package.json` 中声明 `"packageManager": "yarn@1.22.22"`。后端构建必须使用 JDK 21。项目不使用 Docker、Docker Compose 或 Dockerfile；本地数据库由开发者安装和启动，开发阶段由 AI 助手接手管理。

## 3. 本地启动流程

以下命令是建议流程，需结合实际脚本和配置文件调整。

前端（在 `frontend/` 目录）：

```bash
yarn --version
# 必须输出 1.22.22
yarn install --frozen-lockfile
yarn dev
```

后端（在 `backend/` 目录，Windows、Linux、macOS 均使用本机 Maven）：

```bash
mvn -version              # 确认 Maven 3.9.9、JDK 21
mvn spring-boot:run
```

先启动并确认 MySQL 可连接，再配置后端数据源。构建前通过 `java -version` 和 `mvn -version` 确认 JDK 21、Maven 3.9.9。前端提交 `yarn.lock`；本地与 CI 均使用 Yarn 1.22.22 和 `yarn install --frozen-lockfile`，不要混用 npm、pnpm 或 Yarn Berry。

## 4. 环境变量

建议通过环境变量或密钥管理服务提供：
- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `APP_AUTH_*`
- `APP_STORAGE_*`
- `APP_LOG_LEVEL`

不要把凭据提交到 Git；本地 `.env` 加入 `.gitignore`。

## 5. 配置分层

- `application.yml`：安全的默认值。
- `application-local.yml`：本地开发。
- `application-test.yml`：测试。
- `application-prod.yml`：未来部署模板（当前不使用），不含密钥。

如未来需要部署，再限制请求体大小、连接池、线程池、超时、CORS、日志等级和管理端点暴露范围。

## 6. 数据库管理（个人开发，AI 接手）

### 6.1 范围与原则

本项目仅面向个人本地开发，不设计共享/生产环境，不使用迁移框架或迁移执行器。开发阶段数据库由 AI 助手接手管理，可用 Navicat 或命令行操作；删除操作需 Aistor 授权。

- 当前数据库实际结构是事实来源；`V001__init_schema.sql` 仅作为初始基线。
- 不使用 schema 版本登记表、迁移校验和或迁移执行器；`schema_version` 表已彻底移除，不保留兼容表或业务代码引用。
- 变更前必须备份；变更后核对表/列/索引/COMMENT，并同步文档或结构基线。
- 任何删除操作（DROP/TRUNCATE/DELETE、DROP COLUMN/INDEX 等）必须先取得 Aistor 明确授权；执行前打印目标并确认备份可恢复。
- 不引入 Flyway/Liquibase，不在应用启动时自动改 schema。

### 6.2 目录现状

```text
backend/
└── src/main/resources/db/
    └── migration/
        └── V001__init_schema.sql   # 11 张业务表的初始基线，不含 schema_version
```

历史迁移脚本（`db-migrate.ps1` / `db-migrate.sh`）已移除，不作为日常流程的一部分。

如后续需要空库重建，可直接执行当前版本的 `V001__init_schema.sql`；该脚本创建 11 张业务表，不包含 `schema_version` 或迁移登记逻辑。结构快照建议由 Navicat 导出，不强制纳入仓库。

### 6.3 变更与备份流程

1. 备份：Navicat「转储 SQL 文件」（结构+数据）或 `mysqldump`，存到仓库外，文件名带日期。
2. 预览：在 Navicat 设计表中检查 ALTER SQL，确认没有误删列/改类型/丢索引。
3. 执行：由 AI 助手应用变更；高风险变更先在副本表验证。涉及删除的操作先取得 Aistor 授权。
4. 核验：`SHOW CREATE TABLE` 与 `information_schema` 检查列、索引、COMMENT；跑一条读写查询。
5. 留痕：在本文或 `docs/db-changelog.md` 记录日期、表、变更、备份文件。
6. 恢复演练：定期恢复到临时库验证。

### 6.4 备份与恢复

- 变更前一份，每周一份；保留 7 份每日 + 4 份每周。
- 优先 `.sql`，不要只依赖 Navicat 专有备份格式。
- 示例：

```bash
mysqldump --single-transaction --no-tablespaces \
  --default-character-set=utf8mb4 sheet_lite \
  | gzip > sheet_lite_$(date +%F_%H%M).sql.gz
```

- 恢复：`gunzip -c xxx.sql.gz | mysql ...`，先恢复到临时库，不要直接覆盖当前库。
- 备份文件不提交 Git，不包含明文密码。

### 6.5 本地账号

- 个人开发可用一个本机账号；不要用 root 运行应用。
- 密码通过 0600 的客户端 option file 或凭据管理提供，不写入仓库/命令行/日志。
- 账号只授予 `sheet_lite` 所需权限；个人开发使用一个应用账号即可。

### 6.6 检查清单

- 11 张业务表存在，不包含 `schema_version`；字符集/排序正确。
- 所有表和列 COMMENT 非空。
- 关键索引存在。
- 备份可恢复。
- 删除类变更已取得 Aistor 授权。
- 文档与当前结构一致。
- 不再要求 CI 迁移验证；如保留脚本，仅作历史参考。

## 7. 可观测性

建议统一：
- JSON 结构化日志。
- `traceId` / 请求 ID。
- API 延迟、错误率和请求大小。
- 数据库连接池、慢 SQL、锁等待。
- 工作簿操作数量、批量大小、revision 冲突率。
- 导入导出任务成功率和耗时。
- 前端异常、渲染耗时与关键交互延迟（注意隐私和脱敏）。

## 8. 备份与恢复

- 本地开发也要定期备份：至少保留最近 7 份每日 + 4 份每周。
- schema 变更前额外备份一次；备份文件放在仓库外，文件名带日期。
- 定期恢复到临时库验证，不要只确认文件存在。
- 如果快照放在对象存储中，数据库备份与快照文件必须有一致性和版本对应关系。
- 操作日志保留不能替代备份；恢复方案需覆盖数据、元数据和必要的对象存储内容。
