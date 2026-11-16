import { formatCellText } from '../core/format.js';
import { DEFAULT_STYLE, normalizeStyle } from '../core/style.js';
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
  activeCellBackground: '#ffffff',
  activeBorder: '#2563eb',
  selectionFill: 'rgba(37, 99, 235, 0.16)',
  selectionBorder: '#2563eb',
  selectionGridLine: '#b9cbe6',
  cellText: '#1f2329',
  cellBorder: '#1f2329',
  cellFontSize: 13,
  font: '12px "Segoe UI", "PingFang SC", sans-serif',
  cellFont: '13px "Segoe UI", "PingFang SC", sans-serif',
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
   * @param {{ startRow: number, startCol: number, endRow: number, endCol: number } | null} [params.selection] 选区范围
   * @param {(row: number, col: number) => object | undefined} [params.getCell] 单元格读取函数
   * @param {(row: number, col: number) => object | undefined} [params.getStyle] 样式读取函数
   * @param {number} params.width 画布 CSS 宽度
   * @param {number} params.height 画布 CSS 高度
   * @returns {{ rows: number, columns: number, labels: number, texts: number }} 绘制统计
   */
  function draw(
    ctx,
    {
      layout,
      viewport,
      scrollLeft,
      scrollTop,
      activeCell,
      selection,
      getCell,
      getStyle,
      width,
      height,
    },
  ) {
    const stats = { rows: 0, columns: 0, labels: 0, texts: 0 };
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
      selection,
      bodyLeft,
      bodyTop,
      bodyWidth,
      bodyHeight,
      getStyle,
      width,
      height,
      stats,
    });
    if (getCell) {
      drawCellTexts(ctx, {
        layout,
        viewport,
        scrollLeft,
        scrollTop,
        bodyLeft,
        bodyTop,
        bodyWidth,
        bodyHeight,
        getCell,
        getStyle,
        stats,
      });
    }
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
      selection,
      bodyLeft,
      bodyTop,
      bodyWidth,
      bodyHeight,
      getStyle,
      width,
      height,
      stats,
    } = params;

    ctx.save();
    ctx.beginPath();
    ctx.rect(bodyLeft, bodyTop, bodyWidth, bodyHeight);
    ctx.clip();

    if (getStyle) {
      for (let row = viewport.firstRow; row <= viewport.lastRow; row += 1) {
        for (let col = viewport.firstCol; col <= viewport.lastCol; col += 1) {
          const background = getStyle(row, col)?.backgroundColor;
          if (!background) {
            continue;
          }
          const x = bodyLeft + layout.columnX(col) - scrollLeft;
          const y = bodyTop + layout.rowY(row) - scrollTop;
          ctx.fillStyle = background;
          ctx.fillRect(x, y, layout.columnWidth, layout.rowHeight);
        }
      }
    }

    if (selection) {
      const x = bodyLeft + layout.columnX(selection.startCol) - scrollLeft;
      const y = bodyTop + layout.rowY(selection.startRow) - scrollTop;
      const selectionWidth = (selection.endCol - selection.startCol + 1) * layout.columnWidth;
      const selectionHeight = (selection.endRow - selection.startRow + 1) * layout.rowHeight;
      ctx.fillStyle = currentTheme.selectionFill;
      ctx.fillRect(x, y, selectionWidth, selectionHeight);
    }

    if (activeCell) {
      const x = bodyLeft + layout.columnX(activeCell.col) - scrollLeft;
      const y = bodyTop + layout.rowY(activeCell.row) - scrollTop;
      ctx.fillStyle = currentTheme.activeCellBackground;
      ctx.fillRect(x, y, layout.columnWidth, layout.rowHeight);
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

    if (getStyle) {
      ctx.strokeStyle = currentTheme.cellBorder;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let row = viewport.firstRow; row <= viewport.lastRow; row += 1) {
        for (let col = viewport.firstCol; col <= viewport.lastCol; col += 1) {
          const borders = getStyle(row, col)?.borders;
          if (!borders) {
            continue;
          }
          const x = bodyLeft + layout.columnX(col) - scrollLeft;
          const y = bodyTop + layout.rowY(row) - scrollTop;
          const cellWidth = layout.columnWidth;
          const cellHeight = layout.rowHeight;
          if (borders.top) {
            ctx.moveTo(x, y + 0.5);
            ctx.lineTo(x + cellWidth, y + 0.5);
          }
          if (borders.bottom) {
            ctx.moveTo(x, y + cellHeight - 0.5);
            ctx.lineTo(x + cellWidth, y + cellHeight - 0.5);
          }
          if (borders.left) {
            ctx.moveTo(x + 0.5, y);
            ctx.lineTo(x + 0.5, y + cellHeight);
          }
          if (borders.right) {
            ctx.moveTo(x + cellWidth - 0.5, y);
            ctx.lineTo(x + cellWidth - 0.5, y + cellHeight);
          }
        }
      }
      ctx.stroke();
    }

    if (selection) {
      const x = bodyLeft + layout.columnX(selection.startCol) - scrollLeft;
      const y = bodyTop + layout.rowY(selection.startRow) - scrollTop;
      const selectionWidth = (selection.endCol - selection.startCol + 1) * layout.columnWidth;
      const selectionHeight = (selection.endRow - selection.startRow + 1) * layout.rowHeight;
      ctx.strokeStyle = currentTheme.selectionBorder;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, selectionWidth - 2, selectionHeight - 2);

      ctx.strokeStyle = currentTheme.selectionGridLine;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let row = selection.startRow + 1; row <= selection.endRow; row += 1) {
        const lineY = bodyTop + layout.rowY(row) - scrollTop;
        if (lineY < bodyTop || lineY > height) {
          continue;
        }
        ctx.moveTo(Math.max(x, bodyLeft), lineY + 0.5);
        ctx.lineTo(Math.min(x + selectionWidth, width), lineY + 0.5);
      }
      for (let col = selection.startCol + 1; col <= selection.endCol; col += 1) {
        const lineX = bodyLeft + layout.columnX(col) - scrollLeft;
        if (lineX < bodyLeft || lineX > width) {
          continue;
        }
        ctx.moveTo(lineX + 0.5, Math.max(y, bodyTop));
        ctx.lineTo(lineX + 0.5, Math.min(y + selectionHeight, height));
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawCellTexts(ctx, params) {
    const {
      layout,
      viewport,
      scrollLeft,
      scrollTop,
      bodyLeft,
      bodyTop,
      bodyWidth,
      bodyHeight,
      getCell,
      getStyle,
      stats,
    } = params;

    ctx.save();
    ctx.beginPath();
    ctx.rect(bodyLeft, bodyTop, bodyWidth, bodyHeight);
    ctx.clip();
    ctx.textBaseline = 'middle';

    for (let row = viewport.firstRow; row <= viewport.lastRow; row += 1) {
      for (let col = viewport.firstCol; col <= viewport.lastCol; col += 1) {
        const cell = getCell(row, col);
        const style = normalizeStyle(getStyle?.(row, col) ?? DEFAULT_STYLE);
        const text = formatCellText(cell, style);
        if (text === '') {
          continue;
        }
        const x = bodyLeft + layout.columnX(col) - scrollLeft;
        const y = bodyTop + layout.rowY(row) - scrollTop;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 1, y + 1, layout.columnWidth - 2, layout.rowHeight - 2);
        ctx.clip();
        ctx.font = `${style.italic ? 'italic ' : ''}${style.bold ? '700 ' : ''}${currentTheme.cellFontSize}px "Segoe UI", "PingFang SC", sans-serif`;
        ctx.fillStyle = style.textColor;
        const verticalCenter = y + layout.rowHeight / 2;
        if (style.align === 'center') {
          ctx.textAlign = 'center';
          ctx.fillText(text, x + layout.columnWidth / 2, verticalCenter);
        } else if (style.align === 'right') {
          ctx.textAlign = 'right';
          ctx.fillText(text, x + layout.columnWidth - 6, verticalCenter);
        } else {
          ctx.textAlign = 'left';
          ctx.fillText(text, x + 6, verticalCenter);
        }
        ctx.restore();
        stats.texts += 1;
      }
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
