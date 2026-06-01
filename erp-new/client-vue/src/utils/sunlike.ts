/** SUNLIKE 9.0 全局参数 — DEV-01 第一节 */

export const SUNLIKE_PRECISION = {
  qty: 2,
  price: 4,
  amount: 2,
  tax: 2,
  ratio: 4,
} as const;

const YES = new Set(['Y', 'y', 'T', 't', '1', '是']);

/** 文本空值：null/undefined → 空字符串 */
export function fmtText(v: unknown): string {
  if (v == null) return '';
  return String(v);
}

/** 数值展示；空值按 0 处理 */
export function fmtNum(v: unknown, precision = 2): string {
  if (v == null || v === '') return (0).toFixed(precision);
  const n = Number(v);
  if (Number.isNaN(n)) return (0).toFixed(precision);
  return n.toFixed(precision);
}

export function fmtQty(v: unknown): string {
  return fmtNum(v, SUNLIKE_PRECISION.qty);
}

export function fmtPrice(v: unknown): string {
  return fmtNum(v, SUNLIKE_PRECISION.price);
}

/** 停止使用=是（货品 STOP_ID） */
export function isStopYes(v?: string | null): boolean {
  return YES.has(String(v ?? '').trim());
}

export function stopYesLabel(v?: string | null): string {
  return isStopYes(v) ? '是' : '否';
}

/** 中类停用：停用日期已填且 ≤ 今天 */
export function isIndxStopped(row: { stop_dd?: string | null }, today = todayStr()): boolean {
  const d = row.stop_dd?.trim();
  if (!d) return false;
  return d <= today;
}

export function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 表格停用行 class */
export function archiveRowClass(row: {
  stop_id?: string | null;
  stop_dd?: string | null;
  end_dd?: string | null;
  dut_ot_d?: string | null;
}): string {
  if (
    isStopYes(row.stop_id) ||
    isIndxStopped(row) ||
    isIndxStopped({ stop_dd: row.end_dd }) ||
    isIndxStopped({ stop_dd: row.dut_ot_d })
  ) {
    return 'erp-row--stopped';
  }
  return '';
}

type HierarchyRow = { id: string; up?: string | null; stop_dd?: string | null };

function getHierarchyDescendants(list: HierarchyRow[], root: string): Set<string> {
  const byUp = new Map<string, string[]>();
  for (const r of list) {
    const up = r.up?.trim();
    if (up) {
      const arr = byUp.get(up) ?? [];
      arr.push(r.id);
      byUp.set(up, arr);
    }
  }
  const out = new Set<string>();
  const stack = [...(byUp.get(root) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    out.add(id);
    stack.push(...(byUp.get(id) ?? []));
  }
  return out;
}

/** 部门：收集节点自身 + 全部下级代号 */
export function collectDeptSubtreeIds(
  list: Array<{ dep: string; up?: string | null }>,
  root: string
): Set<string> {
  const ids = new Set<string>([root]);
  getHierarchyDescendants(
    list.map((r) => ({ id: r.dep, up: r.up })),
    root
  ).forEach((id) => ids.add(id));
  return ids;
}

export function isValidDeptParent(
  list: Array<{ dep: string; up?: string | null }>,
  self: string | null,
  parent?: string | null
): boolean {
  const p = parent?.trim();
  if (!p) return true;
  if (self && p === self) return false;
  if (self) {
    const desc = getHierarchyDescendants(
      list.map((r) => ({ id: r.dep, up: r.up })),
      self
    );
    if (desc.has(p)) return false;
  }
  return true;
}

export function selectableDeptParents(
  list: Array<{ dep: string; up?: string | null; stop_dd?: string | null }>,
  self: string | null
): typeof list {
  const blocked = new Set<string>();
  if (self) {
    blocked.add(self);
    getHierarchyDescendants(
      list.map((r) => ({ id: r.dep, up: r.up })),
      self
    ).forEach((id) => blocked.add(id));
  }
  return list.filter((r) => !blocked.has(r.dep) && !isIndxStopped(r));
}

function hierarchyList<T extends Record<string, unknown>>(
  rows: T[],
  idKey: keyof T,
  upKey: keyof T
): HierarchyRow[] {
  return rows.map((r) => ({
    id: String(r[idKey]),
    up: (r[upKey] as string | null | undefined) ?? null,
  }));
}

export function isValidWhParent(
  list: Array<{ wh: string; up_wh?: string | null }>,
  self: string | null,
  parent?: string | null
): boolean {
  const p = parent?.trim();
  if (!p) return true;
  if (self && p === self) return false;
  if (self) {
    const desc = getHierarchyDescendants(
      hierarchyList(list, 'wh', 'up_wh'),
      self
    );
    if (desc.has(p)) return false;
  }
  return true;
}

export function selectableWhParents(
  list: Array<{ wh: string; up_wh?: string | null; stop_dd?: string | null }>,
  self: string | null
): typeof list {
  const blocked = new Set<string>();
  if (self) {
    blocked.add(self);
    getHierarchyDescendants(hierarchyList(list, 'wh', 'up_wh'), self).forEach((id) =>
      blocked.add(id)
    );
  }
  return list.filter((r) => !blocked.has(r.wh) && !isIndxStopped(r));
}

/** 仓库：收集节点自身 + 全部下级库位代号 */
export function collectWhSubtreeIds(
  list: Array<{ wh: string; up_wh?: string | null }>,
  root: string
): Set<string> {
  const ids = new Set<string>([root]);
  getHierarchyDescendants(hierarchyList(list, 'wh', 'up_wh'), root).forEach((id) => ids.add(id));
  return ids;
}

export function isValidSalmParent(
  list: Array<{ sal_no: string; up_sal_no?: string | null }>,
  self: string | null,
  parent?: string | null
): boolean {
  const p = parent?.trim();
  if (!p) return true;
  if (self && p === self) return false;
  if (self) {
    const desc = getHierarchyDescendants(
      hierarchyList(list, 'sal_no', 'up_sal_no'),
      self
    );
    if (desc.has(p)) return false;
  }
  return true;
}

export function selectableSalmParents(
  list: Array<{ sal_no: string; up_sal_no?: string | null; dut_ot_d?: string | null }>,
  self: string | null
): typeof list {
  const blocked = new Set<string>();
  if (self) {
    blocked.add(self);
    getHierarchyDescendants(hierarchyList(list, 'sal_no', 'up_sal_no'), self).forEach((id) =>
      blocked.add(id)
    );
  }
  return list.filter(
    (r) => !blocked.has(r.sal_no) && !isIndxStopped({ stop_dd: r.dut_ot_d })
  );
}

/** 中类：收集所有下级代号（防层级闭环） */
export function getIndxDescendants(
  list: Array<{ idx_no: string; idx_up?: string | null }>,
  root: string
): Set<string> {
  const byUp = new Map<string, string[]>();
  for (const r of list) {
    const up = r.idx_up?.trim();
    if (up) {
      const arr = byUp.get(up) ?? [];
      arr.push(r.idx_no);
      byUp.set(up, arr);
    }
  }
  const out = new Set<string>();
  const stack = [...(byUp.get(root) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    out.add(id);
    stack.push(...(byUp.get(id) ?? []));
  }
  return out;
}

export const INDX_ROOT_NO = '0000000000';

export function isValidIndxParent(
  list: Array<{ idx_no: string; idx_up?: string | null }>,
  self: string | null,
  parent?: string | null
): boolean {
  const p = parent?.trim();
  if (!p) return true;
  if (p === INDX_ROOT_NO) return true;
  if (self && p === self) return false;
  if (self) {
    const desc = getIndxDescendants(list, self);
    if (desc.has(p)) return false;
  }
  return true;
}

/** 中类是否为末阶（无下级） */
export function isIndxLeaf(
  list: Array<{ idx_no: string; idx_up?: string | null }>,
  idxNo: string
): boolean {
  const code = idxNo?.trim();
  if (!code || code === INDX_ROOT_NO) return false;
  return !list.some((r) => r.idx_up?.trim() === code);
}

/** 可选上层中类：排除自身、下级、已停用 */
export function selectableIndxParents(
  list: Array<{ idx_no: string; idx_up?: string | null; stop_dd?: string | null }>,
  self: string | null
): typeof list {
  const blocked = new Set<string>();
  if (self) {
    blocked.add(self);
    getIndxDescendants(list, self).forEach((id) => blocked.add(id));
  }
  return list.filter(
    (r) => r.idx_no !== INDX_ROOT_NO && !blocked.has(r.idx_no) && !isIndxStopped(r)
  );
}

/** 可选中类（货品 idx1）：末阶、未停用 */
export function selectableIndxForProduct(
  list: Array<{ idx_no: string; idx_up?: string | null; stop_dd?: string | null }>
): typeof list {
  return list.filter(
    (r) => r.idx_no !== INDX_ROOT_NO && !isIndxStopped(r) && isIndxLeaf(list, r.idx_no)
  );
}

/** 中类：收集节点自身 + 全部下级代号 */
export function collectIndxSubtreeIds(
  list: Array<{ idx_no: string; idx_up?: string | null }>,
  root: string
): Set<string> {
  const ids = new Set<string>([root]);
  getIndxDescendants(list, root).forEach((id) => ids.add(id));
  return ids;
}

export const AREA_ROOT_NO = '00000000';

export function getAreaDescendants(
  list: Array<{ area_no: string; area_up?: string | null }>,
  root: string
): Set<string> {
  const byUp = new Map<string, string[]>();
  for (const r of list) {
    const up = r.area_up?.trim();
    if (up) {
      const arr = byUp.get(up) ?? [];
      arr.push(r.area_no);
      byUp.set(up, arr);
    }
  }
  const out = new Set<string>();
  const stack = [...(byUp.get(root) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    out.add(id);
    stack.push(...(byUp.get(id) ?? []));
  }
  return out;
}

export function isValidAreaParent(
  list: Array<{ area_no: string; area_up?: string | null }>,
  self: string | null,
  parent?: string | null
): boolean {
  const p = parent?.trim();
  if (!p) return true;
  if (p === AREA_ROOT_NO) return true;
  if (self && p === self) return false;
  if (self) {
    const desc = getAreaDescendants(list, self);
    if (desc.has(p)) return false;
  }
  return true;
}

export function selectableAreaParents(
  list: Array<{ area_no: string; area_up?: string | null; stop_dd?: string | null }>,
  self: string | null
): typeof list {
  const blocked = new Set<string>();
  if (self) {
    blocked.add(self);
    getAreaDescendants(list, self).forEach((id) => blocked.add(id));
  }
  return list.filter(
    (r) => r.area_no !== AREA_ROOT_NO && !blocked.has(r.area_no) && !isIndxStopped(r)
  );
}

export function collectAreaSubtreeIds(
  list: Array<{ area_no: string; area_up?: string | null }>,
  root: string
): Set<string> {
  const ids = new Set<string>([root]);
  getAreaDescendants(list, root).forEach((id) => ids.add(id));
  return ids;
}

export function apiErrorMessage(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { error?: string } } };
  return err.response?.data?.error || fallback;
}

export const LOAD_FAIL_HINT =
  '数据加载失败，请确认后端已启动：在 erp-new/server 目录执行 npm start（端口 3001）';
