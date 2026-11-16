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
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { toA1 } from '@/spreadsheet/core/coordinates.js';
import { moveActiveCell } from '@/spreadsheet/core/selection.js';
import { createGridLayout } from '@/spreadsheet/layout/gridLayout.js';
import { cellScreenRect } from '@/spreadsheet/layout/editorRect.js';
import { createGridRenderer } from '@/spreadsheet/rendering/gridRenderer.js';
import { SparseCellStore } from '@/spreadsheet/store/sparseCellStore.js';
import { createCommandManager } from '@/spreadsheet/commands/commandManager.js';
import { createSetCellCommand } from '@/spreadsheet/commands/setCellCommand.js';
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

const activeCell = ref({ row: 0, col: 0 });
const editing = ref(null);
const editorStyle = ref({});

const cellStore = new SparseCellStore();
const commandContext = { store: cellStore };
const commands = createCommandManager({ onApplied: () => scheduleDraw() });
const renderer = createGridRenderer();

let editorText = '';
let composing = false;

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
  const scroller = scrollerRef.value;
  if (!scroller) {
    return;
  }
  scroller.focus({ preventScroll: true });
  const cell = cellAt(event.clientX, event.clientY);
  if (!cell) {
    return;
  }
  activeCell.value = cell;
  scheduleDraw();
}

function handleDoubleClick(event) {
  const cell = cellAt(event.clientX, event.clientY);
  if (!cell) {
    return;
  }
  activeCell.value = cell;
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

function moveActive(deltaRow, deltaCol) {
  activeCell.value = moveActiveCell(activeCell.value, deltaRow, deltaCol, layout);
  const target = scrollToCell({
    row: activeCell.value.row,
    col: activeCell.value.col,
    scrollLeft: state.scrollLeft,
    scrollTop: state.scrollTop,
    layout,
    viewportWidth: state.width,
    viewportHeight: state.height,
  });
  syncScroll(target.scrollLeft, target.scrollTop);
  scheduleDraw();
}

function clearActiveCell() {
  const { row, col } = activeCell.value;
  if (!cellStore.has(row, col)) {
    return;
  }
  commands.execute(createSetCellCommand({ row, col, input: '' }), commandContext);
}

function handleKeyDown(event) {
  if (event.key === 'Enter' || event.key === 'F2') {
    event.preventDefault();
    startEdit(activeCell.value.row, activeCell.value.col);
    return;
  }
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    clearActiveCell();
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
    moveActive(delta[0], delta[1]);
    return;
  }
  if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
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
</style>
