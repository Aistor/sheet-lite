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
      aria-label="空白表格"
      @scroll.passive="handleScroll"
      @pointerdown="handlePointerDown"
      @keydown="handleKeyDown"
    >
      <div class="grid-spacer" :style="spacerStyle"></div>
    </div>
    <div class="grid-badge">{{ activeLabel }}</div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { toA1 } from '@/spreadsheet/core/coordinates.js';
import { moveActiveCell } from '@/spreadsheet/core/selection.js';
import { createGridLayout } from '@/spreadsheet/layout/gridLayout.js';
import { createGridRenderer } from '@/spreadsheet/rendering/gridRenderer.js';
import {
  clampScroll,
  computeViewport,
  scrollToCell,
} from '@/spreadsheet/viewport/viewport.js';

const props = defineProps({
  rowCount: { type: Number, default: 1048576 },
  columnCount: { type: Number, default: 16384 },
});

const layout = createGridLayout({
  rowCount: props.rowCount,
  columnCount: props.columnCount,
});

const shellRef = ref(null);
const canvasRef = ref(null);
const scrollerRef = ref(null);

const activeCell = ref({ row: 0, col: 0 });
const activeLabel = computed(() => toA1(activeCell.value.row, activeCell.value.col));

const spacerStyle = computed(() => ({
  width: `${layout.totalWidth}px`,
  height: `${layout.totalHeight}px`,
}));

const renderer = createGridRenderer();
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
  state.scrollLeft = scroller.scrollLeft;
  state.scrollTop = scroller.scrollTop;
  refreshViewport();
  scheduleDraw();
}

function handlePointerDown(event) {
  const scroller = scrollerRef.value;
  if (!scroller) {
    return;
  }
  scroller.focus({ preventScroll: true });
  const rect = scroller.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  if (x < layout.headerWidth || y < layout.headerHeight) {
    return;
  }
  const cell = layout.hitTest(
    x - layout.headerWidth + scroller.scrollLeft,
    y - layout.headerHeight + scroller.scrollTop,
  );
  if (!cell) {
    return;
  }
  activeCell.value = cell;
  scheduleDraw();
}

function handleKeyDown(event) {
  const keyMap = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
  };
  const delta = keyMap[event.key];
  if (!delta) {
    return;
  }
  event.preventDefault();
  activeCell.value = moveActiveCell(activeCell.value, delta[0], delta[1], layout);
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
  height: 100%;
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

.grid-badge {
  position: absolute;
  top: 4px;
  right: 12px;
  padding: 1px 8px;
  border-radius: 999px;
  background-color: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
  font-size: 12px;
  line-height: 16px;
  pointer-events: none;
}
</style>
