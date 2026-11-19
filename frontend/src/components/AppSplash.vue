<template>
  <div
    v-if="visible"
    class="app-splash"
    :class="{ 'app-splash-leaving': fading }"
    role="status"
    aria-label="正在加载 Sheet Lite"
  >
    <img
      ref="logoRef"
      :src="logoSrc"
      alt="Sheet Lite"
      width="220"
      height="220"
      @load="handleLogoLoad"
      @error="handleLogoError"
    />
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

// 动画最长延迟 1.33s + 最长时长 0.9s ≈ 2.23s，取 2.3s；
// 播放完成后再停留 200ms，最后用 300ms 淡出。
const ANIMATION_TOTAL_MS = 2300;
const POST_ANIMATION_DELAY_MS = 200;
const FADE_MS = 300;
const LOAD_FALLBACK_MS = 5000;

const visible = ref(false);
const fading = ref(false);
const logoSrc = ref('/sheetlite-animated-logo.svg');
const logoRef = ref(null);

let fadeTimer = 0;
let removeTimer = 0;
let fallbackTimer = 0;
let sequenceStarted = false;

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
  // 资源很久没有触发 load 时兜底，避免覆盖层一直停留。
  fallbackTimer = window.setTimeout(startSequence, LOAD_FALLBACK_MS);
  nextTick(() => {
    if (logoRef.value?.complete && logoRef.value.naturalWidth > 0) {
      startSequence();
    }
  });
});

onBeforeUnmount(() => {
  window.clearTimeout(fadeTimer);
  window.clearTimeout(removeTimer);
  window.clearTimeout(fallbackTimer);
});

function handleLogoLoad() {
  startSequence();
}

function handleLogoError() {
  if (logoSrc.value.endsWith('sheetlite-animated-logo.svg')) {
    logoSrc.value = '/sheetlite-high-resolution-logo.svg';
    return;
  }
  visible.value = false;
}

function startSequence() {
  if (sequenceStarted) {
    return;
  }
  sequenceStarted = true;
  window.clearTimeout(fallbackTimer);

  const holdUntil = ANIMATION_TOTAL_MS + POST_ANIMATION_DELAY_MS;
  fadeTimer = window.setTimeout(() => {
    fading.value = true;
  }, holdUntil);
  removeTimer = window.setTimeout(() => {
    visible.value = false;
  }, holdUntil + FADE_MS);
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
  background: linear-gradient(160deg, #f5fcf6 0%, #eaf6ec 55%, #dcefe1 100%);
  opacity: 1;
  transition: opacity 0.3s ease;
  pointer-events: auto;
}

.app-splash-leaving {
  opacity: 0;
}

.app-splash img {
  width: 220px;
  height: 220px;
  filter: drop-shadow(0 18px 34px rgba(7, 49, 6, 0.12));
}
</style>
