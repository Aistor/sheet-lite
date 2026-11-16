import { describe, expect, it } from 'vitest';
import {
  MAX_PASTE_CELLS,
  MAX_PASTE_CHARS,
  parseTsv,
  serializeRangeToTsv,
} from '../clipboard/tsv.js';

function storeFrom(rows) {
  const map = new Map();
  rows.forEach((fields, row) => {
    fields.forEach((value, col) => {
      if (value !== '') {
        map.set(`${row}:${col}`, { rawInput: value, valueType: 'text' });
      }
    });
  });
  return (row, col) => map.get(`${row}:${col}`);
}

describe('serializeRangeToTsv', () => {
  it('按行列展开选区并用制表符连接', () => {
    const getCell = storeFrom([
      ['a', 'b'],
      ['c'],
    ]);
    const text = serializeRangeToTsv({
      range: { startRow: 0, startCol: 0, endRow: 1, endCol: 1 },
      getCell,
    });

    expect(text).toBe('a\tb\nc\t');
  });

  it('转义制表符、换行与引号', () => {
    const getCell = storeFrom([['a\tb', 'line\nbreak', 'say "hi"']]);
    const text = serializeRangeToTsv({
      range: { startRow: 0, startCol: 0, endRow: 0, endCol: 2 },
      getCell,
    });

    expect(text).toBe('"a\tb"\t"line\nbreak"\t"say ""hi"""');
  });
});

describe('parseTsv', () => {
  it('解析普通行与末尾换行', () => {
    expect(parseTsv('a\tb\nc\td\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('解析 CRLF', () => {
    expect(parseTsv('a\tb\r\nc\td')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('解析引号字段中的制表符、换行和转义引号', () => {
    expect(parseTsv('"a\tb"\t"line\nbreak"\t"say ""hi"""')).toEqual([
      ['a\tb', 'line\nbreak', 'say "hi"'],
    ]);
  });

  it('保留行内空字段与不规则行', () => {
    expect(parseTsv('a\t\tc\n\td')).toEqual([
      ['a', '', 'c'],
      ['', 'd'],
    ]);
  });

  it('序列化与解析可往返', () => {
    const rows = [
      ['a', 'b\tc'],
      ['d\ne', '"quoted"'],
    ];
    expect(parseTsv(rows.map((row) => row.map((value) => (/\t|\n|"/.test(value) ? `"${value.replaceAll('"', '""')}"` : value)).join('\t')).join('\n'))).toEqual(rows);
  });

  it('超过字符或单元格限制时拒绝', () => {
    expect(() => parseTsv('x'.repeat(MAX_PASTE_CHARS + 1))).toThrow(RangeError);
    expect(() => parseTsv('a\t'.repeat(MAX_PASTE_CELLS + 1))).toThrow(RangeError);
  });

  it('拒绝非字符串输入', () => {
    expect(() => parseTsv(null)).toThrow(TypeError);
  });
});
