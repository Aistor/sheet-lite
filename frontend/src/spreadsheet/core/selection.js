/**
 * 活动单元格与选区的纯函数，不依赖 DOM 或框架。
 */

/**
 * 把单元格坐标限制在表格边界内。
 *
 * @param {{ row: number, col: number }} cell 单元格
 * @param {{ rowCount: number, columnCount: number }} bounds 行列数量
 * @returns {{ row: number, col: number }} 合法单元格
 */
export function clampCell(cell, { rowCount, columnCount }) {
  const row = Number.isFinite(cell.row) ? Math.trunc(cell.row) : 0;
  const col = Number.isFinite(cell.col) ? Math.trunc(cell.col) : 0;
  return {
    row: Math.min(Math.max(0, row), rowCount - 1),
    col: Math.min(Math.max(0, col), columnCount - 1),
  };
}

/**
 * 按方向移动活动单元格，并在边界处停住。
 *
 * @param {{ row: number, col: number }} activeCell 当前活动单元格
 * @param {number} deltaRow 行增量
 * @param {number} deltaCol 列增量
 * @param {{ rowCount: number, columnCount: number }} bounds 行列数量
 * @returns {{ row: number, col: number }} 新活动单元格
 */
export function moveActiveCell(activeCell, deltaRow, deltaCol, bounds) {
  return clampCell(
    { row: activeCell.row + deltaRow, col: activeCell.col + deltaCol },
    bounds,
  );
}
