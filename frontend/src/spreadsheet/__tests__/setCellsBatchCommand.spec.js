import { describe, expect, it } from 'vitest';
import { createCommandManager } from '../commands/commandManager.js';
import { createSetCellsBatchCommand } from '../commands/setCellsBatchCommand.js';
import { SparseCellStore } from '../store/sparseCellStore.js';

function setup() {
  const store = new SparseCellStore();
  const manager = createCommandManager();
  const context = { store };
  const run = (cells) =>
    manager.execute(createSetCellsBatchCommand({ cells }), context);
  return { store, manager, context, run };
}

describe('SET_CELLS_BATCH 命令', () => {
  it('一次写入多个单元格', () => {
    const { store, run } = setup();
    run([
      { row: 0, col: 0, input: 'a' },
      { row: 0, col: 1, input: 'b' },
      { row: 1, col: 0, input: 'c' },
    ]);

    expect(store.get(0, 0).rawInput).toBe('a');
    expect(store.get(0, 1).rawInput).toBe('b');
    expect(store.get(1, 0).rawInput).toBe('c');
    expect(store.size).toBe(3);
  });

  it('撤销时恢复被覆盖的值并删除新增值', () => {
    const { store, manager, context, run } = setup();
    store.set(0, 0, { rawInput: 'old', valueType: 'text' });
    run([
      { row: 0, col: 0, input: 'new' },
      { row: 0, col: 1, input: 'added' },
    ]);

    manager.undo(context);
    expect(store.get(0, 0).rawInput).toBe('old');
    expect(store.has(0, 1)).toBe(false);
  });

  it('空输入删除单元格，撤销后恢复', () => {
    const { store, manager, context, run } = setup();
    store.set(2, 2, { rawInput: 'keep', valueType: 'text' });

    run([{ row: 2, col: 2, input: '' }]);
    expect(store.has(2, 2)).toBe(false);

    manager.undo(context);
    expect(store.get(2, 2).rawInput).toBe('keep');
  });

  it('拒绝空变更数组', () => {
    expect(() => createSetCellsBatchCommand({ cells: [] })).toThrow(TypeError);
  });
});
