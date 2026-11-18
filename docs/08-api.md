# 08. API 与版本控制

## 1. API 约定

- 基础路径：`/api`
- JSON 使用 UTF-8。
- 单元格坐标统一使用 0-based 行列索引；所有矩形范围统一使用半开区间 `[start, end)`：包含起点、不包含终点。禁止在不同 API 中混用 inclusive 与 exclusive。
- 单元格点坐标字段 `row` / `col` 表示单个坐标，不是范围；范围字段统一使用 `startRow` / `endRow` / `startCol` / `endCol`，其中 `end*` 均为开区间边界。
- 范围必须满足 `0 <= start < end <= rowLimit/columnLimit`；单元格坐标必须满足 `0 <= row < rowLimit`、`0 <= col < columnLimit`。前端 A1 等人类可读地址如采用闭区间表达，必须在 API 边界转换为半开区间。
- 写接口携带幂等 `operationId`。
- 需要并发控制的请求携带 `baseRevision`。
- 所有接口执行身份认证和资源级权限校验。
- 对范围、请求体字节数和批量单元格数量设置上限。

## 2. 建议接口

| 方法 | 路径 | 用途 |
|---|---|---|
| POST | `/api/workbooks` | 创建工作簿 |
| GET | `/api/workbooks` | 分页查询用户可访问工作簿 |
| GET | `/api/workbooks/{workbookId}` | 获取元数据 |
| PATCH | `/api/workbooks/{workbookId}` | 更新工作簿元数据 |
| POST | `/api/workbooks/{workbookId}/worksheets` | 新建工作表 |
| PATCH | `/api/workbooks/{workbookId}/worksheets/{sheetId}` | 修改工作表元数据 |
| GET | `/api/workbooks/{workbookId}/worksheets/{sheetId}/chunks` | 获取可视区域数据块 |
| POST | `/api/workbooks/{workbookId}/operations` | 提交一批操作 |
| GET | `/api/workbooks/{workbookId}/operations` | 按 revision 查询操作日志（协作/恢复时使用） |
| POST | `/api/workbooks/{workbookId}/snapshots` | 创建快照 |
| GET | `/api/workbooks/{workbookId}/snapshots/latest` | 获取最新快照元数据/内容 |
| POST | `/api/workbooks/{workbookId}/imports` | 创建导入任务 |
| POST | `/api/workbooks/{workbookId}/exports` | 创建导出任务 |
| GET | `/api/tasks/{taskId}` | 查询任务状态 |

## 3. 读取网格块

请求示意：

```http
GET /api/workbooks/100/worksheets/200/chunks?startRow=0&endRow=128&startCol=0&endCol=32
```

建议响应只包含有内容/样式的单元格和必要的尺寸覆盖项：

```json
{
  "workbookId": "100",
  "worksheetId": "200",
  "revision": 12,
  "range": {
    "startRow": 0,
    "endRow": 128,
    "startCol": 0,
    "endCol": 32
  },
  "cells": [
    {
      "row": 0,
      "col": 0,
      "rawInput": "Revenue",
      "valueType": "text",
      "styleId": null
    }
  ]
}
```

上例采用半开区间 `[startRow, endRow)`、`[startCol, endCol)`，表示读取第 0～127 行、第 0～31 列。请在所有 API、数据库查询和前端/后端适配层保持一致；SQL 不得使用两端包含的 `BETWEEN` 表达半开范围。

## 4. 操作提交

```json
{
  "operationId": "client-generated-unique-id",
  "baseRevision": 12,
  "operations": [
    {
      "type": "SET_CELLS_BATCH",
      "worksheetId": "200",
      "cells": [
        {
          "row": 0,
          "col": 1,
          "rawInput": "120"
        }
      ]
    }
  ]
}
```

响应示意：

```json
{
  "operationId": "client-generated-unique-id",
  "revision": 13,
  "accepted": true
}
```

如果 revision 冲突，返回 HTTP 409 和稳定错误码 `REVISION_CONFLICT`，附带当前 revision；客户端不能静默覆盖。

幂等处理约定：

1. 服务端先校验工作簿存在、未删除及当前用户写权限。
2. 在同一事务中查询 `(workbookId, operationId)`，并比较首次请求与重试请求的规范化内容。
3. 内容一致时返回首次成功的 `revision` 和 `duplicate: true`，不得再次应用操作；内容不一致时返回 HTTP 409、错误码 `OPERATION_ID_REUSED`。
4. 只有该 `operationId` 尚不存在时，才校验 `baseRevision` 并执行新操作。
5. 客户端超时重试必须沿用原 `operationId`、`baseRevision` 和完全相同的 `operations`；修改请求内容必须生成新的 `operationId`。

幂等重放示意响应：

```json
{
  "operationId": "client-generated-unique-id",
  "revision": 13,
  "accepted": true,
  "duplicate": true
}
```

当前操作日志不保存完整响应体，因此 API 只承诺返回已记录的 revision 与重复标志；需要单元格最新内容时重新读取。`OPERATION_ID_REUSED` 是本契约新增的错误码，后端实现时须同步加入 `ErrorCode.java` 和测试。

## 5. 统一错误格式

```json
{
  "code": "REVISION_CONFLICT",
  "message": "工作簿已被更新，请刷新后重试。",
  "traceId": "request-trace-id",
  "details": {
    "currentRevision": 13
  }
}
```

不要把 SQL、堆栈、内部路径或未经脱敏的输入数据返回客户端。

当前已实现的错误码以 `backend/src/main/java/com/sheetlite/common/response/ErrorCode.java` 为唯一来源：

- 成功响应 `code` 固定为 `OK`。
- 当前已实现错误码：`VALIDATION_ERROR`、`RESOURCE_NOT_FOUND`、`METHOD_NOT_ALLOWED`、`WORKBOOK_NOT_FOUND`、`FORBIDDEN`、`REVISION_CONFLICT`、`RANGE_TOO_LARGE`、`UNSUPPORTED_OPERATION`、`INTERNAL_ERROR`。
- 待实现新增错误码：`OPERATION_ID_REUSED`（同一工作簿内重复使用 `operationId`，但请求内容与首次成功请求不一致）。在后端实现该契约时，同步更新 `ErrorCode.java`、统一异常响应和自动化测试。
- `details` 在字段校验错误时是 `{ field, message }` 数组；其他错误可使用结构化对象（如 `{ "currentRevision": 13 }`）。

## 6. 分页与批量限制

- 工作簿列表使用服务端分页，不返回全量结果。
- 单元格读取按块查询，禁止客户端请求无限范围。
- 批量写入限制操作数量、单次单元格数和请求体大小。
- 大型导入/导出采用异步任务和状态轮询。
- 任务接口要有所有者/权限校验，不能只凭 taskId 访问。
