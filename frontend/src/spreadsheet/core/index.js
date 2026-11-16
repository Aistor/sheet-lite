export {
  MAX_COLUMNS,
  MAX_ROWS,
  columnIndexToLabel,
  columnLabelToIndex,
  isValidColumn,
  isValidRow,
  parseA1,
  toA1,
} from './coordinates.js';

export { CellValueType, cellDisplayText, createTextCell, isEmptyInput } from './cell.js';

export {
  clampCell,
  createSelection,
  extendSelection,
  isSingleCellSelection,
  moveActiveCell,
  selectionRange,
} from './selection.js';

export {
  clampRangeToSheet,
  createRange,
  intersectRanges,
  rangeCellCount,
  rangeContains,
  rangesEqual,
} from './range.js';
