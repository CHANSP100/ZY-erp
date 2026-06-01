import type { DetailGridColumn } from '@/api/types';
import type { BillLinePasteColumn } from '@/utils/billLinePaste';
import { staticSelectOptions, tableNameForSelect } from '@/utils/extFieldRuntime';
import { findLookupExactByValueKey } from '@/utils/lookupFilter';

export type PastedLookupCell = {
  rowIndex: number;
  fieldKey: string;
  label: string;
  value: string;
  col: BillLinePasteColumn;
};

export type PastedLookupContext = {
  lookupProducts?: Record<string, unknown>[];
  lookupResolveByCode?: (code: string) => Promise<Record<string, unknown> | null | undefined>;
  lookupResolveWhByCode?: (code: string) => Promise<Record<string, unknown> | null | undefined>;
  whs?: { wh: string; name?: string }[];
  tableOptions?: Record<string, { value: string; label: string }[]>;
};

export type PastedLookupValidateResult =
  | { ok: true; row?: Record<string, unknown> }
  | { ok: false };

export function pasteCellKey(rowIndex: number, fieldKey: string): string {
  return `${rowIndex}:${fieldKey}`;
}

export type PastedLookupBatchResult = {
  invalid: PastedLookupCell[];
  selectedProducts: { rowIndex: number; row: Record<string, unknown> }[];
};

/** 批量校验粘贴开窗栏位，返回全部无效项与有效品号带出 */
export async function validatePastedLookupBatch(
  cells: PastedLookupCell[],
  ctx: PastedLookupContext
): Promise<PastedLookupBatchResult> {
  const invalid: PastedLookupCell[] = [];
  const selectedProducts: { rowIndex: number; row: Record<string, unknown> }[] = [];

  for (const cell of cells) {
    const result = await validatePastedLookupCell(cell, ctx);
    if (result.ok) {
      if (cell.fieldKey === 'prd_no' && result.row) {
        selectedProducts.push({ rowIndex: cell.rowIndex, row: result.row });
      }
      continue;
    }
    invalid.push(cell);
  }

  return { invalid, selectedProducts };
}

function isPastedLookupColumn(col: BillLinePasteColumn): boolean {
  if (col.isExt) return col.extCol?.field_source === 'select';
  if (col.key === 'prd_no') return true;
  if (col.key === 'wh' || col.widget === 'lookup') return true;
  return false;
}

/** 收集本次粘贴矩阵中涉及的开窗 / 下拉栏位（按行、列顺序） */
export function collectPastedLookupCells(
  grid: string[][],
  columns: BillLinePasteColumn[],
  startRowIndex: number,
  startColIndex: number,
  fieldLabels: Map<string, string>
): PastedLookupCell[] {
  const cells: PastedLookupCell[] = [];
  for (let r = 0; r < grid.length; r++) {
    const rowCells = grid[r] ?? [];
    for (let c = 0; c < rowCells.length; c++) {
      const col = columns[startColIndex + c];
      if (!col || !isPastedLookupColumn(col)) continue;
      const value = String(rowCells[c] ?? '').trim();
      if (!value) continue;
      cells.push({
        rowIndex: startRowIndex + r,
        fieldKey: col.key,
        label: fieldLabels.get(col.key) || col.key,
        value,
        col,
      });
    }
  }
  return cells;
}

async function validateProductLookup(
  value: string,
  ctx: PastedLookupContext
): Promise<PastedLookupValidateResult> {
  const rows = ctx.lookupProducts ?? [];
  const exact = findLookupExactByValueKey(rows, value, 'prd_no');
  if (exact) return { ok: true, row: exact };

  if (ctx.lookupResolveByCode) {
    try {
      const remote = await ctx.lookupResolveByCode(value);
      if (remote && String(remote.prd_no ?? '').trim().toLowerCase() === value.toLowerCase()) {
        const inSet = findLookupExactByValueKey(rows, value, 'prd_no');
        if (inSet) return { ok: true, row: inSet };
        if (rows.length === 0) return { ok: true, row: remote };
      }
    } catch {
      /* ignore */
    }
  }

  return { ok: false };
}

async function validateWhLookup(
  value: string,
  ctx: PastedLookupContext
): Promise<PastedLookupValidateResult> {
  if (ctx.whs?.some((w) => w.wh === value)) return { ok: true };

  if (ctx.lookupResolveWhByCode) {
    try {
      const remote = await ctx.lookupResolveWhByCode(value);
      if (remote && String(remote.wh ?? '').trim() === value) {
        return { ok: true };
      }
    } catch {
      /* ignore */
    }
  }

  return { ok: false };
}

function validateExtSelectLookup(
  value: string,
  col: DetailGridColumn | undefined,
  ctx: PastedLookupContext
): PastedLookupValidateResult {
  if (!col) return { ok: false };
  const staticOpts = staticSelectOptions(col);
  if (staticOpts.length) {
    return staticOpts.some((o) => o.value === value) ? { ok: true } : { ok: false };
  }
  const table = tableNameForSelect(col);
  const opts = table ? ctx.tableOptions?.[table] ?? [] : [];
  return opts.some((o) => o.value === value) ? { ok: true } : { ok: false };
}

/** 校验粘贴值是否落在开窗 / 下拉候选范围内 */
export async function validatePastedLookupCell(
  cell: PastedLookupCell,
  ctx: PastedLookupContext
): Promise<PastedLookupValidateResult> {
  if (cell.col.isExt) {
    return validateExtSelectLookup(cell.value, cell.col.extCol, ctx);
  }
  if (cell.fieldKey === 'prd_no') {
    return validateProductLookup(cell.value, ctx);
  }
  if (cell.fieldKey === 'wh' || cell.col.widget === 'lookup') {
    return validateWhLookup(cell.value, ctx);
  }
  return { ok: true };
}
