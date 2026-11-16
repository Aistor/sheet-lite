import { describe, expect, it } from 'vitest';
import { cellScreenRect } from '../layout/editorRect.js';
import { createGridLayout } from '../layout/gridLayout.js';

const layout = createGridLayout({
  rowCount: 1000,
  columnCount: 100,
  rowHeight: 24,
  columnWidth: 100,
  headerHeight: 24,
  headerWidth: 48,
});

describe('cellScreenRect', () => {
  it('不计滚动时从表头之后开始', () => {
    expect(cellScreenRect({ layout, scrollLeft: 0, scrollTop: 0, row: 0, col: 0 })).toEqual({
      left: 48,
      top: 24,
      width: 100,
      height: 24,
    });
  });

  it('扣除滚动偏移，与 Canvas 绘制坐标一致', () => {
    expect(cellScreenRect({ layout, scrollLeft: 250, scrollTop: 120, row: 10, col: 3 })).toEqual({
      left: 98,
      top: 144,
      width: 100,
      height: 24,
    });
  });
});
