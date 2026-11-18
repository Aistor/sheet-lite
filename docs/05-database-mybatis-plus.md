# 05. MySQL 数据模型与 MyBatis-Plus 实践

## 1. 结论

**MyBatis-Plus 适合本项目的元数据 CRUD，但单元格主路径必须使用自定义 SQL。**

已经落地并执行的初始 schema 是：

```text
backend/src/main/resources/db/migration/V001__init_schema.sql
```

它在本地 `sheet_lite` 数据库中创建 11 张业务表，所有表和列都带中文 `COMMENT`，不包含 `schema_version`。项目仅考虑个人开发，开发阶段数据库由 AI 助手接手管理，可用 Navicat 或命令行操作，不使用 schema 版本登记表、迁移校验和或迁移执行器；`V001` 仅作为初始结构基线。本文描述这些表的语义、访问路径和管理方式；精确列定义以当前数据库的 `SHOW CREATE TABLE` 为准。日常变更直接改表，但必须先备份，变更后同步本文和结构基线；删除操作需 Aistor 授权。

适合 MyBatis-Plus 通用能力的地方：

- 工作簿、工作表、成员、样式、任务等元数据 CRUD。
- 条件分页、单行更新、按主键查询。
- 简单的逻辑删除和审计字段映射。

必须使用自定义 Mapper / XML / 手写批量 SQL 的地方：

- 视口或块范围内的单元格读取。
- 批量粘贴、批量清空和 upsert。
- 工作簿 revision 推进、操作日志和幂等写入。
- 大范围导入、导出、统计。
- 需要精确控制 SQL 形状、索引和包大小的路径。

不要对 10,000 个单元格循环调用 10,000 次 `updateById`。通用方法隐藏的是 SQL 次数和事务开销，不是消除了它们。

## 2. 落地状态与事实来源

| 项目 | 当前状态 |
| --- | --- |
| 数据库 | MySQL 8.0.x，InnoDB |
| 库名 | 本地开发使用 `sheet_lite` |
| 字符集 | `utf8mb4`，默认排序规则 `utf8mb4_0900_ai_ci` |
| 初始 schema | `V001__init_schema.sql`（历史基线） |
| 表数量 | 11 张业务表（不含 schema 版本登记表） |
| 外键 | 不建立数据库外键 |
| 种子数据 | 当前无 |
| Schema 管理 | AI 助手接手（开发阶段）；可用 Navicat/命令行，删除需 Aistor 授权 |

权威顺序：

1. 当前数据库的实际结构（`SHOW CREATE TABLE`）是最终事实来源。
2. `V001__init_schema.sql` 是初始结构基线，不代表之后的手动变更。
3. 本文解释语义和访问策略，不替代实际 DDL。
4. 文档与数据库不一致时，以当前数据库为准，并补文档或结构基线。

## 3. Schema 统一约定

### 3.1 主键与标识

- 业务表主键统一 `BIGINT`，由应用生成（MyBatis-Plus `ASSIGN_ID` / 雪花 ID）。
- 不使用 `AUTO_INCREMENT`，避免批量写入前需要回读自增值，也便于未来分片或离线导入。
- 操作日志的 `operation_id` 是客户端幂等键，`VARCHAR(64)`，按 ASCII 二进制比较。

### 3.2 时间

- 所有时间列使用 `DATETIME(3)`，应用按 UTC 写入和解释。
- 不使用 `TIMESTAMP`，避免 2038 上限和隐式时区转换。
- 数据库默认值 `CURRENT_TIMESTAMP(3)` 只作为兜底；业务时间由应用显式控制。
- 手动执行 SQL 时，连接会话应设置 `time_zone = '+00:00'`，避免 `CURRENT_TIMESTAMP` 受本机时区影响。

### 3.3 坐标与范围

- 行列坐标统一 0-based，与前端、API 保持一致。
- 数据库中的范围列统一为半开区间 `[start, end)`：包含 `start`，不包含 `end`。
- 合并区域的 `end_row` / `end_column` 是开区间边界，因此必须大于 `start`。
- Excel 逻辑上限为 1,048,576 行 × 16,384 列；这是坐标上限，不是一次加载全部数据的能力。

### 3.4 引用完整性

- 不建立数据库外键。
- 引用完整性、级联清理、删除顺序由应用事务负责。
- 原因：单元格批量写入频繁，外键检查和级联锁会放大写入成本；同时避免删除工作表时触发不可控的级联扫描。
- 代价：必须显式处理孤儿数据，并在删除/恢复流程中按固定顺序清理。

### 3.5 空值与稀疏

- 空单元格不落库。
- 只有满足以下任一条件的单元格才写入 `sl_cell`：
  - `raw_input` 非空；
  - 有公式；
  - 有显式样式；
  - 有需要持久化的缓存值。
- 清除单元格内容时，物理删除对应 `sl_cell` 行；不要写入空字符串占位。
- 行高、列宽也只记录与默认值不同的覆盖项。

### 3.6 字符集与排序

- 表默认 `utf8mb4` / `utf8mb4_0900_ai_ci`。
- 哈希、枚举、脚本名、操作 ID 等使用 `ascii` / `ascii_bin`，避免大小写和重音排序影响唯一性。
- `sl_worksheet.name` 使用 `utf8mb4_0900_as_ci`：工作表名大小写不敏感，但重音敏感，避免把不同名称折叠成同一个。
- JSON 列使用 MySQL 原生 `JSON` 类型；JSON 内部格式由应用定义版本，不依赖数据库排序。

### 3.7 约束

- 能用 `CHECK` 表达的单行不变量都放在数据库层，例如枚举、坐标非负、范围边界、revision 关系。
- 跨行/跨表不变量（合并区域重叠、权限、工作表归属）由应用层校验。
- `CHECK` 约束在 MySQL 8.0.16+ 生效；本项目以 MySQL 8.0.x 为基线。

### 3.8 注释

- V001 的 DDL 中所有表和列都带中文 `COMMENT`，用于本地运维和审阅；数据库重建后生效。
- `COMMENT` 只做说明，不参与业务判断；枚举取值、默认值和约束仍以列定义和 `CHECK` 为准。
- 手动变更表结构或注释时先备份；变更后同步本文和结构基线，不要为了改注释去重跑历史脚本。

## 4. 表清单

| 表 | 作用 | 主键 / 唯一键 | 关键索引或约束 |
| --- | --- | --- | --- |
| `sl_workbook` | 工作簿元数据与 revision | PK `id` | `(owner_id, deleted, updated_at)` |
| `sl_worksheet` | 工作表元数据 | PK `id`；UK `(workbook_id, name)` | `(workbook_id, sort_order)`；行列上限与冻结校验 |
| `sl_workbook_member` | 非所有者成员 ACL（EDITOR / VIEWER） | PK `(workbook_id, user_id)` | `(user_id, workbook_id)`；应用层不写入 OWNER |
| `sl_style` | 规范化样式 | PK `id`；UK `(workbook_id, style_hash)` | `style_hash` SHA-256；`style_version` |
| `sl_cell` | 稀疏单元格 | PK `(worksheet_id, row_index, column_index)` | 聚簇主键即范围查询索引；值类型/长度校验 |
| `sl_row_dimension` | 行高/隐藏覆盖 | PK `(worksheet_id, row_index)` | 行高范围、隐藏枚举 |
| `sl_column_dimension` | 列宽/隐藏覆盖 | PK `(worksheet_id, column_index)` | 列宽范围、隐藏枚举 |
| `sl_merged_range` | 合并区域 | PK `id`；UK `(worksheet_id, start_row, start_column)` | `(worksheet_id, start_row, end_row)`；半开区间校验 |
| `sl_operation_log` | 操作日志与幂等 | PK `id`；UK `(workbook_id, operation_id)`；UK `(workbook_id, revision)` | `revision = base_revision + 1`；按 workbook/时间查询 |
| `sl_snapshot` | 快照元数据 | PK `id`；UK `(workbook_id, revision)` | `INLINE` / `OBJECT` 二选一校验 |
| `sl_task` | 异步任务状态 | PK `id` | `(workbook_id, created_at)`、`(status, created_at)`、`expires_at` |

## 5. 核心表语义

### 5.1 `sl_workbook`

工作簿是 revision 和权限的根。

- `id`：应用生成。
- `owner_id`：所有者快速路径。
- `name` / `description`：展示元数据；名称不要求全局唯一。
- `revision`：工作簿级单调递增版本，初始 0。
- `deleted`：逻辑删除标记；列表查询必须显式过滤 `deleted = 0`。
- `created_at` / `updated_at`：UTC 时间。

索引 `(owner_id, deleted, updated_at)` 支持“某用户的未删除工作簿按最近更新排序”。`updated_at` 上的 `ON UPDATE` 只保证行更新时刷新，不替代业务时间。

### 5.2 `sl_worksheet`

- `workbook_id`：所属工作簿；不建外键。
- `name`：同一工作簿内唯一，大小写不敏感、重音敏感。
- `sort_order`：页签顺序，允许重复；稳定排序应追加 `id`。
- `row_limit` / `column_limit`：该工作表的逻辑上限；默认 1,048,576 × 16,384，可小于 Excel 上限。
- `default_row_height` / `default_column_width`：默认尺寸；只对未覆盖的行列生效。
- `freeze_row_count` / `freeze_column_count`：冻结窗格数量，不得超过对应上限。
- 时间列同上。

### 5.3 `sl_workbook_member`

- 复合主键 `(workbook_id, user_id)`。
- `owner_id` 是工作簿所有权的唯一权威来源；所有者权限由 `sl_workbook.owner_id` 派生，不依赖成员表中的冗余 `OWNER` 行。
- `sl_workbook_member` 只保存非所有者成员的共享权限，应用层角色为 `EDITOR` / `VIEWER`。即使当前物理表的枚举或 CHECK 仍允许 `OWNER`，应用也不得写入或依赖该值；若要收紧数据库约束，须先核对 `SHOW CREATE TABLE`，再单独更新结构基线。
- 鉴权时先判断 `owner_id`，再查询成员表；不得把两处记录简单取并集，也不得因成员表残留 `OWNER` 记录授予所有者权限。
- 转移所有权必须在同一事务中更新 `sl_workbook.owner_id` 与相关成员记录；原所有者转移后的角色必须由请求明确指定，不能隐式推断。
- 索引 `(user_id, workbook_id)` 支持“某用户可访问的工作簿”查询。

### 5.4 `sl_style`

样式按工作簿隔离并去重。

- `style_hash`：规范化样式 JSON 的 SHA-256；同一工作簿内唯一。
- `style_version`：样式格式版本，从 1 开始。
- `style_json`：规范化后的样式对象，例如字体、对齐、边框、数字格式、填充。
- `sl_cell.style_id` 只存引用，不重复存完整样式 JSON。
- 规范化必须稳定：键排序、数字格式统一、省略默认值；否则相同样式会生成不同哈希。

样式表没有数据库外键。删除样式前必须确认没有 `sl_cell` 引用；批量清理应作为独立维护任务，不能在单元格写入事务中同步执行大范围 `NOT IN` 删除。

### 5.5 `sl_cell`

核心稀疏表。

| 列 | 语义 |
| --- | --- |
| `worksheet_id` | 工作表 ID |
| `row_index` / `column_index` | 0-based 坐标 |
| `raw_input` | 用户原始输入；公式以 `=` 开头；非空 |
| `value_type` | `TEXT` / `NUMBER` / `BOOLEAN` / `DATE` / `ERROR` / `FORMULA` |
| `style_id` | 可空，引用 `sl_style.id` |
| `cached_value` | 计算/解析结果的 JSON 缓存，可重建 |
| `cache_version` | 缓存格式版本，从 1 开始 |
| `updated_at` | 最后更新时间 |

关键点：

- 主键 `(worksheet_id, row_index, column_index)` 是聚簇索引，天然支持按工作表和行列范围扫描。
- `raw_input` 是权威输入；`cached_value` 不是真值，缓存失效或公式引擎升级后必须可重建。
- `value_type` 描述 `raw_input` 的语义类别；公式单元格仍以 `FORMULA` 存储，计算结果放 `cached_value`。
- `CHAR_LENGTH(raw_input) <= 32767` 是数据库兜底；应用还应限制单次请求总字节数。
- 没有 `created_at`：单元格是高频覆盖写，保留创建时间收益低。
- 没有 `deleted`：清空即删除行，避免稀疏表膨胀。

### 5.6 `sl_row_dimension` / `sl_column_dimension`

只保存与默认值不同的行高、列宽和隐藏状态。

- 行高上限 409.5，列宽上限 255，均为 `DECIMAL(7,2)`。
- `hidden` 为 0/1。
- 主键分别是 `(worksheet_id, row_index)` 和 `(worksheet_id, column_index)`。
- 读取视口时，先取默认尺寸，再用这些覆盖项替换；不要为每一行/列建记录。

### 5.7 `sl_merged_range`

- `start_row` / `start_column` 包含，`end_row` / `end_column` 不包含。
- 同一工作表内，合并区域锚点 `(start_row, start_column)` 唯一。
- 数据库只校验单行的边界；区域重叠必须由服务层在写入前检查。
- 合并/取消合并是 revisioned 操作；合并区域内非锚点单元格的显示值由锚点决定，服务层需定义清空或保留策略。
- 索引 `(worksheet_id, start_row, end_row)` 支持按行范围找合并区域。

### 5.8 `sl_operation_log`

幂等和审计的核心。

| 列 | 语义 |
| --- | --- |
| `id` | 应用生成 |
| `workbook_id` | 所属工作簿 |
| `worksheet_id` | 可空；工作簿级操作可为空 |
| `operation_id` | 客户端幂等键 |
| `base_revision` | 客户端提交时看到的工作簿 revision |
| `revision` | 本次操作产生的新 revision |
| `operation_type` | 例如 `SET_CELLS`、`CLEAR_RANGE`、`MERGE` |
| `payload` | 请求操作的结构化记录 |
| `actor_id` | 操作者，可空 |
| `created_at` | UTC 时间 |

约束：

- `UNIQUE (workbook_id, operation_id)`：同一工作簿内幂等键唯一。
- `UNIQUE (workbook_id, revision)`：一个 revision 只能对应一条成功操作。
- `CHECK (revision = base_revision + 1)`：一次成功请求只推进一个 revision。
- 索引 `(workbook_id, created_at)` 用于按工作簿审计；`(created_at)` 用于保留期清理。

幂等重放：如果 `(workbook_id, operation_id)` 已存在，必须先验证本次请求与首次成功请求的规范化内容一致；一致时返回已记录的 `revision` 并标记 `duplicate=true`，不得再次修改数据。不一致时返回稳定错误 `OPERATION_ID_REUSED`，不得把不同请求误判为成功重放。当前日志保存 `payload`，应用应对 `operation_type`、`worksheet_id` 和规范化后的操作内容进行一致性比较；如后续增加独立 SHA-256 `request_hash` 列，须先核对实际 DDL 并同步更新 V001 基线。日志没有保存完整响应体，因此重放响应限定为原 `revision` 与重复标志；需要单元格结果时客户端重新读取。

### 5.9 `sl_snapshot`

- `(workbook_id, revision)` 唯一：同一 revision 最多一个快照。
- `storage_type = 'INLINE'` 时 `payload` 非空，快照正文放 `LONGTEXT`。
- `storage_type = 'OBJECT'` 时 `storage_key` 非空，正文放对象存储。
- `payload_bytes` 记录字节数；`checksum` 记录 SHA-256，恢复前校验。
- 大快照优先 `OBJECT`，不要把大二进制塞进数据库。
- 快照生成通常是异步任务；生成时必须固定 revision，避免读到半个事务。
- 保留策略独立于操作日志；清理快照前确认恢复窗口和对象存储引用。

### 5.10 `sl_task`

异步导入、导出、快照等任务的状态表。

- `status`：`PENDING` / `RUNNING` / `SUCCEEDED` / `FAILED` / `CANCELLED`。
- `progress`：0–100。
- `payload`：任务参数；`result`：结果摘要。
- `error_code` / `error_message`：失败信息。
- `started_at` / `finished_at` / `expires_at`：生命周期时间。
- 索引 `(status, created_at)` 支持 worker 拉取待处理任务；`expires_at` 支持过期清理。
- 任务状态更新应使用条件更新（例如 `WHERE id=? AND status='PENDING'`）避免重复执行。

## 6. 范围读取

### 6.1 查询形状

按视口或块读取，使用半开区间：

```sql
SELECT row_index, column_index, raw_input, value_type, style_id, cached_value, cache_version
FROM sl_cell
WHERE worksheet_id = ?
  AND row_index >= ? AND row_index < ?
  AND column_index >= ? AND column_index < ?
ORDER BY row_index, column_index;
```

要点：

- 不要用 `BETWEEN` 表达半开区间；`BETWEEN` 两端都包含。
- 只 select 需要的列；不要 `SELECT *`。
- 必须限制单次返回的行列范围和字节数；大范围读取拆成块。
- 主键前缀 `worksheet_id` 保证范围扫描不跨工作表。
- 空白单元格不出现在结果中；前端用默认值填充。
- 返回后按 `(row_index, column_index)` 合并到稀疏 `CellStore`，不要构造完整二维数组。

### 6.2 索引验证

在空表上执行 `EXPLAIN`，单元格范围查询使用 `PRIMARY` 的 `range` 访问；工作簿列表使用 `idx_workbook_owner_updated` 的反向索引扫描；幂等查询使用 `(workbook_id, operation_id)` 唯一索引的 `const` 访问。数据量增大后应使用真实分布重新跑 `EXPLAIN ANALYZE`，不要以空表计划作为最终性能结论。

### 6.3 缓存

- 视口附近可做有限缓存，键包含 `worksheet_id`、范围、`revision`。
- 工作簿 revision 变化后，相关范围缓存必须失效。
- `cached_value` 的格式版本由 `cache_version` 标识；公式引擎升级时递增或重建。
- 不要缓存权限判断的最终结果而不设过期/失效策略。

## 7. 批量写入与事务

### 7.1 请求契约

写请求至少包含：

- `operationId`：客户端生成的幂等键；
- `baseRevision`：客户端提交时看到的工作簿 revision；
- `operations[]`：单元格设置、清除、样式、行高列宽、合并等；
- 可选的 `worksheetId` 和范围信息。

服务端必须校验：

- 工作簿存在、未删除、当前用户有写权限；
- `baseRevision` 与当前 revision 一致；
- 坐标在 `row_limit` / `column_limit` 内；
- 单次 cell 数、JSON 字节数、操作数不超过配置上限；
- 合并区域不重叠、不越界；
- 样式引用存在或可创建。

### 7.2 事务顺序

推荐顺序（同一数据库事务）：

1. `SELECT id, revision, owner_id, deleted FROM sl_workbook WHERE id = ? FOR UPDATE;`；不存在或已删除时按资源不存在处理。
2. 校验当前请求身份及工作簿写权限。权限校验必须发生在幂等重放之前，避免已失去权限的调用者通过重试读取操作结果。
3. 查询 `sl_operation_log` 的 `(workbook_id, operation_id)`：
   - 已存在且规范化请求内容一致：返回已记录的 `revision`、`duplicate=true`，不再执行写入；
   - 已存在但请求内容不一致：返回 `OPERATION_ID_REUSED`，不执行写入；
   - 不存在：继续下一步。
4. 校验 `baseRevision` 与当前 revision；不一致返回 409 `REVISION_CONFLICT`。**幂等记录查询必须先于 revision 校验**，否则首次请求成功但响应丢失时，客户端用相同 `operationId` 重试会被错误地判为 revision 冲突。
5. 校验操作参数、坐标范围、批量上限、样式引用和合并区域等业务规则。
6. 按主键排序后批量 upsert/删除 `sl_cell`，再处理尺寸、合并、样式。
7. 插入 `sl_operation_log`，`revision = base_revision + 1`，并保存可用于请求一致性比较的规范化操作内容。
8. `UPDATE sl_workbook SET revision = revision + 1 WHERE id = ? AND revision = ? AND deleted = 0;`
9. 受影响行数为 0 时回滚并返回冲突；否则提交。

工作簿行锁使同一工作簿的写请求串行化，也使并发的相同 `operationId` 请求在后到事务获得锁后能够查到先到事务提交的幂等记录。死锁或超时重试必须沿用原 `operationId` 和完全相同的请求内容。

对工作簿行加锁会把同一工作簿的写请求串行化。首期这是可接受的简单正确性方案；如果压测显示吞吐不足，再评估按工作表/块拆分锁或乐观重试，但不能牺牲 revision 的单调性。

### 7.3 批量 upsert

MySQL 8.0.19+ 可使用行别名：

```sql
INSERT INTO sl_cell
  (worksheet_id, row_index, column_index, raw_input, value_type, style_id, cached_value, cache_version)
VALUES
  (?, ?, ?, ?, ?, ?, ?, ?),
  (?, ?, ?, ?, ?, ?, ?, ?)
AS new
ON DUPLICATE KEY UPDATE
  raw_input = new.raw_input,
  value_type = new.value_type,
  style_id = new.style_id,
  cached_value = new.cached_value,
  cache_version = new.cache_version,
  updated_at = CURRENT_TIMESTAMP(3);
```

注意事项：

- 更早的 MySQL 8.0 版本使用 `VALUES(col)`，但该写法已废弃；新代码优先行别名。
- `ON DUPLICATE KEY UPDATE` 的 affected rows 语义（1/2/0）不能直接当作“实际插入/更新行数”；需要精确统计时以业务输入为准或使用额外查询。
- 一批行数受 `max_allowed_packet`、SQL 包大小和事务日志限制；按实测调整批大小。
- 同一批内不要出现重复主键；先在应用层按 `(worksheet_id,row_index,column_index)` 去重。
- 按主键排序写入，降低死锁概率。

### 7.4 范围清除

```sql
DELETE FROM sl_cell
WHERE worksheet_id = ?
  AND row_index >= ? AND row_index < ?
  AND column_index >= ? AND column_index < ?;
```

- 应用内“清除单元格”是业务操作，仍应记录 `sl_operation_log` 并推进 revision。
- 手工在数据库执行 `DELETE` 属于运维删除：必须先备份、打印并核对绝对目标（库/表/条件）、说明恢复方式，并取得明确确认。
- 大范围删除会长时间持锁并产生大量 undo；优先拆批，或改为异步任务。

### 7.5 死锁与重试

- 所有写事务先锁工作簿行，再按主键顺序写单元格。
- 捕获 MySQL 1213（死锁）和 1205（锁等待超时），做有界退避重试；重试必须依赖 `operationId` 保证幂等。
- 不要在重试时重新生成 `operationId`。
- 记录重试次数和最终失败原因，便于定位热点工作簿。

### 7.6 单次请求上限

以下上限应由配置控制，并通过压测固化，而不是写死在代码里：

- 单次请求最大 cell 数；
- 单次请求最大 JSON/文本字节数；
- 单次请求最大操作数；
- 单条 SQL 最大绑定参数数量；
- 事务最大执行时间。

超限时返回明确的 4xx 错误，不要静默截断。超大粘贴应拆分为多个幂等请求或转异步任务。

## 8. revision、并发与幂等

- 每个工作簿一个 `revision`，初始 0。
- 一次成功写请求推进 1；读请求不推进。
- 客户端提交 `baseRevision`；服务端不匹配时返回 409，不静默覆盖。
- `operationId` 是幂等键：网络超时后客户端可以用同一 `operationId` 重试。
- 幂等检查与写入必须在同一事务内完成；在持有工作簿行锁、完成资源权限校验后，先检查 `operationId`，再校验 `baseRevision`。
- 同一 `operationId` 只能代表完全相同的规范化请求；请求内容不同必须拒绝，不能返回旧请求的成功结果。
- `(workbook_id, revision)` 唯一约束是最后防线：即使应用逻辑漏判，也不会产生两个相同 revision 的成功日志。
- 幂等重放只返回日志可证明的结果（`revision`、`duplicate`）；不要伪造未持久化的原始响应体。
- 首期单用户也保留这套语义，避免多人协作时推翻重来。
- 未来协作阶段再评估块级/区域级冲突、CRDT 或操作转换；当前不引入。

## 9. MyBatis-Plus 映射建议

### 9.1 实体

```java
@TableName("sl_workbook")
public class WorkbookEntity {
    @TableId(value = "id", type = IdType.ASSIGN_ID)
    private Long id;
    private Long ownerId;
    private String name;
    private Long revision;
    private Integer deleted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```

- `@TableName` 显式写表名，避免依赖类名推导。
- `@TableId(type = IdType.ASSIGN_ID)` 使用应用生成 ID。
- 列名与字段名不一致时用 `@TableField` 显式映射；不要依赖全局驼峰配置覆盖所有边界情况。
- JSON 列使用自定义 TypeHandler，映射为 `JsonNode` 或受控的 DTO；不要用 `Object` 盲序列化。
- 枚举以 ASCII 字符串存储，和 `CHECK` 约束保持一致；不要存 ordinal。

### 9.2 Mapper 分层

- `WorkbookMapper`、`WorksheetMapper`、`StyleMapper`、`TaskMapper` 等继承 `BaseMapper`，只用于简单 CRUD。
- `CellMapper` 使用自定义方法：

```java
List<CellRow> selectRange(@Param("worksheetId") long worksheetId,
                          @Param("startRow") int startRow,
                          @Param("endRow") int endRow,
                          @Param("startColumn") int startColumn,
                          @Param("endColumn") int endColumn);

int upsertBatch(@Param("cells") List<CellRow> cells);

int deleteRange(@Param("worksheetId") long worksheetId,
                @Param("startRow") int startRow,
                @Param("endRow") int endRow,
                @Param("startColumn") int startColumn,
                @Param("endColumn") int endColumn);
```

- 动态 SQL 只允许拼接白名单内的列名/排序方向；坐标、ID、文本一律用 `#{}` 绑定。
- 不要用 `${}` 拼接用户输入。
- 结果映射显式列出列，避免 schema 变化时静默错位。

### 9.3 逻辑删除与乐观锁

- `sl_workbook.deleted` 可用 MyBatis-Plus `@TableLogic`，但自定义 SQL 必须自己加 `deleted = 0`；插件不会改写手写 SQL。
- 不建议用 `@Version` 代替工作簿 revision：`@Version` 是单行版本，无法表达“一次请求包含多表写入、只推进一个 revision”的语义。
- `sl_cell` 不使用逻辑删除；清空即物理删除。
- 自动填充 `created_at` / `updated_at` 可选；数据库默认值已能兜底，应用显式写入 UTC 更可控。

### 9.4 JSON 与类型

- `cached_value`、`style_json`、`payload`、`result` 使用 MySQL `JSON`。
- JSON 序列化必须稳定（键顺序、数字格式），否则样式哈希和快照校验和会漂移。
- 读取 JSON 后做结构校验；不要假设历史缓存一定符合当前 `cache_version`。
- 日期时间在 Java 侧使用 `LocalDateTime`（UTC 语义）或明确的 `Instant` 转换；不要混用系统默认时区。

## 10. 数据库管理与备份

项目仅个人本地开发，不设计共享/生产环境，也不要求迁移脚本或执行器。开发阶段数据库由 AI 助手接手管理，可用 Navicat 或命令行操作；删除操作需 Aistor 授权。

### 10.1 管理原则

- 当前数据库的实际结构是最终事实来源；`V001__init_schema.sql` 只作为初始基线，不代表后续改动。
- 开发阶段由 AI 助手负责建表、改表、补开发数据和结构核对；Navicat 用于查看、导出和应急操作。
- 任何删除操作（DROP/TRUNCATE/DELETE、DROP COLUMN/INDEX 等）必须先取得 Aistor 明确授权；执行前打印目标并确认备份可恢复。
- 不引入 Flyway/Liquibase，不使用 schema 版本登记表、迁移校验和或迁移执行器；`schema_version` 表已彻底移除，不保留兼容表、视图或业务代码引用。
- `V001__init_schema.sql` 仅作为初始数据库结构基线，不承担日常迁移职责。当前项目不提供、不执行 `db-migrate.sh` / `db-migrate.ps1`；若历史版本中存在同名脚本，仅属于历史资料，不得作为当前流程恢复或执行。
- 所有 schema 变更必须可恢复：先备份，再修改；变更后核对表、列、索引、COMMENT。
- 变更后同步本文与结构基线，不要让文档和数据库长期漂移。
- 已执行过的 `V001` 不再重跑；它只用于空库重建的初始参考。

### 10.2 变更流程

1. 备份：用 Navicat「转储 SQL 文件」导出结构+数据，或执行 `mysqldump`；文件放到仓库外的归档目录，文件名带日期。
2. 预览：在 Navicat 设计表中查看生成的 ALTER SQL，确认没有误删列、改类型、丢索引。
3. 执行：由 AI 助手应用变更；高风险变更先在副本表验证。涉及删除的操作先取得 Aistor 授权。
4. 核验：`SHOW CREATE TABLE`、`information_schema` 检查列/索引/注释；跑一条读写查询。
5. 留痕：在本文或 `docs/db-changelog.md` 记录日期、表、变更、备份文件；建议同步结构快照。
6. 恢复演练：定期把备份恢复到临时库，确认可用。

当前仓库不保留 `db-migrate.sh` / `db-migrate.ps1`，也不使用迁移执行器。若旧分支或历史归档中存在同名文件，不得将其视为当前项目工具。

### 10.3 备份与恢复

- 日常：变更前一份；每周一份；保留 7 份每日 + 4 份每周。
- 格式：优先 `.sql`（Navicat 转储 SQL 或 `mysqldump`），不要只依赖 Navicat 专有备份格式。
- 示例：

```bash
mysqldump --single-transaction --no-tablespaces \
  --default-character-set=utf8mb4 sheet_lite \
  | gzip > sheet_lite_$(date +%F_%H%M).sql.gz
```

- 恢复：`gunzip -c xxx.sql.gz | mysql ...` 或 Navicat 运行 SQL；先恢复到临时库验证，不要直接覆盖当前库。
- 备份文件不提交到 Git，不包含明文密码。

### 10.4 本地建库与权限

```sql
CREATE DATABASE sheet_lite
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
```

- 个人开发可使用一个本机账号，但不要用 root 运行应用。
- 密码通过客户端 option file（0600）或凭据管理提供，不写入仓库、命令行参数或日志。
- 账号只授予 `sheet_lite` 所需权限；个人开发使用一个应用账号即可。

### 10.5 检查清单

- 11 张业务表存在，不包含 `schema_version`；字符集/排序正确。
- 所有表和列 COMMENT 非空。
- 关键索引存在：`sl_cell` 主键、`sl_workbook` 的 owner/updated、`sl_operation_log` 唯一键。
- 备份文件可恢复。
- 删除类变更已取得 Aistor 授权。
- 文档与当前结构一致。
- 不要求 CI 迁移检查；当前仓库不提供 `db-migrate.*` 脚本。

### 10.6 日常运维

- 关注慢查询、锁等待、连接数、磁盘占用。
- `sl_operation_log` 和 `sl_snapshot` 定义保留期与清理任务；清理前确认恢复需求。
- 定期备份并做恢复演练；快照在对象存储时，数据库记录与对象文件必须版本对应。
- 删除工作簿/工作表/样式/快照属于破坏性操作：先备份、核对条件、说明恢复方式并取得确认；优先软删除或归档。

## 11. 当前状态与维护

- 当前初始结构基线 `V001__init_schema.sql` 定义 11 张业务表，不包含 `schema_version`；DDL 中所有表和列带中文 `COMMENT`，重建后按 §10.5 清单核验。
- 开发阶段数据库由 AI 助手接手管理，可用 Navicat 或命令行；删除操作需 Aistor 授权。不使用 `schema_version`、schema 校验和、迁移执行器或 CI 迁移检查。
- `V001__init_schema.sql` 保留为 11 张业务表的初始结构基线；当前仓库不提供 `db-migrate.sh` / `db-migrate.ps1`，不使用迁移执行器。

后续关注：

- 真实数据分布下的范围读取、批量 upsert 和锁等待基准。
- 块存储（方案 B）是否在目标负载下优于逐单元格；没有测量前不切换。
- 样式 GC、快照对象存储、日志保留任务的实现与安全边界。
- 单用户编辑闭环；多人协作不在当前范围。
