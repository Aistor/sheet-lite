/**
 * 选区模型：单元格区域、整行、整列与全表。
 *
 * 选区统一用 `mode` 区分：
 * - cells：anchor/focus 两个单元格
 * - rows：anchorRow/focusRow
 * - columns：anchorCol/focusCol
 * - all：整表
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
 * 创建单格选区。
 *
 * @param {{ row: number, col: number }} cell 单元格
 * @returns {object} 选区
 */
export function createSelection(cell) {
  const point = { row: cell.row, col: cell.col };
  return { mode: 'cells', anchor: { ...point }, focus: { ...point } };
}

/**
 * 扩展单元格选区。
 *
 * @param {object} selection 选区
 * @param {{ row: number, col: number }} cell 新焦点
 * @returns {object} 选区
 */
export function extendSelection(selection, cell) {
  const anchor =
    selection.mode === 'cells'
      ? { ...selection.anchor }
      : { row: cell.row, col: cell.col };
  return { mode: 'cells', anchor, focus: { row: cell.row, col: cell.col } };
}

/**
 * 创建整行选区。
 *
 * @param {number} row 行索引
 * @returns {object} 选区
 */
export function createRowSelection(row) {
  return { mode: 'rows', anchorRow: row, focusRow: row };
}

/**
 * 扩展整行选区。
 *
 * @param {object} selection 选区
 * @param {number} row 新焦点行
 * @returns {object} 选区
 */
export function extendRowSelection(selection, row) {
  const anchorRow = selection.mode === 'rows' ? selection.anchorRow : row;
  return { mode: 'rows', anchorRow, focusRow: row };
}

/**
 * 创建整列选区。
 *
 * @param {number} col 列索引
 * @returns {object} 选区
 */
export function createColumnSelection(col) {
  return { mode: 'columns', anchorCol: col, focusCol: col };
}

/**
 * 扩展整列选区。
 *
 * @param {object} selection 选区
 * @param {number} col 新焦点列
 * @returns {object} 选区
 */
export function extendColumnSelection(selection, col) {
  const anchorCol = selection.mode === 'columns' ? selection.anchorCol : col;
  return { mode: 'columns', anchorCol, focusCol: col };
}

/**
 * 创建全表选区。
 *
 * @returns {object} 选区
 */
export function createAllSelection() {
  return { mode: 'all' };
}

/**
 * 选区对应的活动单元格。
 *
 * @param {object} selection 选区
 * @returns {{ row: number, col: number }} 活动单元格
 */
export function selectionActiveCell(selection) {
  switch (selection.mode) {
    case 'rows':
      return { row: Math.min(selection.anchorRow, selection.focusRow), col: 0 };
    case 'columns':
      return { row: 0, col: Math.min(selection.anchorCol, selection.focusCol) };
    case 'all':
      return { row: 0, col: 0 };
    default:
      return selection.anchor;
  }
}

/**
 * 把选区规范化为矩形范围。
 *
 * @param {object} selection 选区
 * @param {{ rowCount: number, columnCount: number }} bounds 行列数量
 * @returns {{ startRow: number, startCol: number, endRow: number, endCol: number }} 区域
 */
export function selectionRange(selection, bounds) {
  switch (selection.mode) {
    case 'rows':
      return {
        startRow: Math.min(selection.anchorRow, selection.focusRow),
        startCol: 0,
        endRow: Math.max(selection.anchorRow, selection.focusRow),
        endCol: bounds.columnCount - 1,
      };
    case 'columns':
      return {
        startRow: 0,
        startCol: Math.min(selection.anchorCol, selection.focusCol),
        endRow: bounds.rowCount - 1,
        endCol: Math.max(selection.anchorCol, selection.focusCol),
      };
    case 'all':
      return {
        startRow: 0,
        startCol: 0,
        endRow: bounds.rowCount - 1,
        endCol: bounds.columnCount - 1,
      };
    default:
      return {
        startRow: Math.min(selection.anchor.row, selection.focus.row),
        startCol: Math.min(selection.anchor.col, selection.focus.col),
        endRow: Math.max(selection.anchor.row, selection.focus.row),
        endCol: Math.max(selection.anchor.col, selection.focus.col),
      };
  }
}

/**
 * 判断选区是否只覆盖一个单元格。
 *
 * @param {object} selection 选区
 * @returns {boolean} 是否单格
 */
export function isSingleCellSelection(selection) {
  return (
    selection.mode === 'cells' &&
    selection.anchor.row === selection.focus.row &&
    selection.anchor.col === selection.focus.col
  );
}
