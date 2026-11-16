---
name: mysql-batch-performance
description: Use for MySQL schema, sparse cell storage, MyBatis-Plus batch SQL, range reads/upserts, indexes and performance investigations.
---

# MySQL Batch Performance
1. Identify workload: viewport read, random update, paste, clear range, import/export or aggregate.
2. Inspect schema, SQL, indexes, transaction and realistic data distribution.
3. Persist only non-empty cells/formulas/explicit metadata; never store every blank cell.
4. Use bounded range queries and batch writes; measure request bytes, query count, rows examined, lock waits and transaction duration.
5. Keep revision check, cell writes, operation log and revision increment consistent.
6. Use EXPLAIN and reproducible benchmarks for material SQL changes.
7. This project is for personal local development. The AI assistant manages the development database schema and data through the approved Navicat or MySQL CLI workflow. Do not introduce Flyway, Liquibase, migration runners or `schema_version` tracking. `V001__init_schema.sql` is a historical initial-schema reference only, not a daily migration mechanism.
8. Before changing schema or data, inspect the current database and create a recoverable SQL backup. Apply the smallest requested change, then verify affected tables, columns, indexes, constraints and comments; synchronize the schema baseline/documentation.
9. Never execute destructive SQL or destructive schema changes (`DROP`, `TRUNCATE`, `DELETE`, `DROP COLUMN`, `DROP INDEX`, etc.) without the user's explicit authorization. A general feature request is not authorization.
10. Consider MySQL DDL implicit commits, table locks, index build time, disk requirements and forward-recovery steps before applying structural changes.
11. Parameterize values and strictly allowlist dynamic identifiers; never concatenate untrusted identifiers into SQL.
