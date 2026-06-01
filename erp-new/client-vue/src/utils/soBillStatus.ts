export type SoStatusKind = 'open' | 'audited' | 'closed' | 'analyzed';

export interface SoStatusTag {
  kind: SoStatusKind;
  label: string;
}

export function resolveSoBillStatus(
  row: { cls_id?: string | null; cls_mp_id?: string | null; os_no?: string; chk_man?: string | null },
  auditedOsNos: Set<string>
): SoStatusTag {
  const cls = String(row.cls_id ?? '').trim().toUpperCase();
  if (cls === 'T' || cls === 'Y' || cls === '1') {
    return { kind: 'closed', label: '已结案' };
  }
  if (row.chk_man && String(row.chk_man).trim()) {
    return { kind: 'audited', label: '已审核' };
  }
  if (row.os_no && auditedOsNos.has(row.os_no)) {
    return { kind: 'audited', label: '已审核' };
  }
  const mp = String(row.cls_mp_id ?? '').trim().toUpperCase();
  if (mp === 'T' || mp === 'Y' || mp === '1') {
    return { kind: 'analyzed', label: '已分析' };
  }
  return { kind: 'open', label: '开立' };
}

export function isSoBillClosed(row: { cls_id?: string | null }): boolean {
  const cls = String(row.cls_id ?? '').trim().toUpperCase();
  return cls === 'T' || cls === 'Y' || cls === '1';
}
