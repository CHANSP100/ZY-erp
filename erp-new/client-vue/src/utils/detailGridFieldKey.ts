/** 明细网格 col_key → 单据表身字段 key（表单行数据用 est_dd/rem，列表网格用 line_est_dd/line_rem） */
const LINE_COL_ALIASES: Record<string, string> = {
  line_est_dd: 'est_dd',
  line_rem: 'rem',
};

export function resolveLineFieldKey(
  colKey: string,
  fieldKeys: ReadonlySet<string>
): string | null {
  const key = LINE_COL_ALIASES[colKey] ?? colKey;
  return fieldKeys.has(key) ? key : null;
}

/** 单据表身编辑表：列配置面板与可见列仅含表身字段 + 表身扩展列 */
export function isBillLineGridColumn(
  col: { col_key: string; is_system?: boolean; grid_area?: string | null },
  fieldKeys: ReadonlySet<string>
): boolean {
  if (!col.is_system) return col.grid_area === 'line';
  return resolveLineFieldKey(col.col_key, fieldKeys) != null;
}
