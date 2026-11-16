---
name: frontend-canvas-grid
description: Use when implementing or changing the spreadsheet frontend core ——Canvas rendering, viewport virtualization, layout, hit testing, selection, editing, merged cells, clipboard or grid performance.
---

# Frontend Canvas Grid

## Architecture invariants
- Follow `docs/03-frontend.md` module boundaries and `docs/02-architecture.md` dependency rules.
- `core` owns domain contracts/models and must not import Vue, Pinia, DOM, Canvas, HTTP or Naive UI.
- `store` owns sparse data structures; it does not handle UI events, rendering or persistence.
- `viewport` computes visible/overscan ranges; `layout` maps logical coordinates and pixels.
- `rendering` reads model/store state and paints Canvas; it never mutates business data.
- `interaction` translates input into selection changes or commands. All committed data mutations go through `commands`.
- `commands` owns mutation semantics and undo/redo. `persistence` serializes committed changes and manages revision/operationId; it does not mutate the model around the command layer.
- Naive UI is for surrounding controls, never the grid core. Do not create one DOM/Vue component per cell.

## Implementation checklist
1. Identify the owning module before editing; avoid cross-module shortcuts and circular imports.
2. Keep one coordinate transform contract shared by drawing, hit testing, selection overlays and DOM editor placement.
3. Use sparse storage; never allocate the full logical matrix.
4. Render only viewport + bounded overscan. Include merged ranges crossing viewport boundaries in range queries.
5. For variable dimensions, evaluate prefix sums/Fenwick Tree; define hidden/frozen row and column behavior explicitly.
6. Define merge anchors, overlap rejection, value preservation and row/column structural-edit behavior before implementing merge operations.
7. Keep IME composition, focus, keyboard navigation and clipboard behavior separate from Canvas drawing.
8. Treat formula results as rebuildable cache; formula input remains authoritative.

## Required validation
- Unit-test coordinate boundaries, range intersection, sparse store, merge lookup and command undo/redo.
- Test scrolling, zoom, high-DPI rendering, long text, IME composition, keyboard navigation and clipboard boundaries.
- Benchmark sparse, dense, long-text, style-heavy and formula-heavy datasets separately.
- Report environment, data distribution, operation, frame time/latency and memory. Do not claim Excel-scale capacity based only on logical coordinate limits.
