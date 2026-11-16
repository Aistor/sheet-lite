import { describe, expect, it } from 'vitest';
import { SparseDimensionStore } from '../store/sparseDimensionStore.js';

describe('SparseDimensionStore', () => {
  it('默认尺寸与覆盖', () => {
    const store = new SparseDimensionStore(24);
    expect(store.get(0)).toBe(24);
    expect(store.get(100)).toBe(24);

    store.set(2, 48);
    expect(store.get(2)).toBe(48);
    expect(store.size).toBe(1);

    store.reset(2);
    expect(store.get(2)).toBe(24);
    expect(store.size).toBe(0);
  });

  it('累计偏移与总尺寸', () => {
    const store = new SparseDimensionStore(24);
    store.set(2, 48);

    expect(store.offsetOf(0)).toBe(0);
    expect(store.offsetOf(3)).toBe(96);
    expect(store.offsetOf(4)).toBe(120);
    expect(store.total(5)).toBe(144);
  });

  it('按偏移反查索引', () => {
    const store = new SparseDimensionStore(24);
    store.set(2, 48);

    expect(store.indexAt(0, 10)).toBe(0);
    expect(store.indexAt(23, 10)).toBe(0);
    expect(store.indexAt(24, 10)).toBe(1);
    expect(store.indexAt(95, 10)).toBe(2);
    expect(store.indexAt(96, 10)).toBe(3);
  });

  it('隐藏索引不参与命中', () => {
    const store = new SparseDimensionStore(24);
    store.set(1, 0);
    store.set(2, 48);

    expect(store.offsetOf(3)).toBe(72);
    expect(store.indexAt(0, 10)).toBe(0);
    expect(store.indexAt(24, 10)).toBe(2);
    expect(store.indexAt(71, 10)).toBe(2);
  });

  it('全部隐藏时返回 -1', () => {
    const store = new SparseDimensionStore(24);
    store.set(0, 0);
    store.set(1, 0);

    expect(store.total(2)).toBe(0);
    expect(store.indexAt(0, 2)).toBe(-1);
  });

  it('拒绝非法尺寸', () => {
    const store = new SparseDimensionStore(24);
    expect(() => store.set(-1, 10)).toThrow(RangeError);
    expect(() => store.set(0, -1)).toThrow(RangeError);
    expect(() => store.set(0, 5000)).toThrow(RangeError);
  });
});
