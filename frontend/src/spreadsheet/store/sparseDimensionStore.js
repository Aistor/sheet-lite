/**
 * 稀疏尺寸存储：行高/列宽的默认值 + 少量覆盖项。
 *
 * 不创建完整尺寸数组；偏移量用“默认值 × 序号 + 覆盖增量前缀和”计算。
 * 隐藏行列用尺寸 0 表示。
 */

/** 尺寸下限（0 = 隐藏）。 */
export const MIN_DIMENSION = 0;

/** 尺寸上限，避免 NaN/无穷大破坏滚动模型。 */
export const MAX_DIMENSION = 1000;

function assertIndex(value) {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`索引必须是非负整数: ${value}`);
  }
}

function assertSize(value) {
  if (!Number.isFinite(value) || value < MIN_DIMENSION || value > MAX_DIMENSION) {
    throw new RangeError(`尺寸必须在 ${MIN_DIMENSION}..${MAX_DIMENSION} 之间: ${value}`);
  }
}

function upperBound(sorted, value) {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (sorted[middle] < value) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
}

export class SparseDimensionStore {
  /**
   * @param {number} defaultSize 默认尺寸
   */
  constructor(defaultSize) {
    assertSize(defaultSize);
    this.defaultSize = defaultSize;
    this.overrides = new Map();
    this.sorted = [];
    this.prefix = [];
  }

  /**
   * 读取指定索引的尺寸。
   *
   * @param {number} index 索引
   * @returns {number} 尺寸
   */
  get(index) {
    return this.overrides.get(index) ?? this.defaultSize;
  }

  /**
   * 是否隐藏。
   *
   * @param {number} index 索引
   * @returns {boolean} 是否隐藏
   */
  isHidden(index) {
    return this.get(index) === 0;
  }

  /**
   * 设置尺寸；等于默认值时删除覆盖。
   *
   * @param {number} index 索引
   * @param {number} size 尺寸
   * @returns {SparseDimensionStore} 当前存储
   */
  set(index, size) {
    assertIndex(index);
    assertSize(size);
    if (size === this.defaultSize) {
      this.overrides.delete(index);
    } else {
      this.overrides.set(index, size);
    }
    this.rebuildIndex();
    return this;
  }

  /**
   * 恢复默认尺寸。
   *
   * @param {number} index 索引
   */
  reset(index) {
    this.overrides.delete(index);
    this.rebuildIndex();
  }

  /**
   * 清除全部覆盖。
   */
  resetAll() {
    this.overrides.clear();
    this.rebuildIndex();
  }

  /**
   * 覆盖项数量。
   *
   * @returns {number} 数量
   */
  get size() {
    return this.overrides.size;
  }

  /**
   * 计算指定索引之前的累计尺寸。
   *
   * @param {number} index 索引
   * @returns {number} 偏移
   */
  offsetOf(index) {
    assertIndex(index);
    const position = upperBound(this.sorted, index);
    const delta = position > 0 ? this.prefix[position - 1] : 0;
    return index * this.defaultSize + delta;
  }

  /**
   * 计算内容总尺寸。
   *
   * @param {number} count 索引数量
   * @returns {number} 总尺寸
   */
  total(count) {
    const delta = this.prefix.length > 0 ? this.prefix[this.prefix.length - 1] : 0;
    return count * this.defaultSize + delta;
  }

  /**
   * 由像素偏移反查索引；隐藏索引会被跳过。
   *
   * @param {number} offset 偏移
   * @param {number} count 索引数量
   * @returns {number} 索引，全部隐藏时为 -1
   */
  indexAt(offset, count) {
    if (count <= 0) {
      return -1;
    }
    const maxOffset = Math.max(0, this.total(count) - 1);
    const target = Math.min(Math.max(0, offset), maxOffset);
    let low = 0;
    let high = count - 1;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if (this.offsetOf(middle) <= target) {
        low = middle;
      } else {
        high = middle - 1;
      }
    }
    let index = low;
    while (index < count && this.get(index) === 0) {
      index += 1;
    }
    return index < count ? index : -1;
  }

  rebuildIndex() {
    this.sorted = [...this.overrides.keys()].sort((a, b) => a - b);
    this.prefix = [];
    let running = 0;
    for (const index of this.sorted) {
      running += this.overrides.get(index) - this.defaultSize;
      this.prefix.push(running);
    }
  }
}
