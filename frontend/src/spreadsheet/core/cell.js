/**
 * 单元格值对象。
 *
 * 运行时单元格区分用户输入（`rawInput`）与派生值；M2 只处理文本输入，
 * 公式与计算值在后续阶段接入，因此这里不提前引入 `calculatedValue`。
 */

/** 单元格值类型。 */
export const CellValueType = Object.freeze({
  TEXT: 'text',
});

/**
 * 创建文本单元格。
 *
 * @param {string} rawInput 用户输入
 * @returns {{ rawInput: string, valueType: string }} 单元格
 */
export function createTextCell(rawInput) {
  if (typeof rawInput !== 'string') {
    throw new TypeError(`rawInput 必须是字符串: ${typeof rawInput}`);
  }
  return { rawInput, valueType: CellValueType.TEXT };
}

/**
 * 取单元格展示文本；空单元格返回空串。
 *
 * @param {{ rawInput?: string } | undefined} cell 单元格
 * @returns {string} 展示文本
 */
export function cellDisplayText(cell) {
  return cell?.rawInput ?? '';
}

/**
 * 判断输入是否应当被视为“清除单元格”。
 *
 * 空白输入不落存储；只有真正空串才表示删除，空格仍属于有效内容。
 *
 * @param {string} rawInput 输入
 * @returns {boolean} 是否需要删除
 */
export function isEmptyInput(rawInput) {
  return rawInput === '';
}
