import type { LookupColumn, LookupConfig, LookupInteraction, LookupPresetKey } from '@/types/lookup';

/** 常见 valueKey → SUNLIKE 表名（inline LookupDialog 与 preset 共用同一持久化键） */
export const LOOKUP_VALUE_KEY_TABLE: Record<string, string> = {
  cus_no: 'CUST',
  sal_no: 'SALM',
  dep: 'DEPT',
  wh: 'MY_WH',
  prd_no: 'PRDT',
  cur_id: 'CUR_ID',
  idx_no: 'INDX',
  area_no: 'AREA',
  spc_no: 'BIL_SPC',
  ut: 'PRDT_UT',
};

/** SUNLIKE 表名 → 列显示设置 localStorage 分组键 */
export const LOOKUP_TABLE_KEYS: Record<LookupPresetKey, string> = {
  dept: 'DEPT',
  warehouse: 'MY_WH',
  cust: 'CUST',
  salm: 'SALM',
  product: 'PRDT',
  productBomParent: 'PRDT',
  indx: 'INDX',
  area: 'AREA',
  currency: 'CUR_ID',
  prdtUt: 'PRDT_UT',
  bilSpcSales: 'BIL_SPC',
};

/** 编码列不可隐藏；其余列默认可在表头右键菜单中勾选 */
export function normalizeLookupColumns(columns: LookupColumn[], valueKey: string): LookupColumn[] {
  return columns.map((c) => ({
    ...c,
    hideable: c.prop === valueKey ? false : c.hideable !== false,
    defaultVisible: c.defaultVisible ?? true,
  }));
}

export function resolveColumnSettingsKey(
  preset: LookupPresetKey | undefined,
  config: Pick<LookupConfig, 'columnSettingsKey' | 'valueKey' | 'rowKey'>
): string {
  if (config.columnSettingsKey) return config.columnSettingsKey;
  if (preset) return LOOKUP_TABLE_KEYS[preset];
  const vk = config.valueKey ?? config.rowKey;
  return LOOKUP_VALUE_KEY_TABLE[vk] ?? vk.toUpperCase();
}
