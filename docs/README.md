# Sheet Lite：轻量级在线表格项目文档

> 技术路线：Vue 3 + JavaScript + Vite + Yarn Classic 1.22.22 + Naive UI + Canvas 2D；JDK 21 + Spring Boot 4 + Maven + MyBatis-Plus + MySQL。  
> 目标是自研表格网格内核，提供轻量级业务数据表格体验；不把成熟的 Excel 网格组件作为核心依赖。

## 文档导航

1. [项目目标与范围](01-project-scope.md)
2. [总体架构与技术选型](02-architecture.md)
3. [前端工程设计](03-frontend.md)
4. [后端工程设计与 Java 规范](04-backend-java.md)
5. [MySQL 数据模型与 MyBatis-Plus 实践](05-database-mybatis-plus.md)
6. [网格内核、虚拟化与性能](06-grid-engine.md)
7. [命令、剪贴板、撤销重做与公式](07-editing-formula.md)
8. [API 与版本控制](08-api.md)
9. [测试、质量门禁与性能验收](09-testing-performance.md)
10. [分阶段实施计划](10-roadmap.md)
11. [开发环境、构建与部署](11-devops.md)
12. [架构决策记录](12-decisions.md)

## 开发环境约定

- 后端统一使用 **JDK 21 + 本机 Maven 3.9.9**；项目不使用 Maven Wrapper，构建命令统一为 `mvn`。

- 前端统一使用 **Yarn Classic 1.22.22** 管理依赖与执行脚本，在 `frontend/package.json` 中声明 `packageManager: "yarn@1.22.22"`，提交 `yarn.lock`，安装时执行 `yarn install --frozen-lockfile`；不要混用 npm、pnpm 或 Yarn Berry。

- 本项目开发与部署文档不包含 Docker、Docker Compose 或容器化流程。MySQL 由开发者在本机安装并配置；开发阶段数据库由 AI 助手接手管理。

- 数据库在开发阶段由 AI 助手接手管理，可用 Navicat 或命令行；变更前备份，变更后核对表/索引/注释并同步文档；删除操作需 Aistor 授权；不要求迁移框架或版本登记。

## 核心设计原则

- **稀疏存储**：只存非空单元格、非默认样式和显式尺寸，不创建完整二维数组。

- **虚拟化**：只绘制视口和少量缓冲区内的行列。

- **内核与 UI 解耦**：核心模型不依赖 Vue；Vue 负责应用状态与外围 UI，Canvas 负责网格绘制。

- **命令驱动**：编辑、格式、行列操作统一走命令层，为撤销重做、持久化和未来协作打基础。

- **MyBatis-Plus 用于 CRUD，不作为批量单元格存取的唯一抽象**：大范围读写使用专门的 Mapper/XML/批处理 SQL。

- **先定义业务上限，再做性能承诺**：Excel 坐标上限是兼容目标，不代表允许一次加载或一次计算全部单元格。

- **数据安全优先**：权限校验、输入校验、乐观锁、审计和备份不能后补。

## 建议首期范围

首期先实现单用户、单工作簿编辑闭环：空白网格、滚动、单元格选择、输入编辑、复制粘贴、基本格式、保存加载、撤销重做。公式和 XLSX 导入导出在核心交互稳定后迭代；多人协作只预留接口，不作为首期交付条件。

## 重要说明

本文档是可执行的工程起点，不是对所有边界行为的最终规范。涉及公式语义、合并单元格、结构性行列操作、协作冲突、导入导出兼容性时，应通过 ADR 和自动化测试锁定行为。
