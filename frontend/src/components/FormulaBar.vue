<template>
  <div ref="barRef" class="formula-bar">
    <div class="name-box" title="当前选区">{{ address }}</div>
    <button class="fx-button" type="button" disabled title="公式（阶段 6）">fx</button>
    <input
      ref="inputRef"
      class="formula-input"
      type="text"
      spellcheck="false"
      autocomplete="off"
      :value="text"
      :disabled="!editable"
      :placeholder="placeholder"
      @input="handleInput"
      @focus="handleFocus"
      @keydown="handleKeyDown"
      @compositionstart="handleCompositionStart"
      @compositionend="handleCompositionEnd"
      @blur="handleBlur"
    />
  </div>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue';

const props = defineProps({
  address: { type: String, default: 'A1' },
  value: { type: String, default: '' },
  editable: { type: Boolean, default: false },
  placeholder: { type: String, default: '' },
});

const emit = defineEmits(['focus', 'input', 'commit', 'cancel']);

const barRef = ref(null);
const inputRef = ref(null);
const text = ref(props.value);
let composing = false;
let pendingCommit = null;

watch(
  () => props.value,
  (value) => {
    if (text.value !== value) {
      text.value = value;
    }
  },
);

watch(
  () => props.editable,
  (editable) => {
    if (!editable) {
      text.value = '';
    }
  },
);

function handleInput(event) {
  text.value = event.target.value;
  emit('input', text.value);
}

function handleFocus() {
  emit('focus');
  nextTick(() => {
    inputRef.value?.setSelectionRange(text.value.length, text.value.length);
  });
}

function handleKeyDown(event) {
  if (event.isComposing || composing) {
    return;
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    emit('commit', { value: text.value, move: 'down' });
    return;
  }
  if (event.key === 'Tab') {
    event.preventDefault();
    emit('commit', { value: text.value, move: event.shiftKey ? 'left' : 'right' });
    return;
  }
  if (event.key === 'Escape') {
    event.preventDefault();
    emit('cancel');
  }
}

function handleCompositionStart() {
  composing = true;
}

function handleCompositionEnd() {
  composing = false;
  if (pendingCommit) {
    const action = pendingCommit;
    pendingCommit = null;
    emit('commit', action);
  }
}

function handleBlur() {
  if (composing) {
    pendingCommit = { value: text.value, move: null };
    return;
  }
  emit('commit', { value: text.value, move: null });
}
</script>

<style scoped>
.formula-bar {
  display: flex;
  flex: 0 0 auto;
  align-items: stretch;
  height: 36px;
  border-bottom: 1px solid #e5e7eb;
  background-color: #ffffff;
}

.name-box {
  display: flex;
  width: 96px;
  flex: 0 0 96px;
  align-items: center;
  justify-content: center;
  border-right: 1px solid #e5e7eb;
  color: #1d4ed8;
  font-family: 'Consolas', 'Menlo', monospace;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 6px;
}

.fx-button {
  width: 32px;
  flex: 0 0 32px;
  border: 0;
  border-right: 1px solid #e5e7eb;
  background-color: #ffffff;
  color: #9ca3af;
  font-family: 'Times New Roman', serif;
  font-style: italic;
  font-size: 14px;
  cursor: not-allowed;
}

.formula-input {
  flex: 1 1 auto;
  min-width: 0;
  padding: 0 8px;
  border: 0;
  outline: none;
  background-color: #ffffff;
  color: #1f2329;
  font-family: 'Segoe UI', 'PingFang SC', sans-serif;
  font-size: 13px;
}

.formula-input:disabled {
  background-color: #fafafa;
  color: #9ca3af;
}
</style>
