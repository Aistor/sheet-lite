/**
 * 把逻辑单元格映射为屏幕矩形，供 DOM 编辑器定位。
 *
 * 与渲染器共用“行头/列头 + 滚动偏移”的同一套换算，避免编辑框和画布错位。
 *
 * @param {object} params 参数
 * @param {object} params.layout 网格布局
 * @param {number} params.scrollLeft 水平滚动偏移
 * @param {number} params.scrollTop 垂直滚动偏移
 * @param {number} params.row 行索引
 * @param {number} params.col 列索引
 * @returns {{ left: number, top: number, width: number, height: number }} 屏幕矩形
 */
export function cellScreenRect({ layout, scrollLeft, scrollTop, row, col }) {
  return {
    left: layout.headerWidth + layout.columnX(col) - scrollLeft,
    top: layout.headerHeight + layout.rowY(row) - scrollTop,
    width: layout.columnWidth,
    height: layout.rowHeight,
  };
}
