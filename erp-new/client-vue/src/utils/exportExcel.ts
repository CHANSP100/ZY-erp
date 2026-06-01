export interface ExportColumn {
  key: string;
  label: string;
}

export function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 导出为 Excel 可打开的 .xls（HTML 表格） */
export function exportRowsToExcel(opts: {
  fileName: string;
  columns: ExportColumn[];
  rows: Record<string, string>[];
}) {
  const ths = opts.columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('');
  const body = opts.rows
    .map((row) => {
      const tds = opts.columns
        .map((c) => `<td>${escapeHtml(row[c.key] ?? '')}</td>`)
        .join('');
      return `<tr>${tds}</tr>`;
    })
    .join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><table border="1"><thead><tr>${ths}</tr></thead><tbody>${body}</tbody></table></body></html>`;
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${opts.fileName}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildPrintTableHtml(columns: ExportColumn[], rows: Record<string, string>[]): string {
  const ths = columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('');
  const trs = rows
    .map((row) => {
      const tds = columns.map((c) => `<td>${escapeHtml(row[c.key] ?? '')}</td>`).join('');
      return `<tr>${tds}</tr>`;
    })
    .join('');
  return `<table class="erp-print-table" border="1" cellspacing="0" cellpadding="4"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
}

/** 同步渲染（不含 {{qrcode}}）；含二维码请用 printRender.renderPrintHtmlAsync */
export function renderPrintHtml(
  templateContent: string,
  vars: { title: string; print_time: string; row_count: string; table: string }
): string {
  let html = templateContent || '<div>{{title}}</div>{{table}}';
  html = html.replace(/\{\{title\}\}/g, escapeHtml(vars.title));
  html = html.replace(/\{\{print_time\}\}/g, escapeHtml(vars.print_time));
  html = html.replace(/\{\{row_count\}\}/g, escapeHtml(vars.row_count));
  html = html.replace(/\{\{table\}\}/g, vars.table);
  html = html.replace(/\{\{qrcode\}\}/g, '');
  html = html.replace(/\{\{qrcode_text\}\}/g, '');
  html = html.replace(/\{\{doc_no\}\}/g, '');
  return html;
}

export const PRINTER_OPTIONS = [
  { value: 'default', label: '系统默认打印机（打印时选择）' },
  { value: 'pdf', label: 'Microsoft Print to PDF' },
  { value: 'xps', label: 'Microsoft XPS Document Writer' },
];

export function openPrintPreview(htmlBody: string, title: string) {
  const win = window.open('', '_blank', 'width=960,height=720');
  if (!win) return false;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
body{font-family:"Microsoft YaHei",sans-serif;font-size:12px;color:#1d2129;padding:16px;}
.erp-print-title{margin:0 0 8px;font-size:16px;}
.erp-print-meta{margin:0 0 12px;color:#4e5969;}
.erp-print-table{width:100%;border-collapse:collapse;}
.erp-print-table th{background:#f5f7fa;font-weight:600;}
.erp-print-table th,.erp-print-table td{border:1px solid #e5e6eb;padding:4px 6px;}
.erp-print-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:12px;}
.erp-print-qrcode{flex-shrink:0;}
.erp-print-qrcode img{display:block;}
.erp-print-qrcode--empty{display:none;}
@media print{body{padding:0;}}
</style></head><body>${htmlBody}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
  return true;
}
