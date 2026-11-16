import { describe, expect, it } from 'vitest';
import { createCommandManager } from '../commands/commandManager.js';
import { createSetCellsStyleCommand } from '../commands/setCellsStyleCommand.js';
import { SparseStyleStore } from '../store/sparseStyleStore.js';

function setup() {
  const styleStore = new SparseStyleStore();
  const manager = createCommandManager();
  const context = { styleStore };
  return { styleStore, manager, context };
}

describe('SET_CELLS_STYLE 命令', () => {
  it('只处理给定的稀疏单元格', () => {
    const { styleStore, manager, context } = setup();
    styleStore.set(0, 0, { bold: true });
    manager.execute(
      createSetCellsStyleCommand({
        cells: [
          { row: 0, col: 0 },
          { row: 5, col: 2 },
        ],
        resolvePatch: () => ({ italic: true }),
      }),
      context,
    );

    expect(styleStore.get(0, 0).bold).toBe(true);
    expect(styleStore.get(0, 0).italic).toBe(true);
    expect(styleStore.get(5, 2).italic).toBe(true);
  });

  it('撤销后恢复原样式', () => {
    const { styleStore, manager, context } = setup();
    styleStore.set(0, 0, { bold: true });
    manager.execute(
      createSetCellsStyleCommand({
        cells: [{ row: 0, col: 0 }],
        resolvePatch: () => ({ backgroundColor: '#fff2cc' }),
      }),
      context,
    );

    manager.undo(context);
    expect(styleStore.get(0, 0).bold).toBe(true);
    expect(styleStore.get(0, 0).backgroundColor).toBeUndefined();
  });
});
