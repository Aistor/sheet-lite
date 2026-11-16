<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <div class="editor-shell">
      <header class="editor-header">
        <span class="brand">Sheet Lite</span>
        <n-tag size="small" type="info" round>阶段 1 · 空白网格</n-tag>
        <span class="address">{{ activeAddress }}</span>
        <span class="hint">点击单元格激活，方向键移动</span>
      </header>

      <div class="editor-toolbar">
        <n-button-group size="small">
          <n-button
            :type="activeStyle.bold ? 'primary' : 'default'"
            title="加粗"
            @click="toggleBold"
          >
            <n-icon><FormatBoldOutlined /></n-icon>
          </n-button>
          <n-button
            :type="activeStyle.italic ? 'primary' : 'default'"
            title="斜体"
            @click="toggleItalic"
          >
            <n-icon><FormatItalicOutlined /></n-icon>
          </n-button>
        </n-button-group>

        <n-divider vertical />

        <n-button-group size="small">
          <n-button
            :type="activeStyle.align === 'left' ? 'primary' : 'default'"
            title="左对齐"
            @click="setAlign('left')"
          >
            <n-icon><FormatAlignLeftOutlined /></n-icon>
          </n-button>
          <n-button
            :type="activeStyle.align === 'center' ? 'primary' : 'default'"
            title="居中"
            @click="setAlign('center')"
          >
            <n-icon><FormatAlignCenterOutlined /></n-icon>
          </n-button>
          <n-button
            :type="activeStyle.align === 'right' ? 'primary' : 'default'"
            title="右对齐"
            @click="setAlign('right')"
          >
            <n-icon><FormatAlignRightOutlined /></n-icon>
          </n-button>
        </n-button-group>

        <n-select
          class="format-select"
          size="small"
          :value="activeStyle.numberFormat"
          :options="formatOptions"
          @update:value="applyFormat"
        />

        <span class="toolbar-label">文字</span>
        <button
          v-for="color in textColors"
          :key="`text-${color}`"
          class="swatch"
          :style="{ backgroundColor: color }"
          :title="color"
          @click="applyTextColor(color)"
        />

        <span class="toolbar-label">填充</span>
        <button
          v-for="color in fillColors"
          :key="`fill-${color.label}`"
          class="swatch"
          :style="{ backgroundColor: color.value ?? '#ffffff' }"
          :title="color.label"
          @click="applyFillColor(color.value)"
        >
          <span v-if="color.value === null" class="swatch-none">/</span>
        </button>

        <n-divider vertical />

        <n-button-group size="small">
          <n-button @click="applyBorder('all')">全部边框</n-button>
          <n-button @click="applyBorder('outer')">外框</n-button>
          <n-button @click="applyBorder('none')">无边框</n-button>
        </n-button-group>

        <n-divider vertical />

        <n-button-group size="small">
          <n-button @click="hideRows">隐藏行</n-button>
          <n-button @click="hideCols">隐藏列</n-button>
          <n-button @click="showRows">显示行</n-button>
          <n-button @click="showCols">显示列</n-button>
        </n-button-group>
      </div>

      <main class="editor-content">
        <SpreadsheetGrid
          ref="gridRef"
          @active-change="activeAddress = $event"
          @active-style-change="handleStyleChange"
        />
      </main>
    </div>
  </n-config-provider>
</template>

<script setup>
import { ref } from 'vue';
import {
  NButton,
  NButtonGroup,
  NConfigProvider,
  NDivider,
  NIcon,
  NSelect,
  NTag,
} from 'naive-ui';
import {
  FormatAlignCenterOutlined,
  FormatAlignLeftOutlined,
  FormatAlignRightOutlined,
  FormatBoldOutlined,
  FormatItalicOutlined,
} from '@vicons/material';
import SpreadsheetGrid from '@/spreadsheet/SpreadsheetGrid.vue';

const gridRef = ref(null);
const activeAddress = ref('A1');
const activeStyle = ref({
  bold: false,
  italic: false,
  align: 'left',
  textColor: '#1f2329',
  backgroundColor: null,
  numberFormat: 'general',
});

const textColors = ['#1f2329', '#d93025', '#1a73e8', '#188038', '#b06000'];

const fillColors = [
  { label: '无填充', value: null },
  { label: '浅黄', value: '#fff2cc' },
  { label: '浅绿', value: '#d9ead3' },
  { label: '浅蓝', value: '#dbe9f6' },
  { label: '浅粉', value: '#fce4ec' },
];

const formatOptions = [
  { label: '常规', value: 'general' },
  { label: '数值', value: 'number' },
  { label: '百分比', value: 'percent' },
  { label: '日期', value: 'date' },
];

const themeOverrides = {
  common: {
    primaryColor: '#2563eb',
    primaryColorHover: '#1d4ed8',
  },
};

function handleStyleChange(style) {
  activeStyle.value = style;
}

function toggleBold() {
  gridRef.value?.applyStyle({ bold: !activeStyle.value.bold });
}

function toggleItalic() {
  gridRef.value?.applyStyle({ italic: !activeStyle.value.italic });
}

function setAlign(align) {
  gridRef.value?.applyStyle({ align });
}

function applyFormat(numberFormat) {
  gridRef.value?.applyNumberFormat(numberFormat);
}

function applyTextColor(textColor) {
  gridRef.value?.applyStyle({ textColor });
}

function applyFillColor(backgroundColor) {
  gridRef.value?.applyStyle({ backgroundColor });
}

function applyBorder(mode) {
  gridRef.value?.applyBorder(mode);
}

function hideRows() {
  gridRef.value?.hideSelectedRows();
}

function hideCols() {
  gridRef.value?.hideSelectedColumns();
}

function showRows() {
  gridRef.value?.showSelectedRows();
}

function showCols() {
  gridRef.value?.showSelectedColumns();
}
</script>

<style scoped>
.editor-shell {
  display: flex;
  height: 100vh;
  flex-direction: column;
  overflow: hidden;
}

.editor-header {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid #e5e7eb;
  background-color: #ffffff;
}

.brand {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.2px;
}

.hint {
  margin-left: auto;
  color: #6b7280;
  font-size: 12px;
}

.address {
  padding: 2px 10px;
  border: 1px solid #dbe3ef;
  border-radius: 4px;
  background-color: #f7f9fc;
  color: #1d4ed8;
  font-family: 'Consolas', 'Menlo', monospace;
  font-size: 12px;
  line-height: 18px;
}

.editor-toolbar {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-bottom: 1px solid #e5e7eb;
  background-color: #ffffff;
}

.format-select {
  width: 104px;
}

.toolbar-label {
  color: #6b7280;
  font-size: 12px;
}

.swatch {
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  cursor: pointer;
  line-height: 18px;
}

.swatch-none {
  color: #6b7280;
  font-size: 12px;
}

.editor-content {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  padding: 12px;
  background-color: #f5f6f8;
}
</style>
