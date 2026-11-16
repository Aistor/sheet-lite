import { describe, expect, it } from 'vitest';
import { clampCell, moveActiveCell } from '../core/selection.js';

const bounds = { rowCount: 1000, columnCount: 100 };

describe('clampCell', () => {
  it('把越界坐标夹到表格内', () => {
    expect(clampCell({ row: -5, col: -1 }, bounds)).toEqual({ row: 0, col: 0 });
    expect(clampCell({ row: 5000, col: 500 }, bounds)).toEqual({ row: 999, col: 99 });
  });

  it('非法数值回退到 0', () => {
    expect(clampCell({ row: Number.NaN, col: Number.POSITIVE_INFINITY }, bounds)).toEqual({
      row: 0,
      col: 0,
    });
  });
});

describe('moveActiveCell', () => {
  it('按方向移动', () => {
    expect(moveActiveCell({ row: 5, col: 5 }, 1, 0, bounds)).toEqual({ row: 6, col: 5 });
    expect(moveActiveCell({ row: 5, col: 5 }, 0, -1, bounds)).toEqual({ row: 5, col: 4 });
  });

  it('在边界处停住', () => {
    expect(moveActiveCell({ row: 0, col: 0 }, -1, -1, bounds)).toEqual({ row: 0, col: 0 });
    expect(moveActiveCell({ row: 999, col: 99 }, 1, 1, bounds)).toEqual({ row: 999, col: 99 });
  });
});
