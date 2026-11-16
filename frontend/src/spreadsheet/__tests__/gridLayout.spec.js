import { describe, expect, it } from 'vitest';
import { createGridLayout } from '../layout/gridLayout.js';

describe('createGridLayout', () => {
  const layout = createGridLayout({
    rowCount: 1000,
    columnCount: 100,
    rowHeight: 24,
    columnWidth: 100,
    headerHeight: 24,
    headerWidth: 48,
  });

  it('计算内容总尺寸但不创建行列对象', () => {
    expect(layout.totalHeight).toBe(24000);
    expect(layout.totalWidth).toBe(10000);
    expect(Array.isArray(layout.rows)).toBe(false);
  });

  it('行列坐标映射到像素', () => {
    expect(layout.rowY(0)).toBe(0);
    expect(layout.rowY(10)).toBe(240);
    expect(layout.columnX(3)).toBe(300);
  });

  it('像素反查行列并处理边界', () => {
    expect(layout.rowAt(0)).toBe(0);
    expect(layout.rowAt(23.9)).toBe(0);
    expect(layout.rowAt(24)).toBe(1);
    expect(layout.rowAt(-1)).toBe(-1);
    expect(layout.rowAt(layout.totalHeight)).toBe(-1);

    expect(layout.columnAt(0)).toBe(0);
    expect(layout.columnAt(99.9)).toBe(0);
    expect(layout.columnAt(100)).toBe(1);
    expect(layout.columnAt(layout.totalWidth)).toBe(-1);
  });

  it('命中测试返回单元格或 null', () => {
    expect(layout.hitTest(0, 0)).toEqual({ row: 0, col: 0 });
    expect(layout.hitTest(350, 490)).toEqual({ row: 20, col: 3 });
    expect(layout.hitTest(-1, 0)).toBeNull();
    expect(layout.hitTest(0, layout.totalHeight)).toBeNull();
  });

  it('cellRect 返回内容坐标系的矩形', () => {
    expect(layout.cellRect(2, 1)).toEqual({ x: 100, y: 48, width: 100, height: 24 });
  });

  it('拒绝非法尺寸与行列数量', () => {
    expect(() => createGridLayout({ rowCount: 0 })).toThrow(RangeError);
    expect(() => createGridLayout({ rowHeight: 0 })).toThrow(RangeError);
    expect(() => createGridLayout({ columnWidth: Number.NaN })).toThrow(RangeError);
  });
});
