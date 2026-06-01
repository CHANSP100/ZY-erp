import QRCode from 'qrcode';
import { escapeHtml, type ExportColumn } from '@/utils/exportExcel';

/** 打印模板占位符变量 */
export interface PrintTemplateVars {
  title: string;
  print_time: string;
  row_count: string;
  table: string;
  /** 二维码内容（与 {{qrcode}} / {{qrcode_text}} 对应） */
  qrcode_text?: string;
  /** 单号等，未设 qrcode_text 时可作为二维码内容 */
  doc_no?: string;
}

export const PRINT_TEMPLATE_PLACEHOLDERS =
  '{{title}} {{print_time}} {{row_count}} {{table}} {{qrcode}} {{qrcode_text}} {{doc_no}}';

const DOC_NO_KEYS = ['os_no', 'ps_no', 'sq_no', 'bil_no', 'cus_os_no', 'po_no'] as const;

/** 从明细/列表首行推断单号，供二维码默认内容 */
export function inferDocNoFromRows(rows: Record<string, string>[]): string {
  if (!rows.length) return '';
  const row = rows[0];
  for (const key of DOC_NO_KEYS) {
    const v = String(row[key] ?? '').trim();
    if (v) return v;
  }
  return '';
}

export function resolveQrcodeText(vars: PrintTemplateVars, rows?: Record<string, string>[]): string {
  const explicit = String(vars.qrcode_text ?? vars.doc_no ?? '').trim();
  if (explicit) return explicit;
  if (rows?.length) return inferDocNoFromRows(rows);
  return '';
}

export async function buildQrcodeImgHtml(text: string, size = 120): Promise<string> {
  const payload = String(text ?? '').trim();
  if (!payload) {
    return '<span class="erp-print-qrcode erp-print-qrcode--empty"></span>';
  }
  try {
    const src = await QRCode.toDataURL(payload, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
    });
    return `<div class="erp-print-qrcode"><img src="${src}" alt="" width="${size}" height="${size}" /></div>`;
  } catch {
    return `<span class="erp-print-qrcode erp-print-qrcode--error">${escapeHtml(payload)}</span>`;
  }
}

function replaceIfPresent(html: string, token: string, value: string): string {
  if (!html.includes(token)) return html;
  return html.split(token).join(value);
}

/** 异步渲染模板（含二维码图片） */
export async function renderPrintHtmlAsync(
  templateContent: string,
  vars: PrintTemplateVars,
  opts?: { rows?: Record<string, string>[]; qrcodeSize?: number }
): Promise<string> {
  let html = templateContent || '<div class="erp-print-title">{{title}}</div>{{table}}';
  const qrcodeText = resolveQrcodeText(vars, opts?.rows);
  const docNo = String(vars.doc_no ?? '').trim() || inferDocNoFromRows(opts?.rows ?? []);

  html = replaceIfPresent(html, '{{title}}', escapeHtml(vars.title));
  html = replaceIfPresent(html, '{{print_time}}', escapeHtml(vars.print_time));
  html = replaceIfPresent(html, '{{row_count}}', escapeHtml(vars.row_count));
  html = replaceIfPresent(html, '{{table}}', vars.table);
  html = replaceIfPresent(html, '{{qrcode_text}}', escapeHtml(qrcodeText));
  html = replaceIfPresent(html, '{{doc_no}}', escapeHtml(docNo));

  if (html.includes('{{qrcode}}')) {
    const qrHtml = qrcodeText
      ? await buildQrcodeImgHtml(qrcodeText, opts?.qrcodeSize ?? 120)
      : '';
    html = replaceIfPresent(html, '{{qrcode}}', qrHtml);
  }

  return html;
}

export type { ExportColumn };
