/**
 * 活动单元格与区域选择的纯函数，不依赖 DOM 或框架。
 *
 * 选区用 anchor（起点）和 focus（当前焦点）表示，实际范围由两者规范化得到。
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

/**
 * 创建只包含一个单元格的选区。
 *
 * @param {{ row: number, col: number }} cell 单元格
 * @returns {{ anchor: { row: number, col: number }, focus: { row: number, col: number } }} 选区
 */
export function createSelection(cell) {
  const point = { row: cell.row, col: cell.col };
  return { anchor: { ...point }, focus: { ...point } };
}

/**
 * 保持锚点，移动焦点（Shift+点击或 Shift+方向键）。
 *
 * @param {{ anchor: { row: number, col: number }, focus: { row: number, col: number } }} selection 选区
 * @param {{ row: number, col: number }} cell 新焦点
 * @returns {{ anchor: { row: number, col: number }, focus: { row: number, col: number } }} 选区
 */
export function extendSelection(selection, cell) {
  return {
    anchor: { ...selection.anchor },
    focus: { row: cell.row, col: cell.col },
  };
}

/**
 * 把选区规范化为矩形范围。
 *
 * @param {{ anchor: { row: number, col: number }, focus: { row: number, col: number } }} selection 选区
 * @returns {{ startRow: number, startCol: number, endRow: number, endCol: number }} 区域
 */
export function selectionRange(selection) {
  return {
    startRow: Math.min(selection.anchor.row, selection.focus.row),
    startCol: Math.min(selection.anchor.col, selection.focus.col),
    endRow: Math.max(selection.anchor.row, selection.focus.row),
    endCol: Math.max(selection.anchor.col, selection.focus.col),
  };
}

/**
 * 判断选区是否只覆盖一个单元格。
 *
 * @param {{ anchor: { row: number, col: number }, focus: { row: number, col: number } }} selection 选区
 * @returns {boolean} 是否单格
 */
export function isSingleCellSelection(selection) {
  return (
    selection.anchor.row === selection.focus.row && selection.anchor.col === selection.focus.col
  );
}
