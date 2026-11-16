import { describe, expect, it } from 'vitest';
import { createCommandManager } from '../commands/commandManager.js';
import { createSetRangeStyleCommand } from '../commands/setRangeStyleCommand.js';
import { SparseStyleStore } from '../store/sparseStyleStore.js';

function setup() {
  const styleStore = new SparseStyleStore();
  const manager = createCommandManager();
  const context = { styleStore };
  const run = (range, resolvePatch) =>
    manager.execute(createSetRangeStyleCommand({ range, resolvePatch }), context);
  return { styleStore, manager, context, run };
}

const range = { startRow: 0, startCol: 0, endRow: 1, endCol: 1 };

describe('SET_RANGE_STYLE 命令', () => {
  it('给整个区域设置样式', () => {
    const { styleStore, run } = setup();
    run(range, () => ({ bold: true, backgroundColor: '#fff2cc' }));

    expect(styleStore.get(0, 0).bold).toBe(true);
    expect(styleStore.get(1, 1).backgroundColor).toBe('#fff2cc');
    expect(styleStore.size).toBe(4);
  });

  it('撤销后恢复原有样式并删除新增记录', () => {
    const { styleStore, manager, context, run } = setup();
    styleStore.set(0, 0, { bold: true });

    run(range, () => ({ backgroundColor: '#d9ead3' }));
    expect(styleStore.get(0, 0).backgroundColor).toBe('#d9ead3');
    expect(styleStore.get(0, 0).bold).toBe(true);

    manager.undo(context);
    expect(styleStore.get(0, 0).bold).toBe(true);
    expect(styleStore.get(0, 0).backgroundColor).toBeUndefined();
    expect(styleStore.get(1, 1)).toBeUndefined();
  });

  it('只给选区外边缘加边框', () => {
    const { styleStore, run } = setup();
    run(range, (row, col) => ({
      borders: {
        top: row === range.startRow,
        bottom: row === range.endRow,
        left: col === range.startCol,
        right: col === range.endCol,
      },
    }));

    expect(styleStore.get(0, 0).borders).toMatchObject({ top: true, left: true, bottom: false });
    expect(styleStore.get(1, 1).borders).toMatchObject({ bottom: true, right: true, top: false });
  });

  it('回到默认样式时删除记录', () => {
    const { styleStore, run } = setup();
    styleStore.set(0, 0, { bold: true });

    run({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 }, () => ({ bold: false }));

    expect(styleStore.get(0, 0)).toBeUndefined();
  });
});
