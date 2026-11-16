---
name: formula-engine
description: Use for formula parsing, dependency tracking, recalculation, references, formula errors or evaluating a third-party spreadsheet formula engine.
---

# Formula Engine
- Define required functions and exact semantics before choosing an engine.
- Verify license and commercial distribution terms from authoritative sources.
- Keep a FormulaEngine adapter between core model and dependency.
- Benchmark memory, dependencies, bulk paste, large SUM ranges, chains and repeated edits.
- Separate authoritative formula input from rebuildable calculated-value cache.
- Test relative/absolute and cross-sheet references, rename, row/column insert/delete, fill and undo/redo.
- Do not use eval or allow arbitrary JavaScript execution.
- Virtualized rendering does not virtualize formula dependencies; configurable row limits do not guarantee practical million-row performance.
- Document unsupported functions and compatibility differences.
