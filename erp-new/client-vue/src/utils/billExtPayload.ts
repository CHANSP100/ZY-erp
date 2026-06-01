/** 单据存盘 payload — 携带 ext_fields 写入 _Z 表 */
export function buildBillSavePayload<THead extends Record<string, unknown>, TLine extends Record<string, unknown>>(
  head: THead,
  lines: TLine[],
  stripLine?: (ln: TLine) => Record<string, unknown>
) {
  return {
    head: {
      ...head,
      ext_fields: (head.ext_fields as Record<string, unknown> | undefined) ?? {},
    },
    lines: lines.map((ln) => {
      const base = stripLine ? stripLine(ln) : { ...ln };
      return {
        ...base,
        ext_fields: (ln.ext_fields as Record<string, unknown> | undefined) ?? {},
      };
    }),
  };
}

/** 档案存盘 payload — 携带 ext_fields 写入 _Z 表 */
export function buildArchiveSavePayload<T extends Record<string, unknown>>(body: T) {
  return {
    ...body,
    ext_fields: (body.ext_fields as Record<string, unknown> | undefined) ?? {},
  };
}

export function mergeLoadedExtFields<T extends Record<string, unknown>>(row: T): T {
  const ext = (row.ext_fields as Record<string, unknown> | undefined) ?? {};
  return { ...row, ext_fields: ext };
}
