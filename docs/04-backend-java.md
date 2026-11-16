# 04. 后端工程设计与 Java 编码规范

## 1. 后端模块与包结构

建议先采用单体应用、按业务模块分包：

```text
backend/src/main/java/com/sheetlite/
├── SheetLiteApplication.java
├── common/
│   ├── config/
│   ├── constant/
│   ├── exception/
│   ├── response/
│   ├── validation/
│   └── util/
├── security/
├── workbook/
│   ├── controller/
│   ├── application/
│   ├── domain/
│   ├── infrastructure/
│   │   ├── entity/
│   │   └── mapper/
│   └── dto/
├── worksheet/
├── cell/
├── operation/
├── snapshot/
├── importexport/
└── audit/
```

各业务模块可按规模拆分；避免为了分层而产生空壳类。`domain` 不应依赖 Web Controller 和 MyBatis Mapper。

## 2. Java 版本与依赖原则

- **固定使用 JDK 21**，开发机、CI 和构建环境保持一致；禁止无说明地升级或降级 Java 基线。
- 使用本机安装的 Maven **3.9.9**，并在 `pom.xml` 中将 Java release 固定为 `21`。项目不包含 Maven Wrapper 文件或配置目录。
- Spring Boot BOM 管理 Spring 生态依赖版本；避免手工混搭不兼容版本。
- MyBatis-Plus、数据库驱动、Springdoc、测试库等需做 Boot 4 兼容性验证。
- 引入依赖前核对维护状态、许可证、安全公告和升级路径。

在 `pom.xml` 中显式配置 Java 21 编译目标。Windows、Linux 和 macOS 均使用 `mvn` 命令；构建前执行 `java -version` 与 `mvn -version`，确认当前 JDK 为 21、Maven 为 3.9.9。

## 3. 阿里巴巴 Java 开发规范落地

尽量遵循《阿里巴巴 Java 开发手册》及团队补充规范。规范版本应在仓库中记录，团队升级时通过代码检查和评审落地。

建议执行项：

1. 命名：类使用 UpperCamelCase，方法/变量使用 lowerCamelCase，常量使用全大写下划线。
2. 分层：Controller、Application/Service、Mapper 职责清晰；禁止 Controller 直接访问 Mapper。
3. 异常：禁止空 catch；异常必须有上下文；业务异常与系统异常区分。
4. 日志：使用 SLF4J 参数化日志；禁止 `System.out.println`；避免记录密码、令牌和完整敏感单元格内容。
5. 集合：明确集合容量、空值语义和不可变性；避免对外暴露可变内部集合。
6. 日期时间：使用 `java.time`；统一时区策略，服务端存 UTC 或明确业务时区。
7. 数值：金额和精确小数使用 `BigDecimal`，不要使用 `double` 作为财务值的权威表示。
8. 并发：明确线程安全；不要在单例 Service 中保存请求级可变状态。
9. SQL：使用参数绑定；禁止拼接用户输入作为 SQL 标识符或条件。
10. 事务：事务边界放在应用服务层；避免长事务中执行文件上传、网络调用或大型公式计算。
11. 设计：组合优先；避免无意义的工具类、万能 Service 和过度复杂的继承层次。
12. 注释：解释业务原因、约束和非显而易见的设计，不要复述代码。
13. 序列化：外部 DTO 明确字段和兼容策略；不要直接暴露数据库 Entity。
14. API：参数校验、权限校验、幂等性、分页限制和错误码必须一致。

## 4. 工具与质量门禁

建议集成：

- Alibaba Java Coding Guidelines（IDE 插件/检查规则）作为开发辅助。
- Checkstyle 或 Spotless 统一格式；避免多个工具争夺同一规则。
- SpotBugs 或同类静态分析。
- Maven 单元测试、集成测试。
- 依赖漏洞扫描和 SBOM（按团队安全要求）。
- 提交前必须通过格式、静态分析、测试和数据库变更检查（备份可恢复、结构已核对、删除已授权）。

规则应可自动化时尽量自动化；团队例外要通过明确的抑制注释和评审，而不是全局关闭规则。

## 5. Controller 与 DTO 示例

```java
@RestController
@RequestMapping("/api/workbooks")
@Validated
@RequiredArgsConstructor
public class WorkbookController {

    private final WorkbookApplicationService workbookApplicationService;

    @PostMapping
    public ApiResponse<WorkbookResponse> create(
            @Valid @RequestBody CreateWorkbookRequest request) {
        WorkbookResponse response = workbookApplicationService.create(request);
        return ApiResponse.success(response);
    }
}
```

注意：此示例假设项目配置了 `@RequiredArgsConstructor`（Lombok）和统一 `ApiResponse`。如果团队偏好减少 Lombok，可使用显式构造器。不能因为示例而跳过应用服务内的身份、权限和业务校验。

## 6. 统一响应与异常

建议成功响应与错误响应采用统一契约，但下载流、SSE 等特殊接口可以单独定义。

错误至少包含：

- `code`：稳定的机器可读错误码。
- `message`：适合用户或开发者理解的简短说明。
- `traceId`：排查请求用。
- `details`：可选字段错误列表；不可泄露内部堆栈。

典型错误：`VALIDATION_ERROR`、`WORKBOOK_NOT_FOUND`、`FORBIDDEN`、`REVISION_CONFLICT`、`RANGE_TOO_LARGE`、`UNSUPPORTED_OPERATION`、`INTERNAL_ERROR`。

## 7. 事务和服务边界

- 元数据 CRUD 可使用 MyBatis-Plus Service。
- 批量单元格写入应有专门的应用服务和批量 Mapper 方法。
- 事务内完成 revision 校验、单元格变更、操作日志和 revision 推进。
- 大型导入导出改用异步任务，分批提交并记录任务状态。
- 事务失败时确保单元格内容和 revision 不会部分提交。
