<script setup lang="ts">
/**
 * 金蝶单据表身明细表。
 * 调用方必须传入 menuCode（:menu-code），否则表头右键「列显示设置」、列拖拽排序、扩展字段列均不可用。
 */
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { ElMessageBox } from 'element-plus';
import LookupField from '@/components/LookupField.vue';
import { getLookupDialogProps } from '@/config/lookups';
import LookupDialog from '@/components/LookupDialog.vue';
import ExtFieldControl from '@/components/erp/ExtFieldControl.vue';
import DetailGridHeaderMenu from '@/components/erp/DetailGridHeaderMenu.vue';
import type { ErpFieldMeta } from '@/config/fields/types';
import type { DetailGridColumn } from '@/api/types';
import { useDetailGridColumnHeader } from '@/composables/useDetailGridColumnHeader';
import { useExtFieldSelectOptions } from '@/composables/useExtFieldColumns';
import { useBillExtFieldReload } from '@/composables/billExtFieldReload';
import { useBillLineWhLookup } from '@/composables/useBillLineWhLookup';
import { isBillLineGridColumn, resolveLineFieldKey } from '@/utils/detailGridFieldKey';
import {
  buildBillLinePastePatches,
  countBillLineRowsToAdd,
  isMultiCellClipboard,
  parseClipboardGrid,
  pasteColumnsFromBundles,
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
import { fmtNum, fmtQty } from '@/utils/sunlike';
import { lineExtFieldPatch, lineExtFieldValue } from '@/utils/extFieldRuntime';

const props = withDefaults(
  defineProps<{
    fields: ErpFieldMeta[];
    lines: Record<string, unknown>[];
    whs?: { wh: string; name?: string }[];
    /** 表身品号开窗联想候选 */
    lookupProducts?: Record<string, unknown>[];
    lookupResolveByCode?: (code: string) => Promise<Record<string, unknown> | null | undefined>;
    lookupResolveWhByCode?: (code: string) => Promise<Record<string, unknown> | null | undefined>;
    readonly?: boolean;
    /** 菜单代码（必填）：驱动表头右键列显示设置、列序持久化、表身扩展字段列 */
    menuCode: string;
    /** 与订单列表相同：用 detail-grid 列配置（默认 menuCode，销售订单为 InvAD） */
    detailGridMenuCode?: string;
    /** 是否启用表头右键（列显示设置、拖拽排序） */
    enableHeaderMenu?: boolean;
  }>(),
  {
    enableHeaderMenu: true,
  }
);

const emit = defineEmits<{
  updateLine: [index: number, patch: Record<string, unknown>];
  /** 粘贴时行数不足，请增行 count 次（通常绑定 addLine） */
  addLines: [count: number];
  openProductPicker: [index: number, keyword?: string];
  selectProduct: [index: number, row: Record<string, unknown>];
  selectionChange: [number[]];
}>();

const pasteAnchor = ref<{ rowIndex: number; fieldKey: string } | null>(null);
const pasteInvalidCells = ref<Set<string>>(new Set());
const whPickerOpen = ref(false);
const whPickerIdx = ref<number | null>(null);
const whPickerKeyword = ref('');

const {
  whLookupRows,
  loadWhMaster,
  loadWhForDialog,
  whLabel: formatWhLabel,
  effectiveWhs,
} = useBillLineWhLookup(() => props.whs);

const selected = ref<number[]>([]);
const gridMenuCode = computed(() => props.detailGridMenuCode || props.menuCode || '');
const fieldKeySet = computed(
  () => new Set(props.fields.filter((f) => f.widget !== 'hidden').map((f) => f.key))
);

const { tableOptions, tableLoading, preloadForColumns } = useExtFieldSelectOptions();

const {
  visibleColumns,
  panelColumns,
  tableRef,
  headerMenu,
  dragSourceColKey,
  dragOverColKey,
  closeMenus,
  openHeaderMenu,
  onHeaderContextmenu,
  openColumnPanel,
  toggleColumn,
  removeCustomCol,
  onColHeaderMouseDown,
  onHeaderDragEnd,
  loadColumns,
  isAdmin,
} = useDetailGridColumnHeader({
  menuCode: gridMenuCode,
  enabled: computed(() => props.enableHeaderMenu && Boolean(gridMenuCode.value)),
  panelColumnFilter: (col) => isBillLineGridColumn(col, fieldKeySet.value),
  onColumnsReload: () => void preloadForColumns(visibleExtGridCols.value),
});

type FieldColumnBundle = { field: ErpFieldMeta; grid: DetailGridColumn };

function fieldForGridCol(gc: DetailGridColumn): ErpFieldMeta | null {
  const fk = resolveLineFieldKey(gc.col_key, fieldKeySet.value);
  if (!fk) return null;
  return props.fields.find((f) => f.key === fk) ?? null;
}

const useGridColumns = computed(
  () => props.enableHeaderMenu && Boolean(gridMenuCode.value) && visibleColumns.value.length > 0
);

const visibleFieldBundles = computed((): FieldColumnBundle[] => {
  if (!useGridColumns.value) {
    return props.fields
      .filter((f) => f.widget !== 'hidden')
      .map((field) => ({ field, grid: { col_key: field.key, width: field.width } as DetailGridColumn }));
  }
  const out: FieldColumnBundle[] = [];
  for (const gc of visibleColumns.value) {
    const field = fieldForGridCol(gc);
    if (field) out.push({ field, grid: gc });
  }
  return out;
});

const visibleExtGridCols = computed(() => {
  if (!useGridColumns.value) return [];
  return visibleColumns.value.filter(
    (gc) => !gc.is_system && gc.grid_area === 'line' && !fieldForGridCol(gc)
  );
});

watch(visibleExtGridCols, (cols) => {
  void preloadForColumns(cols);
});

onMounted(() => {
  if (import.meta.env.DEV && props.enableHeaderMenu && !props.menuCode?.trim()) {
    console.warn(
      '[ErpBillLineTable] 缺少 menuCode，表头右键列显示设置不可用。请传入 :menu-code="menuCode"。'
    );
  }
  if (visibleExtGridCols.value.length) void preloadForColumns(visibleExtGridCols.value);
  void loadWhMaster();
});

useBillExtFieldReload(() => {
  if (!gridMenuCode.value) return;
  return loadColumns().then(() => preloadForColumns(visibleExtGridCols.value));
});

const allSelected = computed({
  get: () => props.lines.length > 0 && selected.value.length === props.lines.length,
  set: (v: boolean) => {
    selected.value = v ? props.lines.map((_, i) => i) : [];
    emit('selectionChange', selected.value);
  },
});

function toggleRow(idx: number, checked: boolean) {
  if (checked) {
    if (!selected.value.includes(idx)) selected.value = [...selected.value, idx];
  } else {
    selected.value = selected.value.filter((i) => i !== idx);
  }
  emit('selectionChange', selected.value);
}

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

function displayCell(row: Record<string, unknown>, col: ErpFieldMeta): string {
  const v = row[col.key];
  if (col.widget === 'number') {
    if (col.key === 'qty') return fmtQty(v);
    return fmtNum(v);
  }
  if (col.key === 'wh') return whLabel(String(v ?? ''));
  return v == null ? '' : String(v);
}

function colWidth(bundle: FieldColumnBundle): number | undefined {
  return bundle.grid.width ?? bundle.field.width;
}

function colMinWidth(bundle: FieldColumnBundle): number | undefined {
  return bundle.grid.min_width ?? bundle.field.minWidth;
}

function patchExt(index: number, row: Record<string, unknown>, colKey: string, val: unknown) {
  emit('updateLine', index, lineExtFieldPatch(row, colKey, val));
}

const pasteableColumns = computed((): BillLinePasteColumn[] =>
  pasteColumnsFromBundles(visibleFieldBundles.value, visibleExtGridCols.value)
);

const productResolveByCode = computed(
  () => props.lookupResolveByCode ?? resolveLineProductByCode
);

const whResolveByCode = computed(
  () => props.lookupResolveWhByCode ?? resolveWhByCode
);

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

function buildPasteFieldLabels(): Map<string, string> {
  const labels = new Map<string, string>();
  for (const bundle of visibleFieldBundles.value) {
    labels.set(bundle.field.key, bundle.field.label);
  }
  for (const ec of visibleExtGridCols.value) {
    labels.set(ec.col_key, ec.label);
  }
  return labels;
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
  const root = tableRef.value?.$el as HTMLElement | undefined;
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

  const resolveProduct = props.lookupResolveByCode ?? resolveLineProductByCode;
  const { invalid, selectedProducts } = await validatePastedLookupBatch(lookupCells, {
    lookupProducts: props.lookupProducts,
    lookupResolveByCode: resolveProduct,
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

defineExpose({
  selected,
  clearSelection: () => {
    selected.value = [];
    emit('selectionChange', []);
  },
});
</script>

<template>
  <div class="kd-bill-line-table-wrap" @click="closeMenus" @paste="onTablePaste">
    <el-table
      ref="tableRef"
      :data="lines"
      size="small"
      border
      class="erp-table kd-bill-line-table"
      max-height="420"
      highlight-current-row
      @header-contextmenu="onHeaderContextmenu"
      @header-dragend="onHeaderDragEnd"
    >
      <el-table-column v-if="!readonly" width="40" align="center" fixed="left">
        <template #header>
          <el-checkbox v-model="allSelected" />
        </template>
        <template #default="{ $index }">
          <el-checkbox
            :model-value="selected.includes($index)"
            @update:model-value="(v: boolean) => toggleRow($index, v)"
          />
        </template>
      </el-table-column>
      <el-table-column type="index" label="序" width="48" align="center" fixed="left">
        <template #header>
          <span
            class="erp-detail-grid__header-label"
            @contextmenu.prevent="openHeaderMenu"
          >
            序
          </span>
        </template>
      </el-table-column>
      <el-table-column
        v-for="bundle in visibleFieldBundles"
        :key="bundle.field.dbField"
        :prop="bundle.field.key"
        :label="bundle.field.label"
        :width="colWidth(bundle)"
        :min-width="colMinWidth(bundle)"
        show-overflow-tooltip
      >
        <template #header>
          <span
            class="erp-detail-grid__header-label"
            :class="{
              'is-col-drag-source': dragSourceColKey === bundle.grid.col_key,
              'is-col-drag-over':
                dragOverColKey === bundle.grid.col_key && dragSourceColKey !== bundle.grid.col_key,
            }"
            :data-col-key="bundle.grid.col_key"
            :data-field="bundle.field.dbField"
            :title="bundle.field.dbField"
            @mousedown="onColHeaderMouseDown(bundle.grid, $event)"
            @contextmenu.prevent="openHeaderMenu"
          >
            {{ bundle.field.label }}
          </span>
        </template>
        <template #default="{ row, $index }">
          <div
            v-if="bundle.field.key === 'prd_no'"
            class="kd-bill-line-table__paste-cell"
            :class="{ 'is-paste-invalid': isPasteCellInvalid($index, bundle.field.key) }"
            :data-paste-row="$index"
            :data-paste-field="bundle.field.key"
          >
            <LookupField
              :model-value="String(row.prd_no || '')"
              :display="row.prd_name ? `${row.prd_no} ${row.prd_name}` : String(row.prd_no || '')"
              :disabled="readonly"
              :data="lookupProducts"
              :search-keys="['prd_no', 'name', 'spc']"
              row-key="prd_no"
              value-key="prd_no"
              :resolve-by-code="productResolveByCode"
              @focus="setPasteAnchor($index, bundle.field.key)"
              @select="(r) => !readonly && emit('selectProduct', $index, r)"
              @open-dialog="(kw) => !readonly && emit('openProductPicker', $index, kw)"
              @open="!readonly && emit('openProductPicker', $index)"
            />
          </div>
          <div
            v-else-if="bundle.field.key === 'wh'"
            class="kd-bill-line-table__paste-cell"
            :class="{ 'is-paste-invalid': isPasteCellInvalid($index, bundle.field.key) }"
            :data-paste-row="$index"
            :data-paste-field="bundle.field.key"
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
              @focus="setPasteAnchor($index, bundle.field.key)"
              @update:model-value="(v) => !readonly && emit('updateLine', $index, { wh: v })"
              @select="(r) => !readonly && emit('updateLine', $index, { wh: String(r.wh ?? '') })"
              @open-dialog="(kw) => openWhPicker($index, kw)"
              @open="openWhPicker($index)"
            />
          </div>
          <div
            v-else-if="bundle.field.widget === 'number' && !bundle.field.readonly && !readonly"
            class="kd-bill-line-table__paste-cell"
            :class="{ 'is-paste-invalid': isPasteCellInvalid($index, bundle.field.key) }"
            :data-paste-row="$index"
            :data-paste-field="bundle.field.key"
          >
            <el-input-number
              :model-value="Number(row[bundle.field.key] ?? 0)"
              size="small"
              :min="0"
              :step="bundle.field.key === 'up' || bundle.field.key === 'tax_rto' ? 0.01 : 1"
              controls-position="right"
              style="width: 100%"
              @focus="setPasteAnchor($index, bundle.field.key)"
              @update:model-value="
                emit('updateLine', $index, { [bundle.field.key]: Number($event) || 0 })
              "
            />
          </div>
          <div
            v-else-if="bundle.field.widget === 'date' && !bundle.field.readonly && !readonly"
            class="kd-bill-line-table__paste-cell"
            :class="{ 'is-paste-invalid': isPasteCellInvalid($index, bundle.field.key) }"
            :data-paste-row="$index"
            :data-paste-field="bundle.field.key"
          >
            <el-date-picker
              :model-value="row[bundle.field.key]"
              type="date"
              value-format="YYYY-MM-DD"
              size="small"
              style="width: 100%"
              @focus="setPasteAnchor($index, bundle.field.key)"
              @update:model-value="emit('updateLine', $index, { [bundle.field.key]: $event || '' })"
            />
          </div>
          <div
            v-else-if="
              (bundle.field.widget === 'input' || bundle.field.widget === 'textarea') &&
              !bundle.field.readonly &&
              !readonly
            "
            class="kd-bill-line-table__paste-cell"
            :class="{ 'is-paste-invalid': isPasteCellInvalid($index, bundle.field.key) }"
            :data-paste-row="$index"
            :data-paste-field="bundle.field.key"
          >
            <el-input
              :model-value="String(row[bundle.field.key] ?? '')"
              size="small"
              @focus="setPasteAnchor($index, bundle.field.key)"
              @update:model-value="
                emit('updateLine', $index, { [bundle.field.key]: String($event) })
              "
            />
          </div>
          <span v-else class="kd-bill-line-table__text">{{ displayCell(row, bundle.field) }}</span>
        </template>
      </el-table-column>
      <el-table-column
        v-for="ec in visibleExtGridCols"
        :key="ec.col_key"
        :prop="ec.col_key"
        :label="ec.label"
        :width="ec.width ?? 110"
        :min-width="ec.min_width ?? 96"
        show-overflow-tooltip
      >
        <template #header>
          <span
            class="erp-detail-grid__header-label"
            :class="{
              'is-col-drag-source': dragSourceColKey === ec.col_key,
              'is-col-drag-over': dragOverColKey === ec.col_key && dragSourceColKey !== ec.col_key,
            }"
            :data-col-key="ec.col_key"
            :title="ec.col_key"
            @mousedown="onColHeaderMouseDown(ec, $event)"
            @contextmenu.prevent="openHeaderMenu"
          >
            {{ ec.label }}
          </span>
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
    </el-table>

    <DetailGridHeaderMenu
      :header-menu="headerMenu"
      :columns="panelColumns"
      :is-admin="isAdmin()"
      @open-column-panel="openColumnPanel"
      @back-to-main="headerMenu.panel = 'main'"
      @toggle-column="toggleColumn"
      @remove-custom-col="removeCustomCol"
    />
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
