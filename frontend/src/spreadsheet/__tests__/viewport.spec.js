import { describe, expect, it } from 'vitest';
import { createGridLayout } from '../layout/gridLayout.js';
import {
  autoScrollDelta,
  clampScroll,
  computeViewport,
  createScrollMapping,
  logicalToPhysical,
  physicalToLogical,
  scrollToCell,
} from '../viewport/viewport.js';

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

describe('autoScrollDelta', () => {
  const rect = { left: 0, top: 0, right: 800, bottom: 600 };

  it('视口内部不滚动', () => {
    expect(autoScrollDelta({ pointerX: 400, pointerY: 300, ...rect })).toEqual({ dx: 0, dy: 0 });
  });

  it('进入右/下边缘时正向滚动', () => {
    const delta = autoScrollDelta({ pointerX: 790, pointerY: 590, ...rect });
    expect(delta.dx).toBe(13);
    expect(delta.dy).toBe(13);
  });

  it('进入左/上边缘时反向滚动', () => {
    const delta = autoScrollDelta({ pointerX: 10, pointerY: 8, ...rect });
    expect(delta.dx).toBe(-13);
    expect(delta.dy).toBe(-14);
  });

  it('拖出视口时按单帧上限滚动', () => {
    expect(autoScrollDelta({ pointerX: 1200, pointerY: 900, ...rect })).toEqual({
      dx: 30,
      dy: 30,
    });
    expect(autoScrollDelta({ pointerX: -400, pointerY: -400, ...rect })).toEqual({
      dx: -30,
      dy: -30,
    });
  });
});

describe('滚动映射', () => {
  it('内容低于浏览器上限时保持 1:1', () => {
    const mapping = createScrollMapping({
      contentSize: 10_000,
      viewportSize: 600,
      maxContentSize: 22_000_000,
    });

    expect(mapping.logicalMax).toBe(9_400);
    expect(mapping.physicalMax).toBe(9_400);
    expect(mapping.scale).toBe(1);
    expect(logicalToPhysical(mapping, 1_000)).toBe(1_000);
    expect(physicalToLogical(mapping, 1_000)).toBe(1_000);
  });

  it('内容超过上限时压缩，端点仍可达', () => {
    const mapping = createScrollMapping({
      contentSize: 25_000_000,
      viewportSize: 600,
      maxContentSize: 22_000_000,
    });

    expect(mapping.scale).toBeGreaterThan(1);
    expect(logicalToPhysical(mapping, mapping.logicalMax)).toBeCloseTo(mapping.physicalMax, 6);
    expect(physicalToLogical(mapping, mapping.physicalMax)).toBeCloseTo(mapping.logicalMax, 6);
  });

  it('中间值往返误差小于 1px', () => {
    const mapping = createScrollMapping({
      contentSize: 25_000_000,
      viewportSize: 590,
      maxContentSize: 16_500_000,
    });
    const physical = logicalToPhysical(mapping, 12_345_678);

    expect(Math.abs(physicalToLogical(mapping, physical) - 12_345_678)).toBeLessThan(1 / mapping.scale + 1);
  });

  it('零视口与零内容不产生负值', () => {
    const mapping = createScrollMapping({ contentSize: 0, viewportSize: 0, maxContentSize: 100 });
    expect(mapping.logicalMax).toBe(0);
    expect(mapping.physicalMax).toBe(0);
    expect(logicalToPhysical(mapping, 100)).toBe(0);
    expect(physicalToLogical(mapping, 100)).toBe(0);
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
