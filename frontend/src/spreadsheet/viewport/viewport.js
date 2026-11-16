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
 * 计算拖拽选区靠近边缘时的自动滚动增量。
 *
 * 指针进入边缘阈值后开始滚动，越靠近外侧越快，单帧增量有上限。
 *
 * @param {object} params 参数
 * @param {number} params.pointerX 指针 X
 * @param {number} params.pointerY 指针 Y
 * @param {number} params.left 视口左边界
 * @param {number} params.top 视口上边界
 * @param {number} params.right 视口右边界
 * @param {number} params.bottom 视口下边界
 * @param {number} [params.margin] 触发阈值
 * @param {number} [params.maxStep] 单帧最大滚动量
 * @returns {{ dx: number, dy: number }} 滚动增量
 */
export function autoScrollDelta({
  pointerX,
  pointerY,
  left,
  top,
  right,
  bottom,
  margin = 28,
  maxStep = 30,
}) {
  const axisDelta = (position, start, end) => {
    if (position > end - margin) {
      return Math.min(maxStep, Math.ceil((position - (end - margin)) / 2) + 4);
    }
    if (position < start + margin) {
      return -Math.min(maxStep, Math.ceil((start + margin - position) / 2) + 4);
    }
    return 0;
  };

  return {
    dx: axisDelta(pointerX, left, right),
    dy: axisDelta(pointerY, top, bottom),
  };
}

/**
 * 建立物理滚动与逻辑坐标的映射。
 *
 * 浏览器对单个元素的高度有上限（且与 devicePixelRatio 相关），百万行无法直接
 * 用一个 spacer 表达。这里把逻辑内容压缩到安全高度，滚动条在物理像素上移动，
 * 绘制与命中测试仍使用逻辑偏移。
 *
 * @param {object} params 参数
 * @param {number} params.contentSize 逻辑内容尺寸
 * @param {number} params.viewportSize 正文区尺寸（已扣除表头）
 * @param {number} params.maxContentSize 浏览器可安全承载的内容高度
 * @returns {{ logicalMax: number, physicalMax: number, scale: number, physicalContent: number }} 映射
 */
export function createScrollMapping({ contentSize, viewportSize, maxContentSize }) {
  const logicalMax = Math.max(0, contentSize - viewportSize);
  const physicalContent = Math.min(contentSize, Math.max(maxContentSize, viewportSize));
  const physicalMax = Math.max(0, physicalContent - viewportSize);
  const scale = physicalMax === 0 ? 0 : logicalMax / physicalMax;
  return { logicalMax, physicalMax, scale, physicalContent };
}

/**
 * 逻辑偏移转物理滚动偏移。
 *
 * @param {{ physicalMax: number, scale: number }} mapping 映射
 * @param {number} logical 逻辑偏移
 * @returns {number} 物理偏移
 */
export function logicalToPhysical(mapping, logical) {
  if (mapping.physicalMax === 0 || mapping.scale === 0) {
    return 0;
  }
  return Math.min(Math.max(0, logical) / mapping.scale, mapping.physicalMax);
}

/**
 * 物理滚动偏移转逻辑偏移。
 *
 * @param {{ logicalMax: number, physicalMax: number, scale: number }} mapping 映射
 * @param {number} physical 物理偏移
 * @returns {number} 逻辑偏移
 */
export function physicalToLogical(mapping, physical) {
  if (mapping.physicalMax === 0) {
    return 0;
  }
  return Math.min(Math.max(0, physical) * mapping.scale, mapping.logicalMax);
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
