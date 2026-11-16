/**
 * 单元格样式模型。
 *
 * 样式按单元格稀疏存储；未设置的字段回退到默认值。
 */

const EMPTY_BORDERS = Object.freeze({ top: false, right: false, bottom: false, left: false });

/** 默认单元格样式。 */
export const DEFAULT_STYLE = Object.freeze({
  bold: false,
  italic: false,
  align: 'left',
  textColor: '#1f2329',
  backgroundColor: null,
  numberFormat: 'general',
  borders: EMPTY_BORDERS,
});

const ALIGNMENTS = new Set(['left', 'center', 'right']);
const NUMBER_FORMATS = new Set(['general', 'number', 'percent', 'date']);

/**
 * 把任意样式补丁规范化为完整样式。
 *
 * @param {object} [style] 样式补丁
 * @returns {object} 完整样式
 */
export function normalizeStyle(style = {}) {
  return {
    bold: style.bold === true,
    italic: style.italic === true,
    align: ALIGNMENTS.has(style.align) ? style.align : DEFAULT_STYLE.align,
    textColor: style.textColor ?? DEFAULT_STYLE.textColor,
    backgroundColor: style.backgroundColor ?? null,
    numberFormat: NUMBER_FORMATS.has(style.numberFormat)
      ? style.numberFormat
      : DEFAULT_STYLE.numberFormat,
    borders: { ...EMPTY_BORDERS, ...(style.borders ?? {}) },
  };
}

/**
 * 合并样式补丁，用于在现有样式上叠加修改。
 *
 * @param {object} base 基础样式
 * @param {object} patch 补丁
 * @returns {object} 合并后的完整样式
 */
export function mergeStyle(base, patch) {
  const current = normalizeStyle(base);
  return normalizeStyle({
    ...current,
    ...patch,
    borders: { ...current.borders, ...(patch.borders ?? {}) },
  });
}

/**
 * 合并两个样式补丁，保留“未设置”的字段。
 *
 * 与 {@link mergeStyle} 不同，这里不补默认值，适合存储分层样式补丁。
 *
 * @param {object} base 基础补丁
 * @param {object} patch 新补丁
 * @returns {object} 合并补丁
 */
export function mergePatch(base, patch) {
  const left = base ?? {};
  const right = patch ?? {};
  return {
    ...left,
    ...right,
    borders: { ...(left.borders ?? {}), ...(right.borders ?? {}) },
  };
}

/**
 * 判断两个样式是否完全一致。
 *
 * @param {object} a 样式 A
 * @param {object} b 样式 B
 * @returns {boolean} 是否一致
 */
export function stylesEqual(a, b) {
  const left = normalizeStyle(a);
  const right = normalizeStyle(b);
  return (
    left.bold === right.bold &&
    left.italic === right.italic &&
    left.align === right.align &&
    left.textColor === right.textColor &&
    left.backgroundColor === right.backgroundColor &&
    left.numberFormat === right.numberFormat &&
    left.borders.top === right.borders.top &&
    left.borders.right === right.borders.right &&
    left.borders.bottom === right.borders.bottom &&
    left.borders.left === right.borders.left
  );
}

/**
 * 判断样式是否等价于默认样式（可删除记录）。
 *
 * @param {object} style 样式
 * @returns {boolean} 是否默认
 */
export function isDefaultStyle(style) {
  return stylesEqual(style, DEFAULT_STYLE);
}
