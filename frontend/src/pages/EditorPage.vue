<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-layout class="editor-shell">
      <n-layout-header bordered class="editor-header">
        <div class="brand">Sheet Lite</div>
        <n-tag size="small" type="info" round>阶段 1 · 空白网格</n-tag>
        <span class="hint">点击单元格激活，方向键移动</span>
      </n-layout-header>
      <n-layout-content class="editor-content">
        <SpreadsheetGrid />
      </n-layout-content>
    </n-layout>
  </n-config-provider>
</template>

<script setup>
import { NConfigProvider, NLayout, NLayoutContent, NLayoutHeader, NTag } from 'naive-ui';
import SpreadsheetGrid from '@/spreadsheet/SpreadsheetGrid.vue';

const themeOverrides = {
  common: {
    primaryColor: '#2563eb',
    primaryColorHover: '#1d4ed8',
  },
};
</script>

<style scoped>
.editor-shell {
  display: flex;
  height: 100%;
  flex-direction: column;
}

.editor-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
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

.editor-content {
  flex: 1;
  min-height: 0;
  padding: 12px;
  background-color: #f5f6f8;
}
</style>
