import { columnIndexToLabel } from '../core/coordinates.js';
import { formatCellText } from '../core/format.js';
import { DEFAULT_STYLE, normalizeStyle } from '../core/style.js';

/** 默认网格主题。 */
export const DEFAULT_GRID_THEME = Object.freeze({
  background: '#ffffff',
  gridLine: '#e5e7eb',
  headerBackground: '#f7f8fa',
  headerBorder: '#d9dee5',
  headerText: '#6b7280',
  headerActiveText: '#111827',
  headerActiveBackground: '#e8efff',
  activeCellBackground: '#ffffff',
  activeBorder: '#2563eb',
  selectionFill: 'rgba(37, 99, 235, 0.16)',
  selectionBorder: '#2563eb',
  selectionGridLine: '#b9cbe6',
  cellText: '#1f2329',
  cellBorder: '#1f2329',
  cellFontSize: 13,
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

    const cellX = (col) => bodyLeft + layout.columnX(col) - scrollLeft;
    const cellY = (row) => bodyTop + layout.rowY(row) - scrollTop;
    const cellWidth = (col) => layout.columnWidthOf(col);
    const cellHeight = (row) => layout.rowHeightOf(row);

    ctx.save();
    ctx.fillStyle = currentTheme.background;
    ctx.fillRect(0, 0, width, height);

    drawBody(ctx, {
      layout,
      viewport,
      selection,
      activeCell,
      getStyle,
      bodyLeft,
      bodyTop,
      bodyWidth,
      bodyHeight,
      width,
      height,
      cellX,
      cellY,
      cellWidth,
      cellHeight,
      stats,
    });

    if (getCell) {
      drawCellTexts(ctx, {
        layout,
        viewport,
        getCell,
        getStyle,
        bodyLeft,
        bodyTop,
        bodyWidth,
        bodyHeight,
        cellX,
        cellY,
        cellWidth,
        cellHeight,
        stats,
      });
    }

    drawColumnHeader(ctx, {
      layout,
      viewport,
      activeCell,
      selection,
      bodyLeft,
      bodyTop,
      bodyWidth,
      width,
      cellX,
      cellWidth,
      stats,
    });
    drawRowHeader(ctx, {
      layout,
      viewport,
      activeCell,
      selection,
      bodyLeft,
      bodyTop,
      bodyHeight,
      height,
      cellY,
      cellHeight,
      stats,
    });

    ctx.restore();
    return stats;
  }

  function drawBody(ctx, params) {
    const {
      viewport,
      selection,
      activeCell,
      getStyle,
      bodyLeft,
      bodyTop,
      bodyWidth,
      bodyHeight,
      width,
      height,
      cellX,
      cellY,
      cellWidth,
      cellHeight,
      stats,
    } = params;

    ctx.save();
    ctx.beginPath();
    ctx.rect(bodyLeft, bodyTop, bodyWidth, bodyHeight);
    ctx.clip();

    if (getStyle) {
      for (let row = viewport.firstRow; row <= viewport.lastRow; row += 1) {
        const rowHeight = cellHeight(row);
        if (rowHeight === 0) {
          continue;
        }
        for (let col = viewport.firstCol; col <= viewport.lastCol; col += 1) {
          const colWidth = cellWidth(col);
          if (colWidth === 0) {
            continue;
          }
          const background = getStyle(row, col)?.backgroundColor;
          if (!background) {
            continue;
          }
          ctx.fillStyle = background;
          ctx.fillRect(cellX(col), cellY(row), colWidth, rowHeight);
        }
      }
    }

    const selectionRect = selection
      ? (() => {
          if (selection.mode === 'rows') {
            const x = bodyLeft;
            const y = cellY(selection.startRow);
            return { x, y, w: width - bodyLeft, h: cellY(selection.endRow + 1) - y };
          }
          if (selection.mode === 'columns') {
            const x = cellX(selection.startCol);
            const y = bodyTop;
            return { x, y, w: cellX(selection.endCol + 1) - x, h: height - bodyTop };
          }
          if (selection.mode === 'all') {
            return { x: bodyLeft, y: bodyTop, w: bodyWidth, h: bodyHeight };
          }
          const x = cellX(selection.startCol);
          const y = cellY(selection.startRow);
          return {
            x,
            y,
            w: cellX(selection.endCol + 1) - x,
            h: cellY(selection.endRow + 1) - y,
          };
        })()
      : null;

    if (selectionRect) {
      ctx.fillStyle = currentTheme.selectionFill;
      ctx.fillRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
    }

    if (activeCell) {
      const width0 = cellWidth(activeCell.col);
      const height0 = cellHeight(activeCell.row);
      if (width0 > 0 && height0 > 0) {
        ctx.fillStyle = currentTheme.activeCellBackground;
        ctx.fillRect(cellX(activeCell.col), cellY(activeCell.row), width0, height0);
      }
    }

    ctx.strokeStyle = currentTheme.gridLine;
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let row = viewport.firstRow; row <= viewport.lastRow; row += 1) {
      const rowHeight = cellHeight(row);
      if (rowHeight === 0) {
        continue;
      }
      const y = cellY(row);
      if (y < bodyTop - 1 || y > height) {
        continue;
      }
      ctx.moveTo(bodyLeft, y + 0.5);
      ctx.lineTo(width, y + 0.5);
      stats.rows += 1;
    }

    for (let col = viewport.firstCol; col <= viewport.lastCol; col += 1) {
      const colWidth = cellWidth(col);
      if (colWidth === 0) {
        continue;
      }
      const x = cellX(col);
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
        const rowHeight = cellHeight(row);
        if (rowHeight === 0) {
          continue;
        }
        for (let col = viewport.firstCol; col <= viewport.lastCol; col += 1) {
          const colWidth = cellWidth(col);
          if (colWidth === 0) {
            continue;
          }
          const borders = getStyle(row, col)?.borders;
          if (!borders) {
            continue;
          }
          const x = cellX(col);
          const y = cellY(row);
          if (borders.top) {
            ctx.moveTo(x, y + 0.5);
            ctx.lineTo(x + colWidth, y + 0.5);
          }
          if (borders.bottom) {
            ctx.moveTo(x, y + rowHeight - 0.5);
            ctx.lineTo(x + colWidth, y + rowHeight - 0.5);
          }
          if (borders.left) {
            ctx.moveTo(x + 0.5, y);
            ctx.lineTo(x + 0.5, y + rowHeight);
          }
          if (borders.right) {
            ctx.moveTo(x + colWidth - 0.5, y);
            ctx.lineTo(x + colWidth - 0.5, y + rowHeight);
          }
        }
      }
      ctx.stroke();
    }

    if (selectionRect) {
      const { x, y, w: selectionWidth, h: selectionHeight } = selectionRect;
      ctx.strokeStyle = currentTheme.selectionBorder;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, selectionWidth - 2, selectionHeight - 2);

      if (selection.mode === 'cells' || selection.mode === 'rows' || selection.mode === 'columns') {
        ctx.strokeStyle = currentTheme.selectionGridLine;
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (selection.mode !== 'columns') {
          for (let row = selection.startRow + 1; row <= selection.endRow; row += 1) {
            if (cellHeight(row) === 0) {
              continue;
            }
            const lineY = cellY(row);
            if (lineY < bodyTop || lineY > height) {
              continue;
            }
            ctx.moveTo(Math.max(x, bodyLeft), lineY + 0.5);
            ctx.lineTo(Math.min(x + selectionWidth, width), lineY + 0.5);
          }
        }
        if (selection.mode !== 'rows') {
          for (let col = selection.startCol + 1; col <= selection.endCol; col += 1) {
            if (cellWidth(col) === 0) {
              continue;
            }
            const lineX = cellX(col);
            if (lineX < bodyLeft || lineX > width) {
              continue;
            }
            ctx.moveTo(lineX + 0.5, Math.max(y, bodyTop));
            ctx.lineTo(lineX + 0.5, Math.min(y + selectionHeight, height));
          }
        }
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  function drawCellTexts(ctx, params) {
    const {
      viewport,
      getCell,
      getStyle,
      bodyLeft,
      bodyTop,
      bodyWidth,
      bodyHeight,
      cellX,
      cellY,
      cellWidth,
      cellHeight,
      stats,
    } = params;

    ctx.save();
    ctx.beginPath();
    ctx.rect(bodyLeft, bodyTop, bodyWidth, bodyHeight);
    ctx.clip();
    ctx.textBaseline = 'middle';

    for (let row = viewport.firstRow; row <= viewport.lastRow; row += 1) {
      const rowHeight = cellHeight(row);
      if (rowHeight === 0) {
        continue;
      }
      for (let col = viewport.firstCol; col <= viewport.lastCol; col += 1) {
        const colWidth = cellWidth(col);
        if (colWidth === 0) {
          continue;
        }
        const cell = getCell(row, col);
        const style = normalizeStyle(getStyle?.(row, col) ?? DEFAULT_STYLE);
        const text = formatCellText(cell, style);
        if (text === '') {
          continue;
        }
        const x = cellX(col);
        const y = cellY(row);
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 1, y + 1, colWidth - 2, rowHeight - 2);
        ctx.clip();
        ctx.font = `${style.italic ? 'italic ' : ''}${style.bold ? '700 ' : ''}${currentTheme.cellFontSize}px "Segoe UI", "PingFang SC", sans-serif`;
        ctx.fillStyle = style.textColor;
        const verticalCenter = y + rowHeight / 2;
        if (style.align === 'center') {
          ctx.textAlign = 'center';
          ctx.fillText(text, x + colWidth / 2, verticalCenter);
        } else if (style.align === 'right') {
          ctx.textAlign = 'right';
          ctx.fillText(text, x + colWidth - 6, verticalCenter);
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
    const {
      layout,
      viewport,
      activeCell,
      selection,
      bodyLeft,
      bodyTop,
      bodyWidth,
      width,
      cellX,
      cellWidth,
      stats,
    } = params;

    const selectedColumns = selection
      ? selection.mode === 'columns'
        ? {
            start: Math.min(selection.anchorCol, selection.focusCol),
            end: Math.max(selection.anchorCol, selection.focusCol),
          }
        : selection.mode === 'all'
          ? { start: 0, end: layout.columnCount - 1 }
          : null
      : null;

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
      const colWidth = cellWidth(col);
      if (colWidth === 0) {
        continue;
      }
      const x = cellX(col);
      if (x + colWidth < bodyLeft || x > width) {
        continue;
      }
      const isActive = activeCell !== null && activeCell.col === col;
      const isSelected =
        selectedColumns !== null && col >= selectedColumns.start && col <= selectedColumns.end;
      if (isActive || isSelected) {
        ctx.fillStyle = currentTheme.headerActiveBackground;
        ctx.fillRect(x, 0, colWidth, bodyTop);
      }
      ctx.strokeStyle = currentTheme.headerBorder;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + colWidth - 0.5, 0);
      ctx.lineTo(x + colWidth - 0.5, bodyTop);
      ctx.stroke();

      ctx.fillStyle = isActive || isSelected ? currentTheme.headerActiveText : currentTheme.headerText;
      ctx.fillText(columnIndexToLabel(col), x + colWidth / 2, bodyTop / 2);
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
    const {
      layout,
      viewport,
      activeCell,
      selection,
      bodyLeft,
      bodyTop,
      bodyHeight,
      height,
      cellY,
      cellHeight,
      stats,
    } = params;

    const selectedRows = selection
      ? selection.mode === 'rows'
        ? {
            start: Math.min(selection.anchorRow, selection.focusRow),
            end: Math.max(selection.anchorRow, selection.focusRow),
          }
        : selection.mode === 'all'
          ? { start: 0, end: layout.rowCount - 1 }
          : null
      : null;

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
      const rowHeight = cellHeight(row);
      if (rowHeight === 0) {
        continue;
      }
      const y = cellY(row);
      if (y + rowHeight < bodyTop || y > height) {
        continue;
      }
      const isActive = activeCell !== null && activeCell.row === row;
      const isSelected =
        selectedRows !== null && row >= selectedRows.start && row <= selectedRows.end;
      if (isActive || isSelected) {
        ctx.fillStyle = currentTheme.headerActiveBackground;
        ctx.fillRect(0, y, bodyLeft, rowHeight);
      }
      ctx.strokeStyle = currentTheme.headerBorder;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y + rowHeight - 0.5);
      ctx.lineTo(bodyLeft, y + rowHeight - 0.5);
      ctx.stroke();

      ctx.fillStyle = isActive || isSelected ? currentTheme.headerActiveText : currentTheme.headerText;
      ctx.fillText(String(row + 1), bodyLeft - 8, y + rowHeight / 2);
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
