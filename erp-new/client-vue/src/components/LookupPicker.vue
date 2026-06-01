<script setup lang="ts" generic="T extends Record<string, unknown>">
/**
 * 开窗一体化：可输入 + 联想 + Enter 校验 + 「…」弹窗
 */
import { computed, onMounted, ref, watch } from 'vue';
import LookupField from '@/components/LookupField.vue';
import LookupDialog from '@/components/LookupDialog.vue';
import { resolveLookupConfig } from '@/config/lookups';
import type { LookupConfig, LookupPresetKey } from '@/types/lookup';

const props = defineProps<{
  modelValue?: string;
  display?: string;
  placeholder?: string;
  disabled?: boolean;
  preset?: LookupPresetKey;
  config?: Partial<LookupConfig>;
  data?: T[];
  bindValue?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [string];
  select: [T];
  confirm: [T[]];
}>();

const open = ref(false);
const dialogKeyword = ref('');
const rows = ref<T[]>([]);
const rowsLoading = ref(false);
const rowsLoaded = ref(false);

const resolved = computed(() => resolveLookupConfig(props.preset, props.config));

const dialogTitle = computed(() => resolved.value?.title ?? '请选择');
const rowKey = computed(() => resolved.value?.rowKey ?? 'id');
const valueKey = computed(() => resolved.value?.valueKey ?? rowKey.value);
const columns = computed(() => resolved.value?.columns ?? []);
const searchKeys = computed(() => resolved.value?.searchKeys ?? [valueKey.value]);
const interaction = computed(() => resolved.value?.interaction ?? 'click');
const dialogWidth = computed(() => resolved.value?.width ?? 720);
const dialogClass = computed(() => resolved.value?.dialogClass ?? 'kd-so-dialog');
const loader = computed(() => resolved.value?.loader as (() => Promise<T[]>) | undefined);
const loadErrorMessage = computed(() => resolved.value?.loadErrorMessage);
const multiple = computed(() => resolved.value?.multiple ?? false);
const resolveByCode = computed(() => resolved.value?.resolveByCode);
const columnSettingsKey = computed(() => resolved.value?.columnSettingsKey);
const enableColumnSettings = computed(() => resolved.value?.enableColumnSettings);

async function ensureRows() {
  if (props.data?.length) {
    rows.value = [...props.data];
    return;
  }
  const fn = loader.value;
  if (!fn || rowsLoaded.value) return;
  rowsLoading.value = true;
  try {
    rows.value = await fn();
    rowsLoaded.value = true;
  } catch {
    rows.value = [];
  } finally {
    rowsLoading.value = false;
  }
}

watch(
  () => props.data,
  (list) => {
    if (list?.length) rows.value = [...list];
  },
  { deep: true }
);

onMounted(() => {
  void ensureRows();
});

function openDialog(keyword = '') {
  if (!resolved.value) {
    console.warn('[LookupPicker] 缺少 preset 或 config.title');
    return;
  }
  dialogKeyword.value = keyword;
  void ensureRows().then(() => {
    open.value = true;
  });
}

function onOpenButton() {
  openDialog('');
}

function pickValue(row: T): string {
  const v = row[valueKey.value as keyof T];
  return v == null ? '' : String(v);
}

function onSelect(row: T) {
  if (props.bindValue !== false) {
    emit('update:modelValue', pickValue(row));
  }
  emit('select', row);
  open.value = false;
}

function onConfirm(rows: T[]) {
  if (rows.length === 1) {
    onSelect(rows[0]!);
  }
  emit('confirm', rows);
}
</script>

<template>
  <LookupField
    :model-value="modelValue"
    :display="display"
    :placeholder="placeholder"
    :disabled="disabled"
    :data="(rows as Record<string, unknown>[])"
    :search-keys="searchKeys"
    :row-key="rowKey"
    :value-key="valueKey"
    :resolve-by-code="resolveByCode"
    @update:model-value="emit('update:modelValue', $event)"
    @focus="ensureRows()"
    @open="onOpenButton"
    @open-dialog="openDialog"
    @select="(row) => onSelect(row as T)"
  />
  <LookupDialog
    v-if="resolved"
    v-model="open"
    :title="dialogTitle"
    :row-key="rowKey"
    :columns="columns"
    :data="rows"
    :search-keys="searchKeys"
    :initial-keyword="dialogKeyword"
    :dialog-class="dialogClass"
    :width="dialogWidth"
    :interaction="interaction"
    :multiple="multiple"
    :loader="loader"
    :loading="rowsLoading"
    :load-error-message="loadErrorMessage"
    :value-key="valueKey"
    :column-settings-key="columnSettingsKey"
    :enable-column-settings="enableColumnSettings"
    @select="onSelect"
    @confirm="onConfirm"
  >
    <template #footer-before>
      <slot name="dialog-footer-before" />
    </template>
  </LookupDialog>
</template>
