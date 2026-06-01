import { ref } from 'vue';
import { api } from '@/api';
import type { DetailGridColumn } from '@/api/types';
import { resolveSelectConfig } from '@/utils/extFieldRuntime';

export function useExtFieldColumns(
  menuCode: string | (() => string),
  area: 'head' | 'line' | (() => 'head' | 'line')
) {
  const columns = ref<DetailGridColumn[]>([]);
  const loading = ref(false);

  function resolveMenuCode() {
    return typeof menuCode === 'function' ? menuCode() : menuCode;
  }

  function resolveArea() {
    return typeof area === 'function' ? area() : area;
  }

  async function reload() {
    const code = resolveMenuCode();
    const gridArea = resolveArea();
    if (!code) {
      columns.value = [];
      return;
    }
    loading.value = true;
    try {
      const { data } = await api.detailGridColumns(code);
      columns.value = data
        .filter((c) => !c.is_system && c.persist && c.grid_area === gridArea)
        .sort((a, b) => a.sort_order - b.sort_order);
    } catch {
      columns.value = [];
    } finally {
      loading.value = false;
    }
  }

  return { columns, loading, reload };
}

export function useExtFieldSelectOptions() {
  const tableOptions = ref<Record<string, { value: string; label: string }[]>>({});
  const tableLoading = ref<Record<string, boolean>>({});

  async function loadTableOptions(tableName: string) {
    const key = tableName.trim();
    if (!key || tableOptions.value[key]) return;
    tableLoading.value = { ...tableLoading.value, [key]: true };
    try {
      const { data } = await api.extFieldTableSelectOptions(key);
      tableOptions.value = { ...tableOptions.value, [key]: data };
    } catch {
      tableOptions.value = { ...tableOptions.value, [key]: [] };
    } finally {
      tableLoading.value = { ...tableLoading.value, [key]: false };
    }
  }

  async function preloadForColumns(cols: DetailGridColumn[]) {
    for (const col of cols) {
      if (col.field_source !== 'select') continue;
      const cfg = resolveSelectConfig(col);
      if (cfg?.mode === 'table' && cfg.table_name) {
        await loadTableOptions(cfg.table_name);
      }
    }
  }

  return { tableOptions, tableLoading, loadTableOptions, preloadForColumns };
}
