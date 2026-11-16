import { describe, expect, it } from 'vitest';
import {
  clampRangeToSheet,
  createRange,
  intersectRanges,
  rangeCellCount,
  rangeContains,
  rangesEqual,
} from '../core/range.js';

describe('createRange', () => {
  it('归一化颠倒的起止角', () => {
    expect(createRange({ startRow: 5, startCol: 3, endRow: 1, endCol: 0 })).toEqual({
      startRow: 1,
      startCol: 0,
      endRow: 5,
      endCol: 3,
    });
  });

  it('拒绝非法坐标', () => {
    expect(() => createRange({ startRow: -1, startCol: 0, endRow: 0, endCol: 0 })).toThrow(
      RangeError,
    );
    expect(() => createRange({ startRow: 0, startCol: 16384, endRow: 0, endCol: 0 })).toThrow(
      RangeError,
    );
  });
});

describe('区域运算', () => {
  const range = createRange({ startRow: 1, startCol: 1, endRow: 3, endCol: 4 });

  it('统计单元格数量', () => {
    expect(rangeCellCount(range)).toBe(12);
  });

  it('包含边界坐标', () => {
    expect(rangeContains(range, 1, 1)).toBe(true);
    expect(rangeContains(range, 3, 4)).toBe(true);
    expect(rangeContains(range, 4, 4)).toBe(false);
    expect(rangeContains(range, 0, 1)).toBe(false);
  });

  it('计算重叠区域交集', () => {
    const other = createRange({ startRow: 3, startCol: 4, endRow: 9, endCol: 9 });
    expect(intersectRanges(range, other)).toEqual({
      startRow: 3,
      startCol: 4,
      endRow: 3,
      endCol: 4,
    });
  });

  it('无重叠时返回 null', () => {
    const other = createRange({ startRow: 5, startCol: 5, endRow: 6, endCol: 6 });
    expect(intersectRanges(range, other)).toBeNull();
  });

  it('按工作表边界裁剪', () => {
    expect(clampRangeToSheet(range, 3, 3)).toEqual({
      startRow: 1,
      startCol: 1,
      endRow: 2,
      endCol: 2,
    });
    const outside = createRange({ startRow: 5, startCol: 5, endRow: 6, endCol: 6 });
    expect(clampRangeToSheet(outside, 3, 3)).toBeNull();
  });

  it('比较区域是否一致', () => {
    const same = createRange({ startRow: 1, startCol: 1, endRow: 3, endCol: 4 });
    const different = createRange({ startRow: 0, startCol: 1, endRow: 3, endCol: 4 });
    expect(rangesEqual(range, same)).toBe(true);
    expect(rangesEqual(range, different)).toBe(false);
  });
});
