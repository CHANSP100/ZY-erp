/** 开窗联想 / 弹窗共用的候选过滤与精确匹配 */

export function filterLookupRows<T extends Record<string, unknown>>(
  rows: T[],
  query: string,
  searchKeys: string[],
  limit = 20
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows.slice(0, limit);
  const keys = searchKeys.length ? searchKeys : Object.keys(rows[0] ?? {});
  return rows
    .filter((row) => keys.some((k) => String(row[k] ?? '').toLowerCase().includes(q)))
    .slice(0, limit);
}

/** 方案 A：仅 valueKey（编码）精确匹配 */
export function findLookupExactByValueKey<T extends Record<string, unknown>>(
  rows: T[],
  query: string,
  valueKey: string
): T | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  return rows.find((row) => String(row[valueKey] ?? '').toLowerCase() === q);
}

/** @deprecated 多字段精确匹配；Enter 校验请用 findLookupExactByValueKey */
export function findLookupExact<T extends Record<string, unknown>>(
  rows: T[],
  query: string,
  valueKey: string,
  searchKeys: string[] = []
): T | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  const byValue = rows.find((row) => String(row[valueKey] ?? '').toLowerCase() === q);
  if (byValue) return byValue;
  const keys = [valueKey, ...searchKeys.filter((k) => k !== valueKey)];
  return rows.find((row) => keys.some((k) => String(row[k] ?? '').toLowerCase() === q));
}

/** 联想下拉与输入框展示：代号 + 名称 + 规格等 */
export function formatLookupRowLabel(
  row: Record<string, unknown>,
  valueKey: string,
  searchKeys: string[] = []
): string {
  const parts: string[] = [];
  const code = row[valueKey];
  if (code != null && String(code).trim() !== '') parts.push(String(code));
  for (const k of searchKeys) {
    if (k === valueKey) continue;
    const v = row[k];
    const s = v == null ? '' : String(v).trim();
    if (s && !parts.includes(s)) parts.push(s);
  }
  return parts.join(' ');
}

export type LookupResolveResult =
  | { kind: 'selected'; row: Record<string, unknown> }
  | { kind: 'dialog'; keyword: string };

/**
 * Enter / blur 共用：编码精确匹配 → 选中；否则服务端补查；仍无则弹窗（带当前输入）
 * 校验范围 = 当前传入 rows（已业务过滤的候选集）
 */
export async function resolveLookupEntry(
  typed: string,
  rows: Record<string, unknown>[],
  valueKey: string,
  resolveByCode?: (code: string) => Promise<Record<string, unknown> | null | undefined>
): Promise<LookupResolveResult> {
  const q = typed.trim();
  if (!q) return { kind: 'dialog', keyword: '' };

  const exact = findLookupExactByValueKey(rows, q, valueKey);
  if (exact) return { kind: 'selected', row: exact };

  if (resolveByCode) {
    try {
      const remote = await resolveByCode(q);
      if (remote && String(remote[valueKey] ?? '').toLowerCase() === q.toLowerCase()) {
        const inSet = findLookupExactByValueKey(rows, q, valueKey);
        if (inSet) return { kind: 'selected', row: inSet };
      }
    } catch {
      /* 404 */
    }
  }

  return { kind: 'dialog', keyword: q };
}
