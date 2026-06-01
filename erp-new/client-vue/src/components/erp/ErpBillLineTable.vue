<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { ElMessageBox } from 'element-plus';
import LookupField from '@/components/LookupField.vue';
import { getLookupDialogProps } from '@/config/lookups';
import LookupDialog from '@/components/LookupDialog.vue';
import ExtFieldControl from '@/components/erp/ExtFieldControl.vue';
import type { ErpFieldMeta } from '@/config/fields/types';
import { useExtFieldColumns, useExtFieldSelectOptions } from '@/composables/useExtFieldColumns';
import { useBillExtFieldReload } from '@/composables/billExtFieldReload';
import { useBillLineWhLookup } from '@/composables/useBillLineWhLookup';
import {
  buildBillLinePastePatches,
  countBillLineRowsToAdd,
  isMultiCellClipboard,
  parseClipboardGrid,
  pasteColumnsFromFields,
  type BillLinePasteColumn,
} from '@/utils/billLinePaste';
import { resolveLineProductByCode } from '@/utils/billLineProductLookup';
import { resolveWhByCode } from '@/utils/billLineWhLookup';
import {
  collectPastedLookupCells,
  pasteCellKey,
  validatePastedLookupBatch,
  type PastedLookupCell,
} from '@/utils/billLinePasteLookup';
import { lineExtFieldPatch, lineExtFieldValue } from '@/utils/extFieldRuntime';

const props = defineProps<{
  fields: ErpFieldMeta[];
  lines: Record<string, unknown>[];
  whs?: { wh: string; name?: string }[];
  lookupProducts?: Record<string, unknown>[];
  lookupResolveByCode?: (code: string) => Promise<Record<string, unknown> | null | undefined>;
  lookupResolveWhByCode?: (code: string) => Promise<Record<string, unknown> | null | undefined>;
  readonly?: boolean;
  /** 传入菜单代号时加载表身扩展列 */
  menuCode?: string;
}>();

const emit = defineEmits<{
  updateLine: [index: number, patch: Record<string, unknown>];
  addLines: [count: number];
  openProductPicker: [index: number];
  selectProduct: [index: number, row: Record<string, unknown>];
}>();

const pasteAnchor = ref<{ rowIndex: number; fieldKey: string } | null>(null);
const pasteInvalidCells = ref<Set<string>>(new Set());
const whPickerOpen = ref(false);
const whPickerIdx = ref<number | null>(null);
const whPickerKeyword = ref('');
const tableRef = ref<{ $el?: HTMLElement } | null>(null);

const {
  whLookupRows,
  loadWhMaster,
  loadWhForDialog,
  whLabel: formatWhLabel,
  effectiveWhs,
} = useBillLineWhLookup(() => props.whs);

const { columns: extColumns, reload: reloadExt } = useExtFieldColumns(props.menuCode || '', 'line');
const { tableOptions, tableLoading, preloadForColumns } = useExtFieldSelectOptions();

const productResolveByCode = computed(
  () => props.lookupResolveByCode ?? resolveLineProductByCode
);

const whResolveByCode = computed(
  () => props.lookupResolveWhByCode ?? resolveWhByCode
);

function whLabel(wh: string) {
  return formatWhLabel(wh);
}

async function openWhPicker(index: number, keyword?: string) {
  if (props.readonly) return;
  await loadWhMaster(true);
  whPickerIdx.value = index;
  whPickerKeyword.value = keyword ?? '';
  whPickerOpen.value = true;
}

function onWhPicked(row: Record<string, unknown>) {
  if (whPickerIdx.value == null || props.readonly) return;
  emit('updateLine', whPickerIdx.value, { wh: String(row.wh ?? '') });
  whPickerOpen.value = false;
  whPickerIdx.value = null;
  whPickerKeyword.value = '';
}

watch(
  () => props.menuCode,
  (code) => {
    if (code) void reloadExt().then(() => preloadForColumns(extColumns.value));
  }
);

watch(extColumns, (cols) => {
  void preloadForColumns(cols);
});

onMounted(() => {
  if (props.menuCode) void reloadExt().then(() => preloadForColumns(extColumns.value));
  void loadWhMaster();
});

useBillExtFieldReload(() => {
  if (!props.menuCode) return;
  return reloadExt().then(() => preloadForColumns(extColumns.value));
});

function colWidth(f: ErpFieldMeta): number | undefined {
  return f.width;
}

function patchExt(index: number, row: Record<string, unknown>, colKey: string, val: unknown) {
  emit('updateLine', index, lineExtFieldPatch(row, colKey, val));
}

const pasteableColumns = computed((): BillLinePasteColumn[] => {
  const cols = pasteColumnsFromFields(props.fields);
  for (const ec of props.menuCode ? extColumns.value : []) {
    cols.push({ key: ec.col_key, isExt: true, extCol: ec });
  }
  return cols;
});

function buildPasteFieldLabels(): Map<string, string> {
  const labels = new Map<string, string>();
  for (const field of props.fields) labels.set(field.key, field.label);
  for (const ec of extColumns.value) labels.set(ec.col_key, ec.label);
  return labels;
}

function setPasteAnchor(rowIndex: number, fieldKey: string) {
  if (!props.readonly) {
    pasteAnchor.value = { rowIndex, fieldKey };
    clearPasteCellInvalid(rowIndex, fieldKey);
  }
}

function isPasteCellInvalid(rowIndex: number, fieldKey: string): boolean {
  return pasteInvalidCells.value.has(pasteCellKey(rowIndex, fieldKey));
}

function clearPasteCellInvalid(rowIndex: number, fieldKey: string) {
  const key = pasteCellKey(rowIndex, fieldKey);
  if (!pasteInvalidCells.value.has(key)) return;
  const next = new Set(pasteInvalidCells.value);
  next.delete(key);
  pasteInvalidCells.value = next;
}

function markPasteCellsInvalid(cells: PastedLookupCell[]) {
  pasteInvalidCells.value = new Set(cells.map((c) => pasteCellKey(c.rowIndex, c.fieldKey)));
}

function clearPastedLookupCell(cell: { rowIndex: number; fieldKey: string; col: BillLinePasteColumn }) {
  if (cell.col.isExt) {
    const row = props.lines[cell.rowIndex] ?? {};
    emit('updateLine', cell.rowIndex, lineExtFieldPatch(row, cell.fieldKey, ''));
    return;
  }
  emit('updateLine', cell.rowIndex, { [cell.fieldKey]: '' });
}

async function focusPasteCell(rowIndex: number, fieldKey: string) {
  await nextTick();
  const root = tableRef.value?.$el;
  if (!root) return;
  const cell = root.querySelector(
    `[data-paste-row="${rowIndex}"][data-paste-field="${CSS.escape(fieldKey)}"]`
  );
  const focusable = cell?.querySelector(
    'input, textarea, .el-select__wrapper, .lookup-field__input input'
  ) as HTMLElement | null;
  focusable?.focus();
}

async function validatePastedLookups(
  grid: string[][],
  cols: BillLinePasteColumn[],
  startRow: number,
  startCol: number
): Promise<boolean> {
  pasteInvalidCells.value = new Set();
  const lookupCells = collectPastedLookupCells(
    grid,
    cols,
    startRow,
    startCol,
    buildPasteFieldLabels()
  );
  if (!lookupCells.length) return true;

  const { invalid, selectedProducts } = await validatePastedLookupBatch(lookupCells, {
    lookupProducts: props.lookupProducts,
    lookupResolveByCode: productResolveByCode.value,
    lookupResolveWhByCode: whResolveByCode.value,
    whs: effectiveWhs.value,
    tableOptions: tableOptions.value,
  });

  for (const hit of selectedProducts) {
    emit('selectProduct', hit.rowIndex, hit.row);
  }

  if (!invalid.length) return true;

  for (const cell of invalid) {
    clearPastedLookupCell(cell);
  }
  markPasteCellsInvalid(invalid);

  const detail = invalid
    .map((c) => `第 ${c.rowIndex + 1} 行 ${c.label}「${c.value}」`)
    .join('\n');
  await ElMessageBox.alert(`以下栏位值不存在，请重新输入：\n${detail}`, '提示', {
    type: 'warning',
    confirmButtonText: '确定',
  });
  await focusPasteCell(invalid[0].rowIndex, invalid[0].fieldKey);
  return false;
}

async function onTablePaste(e: ClipboardEvent) {
  if (props.readonly || !pasteAnchor.value) return;
  const text = e.clipboardData?.getData('text/plain') ?? '';
  if (!isMultiCellClipboard(text)) return;

  const cols = pasteableColumns.value;
  const startCol = cols.findIndex((c) => c.key === pasteAnchor.value!.fieldKey);
  if (startCol < 0) return;

  e.preventDefault();
  const grid = parseClipboardGrid(text);
  const startRow = pasteAnchor.value.rowIndex;
  const patches = buildBillLinePastePatches(
    grid,
    cols,
    startRow,
    startCol,
    props.lines
  );
  if (!patches.length) return;

  const toAdd = countBillLineRowsToAdd(props.lines.length, startRow, patches.length);
  if (toAdd > 0) emit('addLines', toAdd);

  for (let i = 0; i < patches.length; i++) {
    emit('updateLine', startRow + i, patches[i]);
  }
  await validatePastedLookups(grid, cols, startRow, startCol);
}
</script>

<template>
  <div class="kd-bill-line-table-wrap" @paste="onTablePaste">
    <el-table
      ref="tableRef"
      :data="lines"
      size="small"
      border
      class="erp-table kd-so-line-table"
      max-height="360"
    >
      <el-table-column type="index" label="序" width="48" />
      <el-table-column
        v-for="col in fields"
        :key="col.dbField"
        :prop="col.key"
        :label="col.label"
        :width="colWidth(col)"
        :min-width="col.minWidth"
        show-overflow-tooltip
      >
        <template #header>
          <span :data-field="col.dbField" :title="col.dbField">{{ col.label }}</span>
        </template>
        <template #default="{ row, $index }">
          <div
            v-if="col.key === 'prd_no'"
            class="kd-bill-line-table__paste-cell"
            :class="{ 'is-paste-invalid': isPasteCellInvalid($index, col.key) }"
            :data-paste-row="$index"
            :data-paste-field="col.key"
          >
            <LookupField
              :model-value="String(row.prd_no || '')"
              :display="String(row.prd_no || '')"
              :disabled="readonly"
              :data="lookupProducts"
              :search-keys="['prd_no', 'name', 'spc']"
              row-key="prd_no"
              value-key="prd_no"
              :resolve-by-code="productResolveByCode"
              @focus="setPasteAnchor($index, col.key)"
              @select="(r) => !readonly && emit('selectProduct', $index, r)"
              @open="!readonly && emit('openProductPicker', $index)"
            />
          </div>
          <div
            v-else-if="col.key === 'wh'"
            class="kd-bill-line-table__paste-cell"
            :class="{ 'is-paste-invalid': isPasteCellInvalid($index, col.key) }"
            :data-paste-row="$index"
            :data-paste-field="col.key"
          >
            <LookupField
              :model-value="String(row.wh || '')"
              :display="whLabel(String(row.wh || ''))"
              :disabled="readonly"
              :data="whLookupRows"
              :search-keys="['wh', 'name']"
              row-key="wh"
              value-key="wh"
              :resolve-by-code="whResolveByCode"
              @focus="setPasteAnchor($index, col.key)"
              @update:model-value="(v) => !readonly && emit('updateLine', $index, { wh: v })"
              @select="(r) => !readonly && emit('updateLine', $index, { wh: String(r.wh ?? '') })"
              @open-dialog="(kw) => openWhPicker($index, kw)"
              @open="openWhPicker($index)"
            />
          </div>
          <div
            v-else-if="col.widget === 'number' && !col.readonly && !readonly"
            class="kd-bill-line-table__paste-cell"
            :class="{ 'is-paste-invalid': isPasteCellInvalid($index, col.key) }"
            :data-paste-row="$index"
            :data-paste-field="col.key"
          >
            <el-input-number
              :model-value="Number(row[col.key] ?? 0)"
              size="small"
              :min="0"
              :step="col.key === 'up' ? 0.01 : 1"
              controls-position="right"
              style="width: 100%"
              @focus="setPasteAnchor($index, col.key)"
              @update:model-value="emit('updateLine', $index, { [col.key]: Number($event) || 0 })"
            />
          </div>
          <div
            v-else-if="col.widget === 'date' && !col.readonly && !readonly"
            class="kd-bill-line-table__paste-cell"
            :class="{ 'is-paste-invalid': isPasteCellInvalid($index, col.key) }"
            :data-paste-row="$index"
            :data-paste-field="col.key"
          >
            <el-date-picker
              :model-value="row[col.key]"
              type="date"
              value-format="YYYY-MM-DD"
              size="small"
              style="width: 100%"
              @focus="setPasteAnchor($index, col.key)"
              @update:model-value="emit('updateLine', $index, { [col.key]: $event || '' })"
            />
          </div>
          <div
            v-else-if="(col.widget === 'input' || col.widget === 'textarea') && !readonly"
            class="kd-bill-line-table__paste-cell"
            :class="{ 'is-paste-invalid': isPasteCellInvalid($index, col.key) }"
            :data-paste-row="$index"
            :data-paste-field="col.key"
          >
            <el-input
              :model-value="String(row[col.key] ?? '')"
              size="small"
              @focus="setPasteAnchor($index, col.key)"
              @update:model-value="emit('updateLine', $index, { [col.key]: String($event) })"
            />
          </div>
          <span v-else>{{ row[col.key] }}</span>
        </template>
      </el-table-column>
      <el-table-column
        v-for="ec in menuCode ? extColumns : []"
        :key="ec.col_key"
        :label="ec.label"
        :width="ec.width ?? 110"
        :min-width="ec.min_width ?? 96"
        show-overflow-tooltip
      >
        <template #header>
          <span :title="ec.col_key">{{ ec.label }}</span>
        </template>
        <template #default="{ row, $index }">
          <div
            class="kd-bill-line-table__paste-cell"
            :class="{ 'is-paste-invalid': isPasteCellInvalid($index, ec.col_key) }"
            :data-paste-row="$index"
            :data-paste-field="ec.col_key"
          >
            <ExtFieldControl
              :model-value="lineExtFieldValue(row, ec.col_key)"
              :col="ec"
              :readonly="readonly"
              size="small"
              :table-options="tableOptions"
              :table-loading="tableLoading"
              @focus="setPasteAnchor($index, ec.col_key)"
              @update:model-value="patchExt($index, row, ec.col_key, $event)"
            />
          </div>
        </template>
      </el-table-column>
      <el-table-column label="" width="52" fixed="right">
        <template #default="{ $index }">
          <slot name="actions" :index="$index" />
        </template>
      </el-table-column>
    </el-table>
    <LookupDialog
      v-model="whPickerOpen"
      v-bind="getLookupDialogProps('warehouse', { loader: loadWhForDialog, loadErrorMessage: '仓库加载失败' })"
      :initial-keyword="whPickerKeyword"
      @select="onWhPicked"
    />
  </div>
</template>

<style scoped>
.kd-bill-line-table__paste-cell.is-paste-invalid :deep(.el-input__wrapper),
.kd-bill-line-table__paste-cell.is-paste-invalid :deep(.el-select__wrapper),
.kd-bill-line-table__paste-cell.is-paste-invalid :deep(.lookup-field .el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-color-danger) inset;
}
</style>
