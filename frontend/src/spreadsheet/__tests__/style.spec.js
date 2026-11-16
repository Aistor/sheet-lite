import { describe, expect, it } from 'vitest';
import { DEFAULT_STYLE, isDefaultStyle, mergeStyle, normalizeStyle, stylesEqual } from '../core/style.js';

describe('样式模型', () => {
  it('规范化补丁并回退默认值', () => {
    const style = normalizeStyle({ bold: true, align: 'center', numberFormat: 'number' });

    expect(style.bold).toBe(true);
    expect(style.align).toBe('center');
    expect(style.numberFormat).toBe('number');
    expect(style.italic).toBe(false);
    expect(style.textColor).toBe(DEFAULT_STYLE.textColor);
    expect(style.borders).toEqual({ top: false, right: false, bottom: false, left: false });
  });

  it('非法枚举回退默认值', () => {
    const style = normalizeStyle({ align: 'justify', numberFormat: 'currency' });

    expect(style.align).toBe('left');
    expect(style.numberFormat).toBe('general');
  });

  it('合并补丁时保留未覆盖字段与边框', () => {
    const base = normalizeStyle({ bold: true, borders: { top: true } });
    const merged = mergeStyle(base, { backgroundColor: '#fff2cc', borders: { bottom: true } });

    expect(merged.bold).toBe(true);
    expect(merged.backgroundColor).toBe('#fff2cc');
    expect(merged.borders.top).toBe(true);
    expect(merged.borders.bottom).toBe(true);
    expect(merged.borders.left).toBe(false);
  });

  it('比较样式是否一致并识别默认样式', () => {
    expect(stylesEqual({}, DEFAULT_STYLE)).toBe(true);
    expect(stylesEqual({ bold: true }, DEFAULT_STYLE)).toBe(false);
    expect(isDefaultStyle(normalizeStyle({ align: 'left' }))).toBe(true);
  });
});
