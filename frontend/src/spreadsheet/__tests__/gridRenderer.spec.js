import { describe, expect, it } from 'vitest';
import { createTextCell } from '../core/cell.js';
import { createGridLayout } from '../layout/gridLayout.js';
import { createGridRenderer } from '../rendering/gridRenderer.js';
import { computeViewport } from '../viewport/viewport.js';

function createFakeContext() {
  const calls = {
    fillRect: 0,
    strokeRect: 0,
    fillText: 0,
    moveTo: 0,
    lineTo: 0,
    stroke: 0,
    rect: 0,
    clip: 0,
    save: 0,
    restore: 0,
  };
  const texts = [];
  const ctx = {
    calls,
    texts,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
    save() {
      calls.save += 1;
    },
    restore() {
      calls.restore += 1;
    },
    beginPath() {},
    rect() {
      calls.rect += 1;
    },
    clip() {
      calls.clip += 1;
    },
    fillRect() {
      calls.fillRect += 1;
    },
    strokeRect() {
      calls.strokeRect += 1;
    },
    fillText(text) {
      calls.fillText += 1;
      texts.push(text);
    },
    moveTo() {
      calls.moveTo += 1;
    },
    lineTo() {
      calls.lineTo += 1;
    },
    stroke() {
      calls.stroke += 1;
    },
    setTransform() {},
  };
  return ctx;
}

const layout = createGridLayout({
  rowCount: 1000,
  columnCount: 100,
  rowHeight: 24,
  columnWidth: 100,
  headerHeight: 24,
  headerWidth: 48,
});

describe('gridRenderer', () => {
  const viewport = computeViewport({
    scrollLeft: 0,
    scrollTop: 0,
    viewportWidth: 848,
    viewportHeight: 624,
    layout,
  });

  it('只绘制视口范围内的行列', () => {
    const ctx = createFakeContext();
    const stats = createGridRenderer().draw(ctx, {
      layout,
      viewport,
      scrollLeft: 0,
      scrollTop: 0,
      activeCell: { row: 0, col: 0 },
      width: 848,
      height: 624,
    });

    expect(stats.rows).toBeLessThanOrEqual(viewport.lastRow - viewport.firstRow + 1);
    expect(stats.columns).toBeLessThanOrEqual(viewport.lastCol - viewport.firstCol + 1);
    expect(stats.labels).toBe(stats.rows + stats.columns);
    expect(ctx.calls.fillText).toBe(stats.labels);
    expect(ctx.calls.save).toBe(ctx.calls.restore);
  });

  it('绘制活动单元格高亮边框', () => {
    const ctx = createFakeContext();
    createGridRenderer().draw(ctx, {
      layout,
      viewport,
      scrollLeft: 0,
      scrollTop: 0,
      activeCell: { row: 3, col: 2 },
      width: 848,
      height: 624,
    });

    expect(ctx.calls.strokeRect).toBe(1);
  });

  it('没有活动单元格时不绘制高亮', () => {
    const ctx = createFakeContext();
    createGridRenderer().draw(ctx, {
      layout,
      viewport,
      scrollLeft: 0,
      scrollTop: 0,
      activeCell: null,
      width: 848,
      height: 624,
    });

    expect(ctx.calls.strokeRect).toBe(0);
  });

  it('表头标注列字母与行号', () => {
    const ctx = createFakeContext();
    createGridRenderer().draw(ctx, {
      layout,
      viewport,
      scrollLeft: 0,
      scrollTop: 0,
      activeCell: null,
      width: 848,
      height: 624,
    });

    expect(ctx.texts).toContain('A');
    expect(ctx.texts).toContain('1');
    expect(ctx.texts.length).toBeLessThan(100);
  });

  it('绘制非空单元格文本并跳过空输入', () => {
    const ctx = createFakeContext();
    const cells = new Map([
      ['0:0', createTextCell('Hello')],
      ['1:1', createTextCell('世界')],
      ['2:2', createTextCell('')],
    ]);
    const stats = createGridRenderer().draw(ctx, {
      layout,
      viewport,
      scrollLeft: 0,
      scrollTop: 0,
      activeCell: null,
      getCell: (row, col) => cells.get(`${row}:${col}`),
      width: 848,
      height: 624,
    });

    expect(stats.texts).toBe(2);
    expect(ctx.texts).toContain('Hello');
    expect(ctx.texts).toContain('世界');
  });

  it('远端滚动时仍只绘制窗口内的行号', () => {
    const farViewport = computeViewport({
      scrollLeft: 0,
      scrollTop: 24 * 900,
      viewportWidth: 848,
      viewportHeight: 624,
      layout,
    });
    const ctx = createFakeContext();
    const stats = createGridRenderer().draw(ctx, {
      layout,
      viewport: farViewport,
      scrollLeft: 0,
      scrollTop: 24 * 900,
      activeCell: null,
      width: 848,
      height: 624,
    });

    expect(farViewport.firstRow).toBeGreaterThan(800);
    expect(stats.rows).toBeLessThan(40);
    expect(ctx.texts).toContain('901');
    expect(ctx.texts).not.toContain('1');
  });
});
