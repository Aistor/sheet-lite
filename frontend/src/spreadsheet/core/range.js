import { MAX_COLUMNS, MAX_ROWS, isValidColumn, isValidRow } from './coordinates.js';

/**
 * 矩形区域契约。
 *
 * 区域始终是规范化后的闭区间：startRow <= endRow，startCol <= endCol。
 * 全部使用 0-based 逻辑坐标。
 */

/**
 * 规范化并校验一个矩形区域；起止坐标顺序颠倒时自动交换。
 *
 * @param {{ startRow: number, startCol: number, endRow: number, endCol: number }} range 原始区域
 * @returns {{ startRow: number, startCol: number, endRow: number, endCol: number }} 规范化区域
 */
export function createRange({ startRow, startCol, endRow, endCol }) {
  const coords = [
    ['startRow', startRow],
    ['startCol', startCol],
    ['endRow', endRow],
    ['endCol', endCol],
  ];
  for (const [name, value] of coords) {
    const valid = name.endsWith('Row') ? isValidRow(value) : isValidColumn(value);
    if (!valid) {
      throw new RangeError(`非法区域坐标 ${name}: ${value}`);
    }
  }
  return {
    startRow: Math.min(startRow, endRow),
    startCol: Math.min(startCol, endCol),
    endRow: Math.max(startRow, endRow),
    endCol: Math.max(startCol, endCol),
  };
}

/**
 * 统计区域包含的单元格数量。
 *
 * @param {{ startRow: number, endRow: number, startCol: number, endCol: number }} range 区域
 * @returns {number} 单元格数量
 */
export function rangeCellCount(range) {
  return (range.endRow - range.startRow + 1) * (range.endCol - range.startCol + 1);
}

/**
 * 判断坐标是否落在区域内（含边界）。
 *
 * @param {{ startRow: number, endRow: number, startCol: number, endCol: number }} range 区域
 * @param {number} row 0-based 行索引
 * @param {number} col 0-based 列索引
 * @returns {boolean} 是否命中
 */
export function rangeContains(range, row, col) {
  return (
    row >= range.startRow &&
    row <= range.endRow &&
    col >= range.startCol &&
    col <= range.endCol
  );
}

/**
 * 计算两个区域的交集。
 *
 * @param {{ startRow: number, endRow: number, startCol: number, endCol: number }} a 区域 A
 * @param {{ startRow: number, endRow: number, startCol: number, endCol: number }} b 区域 B
 * @returns {{ startRow: number, startCol: number, endRow: number, endCol: number } | null} 交集，无重叠时为 null
 */
export function intersectRanges(a, b) {
  const startRow = Math.max(a.startRow, b.startRow);
  const startCol = Math.max(a.startCol, b.startCol);
  const endRow = Math.min(a.endRow, b.endRow);
  const endCol = Math.min(a.endCol, b.endCol);
  if (startRow > endRow || startCol > endCol) {
    return null;
  }
  return { startRow, startCol, endRow, endCol };
}

/**
 * 把区域裁剪到工作表边界内。
 *
 * @param {{ startRow: number, endRow: number, startCol: number, endCol: number }} range 区域
 * @param {number} [rowCount] 工作表行数
 * @param {number} [columnCount] 工作表列数
 * @returns {{ startRow: number, startCol: number, endRow: number, endCol: number } | null} 裁剪结果，完全越界时为 null
 */
export function clampRangeToSheet(range, rowCount = MAX_ROWS, columnCount = MAX_COLUMNS) {
  if (!Number.isInteger(rowCount) || rowCount <= 0 || rowCount > MAX_ROWS) {
    throw new RangeError(`非法行数: ${rowCount}`);
  }
  if (!Number.isInteger(columnCount) || columnCount <= 0 || columnCount > MAX_COLUMNS) {
    throw new RangeError(`非法列数: ${columnCount}`);
  }
  const endRow = Math.min(range.endRow, rowCount - 1);
  const endCol = Math.min(range.endCol, columnCount - 1);
  if (range.startRow > endRow || range.startCol > endCol) {
    return null;
  }
  return {
    startRow: range.startRow,
    startCol: range.startCol,
    endRow,
    endCol,
  };
}

/**
 * 判断两个区域是否完全一致。
 *
 * @param {{ startRow: number, startCol: number, endRow: number, endCol: number }} a 区域 A
 * @param {{ startRow: number, startCol: number, endRow: number, endCol: number }} b 区域 B
 * @returns {boolean} 是否一致
 */
export function rangesEqual(a, b) {
  return (
    a.startRow === b.startRow &&
    a.startCol === b.startCol &&
    a.endRow === b.endRow &&
    a.endCol === b.endCol
  );
}
