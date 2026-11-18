<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <div class="editor-shell">
      <AppHeader />

      <FormatToolbar
        :active-style="activeStyle"
        :can-undo="canUndo"
        :can-redo="canRedo"
        @action="handleToolbarAction"
      />

      <FormulaBar
        :address="activeInfo?.address ?? 'A1'"
        :value="formulaValue"
        :editable="activeInfo?.editable ?? false"
        :placeholder="formulaPlaceholder"
        @focus="handleFormulaFocus"
        @input="handleFormulaInput"
        @commit="handleFormulaCommit"
        @cancel="handleFormulaCancel"
      />

      <main class="editor-content">
        <SpreadsheetGrid
          ref="gridRef"
          @active-change="handleActiveChange"
          @active-style-change="handleStyleChange"
          @history-change="handleHistoryChange"
        />
      </main>
    </div>
  </n-config-provider>
</template>

<script setup>
import { computed, ref } from 'vue';
import { NConfigProvider } from 'naive-ui';
import AppHeader from '@/components/AppHeader.vue';
import FormatToolbar from '@/components/FormatToolbar.vue';
import FormulaBar from '@/components/FormulaBar.vue';
import SpreadsheetGrid from '@/spreadsheet/SpreadsheetGrid.vue';

const gridRef = ref(null);
const activeInfo = ref(null);
const activeStyle = ref({
  bold: false,
  italic: false,
  align: 'left',
  textColor: '#1f2329',
  backgroundColor: null,
  numberFormat: 'general',
});
const canUndo = ref(false);
const canRedo = ref(false);
const formulaValue = ref('');
const formulaEditing = ref(false);

const themeOverrides = {
  common: {
    primaryColor: '#2563eb',
    primaryColorHover: '#1d4ed8',
  },
};

const formulaPlaceholder = computed(() => {
  const info = activeInfo.value;
  if (!info) {
    return '';
  }
  const rows = info.range.endRow - info.range.startRow;
  const columns = info.range.endCol - info.range.startCol;
  if (info.mode === 'all') {
    return '已选择全表';
  }
  if (info.mode === 'rows') {
    return `已选择 ${rows} 行`;
  }
  if (info.mode === 'columns') {
    return `已选择 ${columns} 列`;
  }
  return `已选择 ${rows} 行 × ${columns} 列`;
});

function handleActiveChange(info) {
  activeInfo.value = info;
  if (!formulaEditing.value) {
    formulaValue.value = info.rawInput ?? '';
  }
}

function handleStyleChange(style) {
  activeStyle.value = style;
}

function handleHistoryChange(state) {
  canUndo.value = state.canUndo;
  canRedo.value = state.canRedo;
}

function handleFormulaFocus() {
  gridRef.value?.commitActiveEdit?.();
  formulaEditing.value = true;
  formulaValue.value = activeInfo.value?.rawInput ?? '';
}

function handleFormulaInput(value) {
  formulaValue.value = value;
}

function commitFormula(move) {
  if (!formulaEditing.value) {
    return true;
  }
  const info = activeInfo.value;
  if (!info?.editable) {
    formulaEditing.value = false;
    return false;
  }
  formulaEditing.value = false;
  gridRef.value?.applyInput(formulaValue.value);
  if (move === 'down') {
    gridRef.value?.moveActive(1, 0);
  } else if (move === 'right') {
    gridRef.value?.moveActive(0, 1);
  } else if (move === 'left') {
    gridRef.value?.moveActive(0, -1);
  }
  gridRef.value?.focusGrid?.();
  return true;
}

function handleFormulaCommit({ value, move }) {
  formulaValue.value = value;
  commitFormula(move);
}

function handleFormulaCancel() {
  formulaEditing.value = false;
  formulaValue.value = activeInfo.value?.rawInput ?? '';
  gridRef.value?.focusGrid?.();
}

function commitAllEdits() {
  if (formulaEditing.value) {
    commitFormula(null);
  }
  gridRef.value?.commitActiveEdit?.();
}

function handleToolbarAction({ type, payload }) {
  commitAllEdits();
  switch (type) {
    case 'undo':
      gridRef.value?.undo?.();
      break;
    case 'redo':
      gridRef.value?.redo?.();
      break;
    case 'style':
      gridRef.value?.applyStyle?.(payload);
      break;
    case 'border':
      gridRef.value?.applyBorder?.(payload);
      break;
    case 'number-format':
      gridRef.value?.applyNumberFormat?.(payload);
      break;
    case 'hide':
      if (payload === 'rows') {
        gridRef.value?.hideSelectedRows?.();
      } else {
        gridRef.value?.hideSelectedColumns?.();
      }
      break;
    case 'show':
      if (payload === 'rows') {
        gridRef.value?.showSelectedRows?.();
      } else {
        gridRef.value?.showSelectedColumns?.();
      }
      break;
    default:
      break;
  }
}
</script>

<style scoped>
.editor-shell {
  display: flex;
  height: 100vh;
  flex-direction: column;
  overflow: hidden;
}

.editor-content {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  padding: 12px;
  background-color: #f5f6f8;
}
</style>
