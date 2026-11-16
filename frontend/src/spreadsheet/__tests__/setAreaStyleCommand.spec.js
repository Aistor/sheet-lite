import { describe, expect, it } from 'vitest';
import { createCommandManager } from '../commands/commandManager.js';
import { createSetAreaStyleCommand } from '../commands/setAreaStyleCommand.js';
import { SparseStyleStore } from '../store/sparseStyleStore.js';

function setup() {
  const styleStore = new SparseStyleStore();
  const manager = createCommandManager();
  const context = { styleStore };
  const run = (options) => manager.execute(createSetAreaStyleCommand(options), context);
  return { styleStore, manager, context, run };
}

describe('SET_AREA_STYLE 命令', () => {
  it('设置整行样式并支持撤销', () => {
    const { styleStore, manager, context, run } = setup();
    run({ mode: 'rows', start: 1, end: 2, resolvePatch: () => ({ bold: true }) });

    expect(styleStore.getRowStyle(1).bold).toBe(true);
    expect(styleStore.getRowStyle(2).bold).toBe(true);

    manager.undo(context);
    expect(styleStore.getRowStyle(1)).toBeUndefined();
  });

  it('设置整列样式', () => {
    const { styleStore, run } = setup();
    run({ mode: 'columns', start: 3, end: 3, resolvePatch: () => ({ align: 'right' }) });

    expect(styleStore.getColumnStyle(3).align).toBe('right');
  });

  it('设置全表样式', () => {
    const { styleStore, run } = setup();
    run({ mode: 'sheet', resolvePatch: () => ({ backgroundColor: '#f7f8fa' }) });

    expect(styleStore.resolve(999, 999).backgroundColor).toBe('#f7f8fa');
  });

  it('撤销全表样式', () => {
    const { styleStore, manager, context, run } = setup();
    run({ mode: 'sheet', resolvePatch: () => ({ bold: true }) });
    manager.undo(context);

    expect(styleStore.resolve(0, 0).bold).toBe(false);
  });
});
