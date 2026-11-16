/**
 * 视口计算：由滚动偏移、容器尺寸和布局推导需要绘制的行列范围。
 *
 * 所有范围都是闭区间，overscan 用于减少快速滚动时的白边。
 */

/**
 * 计算当前视口覆盖的逻辑行列范围。
 *
 * @param {object} params 参数
 * @param {number} params.scrollLeft 水平滚动偏移
 * @param {number} params.scrollTop 垂直滚动偏移
 * @param {number} params.viewportWidth 容器宽度（含行头）
 * @param {number} params.viewportHeight 容器高度（含列头）
 * @param {object} params.layout 网格布局
 * @param {number} [params.overscanRows] 行方向缓冲区
 * @param {number} [params.overscanColumns] 列方向缓冲区
 * @returns {{ firstRow: number, lastRow: number, firstCol: number, lastCol: number, visibleRows: number, visibleColumns: number }} 视口范围
 */
export function computeViewport({
  scrollLeft,
  scrollTop,
  viewportWidth,
  viewportHeight,
  layout,
  overscanRows = 2,
  overscanColumns = 1,
}) {
  const bodyWidth = Math.max(0, viewportWidth - layout.headerWidth);
  const bodyHeight = Math.max(0, viewportHeight - layout.headerHeight);

  if (bodyWidth === 0 || bodyHeight === 0) {
    return {
      firstRow: 0,
      lastRow: -1,
      firstCol: 0,
      lastCol: -1,
      visibleRows: 0,
      visibleColumns: 0,
    };
  }

  const firstVisibleRow = Math.floor(scrollTop / layout.rowHeight);
  const lastVisibleRow = Math.min(
    layout.rowCount - 1,
    Math.ceil((scrollTop + bodyHeight) / layout.rowHeight) - 1,
  );
  const firstVisibleCol = Math.floor(scrollLeft / layout.columnWidth);
  const lastVisibleCol = Math.min(
    layout.columnCount - 1,
    Math.ceil((scrollLeft + bodyWidth) / layout.columnWidth) - 1,
  );

  const firstRow = Math.max(0, firstVisibleRow - overscanRows);
  const lastRow = Math.min(layout.rowCount - 1, lastVisibleRow + overscanRows);
  const firstCol = Math.max(0, firstVisibleCol - overscanColumns);
  const lastCol = Math.min(layout.columnCount - 1, lastVisibleCol + overscanColumns);

  return {
    firstRow,
    lastRow,
    firstCol,
    lastCol,
    visibleRows: Math.max(0, lastVisibleRow - firstVisibleRow + 1),
    visibleColumns: Math.max(0, lastVisibleCol - firstVisibleCol + 1),
  };
}

/**
 * 把滚动偏移限制在内容边界内。
 *
 * @param {number} scrollLeft 水平偏移
 * @param {number} scrollTop 垂直偏移
 * @param {object} params 参数
 * @param {object} params.layout 网格布局
 * @param {number} params.viewportWidth 容器宽度
 * @param {number} params.viewportHeight 容器高度
 * @returns {{ scrollLeft: number, scrollTop: number }} 合法偏移
 */
export function clampScroll(scrollLeft, scrollTop, { layout, viewportWidth, viewportHeight }) {
  const bodyWidth = Math.max(0, viewportWidth - layout.headerWidth);
  const bodyHeight = Math.max(0, viewportHeight - layout.headerHeight);
  const maxLeft = Math.max(0, layout.totalWidth - bodyWidth);
  const maxTop = Math.max(0, layout.totalHeight - bodyHeight);

  return {
    scrollLeft: Math.min(Math.max(0, scrollLeft), maxLeft),
    scrollTop: Math.min(Math.max(0, scrollTop), maxTop),
  };
}

/**
 * 计算让指定单元格完整可见所需的滚动偏移。
 *
 * @param {object} params 参数
 * @param {number} params.row 行索引
 * @param {number} params.col 列索引
 * @param {number} params.scrollLeft 当前水平偏移
 * @param {number} params.scrollTop 当前垂直偏移
 * @param {object} params.layout 网格布局
 * @param {number} params.viewportWidth 容器宽度
 * @param {number} params.viewportHeight 容器高度
 * @returns {{ scrollLeft: number, scrollTop: number }} 调整后的偏移
 */
export function scrollToCell({
  row,
  col,
  scrollLeft,
  scrollTop,
  layout,
  viewportWidth,
  viewportHeight,
}) {
  const bodyWidth = Math.max(0, viewportWidth - layout.headerWidth);
  const bodyHeight = Math.max(0, viewportHeight - layout.headerHeight);
  const cellX = layout.columnX(col);
  const cellY = layout.rowY(row);

  let left = scrollLeft;
  if (cellX < left) {
    left = cellX;
  } else if (cellX + layout.columnWidth > left + bodyWidth) {
    left = cellX + layout.columnWidth - bodyWidth;
  }

  let top = scrollTop;
  if (cellY < top) {
    top = cellY;
  } else if (cellY + layout.rowHeight > top + bodyHeight) {
    top = cellY + layout.rowHeight - bodyHeight;
  }

  return clampScroll(left, top, { layout, viewportWidth, viewportHeight });
}
