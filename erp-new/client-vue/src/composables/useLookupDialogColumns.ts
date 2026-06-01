import { computed, onBeforeUnmount, reactive, ref, watch, type Ref } from 'vue';
import { getErpUserId } from '@/api';
import type { LookupColumn } from '@/types/lookup';

export type LookupDialogColumnState = LookupColumn & {
  visible: boolean;
  hideable: boolean;
};

export function useLookupDialogColumns(
  settingsKey: Ref<string | undefined>,
  allColumns: Ref<LookupColumn[]>,
  valueKey: Ref<string>,
  enabled: Ref<boolean> = ref(true)
) {
  const columnStates = ref<LookupDialogColumnState[]>([]);

  const headerMenu = reactive({
    show: false,
    x: 0,
    y: 0,
    panel: 'main' as 'main' | 'columns',
  });

  function storageKey() {
    return `erp-lookup-columns-${settingsKey.value}-${getErpUserId()}`;
  }

  function initColumns() {
    const cols = allColumns.value;
    const vk = valueKey.value;
    let saved: Record<string, boolean> = {};
    if (settingsKey.value) {
      try {
        const raw = localStorage.getItem(storageKey());
        if (raw) saved = JSON.parse(raw) as Record<string, boolean>;
      } catch {
        /* ignore */
      }
    }
    columnStates.value = cols.map((c) => {
      const hideable = c.hideable !== false && c.prop !== vk;
      const defaultVisible = c.defaultVisible ?? true;
      return {
        ...c,
        hideable,
        visible: hideable ? (saved[c.prop] ?? defaultVisible) : true,
      };
    });
    if (!columnStates.value.some((c) => c.visible)) {
      const first = columnStates.value[0];
      if (first) first.visible = true;
    }
  }

  function saveVisibility() {
    if (!settingsKey.value) return;
    const map: Record<string, boolean> = {};
    for (const c of columnStates.value) {
      if (c.hideable) map[c.prop] = c.visible;
    }
    localStorage.setItem(storageKey(), JSON.stringify(map));
  }

  function toggleColumn(prop: string, visible: boolean) {
    const col = columnStates.value.find((c) => c.prop === prop);
    if (!col || !col.hideable) return;
    col.visible = visible;
    if (!columnStates.value.some((c) => c.visible)) {
      col.visible = true;
    }
    saveVisibility();
  }

  const visibleColumns = computed(() => columnStates.value.filter((c) => c.visible));

  const columnSettingsEnabled = computed(
    () =>
      enabled.value &&
      Boolean(settingsKey.value) &&
      allColumns.value.length > 1 &&
      columnStates.value.some((c) => c.hideable)
  );

  function closeMenus() {
    headerMenu.show = false;
    headerMenu.panel = 'main';
  }

  function openHeaderMenu(e: MouseEvent) {
    if (!columnSettingsEnabled.value) return;
    headerMenu.show = true;
    headerMenu.x = e.clientX;
    headerMenu.y = e.clientY;
    headerMenu.panel = 'main';
  }

  function openColumnPanel() {
    headerMenu.panel = 'columns';
  }

  function onDocumentClick(e: MouseEvent) {
    if (!headerMenu.show) return;
    if ((e.target as HTMLElement | null)?.closest('.erp-detail-grid__ctx')) return;
    closeMenus();
  }

  watch(
    () => [allColumns.value, settingsKey.value, valueKey.value] as const,
    () => initColumns(),
    { deep: true, immediate: true }
  );

  if (typeof document !== 'undefined') {
    document.addEventListener('click', onDocumentClick);
    onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick));
  }

  return {
    columnStates,
    visibleColumns,
    headerMenu,
    columnSettingsEnabled,
    closeMenus,
    openHeaderMenu,
    openColumnPanel,
    toggleColumn,
    initColumns,
  };
}
