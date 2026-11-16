import { columnIndexToLabel } from '../core/coordinates.js';

/** 默认网格主题。 */
export const DEFAULT_GRID_THEME = Object.freeze({
  background: '#ffffff',
  gridLine: '#e5e7eb',
  headerBackground: '#f7f8fa',
  headerBorder: '#d9dee5',
  headerText: '#6b7280',
  headerActiveText: '#111827',
  headerActiveBackground: '#e8efff',
  activeFill: 'rgba(37, 99, 235, 0.10)',
  activeBorder: '#2563eb',
  font: '12px "Segoe UI", "PingFang SC", sans-serif',
});

/**
 * Canvas 网格渲染器。
 *
 * 只读视口范围并绘制可见单元格、表头和活动单元格；不持有业务数据，
 * 不创建 DOM，也不在绘制过程中分配整行整列的结构。
 *
 * @param {object} [options] 渲染选项
 * @param {object} [options.theme] 主题覆盖
 * @returns {{ draw: Function }} 渲染器
 */
export function createGridRenderer({ theme = {} } = {}) {
  const currentTheme = { ...DEFAULT_GRID_THEME, ...theme };

  /**
   * 绘制一帧。
   *
   * @param {CanvasRenderingContext2D} ctx Canvas 2D 上下文
   * @param {object} params 绘制参数
   * @param {object} params.layout 网格布局
   * @param {object} params.viewport 视口范围
   * @param {number} params.scrollLeft 水平滚动偏移
   * @param {number} params.scrollTop 垂直滚动偏移
   * @param {{ row: number, col: number } | null} params.activeCell 活动单元格
   * @param {number} params.width 画布 CSS 宽度
   * @param {number} params.height 画布 CSS 高度
   * @returns {{ rows: number, columns: number, labels: number }} 绘制统计
   */
  function draw(ctx, { layout, viewport, scrollLeft, scrollTop, activeCell, width, height }) {
    const stats = { rows: 0, columns: 0, labels: 0 };
    const bodyLeft = layout.headerWidth;
    const bodyTop = layout.headerHeight;
    const bodyWidth = Math.max(0, width - bodyLeft);
    const bodyHeight = Math.max(0, height - bodyTop);

    ctx.save();
    ctx.fillStyle = currentTheme.background;
    ctx.fillRect(0, 0, width, height);

    drawBody(ctx, {
      layout,
      viewport,
      scrollLeft,
      scrollTop,
      activeCell,
      bodyLeft,
      bodyTop,
      bodyWidth,
      bodyHeight,
      width,
      height,
      stats,
    });
    drawColumnHeader(ctx, {
      layout,
      viewport,
      scrollLeft,
      activeCell,
      bodyLeft,
      bodyTop,
      bodyWidth,
      width,
      stats,
    });
    drawRowHeader(ctx, {
      layout,
      viewport,
      scrollTop,
      activeCell,
      bodyLeft,
      bodyTop,
      bodyHeight,
      height,
      stats,
    });

    ctx.restore();
    return stats;
  }

  function drawBody(ctx, params) {
    const {
      layout,
      viewport,
      scrollLeft,
      scrollTop,
      activeCell,
      bodyLeft,
      bodyTop,
      bodyWidth,
      bodyHeight,
      width,
      height,
      stats,
    } = params;

    ctx.save();
    ctx.beginPath();
    ctx.rect(bodyLeft, bodyTop, bodyWidth, bodyHeight);
    ctx.clip();

    if (activeCell) {
      const x = bodyLeft + layout.columnX(activeCell.col) - scrollLeft;
      const y = bodyTop + layout.rowY(activeCell.row) - scrollTop;
      ctx.fillStyle = currentTheme.activeFill;
      ctx.fillRect(x + 1, y + 1, layout.columnWidth - 1, layout.rowHeight - 1);
    }

    ctx.strokeStyle = currentTheme.gridLine;
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let row = viewport.firstRow; row <= viewport.lastRow; row += 1) {
      const y = bodyTop + layout.rowY(row) - scrollTop;
      if (y < bodyTop - 1 || y > height) {
        continue;
      }
      ctx.moveTo(bodyLeft, y + 0.5);
      ctx.lineTo(width, y + 0.5);
      stats.rows += 1;
    }

    for (let col = viewport.firstCol; col <= viewport.lastCol; col += 1) {
      const x = bodyLeft + layout.columnX(col) - scrollLeft;
      if (x < bodyLeft - 1 || x > width) {
        continue;
      }
      ctx.moveTo(x + 0.5, bodyTop);
      ctx.lineTo(x + 0.5, height);
      stats.columns += 1;
    }
    ctx.stroke();

    if (activeCell) {
      const x = bodyLeft + layout.columnX(activeCell.col) - scrollLeft;
      const y = bodyTop + layout.rowY(activeCell.row) - scrollTop;
      ctx.strokeStyle = currentTheme.activeBorder;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, layout.columnWidth - 2, layout.rowHeight - 2);
    }

    ctx.restore();
  }

  function drawColumnHeader(ctx, params) {
    const { layout, viewport, scrollLeft, activeCell, bodyLeft, bodyTop, bodyWidth, width, stats } =
      params;

    ctx.save();
    ctx.beginPath();
    ctx.rect(bodyLeft, 0, bodyWidth, bodyTop);
    ctx.clip();

    ctx.fillStyle = currentTheme.headerBackground;
    ctx.fillRect(bodyLeft, 0, bodyWidth, bodyTop);

    ctx.font = currentTheme.font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let col = viewport.firstCol; col <= viewport.lastCol; col += 1) {
      const x = bodyLeft + layout.columnX(col) - scrollLeft;
      if (x + layout.columnWidth < bodyLeft || x > width) {
        continue;
      }
      const isActive = activeCell !== null && activeCell.col === col;
      if (isActive) {
        ctx.fillStyle = currentTheme.headerActiveBackground;
        ctx.fillRect(x, 0, layout.columnWidth, bodyTop);
      }
      ctx.strokeStyle = currentTheme.headerBorder;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + layout.columnWidth - 0.5, 0);
      ctx.lineTo(x + layout.columnWidth - 0.5, bodyTop);
      ctx.stroke();

      ctx.fillStyle = isActive ? currentTheme.headerActiveText : currentTheme.headerText;
      ctx.fillText(columnIndexToLabel(col), x + layout.columnWidth / 2, bodyTop / 2);
      stats.labels += 1;
    }

    ctx.strokeStyle = currentTheme.headerBorder;
    ctx.beginPath();
    ctx.moveTo(bodyLeft, bodyTop - 0.5);
    ctx.lineTo(width, bodyTop - 0.5);
    ctx.stroke();
    ctx.restore();
  }

  function drawRowHeader(ctx, params) {
    const { layout, viewport, scrollTop, activeCell, bodyLeft, bodyTop, bodyHeight, height, stats } =
      params;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, bodyTop, bodyLeft, bodyHeight);
    ctx.clip();

    ctx.fillStyle = currentTheme.headerBackground;
    ctx.fillRect(0, bodyTop, bodyLeft, bodyHeight);

    ctx.font = currentTheme.font;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let row = viewport.firstRow; row <= viewport.lastRow; row += 1) {
      const y = bodyTop + layout.rowY(row) - scrollTop;
      if (y + layout.rowHeight < bodyTop || y > height) {
        continue;
      }
      const isActive = activeCell !== null && activeCell.row === row;
      if (isActive) {
        ctx.fillStyle = currentTheme.headerActiveBackground;
        ctx.fillRect(0, y, bodyLeft, layout.rowHeight);
      }
      ctx.strokeStyle = currentTheme.headerBorder;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y + layout.rowHeight - 0.5);
      ctx.lineTo(bodyLeft, y + layout.rowHeight - 0.5);
      ctx.stroke();

      ctx.fillStyle = isActive ? currentTheme.headerActiveText : currentTheme.headerText;
      ctx.fillText(String(row + 1), bodyLeft - 8, y + layout.rowHeight / 2);
      stats.labels += 1;
    }

    ctx.strokeStyle = currentTheme.headerBorder;
    ctx.beginPath();
    ctx.moveTo(bodyLeft - 0.5, bodyTop);
    ctx.lineTo(bodyLeft - 0.5, height);
    ctx.stroke();
    ctx.restore();
  }

  return { draw };
}
