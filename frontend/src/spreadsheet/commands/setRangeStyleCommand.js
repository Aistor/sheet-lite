import { DEFAULT_STYLE, isDefaultStyle, mergeStyle } from '../core/style.js';

/**
 * 给区域内单元格批量设置样式。
 *
 * `resolvePatch(row, col)` 允许按位置生成不同补丁（例如只给选区外边缘加边框）。
 * 撤销时恢复每个单元格原有的样式记录。
 *
 * @param {object} params 参数
 * @param {{ startRow: number, startCol: number, endRow: number, endCol: number }} params.range 区域
 * @param {(row: number, col: number) => object} params.resolvePatch 样式补丁生成器
 * @returns {object} 命令
 */
export function createSetRangeStyleCommand({ range, resolvePatch }) {
  let previous = [];

  return {
    type: 'SET_RANGE_STYLE',
    range,

    /**
     * 应用样式。
     *
     * @param {{ styleStore: object }} context 上下文
     * @returns {{ range: object }} 变更区域
     */
    execute({ styleStore }) {
      previous = [];
      for (let row = range.startRow; row <= range.endRow; row += 1) {
        for (let col = range.startCol; col <= range.endCol; col += 1) {
          const before = styleStore.get(row, col);
          previous.push({ row, col, style: before });
          const merged = mergeStyle(before ?? DEFAULT_STYLE, resolvePatch(row, col));
          if (isDefaultStyle(merged)) {
            styleStore.delete(row, col);
          } else {
            styleStore.set(row, col, merged);
          }
        }
      }
      return { range };
    },

    /**
     * 撤销样式修改。
     *
     * @param {{ styleStore: object }} context 上下文
     */
    undo({ styleStore }) {
      for (const { row, col, style } of previous) {
        if (style === undefined) {
          styleStore.delete(row, col);
        } else {
          styleStore.set(row, col, style);
        }
      }
    },
  };
}
