<template>
  <header class="app-header">
    <div class="brand">
      <img
        class="brand-mark"
        src="/sheetlite-logo-mark.svg"
        alt="Sheet Lite"
        width="32"
        height="32"
      />
      <span class="brand-name">Sheet Lite</span>
    </div>
    <div class="header-meta">
      <n-tag size="small" type="info" round>阶段 4 · 格式与尺寸</n-tag>
      <span class="hint">点击单元格激活，方向键移动</span>
    </div>
  </header>
</template>

<script setup>
import { NTag } from 'naive-ui';
</script>

<style scoped>
.app-header {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 56px;
  padding: 0 16px;
  border-bottom: 1px solid #e5e7eb;
  background-color: #ffffff;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-mark {
  display: block;
  width: 32px;
  height: 32px;
}

.brand-name {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.2px;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hint {
  color: #6b7280;
  font-size: 12px;
}
</style>
