<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <div class="editor-shell">
      <header class="editor-header">
        <span class="brand">Sheet Lite</span>
        <n-tag size="small" type="info" round>阶段 1 · 空白网格</n-tag>
        <span class="address">{{ activeAddress }}</span>
        <span class="hint">点击单元格激活，方向键移动</span>
      </header>
      <main class="editor-content">
        <SpreadsheetGrid @active-change="activeAddress = $event" />
      </main>
    </div>
  </n-config-provider>
</template>

<script setup>
import { ref } from 'vue';
import { NConfigProvider, NTag } from 'naive-ui';
import SpreadsheetGrid from '@/spreadsheet/SpreadsheetGrid.vue';

const activeAddress = ref('A1');

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

.editor-content {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  padding: 12px;
  background-color: #f5f6f8;
}
</style>
