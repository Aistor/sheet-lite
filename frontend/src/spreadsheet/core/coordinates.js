/**
 * 逻辑坐标契约。
 *
 * 内部一律使用 0-based 行列索引，A1 表示只用于展示与外部输入。
 * 坐标上限对齐 Excel：1,048,576 行 × 16,384 列（A–XFD）。
 * 坐标上限只是逻辑边界，不代表可以一次加载或绘制全部单元格。
 */

/** 允许的最大行数。 */
export const MAX_ROWS = 1_048_576;

/** 允许的最大列数。 */
export const MAX_COLUMNS = 16_384;

/**
 * 判断行索引是否在合法范围内。
 *
 * @param {number} row 0-based 行索引
 * @returns {boolean} 是否合法
 */
export function isValidRow(row) {
  return Number.isInteger(row) && row >= 0 && row < MAX_ROWS;
}

/**
 * 判断列索引是否在合法范围内。
 *
 * @param {number} col 0-based 列索引
 * @returns {boolean} 是否合法
 */
export function isValidColumn(col) {
  return Number.isInteger(col) && col >= 0 && col < MAX_COLUMNS;
}

/**
 * 把 0-based 列索引转换为 Excel 列标签。
 *
 * @param {number} col 0-based 列索引
 * @returns {string} 列标签，如 A、Z、AA、XFD
 */
export function columnIndexToLabel(col) {
  if (!isValidColumn(col)) {
    throw new RangeError(`列索引越界: ${col}`);
  }
  let label = '';
  let current = col + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    current = Math.floor((current - 1) / 26);
  }
  return label;
}

/**
 * 把 Excel 列标签转换为 0-based 列索引。
 *
 * @param {string} label 列标签，大小写不敏感
 * @returns {number} 0-based 列索引
 */
export function columnLabelToIndex(label) {
  if (typeof label !== 'string' || !/^[A-Za-z]{1,3}$/.test(label)) {
    throw new RangeError(`非法列标签: ${label}`);
  }
  let index = 0;
  for (const char of label.toUpperCase()) {
    index = index * 26 + (char.charCodeAt(0) - 64);
  }
  const col = index - 1;
  if (!isValidColumn(col)) {
    throw new RangeError(`列标签越界: ${label}`);
  }
  return col;
}

/**
 * 把逻辑坐标转换为 A1 引用。
 *
 * @param {number} row 0-based 行索引
 * @param {number} col 0-based 列索引
 * @returns {string} A1 引用，如 B3
 */
export function toA1(row, col) {
  if (!isValidRow(row)) {
    throw new RangeError(`行索引越界: ${row}`);
  }
  return `${columnIndexToLabel(col)}${row + 1}`;
}

/**
 * 把 A1 引用解析为逻辑坐标。
 *
 * @param {string} ref A1 引用，如 B3
 * @returns {{ row: number, col: number }} 0-based 坐标
 */
export function parseA1(ref) {
  if (typeof ref !== 'string') {
    throw new TypeError(`非法单元格引用: ${ref}`);
  }
  const match = /^([A-Za-z]{1,3})([1-9]\d*)$/.exec(ref.trim());
  if (!match) {
    throw new RangeError(`非法单元格引用: ${ref}`);
  }
  const col = columnLabelToIndex(match[1]);
  const row = Number(match[2]) - 1;
  if (!isValidRow(row)) {
    throw new RangeError(`单元格引用越界: ${ref}`);
  }
  return { row, col };
}
