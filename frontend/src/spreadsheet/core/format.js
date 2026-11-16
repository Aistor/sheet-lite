import { DEFAULT_STYLE, normalizeStyle } from './style.js';

const numberFormatter = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/;

const pad = (value) => String(value).padStart(2, '0');

function formatDate(raw) {
  const match = DATE_ONLY.exec(raw.trim());
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
}

/**
 * 按样式中的数字格式把原始输入转换为展示文本。
 *
 * 无法解析为数字/日期时保留原始输入，避免吞掉用户内容。
 *
 * @param {{ rawInput?: string } | undefined} cell 单元格
 * @param {object} [style] 样式
 * @returns {string} 展示文本
 */
export function formatCellText(cell, style) {
  const raw = cell?.rawInput ?? '';
  if (raw === '') {
    return '';
  }
  const resolved = normalizeStyle(style ?? DEFAULT_STYLE);

  switch (resolved.numberFormat) {
    case 'number': {
      const value = Number(raw);
      return Number.isFinite(value) ? numberFormatter.format(value) : raw;
    }
    case 'percent': {
      const value = Number(raw);
      return Number.isFinite(value) ? `${percentFormatter.format(value * 100)}%` : raw;
    }
    case 'date':
      return formatDate(raw);
    default:
      return raw;
  }
}
