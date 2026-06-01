/**
 * 明细网格骨架 composable — 5 项标准能力
 * @see config/detailGridRegistry.ts
 */
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch, type Ref } from 'vue';
import { ElMessage } from 'element-plus';
import { api, getErpUserId } from '@/api';
import type { DetailGridColumn } from '@/api/types';
import {
  defaultFormatDetailCell,
  getDetailGridConfig,
  getDetailGridFallbackColumns,
  type DetailGridSummary,
} from '@/config/detailGridRegistry';
import { useErpUser, initErpUser } from '@/composables/useErpUser';

type CellPos = { row: number; col: number };

export interface UseErpDetailGridOptions {
  menuCode: string;
  rows: Ref<Record<string, unknown>[]>;
  loading?: Ref<boolean | undefined>;
  pageSize?: number;
  actionWidth?: number;
  onSummaryChange?: (summary: DetailGridSummary) => void;
  onColumnsReload?: () => void;
}

export function useErpDetailGrid(opts: UseErpDetailGridOptions) {
  const config = getDetailGridConfig(opts.menuCode);
  const { user } = useErpUser();

  const columns = ref<DetailGridColumn[]>([]);
  const columnFilters = reactive<Record<string, string>>({});
  const tableRef = ref<{ $el?: HTMLElement; doLayout?: () => void } | null>(null);
  const filterScrollRef = ref<HTMLElement | null>(null);
  const tableWrapRef = ref<HTMLElement | null>(null);
  const page = ref(1);
  const pageSizeLocal = ref(opts.pageSize ?? 50);

  const INDEX_COL_W = 48;
  const ACTION_COL_W = opts.actionWidth ?? 88;
  const DEFAULT_COL_W = 100;

  const measuredIndexW = ref(INDEX_COL_W);
  const measuredActionW = ref(ACTION_COL_W);
  const measuredColWidths = ref<Record<string, number>>({});
  const scrollInnerWidth = ref(0);

  const   headerMenu = reactive({
    show: false,
    x: 0,
    y: 0,
    panel: 'main' as 'main' | 'columns',
  });

  const sortProp = ref<string>(config.defaultSort?.prop ?? '');
  const sortOrder = ref<'ascending' | 'descending' | null>(config.defaultSort?.order ?? null);

  const selecting = ref(false);
  const selectionStart = ref<CellPos | null>(null);
  const selectionEnd = ref<CellPos | null>(null);

  const dragSourceColKey = ref<string | null>(null);
  const dragOverColKey = ref<string | null>(null);
  const colDrag = reactive({
    pending: false,
    active: false,
    colKey: '',
    startX: 0,
    startY: 0,
    fromIndex: -1,
  });

  const visibleColumns = computed(() =>
    columns.value.filter((c) => c.visible).sort((a, b) => a.sort_order - b.sort_order)
  );
  const selectableColCount = computed(() => visibleColumns.value.length + 1);

  function colPixelWidth(col: DetailGridColumn): number {
    return measuredColWidths.value[col.col_key] ?? col.width ?? col.min_width ?? DEFAULT_COL_W;
  }

  function filterCellStyle(col: DetailGridColumn) {
    const w = colPixelWidth(col);
    return {
      width: `${w}px`,
      minWidth: `${w}px`,
      maxWidth: `${w}px`,
      flex: '0 0 auto',
    };
  }

  function formatCell(row: Record<string, unknown>, col: DetailGridColumn): string {
    const custom = config.formatCell?.(row, col, defaultFormatDetailCell);
    if (custom !== undefined) return custom;
    return defaultFormatDetailCell(row, col);
  }

  /** 5. 列模糊查询 — 每列独立筛选 */
  const filteredRows = computed(() => {
    let rows = opts.rows.value;
    for (const col of visibleColumns.value) {
      const q = (columnFilters[col.col_key] || '').trim().toLowerCase();
      if (!q) continue;
      rows = rows.filter((row) => String(formatCell(row, col) ?? '').toLowerCase().includes(q));
    }
    return rows;
  });

  const sortedRows = computed(() => {
    const rows = [...filteredRows.value];
    const prop = sortProp.value;
    const order = sortOrder.value;
    if (!prop || !order) return rows;
    const dir = order === 'ascending' ? 1 : -1;
    rows.sort((a, b) => dir * compareSortValues(a, b, prop));
    return rows;
  });

  const paginatedRows = computed(() => {
    const start = (page.value - 1) * pageSizeLocal.value;
    return sortedRows.value.slice(start, start + pageSizeLocal.value);
  });

  const summary = computed((): DetailGridSummary => {
    const out: DetailGridSummary = { count: filteredRows.value.length };
    for (const key of config.summaryNumericFields ?? []) {
      let sum = 0;
      for (const r of filteredRows.value) {
        sum += Number(r[key]) || 0;
      }
      out[key] = Math.round(sum * 100) / 100;
    }
    return out;
  });

  watch(summary, (s) => opts.onSummaryChange?.(s), { immediate: true, deep: true });

  watch(
    () => opts.rows.value.length,
    () => {
      page.value = 1;
      nextTick(refreshScrollLayout);
    }
  );

  watch(
    () => visibleColumns.value.map((c) => c.col_key).join('\0'),
    () => nextTick(refreshScrollLayout)
  );

  watch(pageSizeLocal, () => nextTick(refreshScrollLayout));

  function tableRoot(): HTMLElement | null {
    return tableRef.value?.$el ?? null;
  }

  function horizontalScrollEls(): HTMLElement[] {
    const root = tableRoot();
    if (!root) return [];
    const out: HTMLElement[] = [];
    const seen = new Set<HTMLElement>();
    for (const wrapper of root.querySelectorAll('.el-table__body-wrapper, .el-table__header-wrapper')) {
      const wrap = wrapper.querySelector('.el-scrollbar__wrap') as HTMLElement | null;
      const target = wrap ?? (wrapper as HTMLElement);
      if (!seen.has(target)) {
        seen.add(target);
        out.push(target);
      }
    }
    return out;
  }

  function syncTableScrollLeft(left: number) {
    for (const el of horizontalScrollEls()) {
      el.scrollLeft = left;
    }
  }

  /** 1. 列头筛选行 — 与表体横向滚动同步 */
  function onFilterScroll() {
    syncTableScrollLeft(filterScrollRef.value?.scrollLeft ?? 0);
  }

  function onTableWheel(e: WheelEvent) {
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
    if (!delta || !filterScrollRef.value) return;
    e.preventDefault();
    filterScrollRef.value.scrollLeft += delta;
    syncTableScrollLeft(filterScrollRef.value.scrollLeft);
  }

  function measureColumnWidthsFromDom() {
    const root = tableRoot();
    if (!root) {
      scrollInnerWidth.value =
        measuredIndexW.value + visibleColumns.value.reduce((sum, col) => sum + colPixelWidth(col), 0);
      return;
    }

    const mainHeader = root.querySelector(
      '.el-table__header-wrapper:not(.el-table__fixed-header-wrapper)'
    );
    const ths = mainHeader?.querySelectorAll('th.el-table__cell');
    if (!ths?.length) {
      scrollInnerWidth.value =
        measuredIndexW.value + visibleColumns.value.reduce((sum, col) => sum + colPixelWidth(col), 0);
      return;
    }

    measuredIndexW.value = (ths[0] as HTMLElement).offsetWidth || INDEX_COL_W;

    const nextWidths: Record<string, number> = {};
    visibleColumns.value.forEach((col, i) => {
      const th = ths[i + 1] as HTMLElement | undefined;
      if (th?.offsetWidth) nextWidths[col.col_key] = th.offsetWidth;
    });
    measuredColWidths.value = nextWidths;

    const fixedHeader = root.querySelector(
      '.el-table__fixed-right .el-table__header th.el-table__cell'
    ) as HTMLElement | null;
    measuredActionW.value = fixedHeader?.offsetWidth || ACTION_COL_W;

    let inner = measuredIndexW.value;
    for (const col of visibleColumns.value) {
      inner += colPixelWidth(col);
    }
    scrollInnerWidth.value = inner;
  }

  function refreshScrollLayout() {
    tableRef.value?.doLayout?.();
    nextTick(() => {
      measureColumnWidthsFromDom();
      observeHeaderCells();
      syncTableScrollLeft(filterScrollRef.value?.scrollLeft ?? 0);
    });
  }

  let resizeObserver: ResizeObserver | null = null;
  let headerCellObserver: ResizeObserver | null = null;
  let measureRaf = 0;

  function scheduleMeasureFromDom() {
    if (measureRaf) cancelAnimationFrame(measureRaf);
    measureRaf = requestAnimationFrame(() => {
      measureRaf = 0;
      measureColumnWidthsFromDom();
      syncTableScrollLeft(filterScrollRef.value?.scrollLeft ?? 0);
    });
  }

  function observeHeaderCells() {
    headerCellObserver?.disconnect();
    if (typeof ResizeObserver === 'undefined') return;
    const root = tableRoot();
    if (!root) return;
    headerCellObserver = new ResizeObserver(() => scheduleMeasureFromDom());
    for (const sel of [
      '.el-table__header-wrapper:not(.el-table__fixed-header-wrapper) th.el-table__cell',
      '.el-table__fixed-right .el-table__header th.el-table__cell',
    ]) {
      root.querySelectorAll(sel).forEach((th) => headerCellObserver!.observe(th));
    }
  }

  function onHeaderDragEnd(
    newWidth: number,
    _oldWidth: number,
    column: { property?: string; label?: string }
  ) {
    const width = Math.round(newWidth);
    if (column.property) {
      measuredColWidths.value = { ...measuredColWidths.value, [column.property]: width };
      const col = columns.value.find((c) => c.col_key === column.property);
      if (col) col.width = width;
    } else if (column.label === '序') {
      measuredIndexW.value = width;
    } else if (column.label === '操作') {
      measuredActionW.value = width;
    }
    nextTick(refreshScrollLayout);
  }

  function columnOrderStorageKey() {
    return `erp-detail-grid-order-${opts.menuCode}-${getErpUserId()}`;
  }

  function savePersonalColumnOrder(orderedVisibleKeys: string[]) {
    localStorage.setItem(columnOrderStorageKey(), JSON.stringify(orderedVisibleKeys));
  }

  function applyPersonalColumnOrder() {
    const raw = localStorage.getItem(columnOrderStorageKey());
    if (!raw) return;
    try {
      reorderColumnsByVisibleKeys(JSON.parse(raw) as string[], false);
    } catch {
      /* ignore */
    }
  }

  /** 3. 列拖动排序 */
  function reorderColumnsByVisibleKeys(orderedVisibleKeys: string[], persist = true) {
    const visibleSet = new Set(columns.value.filter((c) => c.visible).map((c) => c.col_key));
    const ordered = orderedVisibleKeys.filter((k) => visibleSet.has(k));
    for (const col of columns.value) {
      if (col.visible && !ordered.includes(col.col_key)) ordered.push(col.col_key);
    }
    if (ordered.length < 2) return;

    const byKey = new Map(columns.value.map((c) => [c.col_key, c]));
    let order = 1;
    const nextCols: DetailGridColumn[] = [];
    for (const key of ordered) {
      const col = byKey.get(key);
      if (col) nextCols.push({ ...col, sort_order: order++ });
    }
    for (const col of [...columns.value].sort((a, b) => a.sort_order - b.sort_order)) {
      if (!col.visible) nextCols.push({ ...col, sort_order: order++ });
    }
    columns.value = nextCols;

    if (persist) {
      savePersonalColumnOrder(ordered);
      if (isAdmin()) {
        api.detailGridReorderColumns(opts.menuCode, nextCols.map((c) => c.col_key)).catch(() => {});
      }
    }
  }

  function reorderVisibleColumns(from: number, to: number) {
    const keys = visibleColumns.value.map((c) => c.col_key);
    const [moved] = keys.splice(from, 1);
    if (!moved) return;
    keys.splice(to, 0, moved);
    reorderColumnsByVisibleKeys(keys);
    nextTick(refreshScrollLayout);
  }

  function headerDragHitTest(clientX: number): string | null {
    const ths = tableRoot()?.querySelectorAll(
      '.el-table__header-wrapper:not(.el-table__fixed-header-wrapper) th.el-table__cell'
    );
    if (!ths?.length) return null;
    for (let i = 1; i < ths.length; i++) {
      const rect = (ths[i] as HTMLElement).getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right) {
        return visibleColumns.value[i - 1]?.col_key ?? null;
      }
    }
    return null;
  }

  function onColHeaderMouseDown(col: DetailGridColumn, e: MouseEvent) {
    if (e.button !== 0) return;
    const th = (e.currentTarget as HTMLElement).closest('th');
    if (th) {
      const rect = th.getBoundingClientRect();
      if (e.clientX > rect.right - 10) return;
    }
    colDrag.pending = true;
    colDrag.active = false;
    colDrag.colKey = col.col_key;
    colDrag.startX = e.clientX;
    colDrag.startY = e.clientY;
    colDrag.fromIndex = visibleColumns.value.findIndex((c) => c.col_key === col.col_key);
    dragSourceColKey.value = col.col_key;
    dragOverColKey.value = col.col_key;
    document.addEventListener('mousemove', onColHeaderMouseMove);
    document.addEventListener('mouseup', onColHeaderMouseUp);
  }

  function onColHeaderMouseMove(e: MouseEvent) {
    if (!colDrag.pending && !colDrag.active) return;
    const dx = Math.abs(e.clientX - colDrag.startX);
    const dy = Math.abs(e.clientY - colDrag.startY);
    if (colDrag.pending && !colDrag.active && (dx > 4 || dy > 4)) {
      colDrag.pending = false;
      colDrag.active = true;
      document.body.classList.add('erp-detail-grid--col-dragging');
    }
    if (!colDrag.active) return;
    dragOverColKey.value = headerDragHitTest(e.clientX);
    e.preventDefault();
  }

  function onColHeaderMouseUp() {
    document.removeEventListener('mousemove', onColHeaderMouseMove);
    document.removeEventListener('mouseup', onColHeaderMouseUp);
    document.body.classList.remove('erp-detail-grid--col-dragging');
    if (colDrag.active) {
      const from = colDrag.fromIndex;
      const to = dragOverColKey.value
        ? visibleColumns.value.findIndex((c) => c.col_key === dragOverColKey.value)
        : -1;
      if (from >= 0 && to >= 0 && from !== to) reorderVisibleColumns(from, to);
    }
    colDrag.pending = false;
    colDrag.active = false;
    colDrag.colKey = '';
    colDrag.fromIndex = -1;
    dragSourceColKey.value = null;
    dragOverColKey.value = null;
  }

  async function loadColumns() {
    function applyLoadedColumns(data: DetailGridColumn[]) {
      columns.value = data;
      for (const c of data) {
        if (!(c.col_key in columnFilters)) columnFilters[c.col_key] = '';
      }
      applyPersonalColumnOrder();
      nextTick(refreshScrollLayout);
    }

    try {
      await initErpUser();
      const { data } = await api.detailGridColumns(opts.menuCode);
      if (data.length) {
        applyLoadedColumns(data);
        return;
      }
      const fallback = getDetailGridFallbackColumns(opts.menuCode);
      if (fallback.length) {
        applyLoadedColumns(fallback);
        return;
      }
      columns.value = [];
    } catch (e: unknown) {
      const fallback = getDetailGridFallbackColumns(opts.menuCode);
      if (fallback.length) {
        applyLoadedColumns(fallback);
        return;
      }
      columns.value = [];
      const err = e as { response?: { data?: { error?: string } } };
      ElMessage.error(err.response?.data?.error || '列配置加载失败，请确认后端已启动（端口 3001）');
    }
  }

  function rawSortValue(row: Record<string, unknown>, colKey: string): string | number {
    const col = visibleColumns.value.find((c) => c.col_key === colKey);
    if (!col) return '';
    const v = row[colKey];
    if (col.widget === 'number' && v != null && v !== '') {
      const n = Number(v);
      return Number.isNaN(n) ? 0 : n;
    }
    return formatCell(row, col).toLowerCase();
  }

  function compareSortValues(a: Record<string, unknown>, b: Record<string, unknown>, colKey: string): number {
    const va = rawSortValue(a, colKey);
    const vb = rawSortValue(b, colKey);
    if (typeof va === 'number' && typeof vb === 'number') return va - vb;
    return String(va).localeCompare(String(vb), 'zh-CN', { numeric: true });
  }

  function colTableWidth(col: DetailGridColumn): number {
    return colPixelWidth(col);
  }

  function colIndexOf(col: DetailGridColumn): number {
    return visibleColumns.value.findIndex((c) => c.col_key === col.col_key) + 1;
  }

  function normalizeRange(start: CellPos, end: CellPos) {
    return {
      r0: Math.min(start.row, end.row),
      r1: Math.max(start.row, end.row),
      c0: Math.min(start.col, end.col),
      c1: Math.max(start.col, end.col),
    };
  }

  /** 4. 单元格框选复制 */
  function isCellSelected(row: number, col: number): boolean {
    if (!selectionStart.value || !selectionEnd.value) return false;
    if (col >= selectableColCount.value) return false;
    const { r0, r1, c0, c1 } = normalizeRange(selectionStart.value, selectionEnd.value);
    return row >= r0 && row <= r1 && col >= c0 && col <= c1;
  }

  function cellClassName({ rowIndex, columnIndex }: { rowIndex: number; columnIndex: number }): string {
    return isCellSelected(rowIndex, columnIndex) ? 'is-cell-selected' : '';
  }

  function getCellCopyText(rowIndex: number, colIndex: number): string {
    const row = paginatedRows.value[rowIndex];
    if (!row) return '';
    if (colIndex === 0) return String((page.value - 1) * pageSizeLocal.value + rowIndex + 1);
    const col = visibleColumns.value[colIndex - 1];
    return col ? formatCell(row, col) : '';
  }

  function onCellMouseDown(rowIndex: number, colIndex: number, e: MouseEvent) {
    if (e.button !== 0 || colIndex >= selectableColCount.value) return;
    selecting.value = true;
    selectionStart.value = { row: rowIndex, col: colIndex };
    selectionEnd.value = { row: rowIndex, col: colIndex };
  }

  function onCellMouseEnter(rowIndex: number, colIndex: number) {
    if (!selecting.value || colIndex >= selectableColCount.value) return;
    selectionEnd.value = { row: rowIndex, col: colIndex };
  }

  function onDocumentMouseUp() {
    selecting.value = false;
  }

  function onDocumentKeyDown(e: KeyboardEvent) {
    if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'c') return;
    if (!selectionStart.value || !selectionEnd.value) return;
    const active = document.activeElement;
    if (
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      active?.getAttribute('contenteditable') === 'true'
    ) {
      return;
    }
    const { r0, r1, c0, c1 } = normalizeRange(selectionStart.value, selectionEnd.value);
    const lines: string[] = [];
    for (let r = r0; r <= r1; r++) {
      const cells: string[] = [];
      for (let c = c0; c <= c1; c++) cells.push(getCellCopyText(r, c));
      lines.push(cells.join('\t'));
    }
    const text = lines.join('\n');
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
    e.preventDefault();
  }

  function fallbackCopy(text: string) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }

  function onSortChange(payload: { prop: string; order: string | null }) {
    sortProp.value = payload.prop;
    sortOrder.value =
      payload.order === 'ascending' || payload.order === 'descending' ? payload.order : null;
    page.value = 1;
  }

  function isAdmin(): boolean {
    return user.value?.is_admin ?? getErpUserId() === 'admin';
  }

  /** 2. 表头右键菜单 */
  function closeMenus() {
    headerMenu.show = false;
    headerMenu.panel = 'main';
  }

  function openHeaderMenu(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    headerMenu.x = e.clientX;
    headerMenu.y = e.clientY;
    headerMenu.panel = 'main';
    headerMenu.show = true;
  }

  function onHeaderContextmenu(column: unknown, event?: MouseEvent) {
    const e = event ?? (column as MouseEvent);
    if (typeof e?.clientX === 'number' && typeof e?.clientY === 'number') openHeaderMenu(e);
  }

  function openColumnPanel() {
    headerMenu.panel = 'columns';
  }

  async function toggleColumn(col: DetailGridColumn, visible: boolean) {
    try {
      if (isAdmin()) {
        const { data } = await api.detailGridSetGlobal(opts.menuCode, col.col_key, visible);
        columns.value = data;
        ElMessage.success(visible ? '已全局显示' : '已全局隐藏');
      } else {
        const { data } = await api.detailGridSetUser(opts.menuCode, col.col_key, visible);
        columns.value = data;
        ElMessage.success(visible ? '已显示' : '已隐藏');
      }
      applyPersonalColumnOrder();
      nextTick(refreshScrollLayout);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      ElMessage.error(err.response?.data?.error || '操作失败');
    }
  }

  async function removeCustomCol(col: DetailGridColumn) {
    if (col.is_system) return;
    try {
      const { data } = await api.detailGridRemoveColumn(opts.menuCode, col.col_key);
      columns.value = data;
      opts.onColumnsReload?.();
      ElMessage.success('已删除扩展字段');
      nextTick(refreshScrollLayout);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      ElMessage.error(err.response?.data?.error || '删除失败');
    }
  }

  function onDocumentPointerDown(e: MouseEvent) {
    if (!headerMenu.show || e.button !== 0) return;
    if ((e.target as HTMLElement | null)?.closest('.erp-detail-grid__ctx')) return;
    closeMenus();
  }

  function getExportData() {
    const exportColumns = [
      { key: '__idx', label: '序' },
      ...visibleColumns.value.map((c) => ({ key: c.col_key, label: c.label })),
    ];
    const exportRows = filteredRows.value.map((row, i) => {
      const out: Record<string, string> = { __idx: String(i + 1) };
      for (const col of visibleColumns.value) {
        out[col.col_key] = formatCell(row, col);
      }
      return out;
    });
    return { fileName: config.title, columns: exportColumns, rows: exportRows };
  }

  function mountGrid() {
    void (async () => {
      await loadColumns();
      nextTick(() => {
        tableWrapRef.value?.addEventListener('wheel', onTableWheel, { passive: false });
        if (tableWrapRef.value && typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(() => refreshScrollLayout());
          resizeObserver.observe(tableWrapRef.value);
        }
        refreshScrollLayout();
      });
    })();
    document.addEventListener('mouseup', onDocumentMouseUp);
    document.addEventListener('keydown', onDocumentKeyDown);
    document.addEventListener('mousedown', onDocumentPointerDown);
  }

  function unmountGrid() {
    tableWrapRef.value?.removeEventListener('wheel', onTableWheel);
    document.removeEventListener('mouseup', onDocumentMouseUp);
    document.removeEventListener('keydown', onDocumentKeyDown);
    document.removeEventListener('mousedown', onDocumentPointerDown);
    document.removeEventListener('mousemove', onColHeaderMouseMove);
    document.removeEventListener('mouseup', onColHeaderMouseUp);
    document.body.classList.remove('erp-detail-grid--col-dragging');
    resizeObserver?.disconnect();
    headerCellObserver?.disconnect();
    if (measureRaf) cancelAnimationFrame(measureRaf);
  }

  onMounted(mountGrid);
  onBeforeUnmount(unmountGrid);

  return {
    config,
    columns,
    columnFilters,
    tableRef,
    filterScrollRef,
    tableWrapRef,
    page,
    pageSizeLocal,
    measuredIndexW,
    measuredActionW,
    scrollInnerWidth,
    headerMenu,
    sortProp,
    sortOrder,
    selectionStart,
    selectionEnd,
    dragSourceColKey,
    dragOverColKey,
    visibleColumns,
    filteredRows,
    paginatedRows,
    summary,
    filterCellStyle,
    formatCell,
    onFilterScroll,
    onHeaderDragEnd,
    onColHeaderMouseDown,
    colTableWidth,
    colIndexOf,
    cellClassName,
    onCellMouseDown,
    onCellMouseEnter,
    onSortChange,
    isAdmin,
    closeMenus,
    openHeaderMenu,
    onHeaderContextmenu,
    openColumnPanel,
    toggleColumn,
    removeCustomCol,
    loadColumns,
    getExportData,
  };
}
