/** 字段元数据 — 与 analysis/字段对照/*.md 本期表同步 */

export type ErpWidget =
  | 'input'
  | 'input-readonly'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'lookup'
  | 'hidden'
  | 'upload';

export interface ErpFieldMeta {
  /** 对照表 # 序号 */
  order: number;
  /** 数据库字段名（对照表「字段名」列） */
  dbField: string;
  /** 前端/API 属性 snake_case */
  key: string;
  /** 对照表「中文名称」 */
  label: string;
  query?: boolean;
  list?: boolean;
  form?: boolean;
  required?: boolean;
  readonly?: boolean;
  widget?: ErpWidget;
  area: 'head' | 'line' | 'sub';
  /** 列表列宽提示 */
  width?: number;
  minWidth?: number;
}

export function pickQuery(fields: ErpFieldMeta[]): ErpFieldMeta[] {
  return fields.filter((f) => f.query).sort((a, b) => a.order - b.order);
}

export function pickList(fields: ErpFieldMeta[]): ErpFieldMeta[] {
  return fields.filter((f) => f.list).sort((a, b) => a.order - b.order);
}

export function pickForm(fields: ErpFieldMeta[]): ErpFieldMeta[] {
  return fields
    .filter((f) => f.form && f.widget !== 'hidden')
    .sort((a, b) => a.order - b.order);
}

export function labelMap(fields: ErpFieldMeta[]): Record<string, string> {
  return Object.fromEntries(fields.map((f) => [f.key, f.label]));
}

export function findField(fields: ErpFieldMeta[], key: string): ErpFieldMeta | undefined {
  return fields.find((f) => f.key === key);
}

/** 表头表单按对照表顺序分行（每行 4 列，textarea 独占一行） */
export function chunkFormFields(fields: ErpFieldMeta[], cols = 4): ErpFieldMeta[][] {
  const out: ErpFieldMeta[][] = [];
  let row: ErpFieldMeta[] = [];
  for (const f of fields) {
    if (f.widget === 'textarea') {
      if (row.length) {
        out.push(row);
        row = [];
      }
      out.push([f]);
      continue;
    }
    row.push(f);
    if (row.length >= cols) {
      out.push(row);
      row = [];
    }
  }
  if (row.length) out.push(row);
  return out;
}
