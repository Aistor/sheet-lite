import { describe, expect, it } from 'vitest';
import {
  MAX_COLUMNS,
  MAX_ROWS,
  columnIndexToLabel,
  columnLabelToIndex,
  isValidColumn,
  isValidRow,
  parseA1,
  toA1,
} from '../core/coordinates.js';

describe('列标签转换', () => {
  it('覆盖边界列索引', () => {
    expect(columnIndexToLabel(0)).toBe('A');
    expect(columnIndexToLabel(25)).toBe('Z');
    expect(columnIndexToLabel(26)).toBe('AA');
    expect(columnIndexToLabel(701)).toBe('ZZ');
    expect(columnIndexToLabel(MAX_COLUMNS - 1)).toBe('XFD');
  });

  it('对采样索引做往返转换', () => {
    const samples = [0, 1, 25, 26, 27, 51, 52, 701, 702, MAX_COLUMNS - 1];
    for (const col of samples) {
      expect(columnLabelToIndex(columnIndexToLabel(col))).toBe(col);
    }
  });

  it('拒绝越界列索引', () => {
    for (const col of [-1, MAX_COLUMNS, 1.5, '3', null]) {
      expect(() => columnIndexToLabel(col)).toThrow(RangeError);
    }
  });

  it('拒绝非法列标签', () => {
    for (const label of ['', 'A1', 'AAAA', 'XFE', '1A']) {
      expect(() => columnLabelToIndex(label)).toThrow(RangeError);
    }
  });
});

describe('单元格引用', () => {
  it('把逻辑坐标转换为 A1', () => {
    expect(toA1(0, 0)).toBe('A1');
    expect(toA1(2, 1)).toBe('B3');
    expect(toA1(MAX_ROWS - 1, MAX_COLUMNS - 1)).toBe('XFD1048576');
  });

  it('解析 A1 时忽略大小写与首尾空格', () => {
    expect(parseA1('b3')).toEqual({ row: 2, col: 1 });
    expect(parseA1(' A1 ')).toEqual({ row: 0, col: 0 });
  });

  it('对采样引用做往返转换', () => {
    const samples = [
      [0, 0],
      [2, 1],
      [MAX_ROWS - 1, MAX_COLUMNS - 1],
    ];
    for (const [row, col] of samples) {
      expect(parseA1(toA1(row, col))).toEqual({ row, col });
    }
  });

  it('拒绝格式错误或越界的引用', () => {
    for (const ref of ['A0', 'A1048577', 'XFE1', 'A', '1A', 'A-1']) {
      expect(() => parseA1(ref)).toThrow();
    }
  });

  it('校验逻辑坐标边界', () => {
    expect(isValidRow(0)).toBe(true);
    expect(isValidRow(MAX_ROWS - 1)).toBe(true);
    expect(isValidRow(MAX_ROWS)).toBe(false);
    expect(isValidColumn(0)).toBe(true);
    expect(isValidColumn(MAX_COLUMNS - 1)).toBe(true);
    expect(isValidColumn(MAX_COLUMNS)).toBe(false);
  });
});
