import { describe, expect, it } from 'vitest';
import {
  clampCell,
  createSelection,
  extendSelection,
  isSingleCellSelection,
  moveActiveCell,
  selectionRange,
} from '../core/selection.js';

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

describe('区域选择', () => {
  it('创建单格选区', () => {
    expect(createSelection({ row: 2, col: 3 })).toEqual({
      anchor: { row: 2, col: 3 },
      focus: { row: 2, col: 3 },
    });
  });

  it('扩展焦点时保持锚点', () => {
    const selection = createSelection({ row: 1, col: 1 });
    const extended = extendSelection(selection, { row: 4, col: 5 });

    expect(extended.anchor).toEqual({ row: 1, col: 1 });
    expect(extended.focus).toEqual({ row: 4, col: 5 });
  });

  it('规范化反向拖拽的范围', () => {
    const range = selectionRange({
      anchor: { row: 5, col: 6 },
      focus: { row: 2, col: 3 },
    });

    expect(range).toEqual({ startRow: 2, startCol: 3, endRow: 5, endCol: 6 });
  });

  it('识别单格选区', () => {
    expect(isSingleCellSelection(createSelection({ row: 0, col: 0 }))).toBe(true);
    expect(
      isSingleCellSelection({
        anchor: { row: 0, col: 0 },
        focus: { row: 0, col: 1 },
      }),
    ).toBe(false);
  });
});
