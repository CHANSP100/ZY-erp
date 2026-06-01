/**
 * 明细网格表头能力 — 列显示设置、列拖拽排序（与 ErpDetailGrid 订单列表一致）
 */
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch, type Ref } from 'vue';
import { ElMessage } from 'element-plus';
import { api, getErpUserId } from '@/api';
import type { DetailGridColumn } from '@/api/types';
import { getDetailGridFallbackColumns } from '@/config/detailGridRegistry';
import { useErpUser, initErpUser } from '@/composables/useErpUser';

export interface UseDetailGridColumnHeaderOptions {
  menuCode: Ref<string | undefined>;
  enabled?: Ref<boolean | undefined>;
  /** 列设置面板中展示的列（如单据表身仅表身相关列） */
  panelColumnFilter?: (col: DetailGridColumn) => boolean;
  onColumnsReload?: () => void;
}

export function useDetailGridColumnHeader(opts: UseDetailGridColumnHeaderOptions) {
  const { user } = useErpUser();
  const columns = ref<DetailGridColumn[]>([]);
  const tableRef = ref<{ $el?: HTMLElement; doLayout?: () => void } | null>(null);

  const headerMenu = reactive({
    show: false,
    x: 0,
    y: 0,
    panel: 'main' as 'main' | 'columns',
  });

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

  const panelColumns = computed(() => {
    const list = columns.value;
    if (!opts.panelColumnFilter) return list;
    return list.filter(opts.panelColumnFilter);
  });

  function isEnabled() {
    return Boolean(opts.menuCode.value) && opts.enabled?.value !== false;
  }

  function isAdmin(): boolean {
    return user.value?.is_admin ?? getErpUserId() === 'admin';
  }

  function columnOrderStorageKey() {
    return `erp-detail-grid-order-${opts.menuCode.value}-${getErpUserId()}`;
  }

  function savePersonalColumnOrder(orderedVisibleKeys: string[]) {
    localStorage.setItem(columnOrderStorageKey(), JSON.stringify(orderedVisibleKeys));
  }

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
      if (isAdmin() && opts.menuCode.value) {
        api.detailGridReorderColumns(opts.menuCode.value, nextCols.map((c) => c.col_key)).catch(() => {});
      }
    }
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

  function reorderVisibleColumns(from: number, to: number) {
    const keys = visibleColumns.value.map((c) => c.col_key);
    const [moved] = keys.splice(from, 1);
    if (!moved) return;
    keys.splice(to, 0, moved);
    reorderColumnsByVisibleKeys(keys);
    nextTick(() => tableRef.value?.doLayout?.());
  }

  function tableRoot(): HTMLElement | null {
    return tableRef.value?.$el ?? null;
  }

  function headerDragHitTest(clientX: number): string | null {
    const labels = tableRoot()?.querySelectorAll(
      '.erp-detail-grid__header-label[data-col-key]'
    );
    if (!labels?.length) return null;
    for (const el of labels) {
      const rect = (el as HTMLElement).getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right) {
        return (el as HTMLElement).dataset.colKey || null;
      }
    }
    return null;
  }

  function onColHeaderMouseDown(col: DetailGridColumn, e: MouseEvent) {
    if (!isEnabled() || e.button !== 0) return;
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
    const code = opts.menuCode.value;
    if (!code) {
      columns.value = [];
      return;
    }

    function applyLoadedColumns(data: DetailGridColumn[]) {
      columns.value = data;
      applyPersonalColumnOrder();
      nextTick(() => tableRef.value?.doLayout?.());
    }

    try {
      await initErpUser();
      const { data } = await api.detailGridColumns(code);
      if (data.length) {
        applyLoadedColumns(data);
        return;
      }
      const fallback = getDetailGridFallbackColumns(code);
      if (fallback.length) applyLoadedColumns(fallback);
      else columns.value = [];
    } catch {
      const fallback = getDetailGridFallbackColumns(code);
      if (fallback.length) applyLoadedColumns(fallback);
      else columns.value = [];
    }
  }

  function closeMenus() {
    headerMenu.show = false;
    headerMenu.panel = 'main';
  }

  function openHeaderMenu(e: MouseEvent) {
    if (!isEnabled()) return;
    e.preventDefault();
    e.stopPropagation();
    headerMenu.x = e.clientX;
    headerMenu.y = e.clientY;
    headerMenu.panel = 'main';
    headerMenu.show = true;
  }

  function onHeaderContextmenu(_column: unknown, event?: MouseEvent) {
    const e = event ?? (_column as MouseEvent);
    if (typeof e?.clientX === 'number' && typeof e?.clientY === 'number') openHeaderMenu(e);
  }

  function openColumnPanel() {
    headerMenu.panel = 'columns';
  }

  async function toggleColumn(col: DetailGridColumn, visible: boolean) {
    const code = opts.menuCode.value;
    if (!code) return;
    try {
      if (isAdmin()) {
        const { data } = await api.detailGridSetGlobal(code, col.col_key, visible);
        columns.value = data;
        ElMessage.success(visible ? '已全局显示' : '已全局隐藏');
      } else {
        const { data } = await api.detailGridSetUser(code, col.col_key, visible);
        columns.value = data;
        ElMessage.success(visible ? '已显示' : '已隐藏');
      }
      applyPersonalColumnOrder();
      opts.onColumnsReload?.();
      nextTick(() => tableRef.value?.doLayout?.());
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      ElMessage.error(err.response?.data?.error || '操作失败');
    }
  }

  async function removeCustomCol(col: DetailGridColumn) {
    const code = opts.menuCode.value;
    if (!code || col.is_system) return;
    try {
      const { data } = await api.detailGridRemoveColumn(code, col.col_key);
      columns.value = data;
      opts.onColumnsReload?.();
      ElMessage.success('已删除扩展字段');
      nextTick(() => tableRef.value?.doLayout?.());
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      ElMessage.error(err.response?.data?.error || '删除失败');
    }
  }

  function onHeaderDragEnd(newWidth: number, _oldWidth: number, column: { property?: string }) {
    if (column.property) {
      const col = columns.value.find((c) => c.col_key === column.property);
      if (col) col.width = Math.round(newWidth);
    }
    nextTick(() => tableRef.value?.doLayout?.());
  }

  function onDocumentPointerDown(e: MouseEvent) {
    if (!headerMenu.show || e.button !== 0) return;
    if ((e.target as HTMLElement | null)?.closest('.erp-detail-grid__ctx')) return;
    closeMenus();
  }

  function mountHeader() {
    document.addEventListener('mousedown', onDocumentPointerDown);
    if (isEnabled()) void loadColumns();
  }

  function unmountHeader() {
    document.removeEventListener('mousedown', onDocumentPointerDown);
    document.removeEventListener('mousemove', onColHeaderMouseMove);
    document.removeEventListener('mouseup', onColHeaderMouseUp);
    document.body.classList.remove('erp-detail-grid--col-dragging');
  }

  onMounted(mountHeader);
  onBeforeUnmount(unmountHeader);

  watch(
    () => opts.menuCode.value,
    () => {
      if (isEnabled()) void loadColumns();
      else columns.value = [];
    }
  );

  return {
    columns,
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
  };
}
