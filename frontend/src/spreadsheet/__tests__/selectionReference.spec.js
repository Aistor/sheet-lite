import { describe, expect, it } from 'vitest';
import { parseSelectionReference } from '../core/selection.js';

const bounds = { rowCount: 1000, columnCount: 100 };

describe('parseSelectionReference', () => {
  it('解析单格与区域并自动规范化方向', () => {
    expect(parseSelectionReference('B3', bounds)).toEqual({
      mode: 'cells',
      anchor: { row: 2, col: 1 },
      focus: { row: 2, col: 1 },
    });

    expect(parseSelectionReference('c5:a2', bounds)).toEqual({
      mode: 'cells',
      anchor: { row: 1, col: 0 },
      focus: { row: 4, col: 2 },
    });
  });

  it('解析整列、整行与全表', () => {
    expect(parseSelectionReference('A:C', bounds)).toEqual({
      mode: 'columns',
      anchorCol: 0,
      focusCol: 2,
    });
    expect(parseSelectionReference('3:1', bounds)).toEqual({
      mode: 'rows',
      anchorRow: 0,
      focusRow: 2,
    });
    expect(parseSelectionReference('全部', bounds)).toEqual({ mode: 'all' });
  });

  it('支持省略列号或行号', () => {
    expect(parseSelectionReference('B', bounds)).toEqual({
      mode: 'columns',
      anchorCol: 1,
      focusCol: 1,
    });
    expect(parseSelectionReference('2', bounds)).toEqual({
      mode: 'rows',
      anchorRow: 1,
      focusRow: 1,
    });
  });

  it('拒绝非法与越界引用', () => {
    expect(parseSelectionReference('', bounds)).toBeNull();
    expect(parseSelectionReference('A0', bounds)).toBeNull();
    expect(parseSelectionReference('A1:C', bounds)).toBeNull();
    expect(parseSelectionReference('A1001', bounds)).toBeNull();
    expect(parseSelectionReference('CW1', bounds)).toBeNull();
  });
});
