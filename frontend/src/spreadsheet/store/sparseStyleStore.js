import { isDefaultStyle, normalizeStyle } from '../core/style.js';

function assertCoordinate(value, name) {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} 必须是非负整数: ${value}`);
  }
}

/**
 * 稀疏样式存储：只为显式设置过样式的单元格保留记录。
 */
export class SparseStyleStore {
  constructor() {
    this.styles = new Map();
  }

  static keyOf(row, col) {
    assertCoordinate(row, 'row');
    assertCoordinate(col, 'col');
    return `${row}:${col}`;
  }

  /**
   * 读取单元格样式。
   *
   * @param {number} row 行索引
   * @param {number} col 列索引
   * @returns {object | undefined} 样式
   */
  get(row, col) {
    return this.styles.get(SparseStyleStore.keyOf(row, col));
  }

  /**
   * 写入样式；等价于默认样式时删除记录。
   *
   * @param {number} row 行索引
   * @param {number} col 列索引
   * @param {object} style 样式
   * @returns {SparseStyleStore} 当前存储
   */
  set(row, col, style) {
    const normalized = normalizeStyle(style);
    if (isDefaultStyle(normalized)) {
      this.styles.delete(SparseStyleStore.keyOf(row, col));
    } else {
      this.styles.set(SparseStyleStore.keyOf(row, col), normalized);
    }
    return this;
  }

  /**
   * 删除样式记录。
   *
   * @param {number} row 行索引
   * @param {number} col 列索引
   * @returns {boolean} 是否删除
   */
  delete(row, col) {
    return this.styles.delete(SparseStyleStore.keyOf(row, col));
  }

  /**
   * 当前样式记录数量。
   *
   * @returns {number} 数量
   */
  get size() {
    return this.styles.size;
  }
}
