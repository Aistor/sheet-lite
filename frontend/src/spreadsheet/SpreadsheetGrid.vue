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
import { createCommandManager } from '@/spreadsheet/commands/commandManager.js';
import { createSetCellCommand } from '@/spreadsheet/commands/setCellCommand.js';
import { createSetCellsBatchCommand } from '@/spreadsheet/commands/setCellsBatchCommand.js';
import { parseTsv, serializeRangeToTsv } from '@/spreadsheet/clipboard/tsv.js';
import { clampScroll, computeViewport, scrollToCell } from '@/spreadsheet/viewport/viewport.js';

const props = defineProps({
  rowCount: { type: Number, default: 1048576 },
  columnCount: { type: Number, default: 16384 },
});

const emit = defineEmits(['active-change']);

const layout = createGridLayout({
  rowCount: props.rowCount,
  columnCount: props.columnCount,
});

const shellRef = ref(null);
const canvasRef = ref(null);
const scrollerRef = ref(null);
const editorRef = ref(null);

const selection = ref(createSelection({ row: 0, col: 0 }));
const activeCell = computed(() => selection.value.focus);
const editing = ref(null);
const editorStyle = ref({});
const notice = ref('');

const cellStore = new SparseCellStore();
const commandContext = { store: cellStore };
const commands = createCommandManager({ onApplied: () => scheduleDraw() });
const renderer = createGridRenderer();

let editorText = '';
let composing = false;
let dragging = false;
let noticeTimer = 0;

watch(
  activeCell,
  (cell) => {
    emit('active-change', toA1(cell.row, cell.col));
  },
  { immediate: true },
);

const spacerStyle = computed(() => ({
  width: `${layout.totalWidth}px`,
  height: `${layout.totalHeight}px`,
}));

const state = {
  scrollLeft: 0,
  scrollTop: 0,
  width: 0,
  height: 0,
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
  if (scroller.scrollLeft !== left) {
    scroller.scrollLeft = left;
  }
  if (scroller.scrollTop !== top) {
    scroller.scrollTop = top;
  }
  state.scrollLeft = scroller.scrollLeft;
  state.scrollTop = scroller.scrollTop;
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
  state.scrollTop = scroller.scrollTop;
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
  return layout.hitTest(
    x - layout.headerWidth + scroller.scrollLeft,
    y - layout.headerHeight + scroller.scrollTop,
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

function handlePointerMove(event) {
  if (!dragging) {
    return;
  }
  const cell = cellAt(event.clientX, event.clientY);
  if (!cell) {
    return;
  }
  selection.value = extendSelection(selection.value, cell);
  scheduleDraw();
}

function handlePointerUp() {
  dragging = false;
  window.removeEventListener('pointermove', handlePointerMove);
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
  if (!shell) {
    return;
  }
  state.width = shell.clientWidth;
  state.height = shell.clientHeight;
  const clamped = clampScroll(state.scrollLeft, state.scrollTop, {
    layout,
    viewportWidth: state.width,
    viewportHeight: state.height,
  });
  state.scrollLeft = clamped.scrollLeft;
  state.scrollTop = clamped.scrollTop;
  refreshViewport();
  positionEditor();
  scheduleDraw();
}

onMounted(() => {
  resizeObserver = new ResizeObserver(handleResize);
  if (shellRef.value) {
    resizeObserver.observe(shellRef.value);
  }
  handleResize();
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  window.clearTimeout(noticeTimer);
  window.removeEventListener('pointermove', handlePointerMove);
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
  pointer-events: none;
}

.grid-scroller {
  position: absolute;
  inset: 0;
  overflow: auto;
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
