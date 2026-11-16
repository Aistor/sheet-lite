import { createTextCell, isEmptyInput } from '../core/cell.js';

/**
 * 设置单元格文本的命令。
 *
 * 命令负责“空输入 = 删除”的语义，并把执行前的值记录为撤销信息；
 * 同一命令对象可以重复执行（redo）。
 *
 * @param {object} params 参数
 * @param {number} params.row 行索引
 * @param {number} params.col 列索引
 * @param {string} params.input 新输入
 * @returns {object} 命令
 */
export function createSetCellCommand({ row, col, input }) {
  if (typeof input !== 'string') {
    throw new TypeError('input 必须是字符串');
  }
  let previous;

  return {
    type: 'SET_CELL',
    row,
    col,
    input,

    /**
     * 执行命令。
     *
     * @param {{ store: object }} context 上下文
     * @returns {{ row: number, col: number }} 变更坐标
     */
    execute({ store }) {
      previous = store.get(row, col);
      if (isEmptyInput(input)) {
        store.delete(row, col);
      } else {
        store.set(row, col, createTextCell(input));
      }
      return { row, col };
    },

    /**
     * 撤销命令。
     *
     * @param {{ store: object }} context 上下文
     */
    undo({ store }) {
      if (previous === undefined) {
        store.delete(row, col);
      } else {
        store.set(row, col, previous);
      }
    },
  };
}
