import { describe, expect, it } from 'vitest';
import { SparseStyleStore } from '../store/sparseStyleStore.js';

describe('SparseStyleStore 分层解析', () => {
  it('按 全表 → 列 → 行 → 单元格 叠加', () => {
    const store = new SparseStyleStore();
    store.setSheetStyle({ align: 'center' });
    store.setColumnStyle(1, { bold: true });
    store.setRowStyle(2, { backgroundColor: '#fff2cc' });
    store.set(2, 1, { italic: true });

    const style = store.resolve(2, 1);
    expect(style.align).toBe('center');
    expect(style.bold).toBe(true);
    expect(style.backgroundColor).toBe('#fff2cc');
    expect(style.italic).toBe(true);
  });

  it('单元格样式覆盖行/列样式', () => {
    const store = new SparseStyleStore();
    store.setColumnStyle(1, { textColor: '#d93025' });
    store.set(0, 1, { textColor: '#188038' });

    expect(store.resolve(0, 1).textColor).toBe('#188038');
    expect(store.resolve(1, 1).textColor).toBe('#d93025');
  });

  it('默认样式不保留记录', () => {
    const store = new SparseStyleStore();
    store.setColumnStyle(1, { bold: true });
    store.setColumnStyle(1, { bold: false });
    store.setRowStyle(2, { italic: true });
    store.setRowStyle(2, { italic: false });

    expect(store.getColumnStyle(1)).toBeUndefined();
    expect(store.getRowStyle(2)).toBeUndefined();
    expect(store.size).toBe(0);
  });
});
