<script setup lang="ts" generic="T extends Record<string, unknown>">
import { computed, nextTick, onUnmounted, ref, toRef, watch } from 'vue';
import { ElMessage } from 'element-plus';
import LookupDialogHeaderMenu from '@/components/LookupDialogHeaderMenu.vue';
import { useLookupDialogColumns } from '@/composables/useLookupDialogColumns';
import { resolveColumnSettingsKey } from '@/config/lookups/helpers';
import type { LookupColumn, LookupInteraction } from '@/types/lookup';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title: string;
    rowKey: string;
    columns: LookupColumn[];
    /** 写入 v-model 的字段名，列显示设置中不可隐藏 */
    valueKey?: string;
    /** 弹窗表头右键「列显示设置」持久化键；未传则按 valueKey 大写自动生成 */
    columnSettingsKey?: string;
    /** 是否启用表头右键列显示设置（默认 true） */
    enableColumnSettings?: boolean;
    /** 静态列表；与 loader 二选一，打开时 loader 会覆盖 */
    data?: T[];
    searchKeys?: string[];
    dialogClass?: string;
    width?: number | string;
    multiple?: boolean;
    interaction?: LookupInteraction;
    loading?: boolean;
    loader?: () => Promise<T[]>;
    loadErrorMessage?: string;
    /** 打开弹窗时预填搜索关键字（Enter 未命中时带入） */
    initialKeyword?: string;
  }>(),
  {
    data: () => [],
    dialogClass: 'kd-so-dialog',
    width: 720,
    interaction: 'click',
    loadErrorMessage: '数据加载失败',
    enableColumnSettings: true,
  }
);

const emit = defineEmits<{
  'update:modelValue': [boolean];
  select: [T];
  confirm: [T[]];
}>();

const keyword = ref('');
const selectedRows = ref<T[]>([]);
const selectedRow = ref<T | null>(null);
const rows = ref<T[]>([]);
const innerLoading = ref(false);
const tableRef = ref<{ setCurrentRow: (row: T) => void; $el?: HTMLElement } | null>(null);
const highlightIndex = ref(-1);

const effectiveValueKey = computed(() => props.valueKey || props.rowKey);

const effectiveColumnSettingsKey = computed(() =>
  resolveColumnSettingsKey(undefined, {
    columnSettingsKey: props.columnSettingsKey,
    valueKey: effectiveValueKey.value,
    rowKey: props.rowKey,
  })
);

const columnSettingsEnabledFlag = computed(() => props.enableColumnSettings !== false);

const {
  columnStates,
  visibleColumns,
  headerMenu,
  columnSettingsEnabled,
  openHeaderMenu,
  openColumnPanel,
  closeMenus,
  toggleColumn,
} = useLookupDialogColumns(
  effectiveColumnSettingsKey,
  toRef(props, 'columns'),
  effectiveValueKey,
  columnSettingsEnabledFlag
);

const displayColumns = computed(() =>
  columnSettingsEnabled.value ? visibleColumns.value : props.columns
);

async function reloadRows() {
  if (props.loader) {
    innerLoading.value = true;
    try {
      rows.value = await props.loader();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      ElMessage.error(err.response?.data?.error || props.loadErrorMessage);
      rows.value = [];
    } finally {
      innerLoading.value = false;
    }
  } else {
    rows.value = [...(props.data ?? [])];
  }
}

const tableLoading = computed(() => props.loading || innerLoading.value);
const isConfirmMode = computed(() => props.interaction === 'confirm' && !props.multiple);

function bindDialogKeydown() {
  document.addEventListener('keydown', onDialogKeydown, true);
}

function unbindDialogKeydown() {
  document.removeEventListener('keydown', onDialogKeydown, true);
}

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) {
      unbindDialogKeydown();
      closeMenus();
      highlightIndex.value = -1;
      return;
    }
    bindDialogKeydown();
    keyword.value = props.initialKeyword ?? '';
    selectedRows.value = [];
    selectedRow.value = null;
    await reloadRows();
    resetHighlight();
  }
);

onUnmounted(unbindDialogKeydown);

defineExpose({ reload: reloadRows });

watch(
  () => props.data,
  (list) => {
    if (props.modelValue && !props.loader) {
      rows.value = [...(list ?? [])];
    }
  },
  { deep: true }
);

const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase();
  if (!q) return rows.value;
  const keys = props.searchKeys?.length ? props.searchKeys : props.columns.map((c) => c.prop);
  return rows.value.filter((row) =>
    keys.some((k) => String(row[k] ?? '').toLowerCase().includes(q))
  );
});

function resetHighlight() {
  highlightIndex.value = filtered.value.length > 0 ? 0 : -1;
  syncTableCurrentRow();
}

function syncTableCurrentRow() {
  nextTick(() => {
    const row = filtered.value[highlightIndex.value];
    if (row) tableRef.value?.setCurrentRow(row);
  });
}

function scrollHighlightIntoView() {
  nextTick(() => {
    const el = tableRef.value?.$el?.querySelector('.current-row');
    el?.scrollIntoView({ block: 'nearest' });
  });
}

watch(filtered, (list) => {
  if (!props.modelValue) return;
  if (highlightIndex.value >= list.length) {
    resetHighlight();
  } else {
    syncTableCurrentRow();
  }
});

function onDialogKeydown(e: KeyboardEvent) {
  if (!props.modelValue || props.multiple) return;
  if (!(e.target as HTMLElement | null)?.closest('.el-overlay-dialog, .el-dialog')) return;
  const list = filtered.value;
  if (!list.length) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    highlightIndex.value =
      highlightIndex.value < 0 ? 0 : Math.min(highlightIndex.value + 1, list.length - 1);
    syncTableCurrentRow();
    scrollHighlightIntoView();
    return;
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault();
    highlightIndex.value = Math.max(highlightIndex.value <= 0 ? 0 : highlightIndex.value - 1, 0);
    syncTableCurrentRow();
    scrollHighlightIntoView();
    return;
  }

  if (e.key !== 'Enter') return;

  const row = list[highlightIndex.value];
  if (!row) return;

  if (isConfirmMode.value) {
    e.preventDefault();
    selectedRow.value = row;
    onConfirmPick();
    return;
  }

  const inSearch = (e.target as HTMLElement | null)?.closest('.kd-so-dialog-search');
  if (inSearch && list.length > 1) return;

  e.preventDefault();
  onRowClick(row);
}

function close() {
  closeMenus();
  emit('update:modelValue', false);
}

function onRowClick(row: T) {
  if (props.multiple) return;
  const idx = filtered.value.indexOf(row);
  if (idx >= 0) highlightIndex.value = idx;
  if (isConfirmMode.value) {
    selectedRow.value = row;
    return;
  }
  emit('select', row);
  close();
}

function onRowDblclick(row: T) {
  if (props.multiple || !isConfirmMode.value) return;
  selectedRow.value = row;
  onConfirmPick();
}

function onConfirmPick() {
  if (!selectedRow.value) {
    ElMessage.warning('请先选择一行');
    return;
  }
  emit('select', selectedRow.value);
  close();
}

function onSelectionChange(selection: T[]) {
  selectedRows.value = selection;
}

function onConfirmMultiple() {
  if (!selectedRows.value.length) return;
  emit('confirm', [...selectedRows.value] as T[]);
  close();
}

function onHeaderContextmenu(_column: unknown, e: MouseEvent) {
  if (!columnSettingsEnabled.value) return;
  e.preventDefault();
  openHeaderMenu(e);
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    :width="width"
    destroy-on-close
    :class="dialogClass"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-input v-model="keyword" class="kd-so-dialog-search" placeholder="模糊查询" clearable />
    <el-table
      ref="tableRef"
      v-loading="tableLoading"
      :data="filtered"
      :row-key="rowKey"
      height="360"
      :highlight-current-row="!multiple"
      size="small"
      border
      stripe
      @row-click="onRowClick"
      @row-dblclick="onRowDblclick"
      @selection-change="onSelectionChange"
      @header-contextmenu="onHeaderContextmenu"
    >
      <el-table-column v-if="multiple" type="selection" width="44" />
      <el-table-column
        v-for="col in displayColumns"
        :key="col.prop"
        :prop="col.prop"
        :label="col.label"
        :width="col.width"
        :min-width="col.minWidth"
        show-overflow-tooltip
      />
    </el-table>

    <LookupDialogHeaderMenu
      :header-menu="headerMenu"
      :columns="columnStates"
      @open-column-panel="openColumnPanel"
      @back-to-main="headerMenu.panel = 'main'"
      @toggle-column="toggleColumn"
    />

    <template #footer>
      <slot name="footer-before" />
      <el-button @click="close">取消</el-button>
      <el-button v-if="isConfirmMode" type="primary" :disabled="!selectedRow" @click="onConfirmPick">
        选取
      </el-button>
      <el-button
        v-else-if="multiple"
        type="primary"
        :disabled="!selectedRows.length"
        @click="onConfirmMultiple"
      >
        确定（{{ selectedRows.length }}）
      </el-button>
    </template>
  </el-dialog>
</template>
