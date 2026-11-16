<template>
  <div ref="shellRef" class="grid-shell">
    <canvas ref="canvasRef" class="grid-canvas" aria-hidden="true"></canvas>
    <div
      ref="scrollerRef"
      class="grid-scroller"
      tabindex="0"
      role="grid"
      :aria-rowcount="layout.rowCount"
      :aria-colcount="layout.columnCount"
      aria-label="可编辑表格"
      @scroll.passive="handleScroll"
      @pointerdown="handlePointerDown"
      @pointermove="handleHoverMove"
      @dblclick="handleDoubleClick"
      @keydown="handleKeyDown"
      @paste="handlePaste"
    >
      <div class="grid-spacer" :style="spacerStyle"></div>
    </div>
    <input
      v-if="editing"
      ref="editorRef"
      class="grid-editor"
      type="text"
      :style="editorStyle"
      :value="editing.initialValue"
      spellcheck="false"
      autocomplete="off"
      @input="handleEditorInput"
      @keydown="handleEditorKeyDown"
      @compositionstart="handleCompositionStart"
      @compositionend="handleCompositionEnd"
      @blur="commitEdit"
    />
    <div v-if="notice" class="grid-notice">{{ notice }}</div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { toA1 } from '@/spreadsheet/core/coordinates.js';
import {
  createSelection,
  extendSelection,
  moveActiveCell,
  selectionRange,
} from '@/spreadsheet/core/selection.js';
import { createGridLayout } from '@/spreadsheet/layout/gridLayout.js';
import { cellScreenRect } from '@/spreadsheet/layout/editorRect.js';
import { createGridRenderer } from '@/spreadsheet/rendering/gridRenderer.js';
import { SparseCellStore } from '@/spreadsheet/store/sparseCellStore.js';
import { SparseStyleStore } from '@/spreadsheet/store/sparseStyleStore.js';
import { DEFAULT_STYLE, normalizeStyle } from '@/spreadsheet/core/style.js';
import { createCommandManager } from '@/spreadsheet/commands/commandManager.js';
import { createSetCellCommand } from '@/spreadsheet/commands/setCellCommand.js';
import { createSetCellsBatchCommand } from '@/spreadsheet/commands/setCellsBatchCommand.js';
import { createSetRangeStyleCommand } from '@/spreadsheet/commands/setRangeStyleCommand.js';
import { parseTsv, serializeRangeToTsv } from '@/spreadsheet/clipboard/tsv.js';
import {
  autoScrollDelta,
  clampScroll,
  computeViewport,
  createScrollMapping,
  logicalToPhysical,
  physicalToLogical,
  scrollToCell,
} from '@/spreadsheet/viewport/viewport.js';

const props = defineProps({
  rowCount: { type: Number, default: 1048576 },
  columnCount: { type: Number, default: 16384 },
});

const emit = defineEmits(['active-change', 'active-style-change']);

const layout = createGridLayout({
  rowCount: props.rowCount,
  columnCount: props.columnCount,
});

// Chromium 的元素高度上限按设备像素计算；按 devicePixelRatio 折算出 CSS 上限并预留余量。
const MAX_SAFE_CONTENT_HEIGHT = Math.max(
  2_000_000,
  33_000_000 / (window.devicePixelRatio || 1),
);

const shellRef = ref(null);
const canvasRef = ref(null);
const scrollerRef = ref(null);
const editorRef = ref(null);

const selection = ref(createSelection({ row: 0, col: 0 }));
const activeCell = computed(() => selection.value.anchor);
const editing = ref(null);
const editorStyle = ref({});
const notice = ref('');

const cellStore = new SparseCellStore();
const styleStore = new SparseStyleStore();
const commandContext = { store: cellStore, styleStore };
const commands = createCommandManager({
  onApplied: () => {
    scheduleDraw();
    emitActiveStyle();
  },
});
const renderer = createGridRenderer();

const MAX_STYLE_CELLS = 100_000;
const layoutVersion = ref(0);

let editorText = '';
let composing = false;
let dragging = false;
let resizeState = null;
let dragPointer = null;
let dragFrame = 0;
let noticeTimer = 0;

watch(
  activeCell,
  (cell) => {
    emit('active-change', toA1(cell.row, cell.col));
    emitActiveStyle();
  },
  { immediate: true },
);

const spacerStyle = computed(() => {
  void layoutVersion.value;
  return {
    // 宽度加上表头，使滚动上限能把最后一列完整滚入正文区。
    width: `${layout.totalWidth + layout.headerWidth}px`,
    // 高度受浏览器上限约束，超出部分由纵向滚动映射承担。
    height: `${Math.min(layout.totalHeight, MAX_SAFE_CONTENT_HEIGHT) + layout.headerHeight}px`,
  };
});

const state = {
  scrollLeft: 0,
  scrollTop: 0,
  width: 0,
  height: 0,
  verticalMapping: {
    logicalMax: 0,
    physicalMax: 0,
    scale: 0,
    physicalContent: 0,
  },
  viewport: {
    firstRow: 0,
    lastRow: -1,
    firstCol: 0,
    lastCol: -1,
    visibleRows: 0,
    visibleColumns: 0,
  },
};

let resizeObserver;
let frameHandle = 0;

function showNotice(message) {
  notice.value = message;
  window.clearTimeout(noticeTimer);
  noticeTimer = window.setTimeout(() => {
    notice.value = '';
  }, 2400);
}

function refreshViewport() {
  state.viewport = computeViewport({
    scrollLeft: state.scrollLeft,
    scrollTop: state.scrollTop,
    viewportWidth: state.width,
    viewportHeight: state.height,
    layout,
  });
}

function drawFrame() {
  frameHandle = 0;
  const canvas = canvasRef.value;
  if (!canvas || state.width === 0 || state.height === 0) {
    return;
  }
  const dpr = window.devicePixelRatio || 1;
  const pixelWidth = Math.max(1, Math.round(state.width * dpr));
  const pixelHeight = Math.max(1, Math.round(state.height * dpr));
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  renderer.draw(ctx, {
    layout,
    viewport: state.viewport,
    scrollLeft: state.scrollLeft,
    scrollTop: state.scrollTop,
    activeCell: activeCell.value,
    selection: selectionRange(selection.value),
    getCell: (row, col) => cellStore.get(row, col),
    getStyle: (row, col) => styleStore.get(row, col),
    width: state.width,
    height: state.height,
  });
}

function scheduleDraw() {
  if (frameHandle !== 0) {
    return;
  }
  frameHandle = window.requestAnimationFrame(drawFrame);
}

function syncScroll(left, top) {
  const scroller = scrollerRef.value;
  if (!scroller) {
    return;
  }
  const targetLeft = Math.max(0, left);
  const targetTop = Math.min(Math.max(0, top), state.verticalMapping.logicalMax);
  if (scroller.scrollLeft !== targetLeft) {
    scroller.scrollLeft = targetLeft;
  }
  const physicalTop = logicalToPhysical(state.verticalMapping, targetTop);
  if (scroller.scrollTop !== physicalTop) {
    scroller.scrollTop = physicalTop;
  }
  state.scrollLeft = targetLeft;
  state.scrollTop = targetTop;
  refreshViewport();
  scheduleDraw();
}

function handleScroll() {
  const scroller = scrollerRef.value;
  if (!scroller) {
    return;
  }
  if (editing.value) {
    commitEdit();
  }
  state.scrollLeft = scroller.scrollLeft;
  state.scrollTop = physicalToLogical(state.verticalMapping, scroller.scrollTop);
  refreshViewport();
  scheduleDraw();
}

function cellAt(clientX, clientY) {
  const scroller = scrollerRef.value;
  if (!scroller) {
    return null;
  }
  const rect = scroller.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  if (x < layout.headerWidth || y < layout.headerHeight) {
    return null;
  }
  const logicalLeft = scroller.scrollLeft;
  const logicalTop = physicalToLogical(state.verticalMapping, scroller.scrollTop);
  return layout.hitTest(
    x - layout.headerWidth + logicalLeft,
    y - layout.headerHeight + logicalTop,
  );
}

function handlePointerDown(event) {
  if (event.button !== 0) {
    return;
  }
  const scroller = scrollerRef.value;
  if (!scroller) {
    return;
  }
  scroller.focus({ preventScroll: true });
  if (editing.value) {
    commitEdit();
  }
  const resizeTarget = findResizeTarget(event.clientX, event.clientY);
  if (resizeTarget) {
    startResize(resizeTarget);
    return;
  }
  const cell = cellAt(event.clientX, event.clientY);
  if (!cell) {
    return;
  }
  selection.value = event.shiftKey
    ? extendSelection(selection.value, cell)
    : createSelection(cell);
  dragging = true;
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp, { once: true });
  scheduleDraw();
}

function cellAtClamped(clientX, clientY) {
  const scroller = scrollerRef.value;
  if (!scroller) {
    return null;
  }
  const rect = scroller.getBoundingClientRect();
  const logicalLeft = scroller.scrollLeft;
  const logicalTop = physicalToLogical(state.verticalMapping, scroller.scrollTop);
  const contentX = Math.min(
    Math.max(0, clientX - rect.left - layout.headerWidth + logicalLeft),
    layout.totalWidth - 1,
  );
  const contentY = Math.min(
    Math.max(0, clientY - rect.top - layout.headerHeight + logicalTop),
    layout.totalHeight - 1,
  );
  return layout.hitTest(contentX, contentY);
}

function extendSelectionToPointer() {
  if (!dragPointer) {
    return;
  }
  const cell = cellAtClamped(dragPointer.x, dragPointer.y);
  if (!cell) {
    return;
  }
  selection.value = extendSelection(selection.value, cell);
  scheduleDraw();
}

function autoScrollStep() {
  dragFrame = 0;
  const scroller = scrollerRef.value;
  if (!dragging || !dragPointer || !scroller) {
    return;
  }
  const rect = scroller.getBoundingClientRect();
  const { dx, dy } = autoScrollDelta({
    pointerX: dragPointer.x,
    pointerY: dragPointer.y,
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
  });
  if (dx !== 0 || dy !== 0) {
    const bodyWidth = Math.max(0, state.width - layout.headerWidth);
    const nextLeft = Math.min(
      Math.max(0, state.scrollLeft + dx),
      Math.max(0, layout.totalWidth - bodyWidth),
    );
    const nextTop = Math.min(
      Math.max(0, state.scrollTop + dy * (state.verticalMapping.scale || 1)),
      state.verticalMapping.logicalMax,
    );
    if (nextLeft !== state.scrollLeft || nextTop !== state.scrollTop) {
      syncScroll(nextLeft, nextTop);
      extendSelectionToPointer();
    }
  }
  if (dragging) {
    dragFrame = window.requestAnimationFrame(autoScrollStep);
  }
}

function handlePointerMove(event) {
  if (!dragging) {
    return;
  }
  dragPointer = { x: event.clientX, y: event.clientY };
  extendSelectionToPointer();
  if (dragFrame === 0) {
    dragFrame = window.requestAnimationFrame(autoScrollStep);
  }
}

function handlePointerUp() {
  dragging = false;
  dragPointer = null;
  if (dragFrame !== 0) {
    window.cancelAnimationFrame(dragFrame);
    dragFrame = 0;
  }
  window.removeEventListener('pointermove', handlePointerMove);
}

function findResizeTarget(clientX, clientY) {
  const scroller = scrollerRef.value;
  if (!scroller) {
    return null;
  }
  const rect = scroller.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const threshold = 5;

  if (y < layout.headerHeight && x >= layout.headerWidth) {
    const contentX = x - layout.headerWidth + state.scrollLeft;
    for (let col = state.viewport.firstCol; col <= state.viewport.lastCol; col += 1) {
      const right = layout.columnX(col) + layout.columnWidthOf(col);
      if (Math.abs(contentX - right) <= threshold) {
        return {
          type: 'column',
          index: col,
          startSize: layout.columnWidthOf(col),
          startCoord: clientX,
        };
      }
    }
    return null;
  }

  if (x < layout.headerWidth && y >= layout.headerHeight) {
    const contentY = y - layout.headerHeight + state.scrollTop;
    for (let row = state.viewport.firstRow; row <= state.viewport.lastRow; row += 1) {
      const bottom = layout.rowY(row) + layout.rowHeightOf(row);
      if (Math.abs(contentY - bottom) <= threshold) {
        return {
          type: 'row',
          index: row,
          startSize: layout.rowHeightOf(row),
          startCoord: clientY,
        };
      }
    }
  }
  return null;
}

function startResize(target) {
  resizeState = target;
  window.addEventListener('pointermove', handleResizeMove);
  window.addEventListener('pointerup', endResize, { once: true });
}

function handleResizeMove(event) {
  if (!resizeState) {
    return;
  }
  const delta =
    resizeState.type === 'column'
      ? event.clientX - resizeState.startCoord
      : event.clientY - resizeState.startCoord;
  const nextSize = Math.min(1000, Math.max(12, Math.round(resizeState.startSize + delta)));
  if (resizeState.type === 'column') {
    layout.setColumnWidth(resizeState.index, nextSize);
  } else {
    layout.setRowHeight(resizeState.index, nextSize);
  }
  layoutVersion.value += 1;
  refreshViewport();
  positionEditor();
  scheduleDraw();
}

function endResize() {
  resizeState = null;
  window.removeEventListener('pointermove', handleResizeMove);
  handleResize();
}

function handleHoverMove(event) {
  if (resizeState || dragging) {
    return;
  }
  const scroller = scrollerRef.value;
  if (!scroller) {
    return;
  }
  const target = findResizeTarget(event.clientX, event.clientY);
  scroller.style.cursor = target ? (target.type === 'column' ? 'col-resize' : 'row-resize') : '';
}

function afterLayoutChange() {
  layoutVersion.value += 1;
  handleResize();
}

function hideSelectedRows() {
  const range = selectionRange(selection.value);
  const count = range.endRow - range.startRow + 1;
  if (count > 2000) {
    showNotice('选区行数过多，暂不支持批量隐藏');
    return;
  }
  for (let row = range.startRow; row <= range.endRow; row += 1) {
    layout.setRowHeight(row, 0);
  }
  afterLayoutChange();
}

function hideSelectedColumns() {
  const range = selectionRange(selection.value);
  const count = range.endCol - range.startCol + 1;
  if (count > 200) {
    showNotice('选区列数过多，暂不支持批量隐藏');
    return;
  }
  for (let col = range.startCol; col <= range.endCol; col += 1) {
    layout.setColumnWidth(col, 0);
  }
  afterLayoutChange();
}

function showSelectedRows() {
  const range = selectionRange(selection.value);
  for (let row = range.startRow; row <= range.endRow; row += 1) {
    layout.resetRowHeight(row);
  }
  afterLayoutChange();
}

function showSelectedColumns() {
  const range = selectionRange(selection.value);
  for (let col = range.startCol; col <= range.endCol; col += 1) {
    layout.resetColumnWidth(col);
  }
  afterLayoutChange();
}

function handleDoubleClick(event) {
  const cell = cellAt(event.clientX, event.clientY);
  if (!cell) {
    return;
  }
  selection.value = createSelection(cell);
  startEdit(cell.row, cell.col);
}

function focusScroller() {
  nextTick(() => {
    scrollerRef.value?.focus({ preventScroll: true });
  });
}

function positionEditor() {
  if (!editing.value) {
    return;
  }
  const rect = cellScreenRect({
    layout,
    scrollLeft: state.scrollLeft,
    scrollTop: state.scrollTop,
    row: editing.value.row,
    col: editing.value.col,
  });
  editorStyle.value = {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  };
}

function startEdit(row, col, initialValue) {
  const existing = cellStore.get(row, col)?.rawInput ?? '';
  editorText = initialValue ?? existing;
  selection.value = createSelection({ row, col });
  editing.value = { row, col, initialValue: editorText };
  positionEditor();
  scheduleDraw();
  nextTick(() => {
    const input = editorRef.value;
    if (!input) {
      return;
    }
    input.focus({ preventScroll: true });
    input.setSelectionRange(input.value.length, input.value.length);
  });
}

function commitEdit() {
  const session = editing.value;
  if (!session) {
    return null;
  }
  editing.value = null;
  const current = cellStore.get(session.row, session.col)?.rawInput ?? '';
  if (editorText !== current) {
    commands.execute(
      createSetCellCommand({ row: session.row, col: session.col, input: editorText }),
      commandContext,
    );
  }
  scheduleDraw();
  focusScroller();
  return session;
}

function cancelEdit() {
  editing.value = null;
  scheduleDraw();
  focusScroller();
}

function handleEditorInput(event) {
  editorText = event.target.value;
}

function handleEditorKeyDown(event) {
  if (event.isComposing || composing) {
    return;
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    const session = commitEdit();
    if (session) {
      moveActive(1, 0);
    }
    return;
  }
  if (event.key === 'Tab') {
    event.preventDefault();
    const session = commitEdit();
    if (session) {
      moveActive(0, event.shiftKey ? -1 : 1);
    }
    return;
  }
  if (event.key === 'Escape') {
    event.preventDefault();
    cancelEdit();
  }
}

function handleCompositionStart() {
  composing = true;
}

function handleCompositionEnd() {
  composing = false;
}

function ensureVisible(cell) {
  const target = scrollToCell({
    row: cell.row,
    col: cell.col,
    scrollLeft: state.scrollLeft,
    scrollTop: state.scrollTop,
    layout,
    viewportWidth: state.width,
    viewportHeight: state.height,
  });
  syncScroll(target.scrollLeft, target.scrollTop);
}

function moveActive(deltaRow, deltaCol, extend = false) {
  const next = moveActiveCell(activeCell.value, deltaRow, deltaCol, layout);
  selection.value = extend ? extendSelection(selection.value, next) : createSelection(next);
  ensureVisible(next);
  scheduleDraw();
}

function copySelection() {
  const range = selectionRange(selection.value);
  const text = serializeRangeToTsv({
    range,
    getCell: (row, col) => cellStore.get(row, col),
  });
  const rows = range.endRow - range.startRow + 1;
  const columns = range.endCol - range.startCol + 1;
  navigator.clipboard
    .writeText(text)
    .then(() => showNotice(`已复制 ${rows} 行 × ${columns} 列`))
    .catch(() => showNotice('复制失败：浏览器拒绝剪贴板访问'));
}

function handlePaste(event) {
  const text = event.clipboardData?.getData('text/plain') ?? '';
  if (text === '') {
    return;
  }
  event.preventDefault();
  let rows;
  try {
    rows = parseTsv(text);
  } catch (error) {
    showNotice(
      error instanceof RangeError ? '粘贴内容超出单次限制（10 万单元格 / 5 MB）' : '粘贴内容格式无法解析',
    );
    return;
  }
  if (rows.length === 0) {
    return;
  }
  const columnCount = Math.max(...rows.map((fields) => fields.length));
  const { row, col } = activeCell.value;
  if (row + rows.length > layout.rowCount || col + columnCount > layout.columnCount) {
    showNotice('粘贴范围超出工作表边界');
    return;
  }

  const cells = [];
  rows.forEach((fields, rowOffset) => {
    fields.forEach((input, colOffset) => {
      cells.push({ row: row + rowOffset, col: col + colOffset, input });
    });
  });
  commands.execute(createSetCellsBatchCommand({ cells }), commandContext);
  selection.value = {
    anchor: { row, col },
    focus: {
      row: row + rows.length - 1,
      col: col + columnCount - 1,
    },
  };
  scheduleDraw();
  showNotice(`已粘贴 ${rows.length} 行 × ${columnCount} 列`);
}

function clearSelection() {
  const range = selectionRange(selection.value);
  const cells = [];
  for (const { row, col } of cellStore.entriesInRange(range)) {
    cells.push({ row, col, input: '' });
  }
  if (cells.length === 0) {
    return;
  }
  commands.execute(createSetCellsBatchCommand({ cells }), commandContext);
}

function emitActiveStyle() {
  const cell = activeCell.value;
  emit('active-style-change', normalizeStyle(styleStore.get(cell.row, cell.col) ?? DEFAULT_STYLE));
}

function selectionCellCount(range) {
  return (range.endRow - range.startRow + 1) * (range.endCol - range.startCol + 1);
}

function applyStyle(patch) {
  const range = selectionRange(selection.value);
  if (selectionCellCount(range) > MAX_STYLE_CELLS) {
    showNotice('选区过大，暂不支持一次性设置样式');
    return;
  }
  commands.execute(
    createSetRangeStyleCommand({ range, resolvePatch: () => patch }),
    commandContext,
  );
  emitActiveStyle();
}

function applyBorder(mode) {
  const range = selectionRange(selection.value);
  if (selectionCellCount(range) > MAX_STYLE_CELLS) {
    showNotice('选区过大，暂不支持一次性设置边框');
    return;
  }
  commands.execute(
    createSetRangeStyleCommand({
      range,
      resolvePatch: (row, col) => {
        if (mode === 'none') {
          return { borders: { top: false, right: false, bottom: false, left: false } };
        }
        if (mode === 'all') {
          return { borders: { top: true, right: true, bottom: true, left: true } };
        }
        return {
          borders: {
            top: row === range.startRow,
            bottom: row === range.endRow,
            left: col === range.startCol,
            right: col === range.endCol,
          },
        };
      },
    }),
    commandContext,
  );
  emitActiveStyle();
}

function applyNumberFormat(numberFormat) {
  applyStyle({ numberFormat });
}

defineExpose({
  applyStyle,
  applyBorder,
  applyNumberFormat,
  hideSelectedRows,
  hideSelectedColumns,
  showSelectedRows,
  showSelectedColumns,
});

function undo() {
  if (commands.undo(commandContext)) {
    scheduleDraw();
  }
}

function redo() {
  if (commands.redo(commandContext)) {
    scheduleDraw();
  }
}

function handleKeyDown(event) {
  const modifier = event.ctrlKey || event.metaKey;
  if (modifier && event.key.toLowerCase() === 'c') {
    event.preventDefault();
    copySelection();
    return;
  }
  if (modifier && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    if (event.shiftKey) {
      redo();
    } else {
      undo();
    }
    return;
  }
  if (modifier && event.key.toLowerCase() === 'y') {
    event.preventDefault();
    redo();
    return;
  }
  if (event.key === 'Enter' || event.key === 'F2') {
    event.preventDefault();
    startEdit(activeCell.value.row, activeCell.value.col);
    return;
  }
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    clearSelection();
    return;
  }
  if (event.key === 'Tab') {
    event.preventDefault();
    moveActive(0, event.shiftKey ? -1 : 1);
    return;
  }
  const delta = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
  }[event.key];
  if (delta) {
    event.preventDefault();
    moveActive(delta[0], delta[1], event.shiftKey);
    return;
  }
  if (event.key.length === 1 && !modifier && !event.altKey) {
    event.preventDefault();
    startEdit(activeCell.value.row, activeCell.value.col, event.key);
  }
}

function handleResize() {
  const shell = shellRef.value;
  const scroller = scrollerRef.value;
  if (!shell) {
    return;
  }
  state.width = scroller ? scroller.clientWidth : shell.clientWidth;
  state.height = scroller ? scroller.clientHeight : shell.clientHeight;
  const canvas = canvasRef.value;
  if (canvas) {
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;
  }
  const clamped = clampScroll(state.scrollLeft, state.scrollTop, {
    layout,
    viewportWidth: state.width,
    viewportHeight: state.height,
  });
  state.verticalMapping = createScrollMapping({
    contentSize: layout.totalHeight,
    viewportSize: Math.max(0, state.height - layout.headerHeight),
    maxContentSize: MAX_SAFE_CONTENT_HEIGHT,
  });
  state.scrollLeft = clamped.scrollLeft;
  state.scrollTop = Math.min(clamped.scrollTop, state.verticalMapping.logicalMax);
  if (scroller) {
    scroller.scrollLeft = state.scrollLeft;
    scroller.scrollTop = logicalToPhysical(state.verticalMapping, state.scrollTop);
  }
  refreshViewport();
  positionEditor();
  scheduleDraw();
}

onMounted(() => {
  resizeObserver = new ResizeObserver(handleResize);
  if (shellRef.value) {
    resizeObserver.observe(shellRef.value);
  }
  if (scrollerRef.value) {
    resizeObserver.observe(scrollerRef.value);
  }
  handleResize();
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  window.clearTimeout(noticeTimer);
  if (dragFrame !== 0) {
    window.cancelAnimationFrame(dragFrame);
    dragFrame = 0;
  }
  window.removeEventListener('pointermove', handlePointerMove);
  window.removeEventListener('pointermove', handleResizeMove);
  if (frameHandle !== 0) {
    window.cancelAnimationFrame(frameHandle);
    frameHandle = 0;
  }
});
</script>

<style scoped>
.grid-shell {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background-color: #ffffff;
}

.grid-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: 8px;
  clip-path: inset(0 round 8px);
  pointer-events: none;
}

.grid-scroller {
  position: absolute;
  inset: 0;
  overflow: auto;
  border-radius: 8px;
  outline: none;
}

.grid-scroller:focus-visible {
  box-shadow: inset 0 0 0 2px rgba(37, 99, 235, 0.35);
}

.grid-spacer {
  pointer-events: none;
}

.grid-editor {
  position: absolute;
  z-index: 3;
  box-sizing: border-box;
  margin: 0;
  padding: 0 5px;
  border: 2px solid #2563eb;
  outline: none;
  background-color: #ffffff;
  color: #1f2329;
  font-family: 'Segoe UI', 'PingFang SC', sans-serif;
  font-size: 13px;
  line-height: normal;
}

.grid-notice {
  position: absolute;
  bottom: 12px;
  left: 50%;
  z-index: 4;
  padding: 6px 14px;
  border-radius: 6px;
  background-color: rgba(31, 35, 41, 0.86);
  color: #ffffff;
  font-size: 12px;
  transform: translateX(-50%);
  pointer-events: none;
}
</style>
