---
name: testing-performance
description: Use when adding features, fixing regressions or evaluating correctness and performance across the grid, formulas, APIs and MySQL.
---

# Testing and Performance

## Test selection
- Unit: coordinate mapping, range intersection, sparse stores, commands/undo-redo, validation and formula adapter.
- Module integration: renderer invalidation from model changes; interaction-to-command flow; clipboard-to-command flow; persistence revision/conflict handling.
- Backend integration: Mapper SQL on MySQL, transaction behavior, revision conflicts and operationId idempotency.
- Browser acceptance is manual; do not add Playwright or another browser automation framework unless explicitly approved. Keep checklists under `frontend/tests/manual/`.

## Performance datasets
Use separate representative datasets:
- sparse random cells;
- continuous business rows;
- dense blocks;
- long text and style-heavy cells;
- formula-heavy ranges and dependency chains.

Measure the relevant path rather than one generic “grid performance” number:
- initial load and viewport query;
- scroll frame time and hit testing;
- paste/clear and command history;
- formula recalculation;
- save/load payload, API latency and SQL query count;
- heap growth, transaction duration and lock waits.

Record environment, dataset generation, operation steps, correctness checks, p50/p95 and memory. Compare against a baseline when available.

## Boundary and regression checks
- Assert module boundaries: core has no Vue/DOM/Canvas/HTTP dependency; rendering is read-only; committed mutations use commands.
- Test merged cells crossing viewport boundaries, frozen panes, hidden dimensions and long-distance scrolling.
- Verify edit, keyboard, IME, clipboard, save/reload, network failure and revision conflict with the manual checklist.
- Verify actual database schema against Entity/Mapper expectations and documented schema baseline after schema changes.
- Do not test or require a migration runner, `schema_version` table, migration ordering or migration checksums; this project does not use an automated migration framework.

## Reporting
- Separate correctness tests from performance measurements.
- State exactly which commands ran and their actual results.
- Mark unavailable/unrun checks explicitly; never claim unrun tests passed.
- Never extrapolate blank-sheet performance to dense or formula-heavy data.
