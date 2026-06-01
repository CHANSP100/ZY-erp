import type { DetailGridColumn, ExtFieldSelectConfig } from '@/api/types';

export function isExtFieldEmpty(val: unknown): boolean {
  return val == null || val === '';
}

/** 扩展字段必填校验 — 返回首条错误文案，通过则 null */
export function validateExtRequiredFields(
  columns: DetailGridColumn[],
  values: Record<string, unknown> | undefined
): string | null {
  const bag = values || {};
  for (const col of columns) {
    if (!col.required) continue;
    if (isExtFieldEmpty(bag[col.col_key])) {
      return `请填写扩展字段「${col.label || col.col_key}」`;
    }
  }
  return null;
}

export function resolveSelectConfig(col: DetailGridColumn): ExtFieldSelectConfig | null {
  const raw = col.select_config as (ExtFieldSelectConfig & { mode?: string }) | null;
  if (!raw) return null;
  const mode = String(raw.mode || '');
  if (mode === 'table' || mode === 'text_select') {
    const table_name = String(raw.table_name || '').trim();
    return table_name ? { mode: 'table', table_name } : null;
  }
  if (raw.mode === 'static') return raw;
  return null;
}

export function staticSelectOptions(col: DetailGridColumn) {
  const cfg = resolveSelectConfig(col);
  if (!cfg || cfg.mode !== 'static') return [];
  return cfg.options ?? [];
}

export function tableNameForSelect(col: DetailGridColumn) {
  const cfg = resolveSelectConfig(col);
  return cfg?.mode === 'table' ? cfg.table_name || '' : '';
}

export function lineExtFieldPatch(
  row: Record<string, unknown>,
  colKey: string,
  val: unknown
): Record<string, unknown> {
  const ext = (row.ext_fields as Record<string, unknown> | undefined) ?? {};
  return { ext_fields: { ...ext, [colKey]: val } };
}

export function lineExtFieldValue(row: Record<string, unknown>, colKey: string): unknown {
  const ext = row.ext_fields as Record<string, unknown> | undefined;
  return ext?.[colKey] ?? '';
}
