<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import {
  filterSunlikeTokens,
  getDetailGridMenuMeta,
  translateSunlikeSqlExpr,
  type SunlikeSqlFieldToken,
} from '@/utils/sunlikeSqlExpr';

const props = defineProps<{
  modelValue: string;
  menuCode: string;
  rows?: number;
}>();

const emit = defineEmits<{
  'update:modelValue': [string];
}>();

const textareaRef = ref<HTMLTextAreaElement | null>(null);
const pickerOpen = ref(false);
const pickerQuery = ref('');
const pickerStyle = ref({ top: '0px', left: '0px' });
const activeIndex = ref(0);

const meta = computed(() => getDetailGridMenuMeta(props.menuCode));
const filteredTokens = computed(() => filterSunlikeTokens(props.menuCode, pickerQuery.value));
const headTokens = computed(() => filteredTokens.value.filter((t) => t.prefix === 'M'));
const lineTokens = computed(() => filteredTokens.value.filter((t) => t.prefix === 'T'));

const translatedPreview = computed(() => {
  const v = props.modelValue.trim();
  if (!v || !v.includes(':')) return '';
  try {
    return translateSunlikeSqlExpr(v, props.menuCode);
  } catch (e: unknown) {
    return `错误: ${e instanceof Error ? e.message : String(e)}`;
  }
});

watch(
  () => props.modelValue,
  () => {
    if (pickerOpen.value) syncPickerQueryFromCursor();
  }
);

function onInput(e: Event) {
  const el = e.target as HTMLTextAreaElement;
  emit('update:modelValue', el.value);
  checkColonTrigger(el);
}

function checkColonTrigger(el: HTMLTextAreaElement) {
  const pos = el.selectionStart ?? 0;
  const before = el.value.slice(0, pos);
  const colonIdx = before.lastIndexOf(':');
  if (colonIdx === -1) {
    pickerOpen.value = false;
    return;
  }
  const partial = before.slice(colonIdx + 1);
  if (/[\s;()]/.test(partial)) {
    pickerOpen.value = false;
    return;
  }
  pickerQuery.value = partial;
  pickerOpen.value = true;
  activeIndex.value = 0;
  positionPicker(el);
}

function syncPickerQueryFromCursor() {
  const el = textareaRef.value;
  if (el) checkColonTrigger(el);
}

function positionPicker(el: HTMLTextAreaElement) {
  const rect = el.getBoundingClientRect();
  pickerStyle.value = { top: `${rect.bottom + 4}px`, left: `${rect.left}px` };
}

function insertToken(token: SunlikeSqlFieldToken) {
  const el = textareaRef.value;
  if (!el) return;
  const pos = el.selectionStart ?? 0;
  const val = el.value;
  const before = val.slice(0, pos);
  const colonIdx = before.lastIndexOf(':');
  if (colonIdx === -1) return;
  const after = val.slice(pos);
  const insertText = token.token;
  const next = val.slice(0, colonIdx + 1) + insertText + after;
  emit('update:modelValue', next);
  pickerOpen.value = false;
  nextTick(() => {
    const newPos = colonIdx + 1 + insertText.length;
    el.focus();
    el.setSelectionRange(newPos, newPos);
  });
}

function onKeydown(e: KeyboardEvent) {
  if (!pickerOpen.value || !filteredTokens.value.length) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeIndex.value = Math.min(activeIndex.value + 1, filteredTokens.value.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeIndex.value = Math.max(activeIndex.value - 1, 0);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    insertToken(filteredTokens.value[activeIndex.value]);
  } else if (e.key === 'Escape') {
    pickerOpen.value = false;
  }
}

function flatIndex(token: SunlikeSqlFieldToken): number {
  return filteredTokens.value.findIndex((t) => t.token === token.token);
}
</script>

<template>
  <div class="sunlike-sql-editor">
    <p v-if="meta" class="sunlike-sql-editor__hint">
      字段引用：表头 <strong>M.字段</strong>（{{ meta.headTable }}），表身
      <strong>T.字段</strong>（{{ meta.lineTable }}）。键入 <strong>:</strong> 后选字段，例：
      <code>SELECT REM FROM PRDT WHERE PRD_NO=:T.PRD_NO</code>
    </p>
    <textarea
      ref="textareaRef"
      class="sunlike-sql-editor__area"
      :rows="rows ?? 5"
      :value="modelValue"
      spellcheck="false"
      placeholder="SELECT REM FROM PRDT WHERE PRD_NO=:T.PRD_NO"
      @input="onInput"
      @keydown="onKeydown"
      @click="syncPickerQueryFromCursor"
    />
    <p v-if="translatedPreview" class="sunlike-sql-editor__preview">
      翻译后 SQL：<code>{{ translatedPreview }}</code>
    </p>

    <teleport to="body">
      <div
        v-if="pickerOpen && filteredTokens.length"
        class="sunlike-sql-picker"
        :style="pickerStyle"
        @mousedown.prevent
      >
        <div v-if="headTokens.length" class="sunlike-sql-picker__group">
          <div class="sunlike-sql-picker__title">表头 M · {{ meta?.headTable }}</div>
          <button
            v-for="t in headTokens"
            :key="t.token"
            type="button"
            class="sunlike-sql-picker__item"
            :class="{ 'is-active': flatIndex(t) === activeIndex }"
            @click="insertToken(t)"
          >
            <span class="sunlike-sql-picker__token">:{{ t.token }}</span>
            <span class="sunlike-sql-picker__label">{{ t.label }}</span>
          </button>
        </div>
        <div v-if="lineTokens.length" class="sunlike-sql-picker__group">
          <div class="sunlike-sql-picker__title">表身 T · {{ meta?.lineTable }}</div>
          <button
            v-for="t in lineTokens"
            :key="t.token"
            type="button"
            class="sunlike-sql-picker__item"
            :class="{ 'is-active': flatIndex(t) === activeIndex }"
            @click="insertToken(t)"
          >
            <span class="sunlike-sql-picker__token">:{{ t.token }}</span>
            <span class="sunlike-sql-picker__label">{{ t.label }}</span>
          </button>
        </div>
      </div>
    </teleport>
  </div>
</template>

<style scoped>
.sunlike-sql-editor__hint {
  margin: 0 0 8px;
  font-size: 12px;
  line-height: 1.6;
  color: #86909c;
}
.sunlike-sql-editor__hint code {
  padding: 0 4px;
  background: #f2f3f5;
  border-radius: 4px;
  font-size: 11px;
}
.sunlike-sql-editor__area {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  border: 1px solid #e5e6eb;
  border-radius: 4px;
  resize: vertical;
}
.sunlike-sql-editor__area:focus {
  outline: none;
  border-color: #165dff;
  box-shadow: 0 0 0 2px rgba(22, 93, 255, 0.12);
}
.sunlike-sql-editor__preview {
  margin: 8px 0 0;
  font-size: 12px;
  color: #4e5969;
  word-break: break-all;
}
.sunlike-sql-editor__preview code {
  color: #165dff;
}
</style>

<style>
.sunlike-sql-picker {
  position: fixed;
  z-index: 4000;
  width: 320px;
  max-height: 280px;
  overflow: auto;
  background: #fff;
  border: 1px solid #e5e6eb;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(29, 33, 41, 0.12);
  padding: 4px 0;
}
.sunlike-sql-picker__group + .sunlike-sql-picker__group {
  border-top: 1px solid #f2f3f5;
  margin-top: 4px;
  padding-top: 4px;
}
.sunlike-sql-picker__title {
  padding: 4px 12px;
  font-size: 11px;
  font-weight: 600;
  color: #86909c;
}
.sunlike-sql-picker__item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 12px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font-size: 13px;
}
.sunlike-sql-picker__item:hover,
.sunlike-sql-picker__item.is-active {
  background: rgba(22, 93, 255, 0.08);
}
.sunlike-sql-picker__token {
  font-family: Consolas, monospace;
  color: #165dff;
  font-size: 12px;
}
.sunlike-sql-picker__label {
  color: #4e5969;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
