import { DEFAULT_STYLE, isDefaultStyle, mergeStyle, normalizeStyle } from '../core/style.js';

function assertCoordinate(value, name) {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} 必须是非负整数: ${value}`);
  }
}

/**
 * 稀疏样式存储，支持四层覆盖：
 * 全表默认 < 整列 < 整行 < 单元格。
 */
export class SparseStyleStore {
  constructor() {
    this.cellStyles = new Map();
    this.rowStyles = new Map();
    this.columnStyles = new Map();
    this.sheetStyle = null;
  }

  static keyOf(row, col) {
    assertCoordinate(row, 'row');
    assertCoordinate(col, 'col');
    return `${row}:${col}`;
  }

  /**
   * 读取单元格自身样式（不含行列/全表层）。
   *
   * @param {number} row 行索引
   * @param {number} col 列索引
   * @returns {object | undefined} 样式
   */
  get(row, col) {
    return this.cellStyles.get(SparseStyleStore.keyOf(row, col));
  }

  /**
   * 写入单元格样式。
   *
   * @param {number} row 行索引
   * @param {number} col 列索引
   * @param {object} style 样式
   * @returns {SparseStyleStore} 当前存储
   */
  set(row, col, style) {
    if (isDefaultStyle(style)) {
      this.cellStyles.delete(SparseStyleStore.keyOf(row, col));
    } else {
      this.cellStyles.set(SparseStyleStore.keyOf(row, col), style);
    }
    return this;
  }

  /**
   * 删除单元格样式。
   *
   * @param {number} row 行索引
   * @param {number} col 列索引
   * @returns {boolean} 是否删除
   */
  delete(row, col) {
    return this.cellStyles.delete(SparseStyleStore.keyOf(row, col));
  }

  /**
   * 读取整行样式。
   *
   * @param {number} row 行索引
   * @returns {object | undefined} 样式
   */
  getRowStyle(row) {
    return this.rowStyles.get(row);
  }

  /**
   * 设置整行样式。
   *
   * @param {number} row 行索引
   * @param {object} style 样式
   */
  setRowStyle(row, style) {
    if (isDefaultStyle(style)) {
      this.rowStyles.delete(row);
    } else {
      this.rowStyles.set(row, style);
    }
  }

  /**
   * 读取整列样式。
   *
   * @param {number} col 列索引
   * @returns {object | undefined} 样式
   */
  getColumnStyle(col) {
    return this.columnStyles.get(col);
  }

  /**
   * 设置整列样式。
   *
   * @param {number} col 列索引
   * @param {object} style 样式
   */
  setColumnStyle(col, style) {
    if (isDefaultStyle(style)) {
      this.columnStyles.delete(col);
    } else {
      this.columnStyles.set(col, style);
    }
  }

  /**
   * 读取全表样式。
   *
   * @returns {object | undefined} 样式
   */
  getSheetStyle() {
    return this.sheetStyle ?? undefined;
  }

  /**
   * 设置全表样式。
   *
   * @param {object} style 样式
   */
  setSheetStyle(style) {
    this.sheetStyle = isDefaultStyle(style) ? null : style;
  }

  /**
   * 解析单元格的最终样式：全表 → 列 → 行 → 单元格。
   *
   * @param {number} row 行索引
   * @param {number} col 列索引
   * @returns {object} 完整样式
   */
  resolve(row, col) {
    let style = this.sheetStyle ?? DEFAULT_STYLE;
    const columnStyle = this.columnStyles.get(col);
    if (columnStyle) {
      style = mergeStyle(style, columnStyle);
    }
    const rowStyle = this.rowStyles.get(row);
    if (rowStyle) {
      style = mergeStyle(style, rowStyle);
    }
    const cellStyle = this.cellStyles.get(SparseStyleStore.keyOf(row, col));
    if (cellStyle) {
      style = mergeStyle(style, cellStyle);
    }
    return normalizeStyle(style);
  }

  /**
   * 样式记录总数（单元格 + 行 + 列 + 全表层）。
   *
   * @returns {number} 数量
   */
  get size() {
    return (
      this.cellStyles.size +
      this.rowStyles.size +
      this.columnStyles.size +
      (this.sheetStyle ? 1 : 0)
    );
  }
}
