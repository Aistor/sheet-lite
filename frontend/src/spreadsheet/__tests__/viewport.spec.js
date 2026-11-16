import { describe, expect, it } from 'vitest';
import { createGridLayout } from '../layout/gridLayout.js';
import { clampScroll, computeViewport, scrollToCell } from '../viewport/viewport.js';

const layout = createGridLayout({
  rowCount: 1000,
  columnCount: 100,
  rowHeight: 24,
  columnWidth: 100,
  headerHeight: 24,
  headerWidth: 48,
});

describe('computeViewport', () => {
  it('从左上角开始计算可见范围并加缓冲区', () => {
    const viewport = computeViewport({
      scrollLeft: 0,
      scrollTop: 0,
      viewportWidth: 848,
      viewportHeight: 624,
      layout,
    });

    expect(viewport.firstRow).toBe(0);
    expect(viewport.visibleRows).toBe(25);
    expect(viewport.lastRow).toBe(26);
    expect(viewport.firstCol).toBe(0);
    expect(viewport.visibleColumns).toBe(8);
    expect(viewport.lastCol).toBe(8);
  });

  it('随滚动偏移推进可见范围', () => {
    const viewport = computeViewport({
      scrollLeft: 500,
      scrollTop: 240,
      viewportWidth: 848,
      viewportHeight: 624,
      layout,
    });

    expect(viewport.firstRow).toBe(8);
    expect(viewport.lastRow).toBe(36);
    expect(viewport.firstCol).toBe(4);
    expect(viewport.lastCol).toBe(13);
  });

  it('缓冲区在表格边界处收缩', () => {
    const viewport = computeViewport({
      scrollLeft: 0,
      scrollTop: layout.totalHeight - 600,
      viewportWidth: 848,
      viewportHeight: 624,
      layout,
    });

    expect(viewport.lastRow).toBe(999);
  });

  it('零尺寸容器不产生可见行列', () => {
    const viewport = computeViewport({
      scrollLeft: 0,
      scrollTop: 0,
      viewportWidth: 48,
      viewportHeight: 24,
      layout,
    });

    expect(viewport.lastRow).toBe(-1);
    expect(viewport.lastCol).toBe(-1);
  });
});

describe('clampScroll', () => {
  it('限制在内容边界内', () => {
    expect(
      clampScroll(-10, -10, { layout, viewportWidth: 848, viewportHeight: 624 }),
    ).toEqual({ scrollLeft: 0, scrollTop: 0 });

    expect(
      clampScroll(999999, 999999, { layout, viewportWidth: 848, viewportHeight: 624 }),
    ).toEqual({ scrollLeft: 9200, scrollTop: 23400 });
  });
});

describe('scrollToCell', () => {
  it('把远端的单元格滚动到可见区域', () => {
    const target = scrollToCell({
      row: 200,
      col: 50,
      scrollLeft: 0,
      scrollTop: 0,
      layout,
      viewportWidth: 848,
      viewportHeight: 624,
    });

    expect(target.scrollTop).toBe(4224);
    expect(target.scrollLeft).toBe(4300);
  });

  it('已可见时保持偏移不变', () => {
    const target = scrollToCell({
      row: 2,
      col: 2,
      scrollLeft: 0,
      scrollTop: 0,
      layout,
      viewportWidth: 848,
      viewportHeight: 624,
    });

    expect(target).toEqual({ scrollLeft: 0, scrollTop: 0 });
  });
});
