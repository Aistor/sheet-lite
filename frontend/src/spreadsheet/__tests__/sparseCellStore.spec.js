import { describe, expect, it } from 'vitest';
import { createTextCell } from '../core/cell.js';
import { SparseCellStore } from '../store/sparseCellStore.js';

describe('SparseCellStore', () => {
  it('写入、读取与覆盖单元格', () => {
    const store = new SparseCellStore();
    store.set(2, 3, createTextCell('first'));

    expect(store.get(2, 3)).toEqual({ rawInput: 'first', valueType: 'text' });
    expect(store.has(2, 3)).toBe(true);
    expect(store.size).toBe(1);

    store.set(2, 3, createTextCell('second'));
    expect(store.get(2, 3).rawInput).toBe('second');
    expect(store.size).toBe(1);
  });

  it('删除与清空', () => {
    const store = new SparseCellStore();
    store.set(0, 0, createTextCell('a'));
    store.set(1, 1, createTextCell('b'));

    expect(store.delete(0, 0)).toBe(true);
    expect(store.delete(0, 0)).toBe(false);
    expect(store.has(0, 0)).toBe(false);

    store.clear();
    expect(store.size).toBe(0);
  });

  it('按区域遍历时包含边界并过滤区域外单元格', () => {
    const store = new SparseCellStore();
    store.set(1, 1, createTextCell('inside'));
    store.set(2, 2, createTextCell('inside'));
    store.set(3, 3, createTextCell('outside'));

    const entries = [...store.entriesInRange({ startRow: 1, startCol: 1, endRow: 2, endCol: 2 })];
    expect(entries.map((entry) => entry.cell.rawInput)).toEqual(['inside', 'inside']);
    expect(entries.map((entry) => [entry.row, entry.col])).toEqual([
      [1, 1],
      [2, 2],
    ]);
  });

  it('空字符串仍可存储，由命令层决定删除语义', () => {
    const store = new SparseCellStore();
    store.set(0, 0, createTextCell(''));

    expect(store.get(0, 0).rawInput).toBe('');
    expect(store.size).toBe(1);
  });

  it('拒绝负坐标与非整数坐标', () => {
    const store = new SparseCellStore();
    expect(() => store.get(-1, 0)).toThrow(RangeError);
    expect(() => store.set(0, 1.5, createTextCell('x'))).toThrow(RangeError);
  });
});
