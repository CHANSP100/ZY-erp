import { computed, ref, watch, type MaybeRefOrGetter, toValue } from 'vue';
import { api } from '@/api';

export type BillLineWhRow = { wh: string; name?: string };

/** 表身仓库开窗：优先用父级 whs，否则自行从 MY_WH 拉取 */
export function useBillLineWhLookup(propsWhs: MaybeRefOrGetter<BillLineWhRow[] | undefined>) {
  const whCache = ref<BillLineWhRow[]>([]);
  const whLoading = ref(false);

  async function loadWhMaster(force = false): Promise<BillLineWhRow[]> {
    if (!force && whCache.value.length) return whCache.value;
    if (whLoading.value) return whCache.value;

    whLoading.value = true;
    try {
      const { data } = await api.whList();
      whCache.value = data
        .filter((w) => String(w.wh ?? '').trim())
        .map((w) => ({ wh: String(w.wh), name: w.name }));
    } catch {
      const external = toValue(propsWhs) ?? [];
      whCache.value = external.length ? [...external] : [];
    } finally {
      whLoading.value = false;
    }
    return whCache.value;
  }

  const whLookupRows = computed((): Record<string, unknown>[] => {
    const external = toValue(propsWhs) ?? [];
    const source = external.length ? external : whCache.value;
    return source as unknown as Record<string, unknown>[];
  });

  const effectiveWhs = computed((): BillLineWhRow[] => {
    const external = toValue(propsWhs) ?? [];
    return external.length ? external : whCache.value;
  });

  watch(
    () => toValue(propsWhs),
    (list) => {
      if (list?.length) whCache.value = [...list];
    },
    { deep: true, immediate: true }
  );

  async function loadWhForDialog(): Promise<Record<string, unknown>[]> {
    await loadWhMaster(true);
    return [...whLookupRows.value];
  }

  function whLabel(wh: string, whs?: BillLineWhRow[]): string {
    const w = (whs ?? effectiveWhs.value).find((x) => x.wh === wh);
    return w?.name ? `${wh} ${w.name}` : wh;
  }

  return {
    whCache,
    whLoading,
    whLookupRows,
    effectiveWhs,
    loadWhMaster,
    loadWhForDialog,
    whLabel,
  };
}
