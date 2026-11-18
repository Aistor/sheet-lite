<template>
  <div class="format-toolbar" role="toolbar" aria-label="格式工具栏">
    <div class="toolbar-group" data-group="history">
      <n-button-group size="small">
        <n-button :disabled="!canUndo" title="撤销（Ctrl+Z）" @click="action('undo')">
          <n-icon><UndoOutlined /></n-icon>
        </n-button>
        <n-button :disabled="!canRedo" title="恢复（Ctrl+Y）" @click="action('redo')">
          <n-icon><RedoOutlined /></n-icon>
        </n-button>
      </n-button-group>
      <n-button size="small" disabled title="格式刷（UI-3）">
        <n-icon><FormatPaintOutlined /></n-icon>
      </n-button>
    </div>

    <n-divider vertical />

    <div class="toolbar-group" data-group="font">
      <n-button size="small" disabled title="字体（UI-2）">
        <n-icon><TextFieldsOutlined /></n-icon>
      </n-button>
      <n-button size="small" disabled title="字号（UI-2）">
        <n-icon><FormatSizeOutlined /></n-icon>
        <span class="control-text">13</span>
      </n-button>
      <n-button size="small" disabled title="增大字号（UI-2）">
        <n-icon><TextIncreaseOutlined /></n-icon>
      </n-button>
      <n-button size="small" disabled title="减小字号（UI-2）">
        <n-icon><TextDecreaseOutlined /></n-icon>
      </n-button>
    </div>

    <n-divider vertical />

    <div class="toolbar-group" data-group="text">
      <n-button-group size="small">
        <n-button
          :type="activeStyle.bold ? 'primary' : 'default'"
          title="加粗（Ctrl+B）"
          @click="toggle('bold')"
        >
          <n-icon><FormatBoldOutlined /></n-icon>
        </n-button>
        <n-button
          :type="activeStyle.italic ? 'primary' : 'default'"
          title="斜体（Ctrl+I）"
          @click="toggle('italic')"
        >
          <n-icon><FormatItalicOutlined /></n-icon>
        </n-button>
        <n-button disabled title="下划线（UI-2）">
          <n-icon><FormatUnderlinedOutlined /></n-icon>
        </n-button>
        <n-button disabled title="删除线（UI-2）">
          <n-icon><StrikethroughSOutlined /></n-icon>
        </n-button>
      </n-button-group>

      <n-popover trigger="click" placement="bottom-start">
        <template #trigger>
          <n-button size="small" title="文本颜色">
            <n-icon><FormatColorTextOutlined /></n-icon>
            <span class="color-indicator" :style="{ backgroundColor: activeStyle.textColor }" />
          </n-button>
        </template>
        <div class="swatch-grid">
          <button
            v-for="color in textColors"
            :key="`text-${color}`"
            class="swatch"
            :style="{ backgroundColor: color }"
            :title="color"
            @click="applyStyle({ textColor: color })"
          />
        </div>
      </n-popover>
    </div>

    <n-divider vertical />

    <div class="toolbar-group" data-group="fill">
      <n-popover trigger="click" placement="bottom-start">
        <template #trigger>
          <n-button size="small" title="填充颜色">
            <n-icon><FormatColorFillOutlined /></n-icon>
            <span
              class="color-indicator"
              :style="{ backgroundColor: activeStyle.backgroundColor ?? '#ffffff' }"
            />
          </n-button>
        </template>
        <div class="swatch-grid">
          <button
            v-for="color in fillColors"
            :key="`fill-${color.label}`"
            class="swatch"
            :style="{ backgroundColor: color.value ?? '#ffffff' }"
            :title="color.label"
            @click="applyStyle({ backgroundColor: color.value })"
          >
            <span v-if="color.value === null" class="swatch-none">/</span>
          </button>
        </div>
      </n-popover>

      <n-popover trigger="click" placement="bottom-start">
        <template #trigger>
          <n-button size="small" title="边框">
            <n-icon><BorderAllOutlined /></n-icon>
          </n-button>
        </template>
        <div class="menu-column">
          <n-button text size="small" @click="action('border', 'all')">全部边框</n-button>
          <n-button text size="small" @click="action('border', 'outer')">外框</n-button>
          <n-button text size="small" @click="action('border', 'none')">无边框</n-button>
        </div>
      </n-popover>

      <n-button size="small" disabled title="合并单元格（UI-4）">
        <n-icon><MergeTypeOutlined /></n-icon>
      </n-button>
    </div>

    <n-divider vertical />

    <div class="toolbar-group" data-group="align">
      <n-button-group size="small">
        <n-button
          :type="activeStyle.align === 'left' ? 'primary' : 'default'"
          title="左对齐"
          @click="applyStyle({ align: 'left' })"
        >
          <n-icon><FormatAlignLeftOutlined /></n-icon>
        </n-button>
        <n-button
          :type="activeStyle.align === 'center' ? 'primary' : 'default'"
          title="居中"
          @click="applyStyle({ align: 'center' })"
        >
          <n-icon><FormatAlignCenterOutlined /></n-icon>
        </n-button>
        <n-button
          :type="activeStyle.align === 'right' ? 'primary' : 'default'"
          title="右对齐"
          @click="applyStyle({ align: 'right' })"
        >
          <n-icon><FormatAlignRightOutlined /></n-icon>
        </n-button>
        <n-button disabled title="两端对齐（UI-2）">
          <n-icon><FormatAlignJustifyOutlined /></n-icon>
        </n-button>
      </n-button-group>

      <n-popover trigger="click" placement="bottom-start">
        <template #trigger>
          <n-button size="small" disabled title="垂直对齐（UI-2）">
            <n-icon><VerticalAlignCenterOutlined /></n-icon>
          </n-button>
        </template>
        <div class="menu-column">
          <n-button text size="small" disabled>顶端对齐</n-button>
          <n-button text size="small" disabled>垂直居中</n-button>
          <n-button text size="small" disabled>底端对齐</n-button>
        </div>
      </n-popover>

      <n-button size="small" disabled title="文本换行（UI-2）">
        <n-icon><WrapTextOutlined /></n-icon>
      </n-button>

      <n-button size="small" disabled title="文本旋转（UI-2）">
        <n-icon><RotateRightOutlined /></n-icon>
      </n-button>
    </div>

    <n-divider vertical />

    <div class="toolbar-group" data-group="number">
      <n-icon class="control-icon"><NumbersOutlined /></n-icon>
      <n-select
        class="format-select"
        size="small"
        :value="activeStyle.numberFormat"
        :options="formatOptions"
        title="数字格式"
        @update:value="action('number-format', $event)"
      />
      <n-button
        size="small"
        :type="activeStyle.numberFormat === 'percent' ? 'primary' : 'default'"
        title="百分比"
        @click="action('number-format', 'percent')"
      >
        <n-icon><PercentOutlined /></n-icon>
      </n-button>
      <n-button size="small" disabled title="增加小数位数（UI-2）">
        <n-icon><AddOutlined /></n-icon>
      </n-button>
      <n-button size="small" disabled title="减小小数位数（UI-2）">
        <n-icon><RemoveOutlined /></n-icon>
      </n-button>
      <n-button size="small" disabled title="公式（阶段 6）">
        <n-icon><FunctionsOutlined /></n-icon>
      </n-button>
    </div>

    <n-divider vertical />

    <div class="toolbar-group" data-group="data">
      <n-button size="small" disabled title="筛选（后续数据处理阶段）">
        <n-icon><FilterAltOutlined /></n-icon>
      </n-button>
      <n-button size="small" disabled title="排序（后续数据处理阶段）">
        <n-icon><SortOutlined /></n-icon>
      </n-button>
    </div>

    <div class="toolbar-spacer" />

    <n-popover trigger="click" placement="bottom-end">
      <template #trigger>
        <n-button size="small" title="更多行列操作">更多</n-button>
      </template>
      <div class="menu-column">
        <n-button text size="small" @click="action('hide', 'rows')">隐藏行</n-button>
        <n-button text size="small" @click="action('hide', 'columns')">隐藏列</n-button>
        <n-button text size="small" @click="action('show', 'rows')">显示行</n-button>
        <n-button text size="small" @click="action('show', 'columns')">显示列</n-button>
      </div>
    </n-popover>
  </div>
</template>

<script setup>
import { NButton, NButtonGroup, NDivider, NIcon, NPopover, NSelect } from 'naive-ui';
import {
  AddOutlined,
  BorderAllOutlined,
  FilterAltOutlined,
  FormatAlignCenterOutlined,
  FormatAlignJustifyOutlined,
  FormatAlignLeftOutlined,
  FormatAlignRightOutlined,
  FormatBoldOutlined,
  FormatColorFillOutlined,
  FormatColorTextOutlined,
  FormatItalicOutlined,
  FormatPaintOutlined,
  FormatSizeOutlined,
  FormatUnderlinedOutlined,
  FunctionsOutlined,
  MergeTypeOutlined,
  NumbersOutlined,
  PercentOutlined,
  RedoOutlined,
  RemoveOutlined,
  RotateRightOutlined,
  SortOutlined,
  StrikethroughSOutlined,
  TextDecreaseOutlined,
  TextFieldsOutlined,
  TextIncreaseOutlined,
  UndoOutlined,
  VerticalAlignCenterOutlined,
  WrapTextOutlined,
} from '@vicons/material';

const props = defineProps({
  activeStyle: { type: Object, required: true },
  canUndo: { type: Boolean, default: false },
  canRedo: { type: Boolean, default: false },
});

const emit = defineEmits(['action']);

const formatOptions = [
  { label: '常规', value: 'general' },
  { label: '数值', value: 'number' },
  { label: '百分比', value: 'percent' },
  { label: '日期', value: 'date' },
];

const textColors = ['#1f2329', '#d93025', '#1a73e8', '#188038', '#b06000'];

const fillColors = [
  { label: '无填充', value: null },
  { label: '浅黄', value: '#fff2cc' },
  { label: '浅绿', value: '#d9ead3' },
  { label: '浅蓝', value: '#dbe9f6' },
  { label: '浅粉', value: '#fce4ec' },
];

function action(type, payload) {
  emit('action', { type, payload });
}

function applyStyle(patch) {
  action('style', patch);
}

function toggle(key) {
  applyStyle({ [key]: !props.activeStyle[key] });
}
</script>

<style scoped>
.format-toolbar {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-bottom: 1px solid #e5e7eb;
  background-color: #ffffff;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-spacer {
  flex: 1 1 auto;
}

.control-text {
  margin-left: 2px;
  color: #4b5563;
  font-size: 12px;
}

.control-icon {
  color: #6b7280;
  font-size: 16px;
}

.format-select {
  width: 96px;
}

.color-indicator {
  display: inline-block;
  width: 10px;
  height: 3px;
  margin-left: 2px;
  border-radius: 1px;
  vertical-align: middle;
}

.swatch-grid {
  display: grid;
  grid-template-columns: repeat(5, 22px);
  gap: 6px;
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

.menu-column {
  display: flex;
  min-width: 104px;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
}
</style>
