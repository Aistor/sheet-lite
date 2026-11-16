import { MAX_COLUMNS, MAX_ROWS } from '../core/coordinates.js';

/** 默认行高（CSS 像素）。 */
export const DEFAULT_ROW_HEIGHT = 24;

/** 默认列宽（CSS 像素）。 */
export const DEFAULT_COLUMN_WIDTH = 100;

/** 列头高度。 */
export const DEFAULT_HEADER_HEIGHT = 24;

/** 行头宽度（容纳 7 位行号）。 */
export const DEFAULT_HEADER_WIDTH = 56;

function assertPositiveInteger(value, name) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${name} 必须是正整数: ${value}`);
  }
}

function assertPositiveNumber(value, name) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} 必须是正数: ${value}`);
  }
}

/**
 * 固定尺寸下的逻辑坐标与像素坐标映射。
 *
 * 只保存行列数量和尺寸，不为每个行列创建对象；所有查询都是常数时间计算。
 * 坐标均为 0-based 逻辑索引，单位是 CSS 像素。
 *
 * @param {object} [options] 布局参数
 * @param {number} [options.rowCount] 逻辑行数
 * @param {number} [options.columnCount] 逻辑列数
 * @param {number} [options.rowHeight] 行高
 * @param {number} [options.columnWidth] 列宽
 * @param {number} [options.headerHeight] 列头高度
 * @param {number} [options.headerWidth] 行头宽度
 * @returns {object} 布局对象
 */
export function createGridLayout({
  rowCount = MAX_ROWS,
  columnCount = MAX_COLUMNS,
  rowHeight = DEFAULT_ROW_HEIGHT,
  columnWidth = DEFAULT_COLUMN_WIDTH,
  headerHeight = DEFAULT_HEADER_HEIGHT,
  headerWidth = DEFAULT_HEADER_WIDTH,
} = {}) {
  assertPositiveInteger(rowCount, 'rowCount');
  assertPositiveInteger(columnCount, 'columnCount');
  if (rowCount > MAX_ROWS) {
    throw new RangeError(`rowCount 超出上限: ${rowCount}`);
  }
  if (columnCount > MAX_COLUMNS) {
    throw new RangeError(`columnCount 超出上限: ${columnCount}`);
  }
  assertPositiveNumber(rowHeight, 'rowHeight');
  assertPositiveNumber(columnWidth, 'columnWidth');
  assertPositiveNumber(headerHeight, 'headerHeight');
  assertPositiveNumber(headerWidth, 'headerWidth');

  const totalHeight = rowCount * rowHeight;
  const totalWidth = columnCount * columnWidth;

  const rowY = (row) => row * rowHeight;
  const columnX = (col) => col * columnWidth;

  const rowAt = (y) => {
    if (!Number.isFinite(y) || y < 0 || y >= totalHeight) {
      return -1;
    }
    return Math.floor(y / rowHeight);
  };

  const columnAt = (x) => {
    if (!Number.isFinite(x) || x < 0 || x >= totalWidth) {
      return -1;
    }
    return Math.floor(x / columnWidth);
  };

  const hitTest = (x, y) => {
    const row = rowAt(y);
    const col = columnAt(x);
    if (row < 0 || col < 0) {
      return null;
    }
    return { row, col };
  };

  return {
    rowCount,
    columnCount,
    rowHeight,
    columnWidth,
    headerHeight,
    headerWidth,
    totalHeight,
    totalWidth,
    rowY,
    columnX,
    rowAt,
    columnAt,
    hitTest,
    /**
     * 单元格在内容坐标系中的矩形。
     *
     * @param {number} row 行索引
     * @param {number} col 列索引
     * @returns {{ x: number, y: number, width: number, height: number }} 矩形
     */
    cellRect(row, col) {
      return {
        x: columnX(col),
        y: rowY(row),
        width: columnWidth,
        height: rowHeight,
      };
    },
  };
}
