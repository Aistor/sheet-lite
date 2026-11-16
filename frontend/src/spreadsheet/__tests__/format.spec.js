import { describe, expect, it } from 'vitest';
import { formatCellText } from '../core/format.js';
import { normalizeStyle } from '../core/style.js';

const cell = (rawInput) => ({ rawInput, valueType: 'text' });

describe('formatCellText', () => {
  it('常规格式保留原始输入', () => {
    expect(formatCellText(cell('00123'), normalizeStyle({}))).toBe('00123');
    expect(formatCellText(cell('  '), normalizeStyle({}))).toBe('  ');
  });

  it('数值格式添加千分位与两位小数', () => {
    expect(formatCellText(cell('12345.6'), normalizeStyle({ numberFormat: 'number' }))).toBe(
      '12,345.60',
    );
  });

  it('百分比格式乘以 100', () => {
    expect(formatCellText(cell('0.256'), normalizeStyle({ numberFormat: 'percent' }))).toBe('25.6%');
  });

  it('日期格式统一为 yyyy-MM-dd', () => {
    expect(formatCellText(cell('2026/11/16'), normalizeStyle({ numberFormat: 'date' }))).toBe(
      '2026-11-16',
    );
    expect(formatCellText(cell('2026-11-16T10:30:00'), normalizeStyle({ numberFormat: 'date' }))).toBe(
      '2026-11-16',
    );
  });

  it('无法解析时保留原始输入', () => {
    expect(formatCellText(cell('abc'), normalizeStyle({ numberFormat: 'number' }))).toBe('abc');
    expect(formatCellText(cell('not-a-date'), normalizeStyle({ numberFormat: 'date' }))).toBe(
      'not-a-date',
    );
  });

  it('空单元格返回空串', () => {
    expect(formatCellText(undefined, normalizeStyle({}))).toBe('');
    expect(formatCellText(cell(''), normalizeStyle({}))).toBe('');
  });
});
