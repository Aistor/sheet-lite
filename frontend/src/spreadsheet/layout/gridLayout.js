import { MAX_COLUMNS, MAX_ROWS } from '../core/coordinates.js';
import { SparseDimensionStore } from '../store/sparseDimensionStore.js';

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
 * 网格布局：逻辑坐标、像素偏移与尺寸查询。
 *
 * 行高/列宽默认统一，可通过覆盖项调整或隐藏（尺寸 0）；
 * 不创建完整尺寸数组，所有查询按稀疏覆盖计算。
 *
 * @param {object} [options] 布局参数
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

  const rows = new SparseDimensionStore(rowHeight);
  const columns = new SparseDimensionStore(columnWidth);

  const layout = {
    rowCount,
    columnCount,
    headerHeight,
    headerWidth,
    rows,
    columns,

    get rowHeight() {
      return rows.defaultSize;
    },

    get columnWidth() {
      return columns.defaultSize;
    },

    get totalHeight() {
      return rows.total(rowCount);
    },

    get totalWidth() {
      return columns.total(columnCount);
    },

    /**
     * 指定行的像素高度。
     *
     * @param {number} row 行索引
     * @returns {number} 行高
     */
    rowHeightOf(row) {
      return rows.get(row);
    },

    /**
     * 指定列的像素宽度。
     *
     * @param {number} col 列索引
     * @returns {number} 列宽
     */
    columnWidthOf(col) {
      return columns.get(col);
    },

    /**
     * 行顶部偏移。
     *
     * @param {number} row 行索引
     * @returns {number} 像素偏移
     */
    rowY(row) {
      return rows.offsetOf(row);
    },

    /**
     * 列左侧偏移。
     *
     * @param {number} col 列索引
     * @returns {number} 像素偏移
     */
    columnX(col) {
      return columns.offsetOf(col);
    },

    /**
     * 像素偏移反查行（跳过隐藏行）。
     *
     * @param {number} y 垂直偏移
     * @returns {number} 行索引，无效时为 -1
     */
    rowAt(y) {
      if (!Number.isFinite(y) || y < 0 || y >= layout.totalHeight) {
        return -1;
      }
      return rows.indexAt(y, rowCount);
    },

    /**
     * 像素偏移反查列（跳过隐藏列）。
     *
     * @param {number} x 水平偏移
     * @returns {number} 列索引，无效时为 -1
     */
    columnAt(x) {
      if (!Number.isFinite(x) || x < 0 || x >= layout.totalWidth) {
        return -1;
      }
      return columns.indexAt(x, columnCount);
    },

    /**
     * 命中测试。
     *
     * @param {number} x 水平偏移
     * @param {number} y 垂直偏移
     * @returns {{ row: number, col: number } | null} 单元格
     */
    hitTest(x, y) {
      const row = layout.rowAt(y);
      const col = layout.columnAt(x);
      if (row < 0 || col < 0) {
        return null;
      }
      return { row, col };
    },

    /**
     * 单元格在内容坐标系中的矩形。
     *
     * @param {number} row 行索引
     * @param {number} col 列索引
     * @returns {{ x: number, y: number, width: number, height: number }} 矩形
     */
    cellRect(row, col) {
      return {
        x: columns.offsetOf(col),
        y: rows.offsetOf(row),
        width: columns.get(col),
        height: rows.get(row),
      };
    },

    /**
     * 设置行高（0 = 隐藏）。
     *
     * @param {number} row 行索引
     * @param {number} height 行高
     */
    setRowHeight(row, height) {
      rows.set(row, height);
    },

    /**
     * 设置列宽（0 = 隐藏）。
     *
     * @param {number} col 列索引
     * @param {number} width 列宽
     */
    setColumnWidth(col, width) {
      columns.set(col, width);
    },

    /**
     * 恢复行高默认值。
     *
     * @param {number} row 行索引
     */
    resetRowHeight(row) {
      rows.reset(row);
    },

    /**
     * 恢复列宽默认值。
     *
     * @param {number} col 列索引
     */
    resetColumnWidth(col) {
      columns.reset(col);
    },
  };

  return layout;
}
