/**
 * TSV（制表符分隔）序列化与解析。
 *
 * 复制时把选区展开为矩阵；粘贴时按 TSV 解析并做尺寸限制。
 * 含制表符、换行或引号的字段用双引号包裹，内部引号成对转义。
 */

/** 单次粘贴允许的最大单元格数量。 */
export const MAX_PASTE_CELLS = 100_000;

/** 单次粘贴允许的最大文本长度（字符）。 */
export const MAX_PASTE_CHARS = 5_000_000;

function escapeField(value) {
  if (/[\t\n\r"]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

/**
 * 把区域序列化为 TSV。
 *
 * @param {object} params 参数
 * @param {{ startRow: number, startCol: number, endRow: number, endCol: number }} params.range 区域
 * @param {(row: number, col: number) => { rawInput?: string } | undefined} params.getCell 单元格读取
 * @returns {string} TSV 文本
 */
export function serializeRangeToTsv({ range, getCell }) {
  const lines = [];
  for (let row = range.startRow; row <= range.endRow; row += 1) {
    const fields = [];
    for (let col = range.startCol; col <= range.endCol; col += 1) {
      fields.push(escapeField(getCell(row, col)?.rawInput ?? ''));
    }
    lines.push(fields.join('\t'));
  }
  return lines.join('\n');
}

/**
 * 解析 TSV 文本。
 *
 * 支持引号包裹的字段、字段内换行、CRLF 与末尾换行。
 *
 * @param {string} text TSV 文本
 * @param {object} [options] 选项
 * @param {number} [options.maxChars] 最大字符数
 * @param {number} [options.maxCells] 最大单元格数
 * @returns {string[][]} 行数组
 */
export function parseTsv(
  text,
  { maxChars = MAX_PASTE_CHARS, maxCells = MAX_PASTE_CELLS } = {},
) {
  if (typeof text !== 'string') {
    throw new TypeError('粘贴内容必须是字符串');
  }
  if (text.length > maxChars) {
    throw new RangeError('PASTE_TOO_LARGE');
  }

  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && field === '') {
      inQuotes = true;
      continue;
    }
    if (char === '\t') {
      row.push(field);
      field = '';
      continue;
    }
    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }
    if (char === '\r') {
      if (text[index + 1] !== '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      }
      continue;
    }
    field += char;
  }

  row.push(field);
  rows.push(row);
  if (text.endsWith('\n') || text.endsWith('\r')) {
    rows.pop();
  }

  const cellCount = rows.reduce((total, current) => total + current.length, 0);
  if (cellCount > maxCells) {
    throw new RangeError('PASTE_TOO_LARGE');
  }
  return rows;
}
