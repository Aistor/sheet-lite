import { describe, expect, it } from 'vitest';
import { createCommandManager } from '../commands/commandManager.js';
import { createSetCellCommand } from '../commands/setCellCommand.js';
import { SparseCellStore } from '../store/sparseCellStore.js';

function setup() {
  const store = new SparseCellStore();
  const manager = createCommandManager();
  const context = { store };
  const run = (row, col, input) =>
    manager.execute(createSetCellCommand({ row, col, input }), context);
  return { store, manager, context, run };
}

describe('SET_CELL 命令', () => {
  it('写入文本并在撤销后移除', () => {
    const { store, manager, context, run } = setup();
    run(0, 0, 'hello');

    expect(store.get(0, 0).rawInput).toBe('hello');
    expect(manager.undo(context)).toBe(true);
    expect(store.has(0, 0)).toBe(false);
  });

  it('重做恢复文本', () => {
    const { store, manager, context, run } = setup();
    run(0, 0, 'hello');
    manager.undo(context);
    manager.redo(context);

    expect(store.get(0, 0).rawInput).toBe('hello');
  });

  it('覆盖后撤销恢复旧值', () => {
    const { store, manager, context, run } = setup();
    run(1, 1, 'old');
    run(1, 1, 'new');
    manager.undo(context);

    expect(store.get(1, 1).rawInput).toBe('old');
  });

  it('空输入删除单元格，撤销可恢复', () => {
    const { store, manager, context, run } = setup();
    run(2, 2, 'keep');
    run(2, 2, '');
    expect(store.has(2, 2)).toBe(false);

    manager.undo(context);
    expect(store.get(2, 2).rawInput).toBe('keep');
  });

  it('按命令顺序撤销', () => {
    const { store, manager, context, run } = setup();
    run(0, 0, 'a');
    run(0, 1, 'b');

    manager.undo(context);
    expect(store.has(0, 1)).toBe(false);
    expect(store.get(0, 0).rawInput).toBe('a');

    manager.undo(context);
    expect(store.size).toBe(0);
    expect(manager.canUndo).toBe(false);
  });
});

describe('命令管理器', () => {
  it('执行新命令后清空重做栈', () => {
    const { manager, context, run } = setup();
    run(0, 0, 'a');
    manager.undo(context);
    expect(manager.canRedo).toBe(true);

    run(1, 1, 'b');
    expect(manager.canRedo).toBe(false);
  });

  it('空栈时撤销/重做返回 false', () => {
    const { manager, context } = setup();
    expect(manager.undo(context)).toBe(false);
    expect(manager.redo(context)).toBe(false);
  });
});
