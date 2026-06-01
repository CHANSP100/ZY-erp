/** 货品 PRDT.TW_ID — 界面显示名「加工方式」（SUNLIKE 原生） */
export const PRDT_TW_ID_OPTIONS = [
  { value: '1', label: '委外' },
  { value: '2', label: '自制' },
  { value: '3', label: '自制&委外' },
  { value: '4', label: '委外&外购' },
  { value: '5', label: '外购' },
  { value: '6', label: '自制&委外' },
] as const;

/** 原料/物料大类：加工方式固定采购（存库 TW_ID=5） */
export const PRDT_TW_ID_PURCHASE = '5';
export const PRDT_TW_ID_PURCHASE_LABEL = '采购';

/** 大类 KND=4 原料、5 物料（原材料） */
export function isPrdtMaterialKnd(knd?: string | null): boolean {
  const k = String(knd ?? '').trim();
  return k === '4' || k === '5';
}

/** 大类 KND=2 制成品、3 半成品 时显示可编辑加工方式 */
export function isPrdtTwIdVisible(knd?: string | null): boolean {
  const k = String(knd ?? '').trim();
  return k === '2' || k === '3';
}

/** BOM 母件品号开窗：仅制成品、半成品（KND=2/3） */
export function isPrdtBomParentKnd(knd?: string | null): boolean {
  return isPrdtTwIdVisible(knd);
}

/** 原材料大类：加工方式只读显示「采购」 */
export function isPrdtTwIdReadonly(knd?: string | null): boolean {
  return isPrdtMaterialKnd(knd);
}

export function prdtTwIdLabel(value?: string | null): string {
  const v = String(value ?? '').trim();
  return PRDT_TW_ID_OPTIONS.find((o) => o.value === v)?.label ?? v;
}
