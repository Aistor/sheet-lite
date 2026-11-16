/**
 * 稀疏单元格存储。
 *
 * 只为非空单元格建立记录，不创建完整二维数组；读取单格是 O(1)，
 * 区域遍历会扫描当前已存在的单元格（M2 可接受，后续按基准测试引入分块索引）。
 */

function assertCoordinate(value, name) {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} 必须是非负整数: ${value}`);
  }
}

/**
 * 单元格存储，实现 core 中的 CellStorePort 契约。
 */
export class SparseCellStore {
  constructor() {
    this.cells = new Map();
  }

  /**
   * 生成存储键。
   *
   * @param {number} row 行索引
   * @param {number} col 列索引
   * @returns {string} 存储键
   */
  static keyOf(row, col) {
    assertCoordinate(row, 'row');
    assertCoordinate(col, 'col');
    return `${row}:${col}`;
  }

  /**
   * 读取单元格。
   *
   * @param {number} row 行索引
   * @param {number} col 列索引
   * @returns {{ rawInput: string, valueType: string } | undefined} 单元格
   */
  get(row, col) {
    return this.cells.get(SparseCellStore.keyOf(row, col));
  }

  /**
   * 判断单元格是否存在。
   *
   * @param {number} row 行索引
   * @param {number} col 列索引
   * @returns {boolean} 是否存在
   */
  has(row, col) {
    return this.cells.has(SparseCellStore.keyOf(row, col));
  }

  /**
   * 写入单元格。
   *
   * @param {number} row 行索引
   * @param {number} col 列索引
   * @param {{ rawInput: string, valueType: string }} cell 单元格
   * @returns {SparseCellStore} 当前存储
   */
  set(row, col, cell) {
    this.cells.set(SparseCellStore.keyOf(row, col), cell);
    return this;
  }

  /**
   * 删除单元格。
   *
   * @param {number} row 行索引
   * @param {number} col 列索引
   * @returns {boolean} 是否删除了记录
   */
  delete(row, col) {
    return this.cells.delete(SparseCellStore.keyOf(row, col));
  }

  /**
   * 当前非空单元格数量。
   *
   * @returns {number} 数量
   */
  get size() {
    return this.cells.size;
  }

  /**
   * 清空所有单元格。
   */
  clear() {
    this.cells.clear();
  }

  /**
   * 遍历区域内的非空单元格（含边界）。
   *
   * @param {{ startRow: number, startCol: number, endRow: number, endCol: number }} range 区域
   * @returns {Iterable<{ row: number, col: number, cell: object }>} 单元格迭代器
   */
  *entriesInRange(range) {
    const { startRow, startCol, endRow, endCol } = range;
    for (const [key, cell] of this.cells) {
      const separator = key.indexOf(':');
      const row = Number(key.slice(0, separator));
      const col = Number(key.slice(separator + 1));
      if (row < startRow || row > endRow || col < startCol || col > endCol) {
        continue;
      }
      yield { row, col, cell };
    }
  }
}
