import { isDefaultStyle, mergePatch } from '../core/style.js';

/**
 * 给指定单元格列表设置样式。
 *
 * 与按矩形遍历的命令不同，这里只处理调用方给出的稀疏单元格列表，
 * 适合整行/整列这类逻辑范围极大但实际数据很少的场景。
 *
 * @param {object} params 参数
 * @param {{ row: number, col: number }[]} params.cells 目标单元格
 * @param {(row: number, col: number) => object} params.resolvePatch 样式补丁生成器
 * @returns {object} 命令
 */
export function createSetCellsStyleCommand({ cells, resolvePatch }) {
  if (!Array.isArray(cells) || cells.length === 0) {
    throw new TypeError('cells 必须是非空数组');
  }
  let previous = [];

  return {
    type: 'SET_CELLS_STYLE',
    cells,

    /**
     * 应用样式。
     *
     * @param {{ styleStore: object }} context 上下文
     * @returns {{ cells: object[] }} 变更结果
     */
    execute({ styleStore }) {
      previous = cells.map(({ row, col }) => ({ row, col, style: styleStore.get(row, col) }));
      for (const { row, col } of cells) {
        const merged = mergePatch(styleStore.get(row, col) ?? {}, resolvePatch(row, col));
        if (isDefaultStyle(merged)) {
          styleStore.delete(row, col);
        } else {
          styleStore.set(row, col, merged);
        }
      }
      return { cells };
    },

    /**
     * 撤销样式修改。
     *
     * @param {{ styleStore: object }} context 上下文
     */
    undo({ styleStore }) {
      for (const { row, col, style } of previous) {
        if (style === undefined) {
          styleStore.delete(row, col);
        } else {
          styleStore.set(row, col, style);
        }
      }
    },
  };
}
