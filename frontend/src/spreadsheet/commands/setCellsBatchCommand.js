import { createTextCell, isEmptyInput } from '../core/cell.js';

/**
 * 批量设置单元格文本。
 *
 * 一次命令覆盖多个单元格，撤销时一起恢复，避免逐格命令把历史撑大。
 *
 * @param {object} params 参数
 * @param {{ row: number, col: number, input: string }[]} params.cells 单元格变更
 * @returns {object} 命令
 */
export function createSetCellsBatchCommand({ cells }) {
  if (!Array.isArray(cells) || cells.length === 0) {
    throw new TypeError('cells 必须是非空数组');
  }
  let previous = [];

  return {
    type: 'SET_CELLS_BATCH',
    cells,

    /**
     * 执行批量写入。
     *
     * @param {{ store: object }} context 上下文
     * @returns {{ cells: object[] }} 变更结果
     */
    execute({ store }) {
      previous = cells.map(({ row, col }) => ({ row, col, cell: store.get(row, col) }));
      for (const { row, col, input } of cells) {
        if (isEmptyInput(input)) {
          store.delete(row, col);
        } else {
          store.set(row, col, createTextCell(input));
        }
      }
      return { cells };
    },

    /**
     * 撤销批量写入。
     *
     * @param {{ store: object }} context 上下文
     */
    undo({ store }) {
      for (const { row, col, cell } of previous) {
        if (cell === undefined) {
          store.delete(row, col);
        } else {
          store.set(row, col, cell);
        }
      }
    },
  };
}
