import type { BillAuditMeta } from '@/api/types';

export function isBillAudited(meta: BillAuditMeta | null | undefined): boolean {
  return !!(meta?.chk_man && String(meta.chk_man).trim());
}

export function applyBillAuditMeta(
  target: BillAuditMeta,
  patch: Partial<BillAuditMeta> | null | undefined
) {
  if (!patch) return;
  if (patch.usr != null) target.usr = patch.usr;
  if (patch.sys_date != null) target.sys_date = patch.sys_date;
  if (patch.chk_man != null) target.chk_man = patch.chk_man;
  if (patch.cls_date != null) target.cls_date = patch.cls_date;
}

export function clearBillAuditMeta(target: BillAuditMeta) {
  target.chk_man = '';
  target.cls_date = '';
}
