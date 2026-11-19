<template>
  <header class="app-header">
    <div class="brand">
      <img
        class="brand-mark"
        src="/sheetlite-logo-mark.svg"
        alt="Sheet Lite"
        width="36"
        height="36"
      />
      <div class="brand-text">
        <span class="brand-name">SHEET LITE</span>
        <span class="brand-subtitle">Lightweight · Efficient · Collaborative</span>
      </div>
    </div>
    <div class="header-meta">
      <n-tag size="small" :bordered="false" round class="phase-pill">阶段 4 · 格式与尺寸</n-tag>
      <span class="hint">点击单元格激活，方向键移动</span>
    </div>
  </header>
</template>

<script setup>
import { NTag } from 'naive-ui';
</script>

<style scoped>
.app-header {
  position: relative;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 64px;
  padding: 0 20px;
  border-bottom: 1px solid var(--sl-border, #dfeee2);
  background-color: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(10px);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-mark {
  display: block;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(7, 49, 6, 0.12);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.brand:hover .brand-mark {
  transform: translateY(-1px) scale(1.03);
  box-shadow: 0 6px 16px rgba(7, 49, 6, 0.16);
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.brand-name {
  color: var(--sl-ink, #073106);
  font-size: 19px;
  font-weight: 700;
  letter-spacing: 0.1px;
  line-height: 1.15;
}

.brand-subtitle {
  color: var(--sl-muted, #5f7a66);
  font-size: 10px;
  letter-spacing: 0.3px;
  line-height: 1.2;
  white-space: nowrap;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 14px;
}

.phase-pill {
  background-color: var(--sl-soft, #eaf6ec) !important;
  color: var(--sl-ink, #073106) !important;
  font-weight: 500;
}

.hint {
  color: var(--sl-muted, #5f7a66);
  font-size: 12px;
}
</style>
