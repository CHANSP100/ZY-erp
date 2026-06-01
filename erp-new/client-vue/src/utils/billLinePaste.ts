import type { DetailGridColumn } from '@/api/types';
import type { ErpFieldMeta, ErpWidget } from '@/config/fields/types';
import { lineExtFieldPatch } from '@/utils/extFieldRuntime';

export interface BillLinePasteColumn {
  key: string;
  widget?: ErpWidget;
  readonly?: boolean;
  isExt?: boolean;
  extCol?: DetailGridColumn;
}

/** 解析 Excel / 剪贴板 TSV（制表符分列、换行分行） */
export function parseClipboardGrid(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n$/, '');
  if (!normalized.trim()) return [];
  return normalized.split('\n').map((line) => line.split('\t'));
}

export function isMultiCellClipboard(text: string): boolean {
  const grid = parseClipboardGrid(text);
  if (grid.length > 1) return true;
  return (grid[0]?.length ?? 0) > 1;
}

function isPasteableField(field: ErpFieldMeta): boolean {
  if (field.readonly || field.widget === 'hidden' || field.widget === 'input-readonly') return false;
  if (field.widget === 'upload') return false;
  return true;
}

export function pasteColumnsFromFields(fields: ErpFieldMeta[]): BillLinePasteColumn[] {
  return fields.filter(isPasteableField).map((f) => ({
    key: f.key,
    widget: f.widget,
    readonly: f.readonly,
  }));
}

export function pasteColumnsFromBundles(
  bundles: { field: ErpFieldMeta }[],
  extCols: DetailGridColumn[] = []
): BillLinePasteColumn[] {
  const cols = bundles
    .map((b) => b.field)
    .filter(isPasteableField)
    .map((f) => ({ key: f.key, widget: f.widget, readonly: f.readonly }));
  for (const ec of extCols) {
    cols.push({ key: ec.col_key, isExt: true, extCol: ec });
  }
  return cols;
}

function coerceFieldValue(col: BillLinePasteColumn, raw: string): unknown {
  const text = raw.trim();
  if (col.widget === 'number') {
    const n = Number(text.replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  if (col.widget === 'date') return text;
  return text;
}

function coerceExtValue(col: DetailGridColumn | undefined, raw: string): unknown {
  const text = raw.trim();
  if (col?.widget === 'number') {
    const n = Number(text.replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  return text;
}

/** 自 anchor 列起，将剪贴板矩阵映射为各行 patch */
export function buildBillLinePastePatches(
  grid: string[][],
  columns: BillLinePasteColumn[],
  startRowIndex: number,
  startColIndex: number,
  existingLines: Record<string, unknown>[]
): Record<string, unknown>[] {
  if (startColIndex < 0 || !grid.length) return [];

  const patches: Record<string, unknown>[] = [];
  for (let r = 0; r < grid.length; r++) {
    const baseRow = existingLines[startRowIndex + r] ?? {};
    let patch: Record<string, unknown> = {};
    const cells = grid[r] ?? [];
    for (let c = 0; c < cells.length; c++) {
      const col = columns[startColIndex + c];
      if (!col) break;
      const raw = cells[c] ?? '';
      if (col.isExt) {
        patch = lineExtFieldPatch(
          { ...baseRow, ...patch },
          col.key,
          coerceExtValue(col.extCol, raw)
        );
      } else {
        patch[col.key] = coerceFieldValue(col, raw);
      }
    }
    if (Object.keys(patch).length) patches.push(patch);
  }
  return patches;
}

export function countBillLineRowsToAdd(
  lineCount: number,
  startRowIndex: number,
  pasteRowCount: number
): number {
  return Math.max(0, startRowIndex + pasteRowCount - lineCount);
}
