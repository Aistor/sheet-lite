---
name: security-review
description: Use for API authorization, batch operations, SQL, imports/exports, formula evaluation, dependency changes, logging and data exposure.
---

# Security Review
Review changed code and call paths for:
- authentication and workbook/sheet/task/snapshot resource authorization;
- IDOR, range/payload/upload/decompression limits and resource exhaustion;
- SQL injection in dynamic SQL and mapper fragments;
- CSV formula injection and unsafe HTML clipboard/import content;
- arbitrary code execution in formulas; secrets and sensitive cell values in logs;
- cross-tenant cache leaks and async task access;
- dependency provenance, licenses and vulnerabilities.
Report severity, evidence/location, preconditions, impact and fix. Distinguish confirmed defects from uncertain questions. Default to read-only; never run destructive tests against production.
