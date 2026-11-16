# 08. API 与版本控制

## 1. API 约定

- 基础路径：`/api`
- JSON 使用 UTF-8。
- 坐标统一使用 0-based 行列索引，范围使用明确的 inclusive/exclusive 规则。
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
GET /api/workbooks/100/worksheets/200/chunks?startRow=0&endRow=127&startCol=0&endCol=31
```

建议响应只包含有内容/样式的单元格和必要的尺寸覆盖项：

```json
{
  "workbookId": "100",
  "worksheetId": "200",
  "revision": 12,
  "range": {
    "startRow": 0,
    "endRow": 127,
    "startCol": 0,
    "endCol": 31
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

上例采用半开区间 `[startRow, endRow)`、`[startCol, endCol)`。请在所有 API 中保持一致。

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

如果 revision 冲突，返回 HTTP 409 和稳定错误码 `REVISION_CONFLICT`，附带当前 revision；客户端不能静默覆盖。幂等键必须有存储/去重策略，避免网络重试导致重复应用。

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

当前已实现的错误码以 `backend/src/main/java/com/example/sheetlite/common/response/ErrorCode.java` 为唯一来源：

- 成功响应 `code` 固定为 `OK`。
- 错误码：`VALIDATION_ERROR`、`RESOURCE_NOT_FOUND`、`METHOD_NOT_ALLOWED`、`WORKBOOK_NOT_FOUND`、`FORBIDDEN`、`REVISION_CONFLICT`、`RANGE_TOO_LARGE`、`UNSUPPORTED_OPERATION`、`INTERNAL_ERROR`。
- `details` 在字段校验错误时是 `{ field, message }` 数组；其他错误可使用结构化对象（如 `{ "currentRevision": 13 }`）。

## 6. 分页与批量限制

- 工作簿列表使用服务端分页，不返回全量结果。
- 单元格读取按块查询，禁止客户端请求无限范围。
- 批量写入限制操作数量、单次单元格数和请求体大小。
- 大型导入/导出采用异步任务和状态轮询。
- 任务接口要有所有者/权限校验，不能只凭 taskId 访问。
