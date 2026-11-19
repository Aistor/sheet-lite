<template>
  <div ref="barRef" class="formula-bar">
    <input
      ref="nameInputRef"
      class="name-box"
      :class="{ 'name-box-invalid': invalid }"
      type="text"
      spellcheck="false"
      autocomplete="off"
      :value="nameText"
      title="输入单元格或区域后回车跳转"
      @focus="handleNameFocus"
      @blur="handleNameBlur"
      @input="handleNameInput"
      @keydown="handleNameKeyDown"
    />
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
  invalid: { type: Boolean, default: false },
});

const emit = defineEmits(['focus', 'input', 'commit', 'cancel', 'jump', 'name-input']);

const barRef = ref(null);
const inputRef = ref(null);
const nameInputRef = ref(null);
const nameText = ref(props.address);
const text = ref(props.value);
let composing = false;
let pendingCommit = null;

watch(
  () => props.address,
  (address) => {
    if (nameInputRef.value !== document.activeElement) {
      nameText.value = address;
    }
  },
);

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

function handleNameFocus() {
  nameText.value = props.address;
  emit('name-input');
  nextTick(() => {
    nameInputRef.value?.select();
  });
}

function handleNameBlur() {
  nameText.value = props.address;
  emit('name-input');
}

function handleNameInput(event) {
  nameText.value = event.target.value;
  emit('name-input');
}

function handleNameKeyDown(event) {
  if (event.isComposing) {
    return;
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    emit('jump', nameText.value);
    return;
  }
  if (event.key === 'Escape') {
    event.preventDefault();
    nameText.value = props.address;
    emit('name-input');
    nameInputRef.value?.blur();
  }
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

/* 现代外壳样式：卡片化编辑栏与绿色焦点 */
.formula-bar {
  height: 34px;
  margin: 8px 16px 0;
  border: 1px solid var(--sl-border, #dfeee2);
  border-bottom: 1px solid var(--sl-border, #dfeee2);
  border-radius: 10px;
  background-color: rgba(255, 255, 255, 0.96);
  box-shadow: 0 4px 12px rgba(7, 49, 6, 0.04);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.formula-bar:focus-within {
  border-color: var(--sl-primary, #358051);
  box-shadow: 0 0 0 2px rgba(53, 128, 81, 0.14);
}

.name-box {
  width: 96px;
  flex-basis: 96px;
  margin: 3px;
  border: 0;
  border-radius: 7px;
  background-color: var(--sl-bg, #f5fcf6);
  color: var(--sl-ink, #073106);
  font-family: 'Consolas', 'Menlo', monospace;
  font-size: 11.5px;
  font-weight: 600;
  line-height: normal;
  padding: 0 6px;
  text-align: center;
  outline: none;
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
}

.name-box:focus {
  background-color: #ffffff;
  box-shadow: 0 0 0 2px rgba(53, 128, 81, 0.18);
}

.name-box-invalid,
.name-box-invalid:focus {
  background-color: #fff7f6;
  color: #b42318;
  box-shadow: 0 0 0 2px rgba(217, 48, 37, 0.28);
}

.fx-button {
  width: 30px;
  flex-basis: 30px;
  border-right: 1px solid #edf5ef;
  color: #7b9a84;
  font-size: 13px;
}

.formula-input {
  padding: 0 10px;
  color: var(--sl-ink, #073106);
  font-size: 12.5px;
}

.formula-input:disabled {
  background-color: transparent;
  color: #a9bdae;
}
</style>
