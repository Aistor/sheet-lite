import { mergePatch } from '../core/style.js';

/**
 * 给整行/整列/全表设置样式。
 *
 * 与单元格样式分开存储，避免为百万行逐格写入；渲染时按
 * 全表 → 列 → 行 → 单元格 的顺序解析。
 *
 * @param {object} params 参数
 * @param {'rows' | 'columns' | 'sheet'} params.mode 目标类型
 * @param {number} [params.start] 起始行/列
 * @param {number} [params.end] 结束行/列
 * @param {(index: number) => object} params.resolvePatch 样式补丁生成器
 * @returns {object} 命令
 */
export function createSetAreaStyleCommand({ mode, start = 0, end = 0, resolvePatch }) {
  let previous = [];

  return {
    type: 'SET_AREA_STYLE',
    mode,
    start,
    end,

    /**
     * 应用样式。
     *
     * @param {{ styleStore: object }} context 上下文
     * @returns {{ mode: string }} 变更结果
     */
    execute({ styleStore }) {
      previous = [];
      if (mode === 'sheet') {
        previous = [{ mode: 'sheet', style: styleStore.getSheetStyle() }];
        const merged = mergePatch(styleStore.getSheetStyle() ?? {}, resolvePatch(0));
        styleStore.setSheetStyle(merged);
        return { mode };
      }

      const isRows = mode === 'rows';
      for (let index = start; index <= end; index += 1) {
        const before = isRows ? styleStore.getRowStyle(index) : styleStore.getColumnStyle(index);
        previous.push({ mode, index, style: before });
        const merged = mergePatch(before ?? {}, resolvePatch(index));
        if (isRows) {
          styleStore.setRowStyle(index, merged);
        } else {
          styleStore.setColumnStyle(index, merged);
        }
      }
      return { mode };
    },

    /**
     * 撤销样式修改。
     *
     * @param {{ styleStore: object }} context 上下文
     */
    undo({ styleStore }) {
      for (const entry of previous) {
        if (entry.mode === 'sheet') {
          styleStore.setSheetStyle(entry.style ?? {});
        } else if (entry.mode === 'rows') {
          styleStore.setRowStyle(entry.index, entry.style ?? {});
        } else {
          styleStore.setColumnStyle(entry.index, entry.style ?? {});
        }
      }
    },
  };
}
