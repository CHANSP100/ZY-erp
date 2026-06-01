<script setup lang="ts">
import { inject, nextTick, ref, watch } from 'vue';
import {
  filterLookupRows,
  formatLookupRowLabel,
  resolveLookupEntry,
} from '@/utils/lookupFilter';
import {
  ENTER_NAV_KEY,
  focusNextInEnterNavZone,
  type EnterNavJumpOptions,
} from '@/composables/useFormEnterNav';

type SuggestItem = { value: string; row: Record<string, unknown> };

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    display?: string;
    placeholder?: string;
    disabled?: boolean;
    data?: Record<string, unknown>[];
    searchKeys?: string[];
    rowKey?: string;
    valueKey?: string;
    suggestLimit?: number;
    resolveByCode?: (code: string) => Promise<Record<string, unknown> | null | undefined>;
  }>(),
  {
    suggestLimit: 20,
  }
);

const emit = defineEmits<{
  'update:modelValue': [string];
  open: [];
  openDialog: [keyword: string];
  focus: [];
  select: [Record<string, unknown>];
}>();

const enterNav = inject<EnterNavJumpOptions | null>(ENTER_NAV_KEY, null);

const rootRef = ref<HTMLElement | null>(null);
const inputText = ref('');
const isFocused = ref(false);
const panelOpen = ref(false);
/** 联想选中 / 弹窗回填时，避免把展示文案写回 v-model */
const suppressInputEmit = ref(false);
let blurTimer: ReturnType<typeof setTimeout> | null = null;

const vk = () => props.valueKey || props.rowKey || 'id';
const sk = () => (props.searchKeys?.length ? props.searchKeys : [vk()]);

function inputEl(): HTMLInputElement | null {
  return rootRef.value?.querySelector('input');
}

function displayText() {
  return props.display ?? props.modelValue ?? '';
}

function syncDisplayFromProps() {
  if (!isFocused.value) {
    inputText.value = displayText();
  }
}

watch(() => props.display, syncDisplayFromProps, { immediate: true });

/** 弹窗选取等外部回填：聚焦中也要把编码/名称同步到输入框 */
watch(
  () => props.modelValue,
  (val, prev) => {
    if (val === prev) return;
    if (blurTimer) {
      clearTimeout(blurTimer);
      blurTimer = null;
    }
    const showing = displayText();
    if (!isFocused.value || !inputText.value.trim()) {
      inputText.value = showing;
      isFocused.value = false;
      panelOpen.value = false;
      return;
    }
    const typed = inputText.value.trim();
    if (typed !== val && typed !== showing) {
      inputText.value = showing;
      isFocused.value = false;
      panelOpen.value = false;
    }
  },
  { immediate: true }
);

function isAutocompletePanelOpen(): boolean {
  return !!document.querySelector('.el-autocomplete__popper[aria-hidden="false"]');
}

function onFocus() {
  if (blurTimer) {
    clearTimeout(blurTimer);
    blurTimer = null;
  }
  isFocused.value = true;
  inputText.value = props.modelValue ?? props.display ?? inputText.value;
  emit('focus');
}

function querySearch(queryString: string, cb: (items: SuggestItem[]) => void) {
  const rows = props.data ?? [];
  panelOpen.value = true;
  if (!rows.length) {
    cb([]);
    return;
  }
  const filtered = filterLookupRows(rows, queryString, sk(), props.suggestLimit);
  cb(
    filtered.map((row) => ({
      value: formatLookupRowLabel(row, vk(), sk()),
      row,
    }))
  );
}

async function applyRow(row: Record<string, unknown>, jumpNext = false) {
  if (blurTimer) {
    clearTimeout(blurTimer);
    blurTimer = null;
  }
  suppressInputEmit.value = true;
  const val = String(row[vk()] ?? '');
  emit('update:modelValue', val);
  emit('select', row);
  inputText.value = formatLookupRowLabel(row, vk(), sk());
  isFocused.value = false;
  panelOpen.value = false;
  await nextTick();
  suppressInputEmit.value = false;
  if (jumpNext) {
    const el = inputEl();
    if (el) await focusNextInEnterNavZone(el, enterNav);
  }
}

async function onSuggestSelect(item: SuggestItem) {
  await applyRow(item.row, true);
}

async function runResolve(jumpNext: boolean) {
  if (props.disabled) return;
  const typed = inputText.value.trim();
  const result = await resolveLookupEntry(
    typed,
    props.data ?? [],
    vk(),
    props.resolveByCode
  );
  if (result.kind === 'selected') {
    await applyRow(result.row, jumpNext);
    return;
  }
  emit('openDialog', result.keyword);
}

async function onEnterKey(e: KeyboardEvent) {
  if (props.disabled) return;
  if (isAutocompletePanelOpen()) return;
  e.preventDefault();
  e.stopPropagation();
  await runResolve(true);
}

async function runBlurResolve() {
  if (suppressInputEmit.value) return;
  isFocused.value = false;
  const typed = inputText.value.trim();
  if (!typed) {
    if (props.modelValue?.trim()) {
      inputText.value = displayText();
      return;
    }
    emit('update:modelValue', '');
    inputText.value = '';
    return;
  }
  const result = await resolveLookupEntry(
    typed,
    props.data ?? [],
    vk(),
    props.resolveByCode
  );
  if (result.kind === 'selected') {
    await applyRow(result.row, false);
    return;
  }
  inputText.value = displayText();
}

function onBlur() {
  panelOpen.value = false;
  if (blurTimer) clearTimeout(blurTimer);
  blurTimer = setTimeout(() => {
    blurTimer = null;
    void runBlurResolve();
  }, 120);
}

function onInput(val: string) {
  inputText.value = val;
  if (!suppressInputEmit.value) {
    emit('update:modelValue', val);
  }
}
</script>

<template>
  <div ref="rootRef" class="lookup-field">
    <el-autocomplete
      v-model="inputText"
      class="lookup-field__input"
      :placeholder="placeholder"
      :disabled="disabled"
      :fetch-suggestions="querySearch"
      :trigger-on-focus="!!(data && data.length)"
      :debounce="120"
      clearable
      highlight-first-item
      value-key="value"
      @select="onSuggestSelect"
      @focus="onFocus"
      @blur="onBlur"
      @update:model-value="onInput"
      @keydown.enter="onEnterKey"
    />
    <el-button class="lookup-field__btn" :disabled="disabled" @click="!disabled && $emit('open')">
      …
    </el-button>
  </div>
</template>

<style scoped>
.lookup-field {
  display: flex;
  width: 100%;
  align-items: stretch;
}

.lookup-field__input {
  flex: 1;
  min-width: 0;
}

.lookup-field__input :deep(.el-input) {
  width: 100%;
}

.lookup-field__btn {
  flex-shrink: 0;
  padding: 8px 12px;
}
</style>
