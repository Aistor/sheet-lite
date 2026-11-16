---
name: java-alibaba-mybatisplus
description: Use when creating or modifying Java, Spring Boot APIs, services, validation, transactions, logging or MyBatis-Plus integration.
---

# Java + Alibaba Guidelines + MyBatis-Plus
- Follow the repository's selected Alibaba Java Development Guidelines version as closely as practical.
- Keep Controller -> application/service -> domain/infrastructure Mapper boundaries clear; do not expose Entity as API DTO.
- Use SLF4J parameterized logging; no System.out, empty catch, swallowed exceptions or sensitive cell contents in logs.
- Parameterize SQL; validate authorization, coordinates, range and request size server-side.
- MyBatis-Plus is suitable for metadata CRUD; use dedicated Mapper/XML/batch SQL for range reads, paste/upsert and range deletes.
- Do not loop over generic updateById for thousands of cells.
- Keep cell writes, operation log and revision advancement transactionally consistent; use operationId for idempotency.
- Database scope is personal local development. The AI assistant manages the development database schema and data through the approved Navicat or MySQL CLI workflow; do not introduce Flyway, Liquibase, migration runners or `schema_version` tracking.
- Before any schema/data change, inspect the current database and create a recoverable SQL backup. Apply only the requested change, then verify affected tables, columns, indexes, constraints and comments; synchronize the schema baseline/documentation.
- Never execute destructive SQL or destructive schema changes (including `DROP`, `TRUNCATE`, `DELETE`, `DROP COLUMN` or `DROP INDEX`) without the user's explicit authorization. Do not infer authorization from a general feature request.
- `V001__init_schema.sql` is a historical initial-schema reference only, not a daily migration mechanism.
- Run available format/static checks and tests; report unrun checks honestly.
