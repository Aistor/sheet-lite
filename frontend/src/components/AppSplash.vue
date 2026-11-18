<template>
  <div
    v-if="visible"
    class="app-splash"
    :class="{ 'app-splash-hidden': fading }"
    aria-hidden="true"
  >
    <img :src="logoSrc" alt="" width="200" height="200" @error="handleLogoError" />
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';

const visible = ref(false);
const fading = ref(false);
const logoSrc = ref('/sheetlite-animated-logo.svg');
let hideTimer = 0;
let removeTimer = 0;

onMounted(() => {
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    if (sessionStorage.getItem('sheetlite-splash-shown') === '1') {
      return;
    }
    sessionStorage.setItem('sheetlite-splash-shown', '1');
  } catch {
    // 存储不可用时跳过启动动画，不阻断应用初始化。
    return;
  }
  visible.value = true;
  hideTimer = window.setTimeout(() => {
    fading.value = true;
  }, 1200);
  removeTimer = window.setTimeout(() => {
    visible.value = false;
  }, 1520);
});

onBeforeUnmount(() => {
  window.clearTimeout(hideTimer);
  window.clearTimeout(removeTimer);
});

function handleLogoError() {
  if (logoSrc.value.endsWith('sheetlite-animated-logo.svg')) {
    logoSrc.value = '/sheetlite-high-resolution-logo.svg';
    return;
  }
  visible.value = false;
}
</script>

<style scoped>
.app-splash {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
  opacity: 1;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.app-splash-hidden {
  opacity: 0;
}

.app-splash img {
  width: 200px;
  height: 200px;
}
</style>
