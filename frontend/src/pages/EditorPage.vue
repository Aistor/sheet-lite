<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-layout class="editor-shell">
      <n-layout-header bordered class="editor-header">
        <div class="brand">Sheet Lite</div>
        <n-tag size="small" type="info" round>阶段 0 · 工程基线</n-tag>
      </n-layout-header>
      <n-layout-content class="editor-content">
        <n-card title="网格内核尚未接入" class="editor-card">
          <n-space vertical size="large">
            <n-text depth="3">
              当前仓库只有工程骨架：坐标与范围契约位于 <code>src/spreadsheet/core</code>，由 Vitest
              覆盖。后续阶段会接入 Canvas 渲染、视口、选区与编辑。
            </n-text>
            <n-space>
              <n-tag type="success">Vite + Vue 3</n-tag>
              <n-tag type="success">Yarn 1.22.22</n-tag>
              <n-tag type="success">Vitest</n-tag>
            </n-space>
          </n-space>
        </n-card>
      </n-layout-content>
    </n-layout>
  </n-config-provider>
</template>

<script setup>
import { NCard, NConfigProvider, NLayout, NLayoutContent, NLayoutHeader, NSpace, NTag, NText } from 'naive-ui';

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
  min-height: 100%;
  flex-direction: column;
}

.editor-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background-color: #ffffff;
}

.brand {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.2px;
}

.editor-content {
  padding: 24px;
  background-color: #f5f6f8;
}

.editor-card {
  max-width: 720px;
  margin: 0 auto;
}

code {
  padding: 2px 6px;
  border-radius: 4px;
  background-color: #f0f2f5;
  font-size: 13px;
}
</style>
