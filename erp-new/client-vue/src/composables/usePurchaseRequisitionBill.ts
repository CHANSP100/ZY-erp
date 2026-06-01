import { computed, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { api } from '@/api';
import type {
  Cust,
  Dept,
  Product,
  PurchaseRequisitionHead,
  PurchaseRequisitionLine,
  Salm,
} from '@/api/types';
import { INV_AQ, pickForm, pickList, pickQuery } from '@/config/fields';
import { buildBillSavePayload } from '@/utils/billExtPayload';
import { applyBillAuditMeta, clearBillAuditMeta, isBillAudited } from '@/utils/billAudit';

export type SqLineRow = PurchaseRequisitionLine & { _key: string };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function newLine(key: string): SqLineRow {
  return {
    _key: key,
    prd_no: '',
    prd_name: '',
    prd_mark: '',
    unit: '',
    qty: 0,
    up: 0,
    amtn: 0,
    est_dd: '',
    rem: '',
    qty_po: 0,
  };
}

function recalcLine(ln: SqLineRow): SqLineRow {
  const q = Number(ln.qty) || 0;
  const p = Number(ln.up) || 0;
  return { ...ln, amtn: Math.round(q * p * 100) / 100 };
}

export function usePurchaseRequisitionBill() {
  const formLabels = {
    billName: '请购单',
    partnerName: '采购对象',
    formTitleNew: '新增请购单',
    formTitleEdit: '编辑请购单',
    formTitleView: '查看请购单',
    orderNoLabel: '请购单号',
    selectPartner: '选择采购对象',
    selectPartnerDialog: '选择采购对象',
    requirePartner: '请选择采购对象',
    deleteConfirm: (no: string) => `确定删除请购单 ${no}？`,
  };

  const viewMode = ref<'list' | 'form'>('list');
  const formViewOnly = ref(false);
  const auditedSqNos = ref<Set<string>>(new Set());

  const head = reactive<PurchaseRequisitionHead>({
    sq_no: '',
    sq_dd: today(),
    cus_no: '',
    dep: '',
    sal_no: '',
    est_dd: '',
    rem: '',
    cur_id: 'RMB',
    exc_rto: 1,
    ext_fields: {},
  });

  const lines = ref<SqLineRow[]>([]);
  const list = ref<PurchaseRequisitionHead[]>([]);
  const filters = reactive({
    sq_no: '',
    cus_no: '',
    dateFrom: '',
    dateTo: '',
  });

  const headQueryFields = pickQuery(INV_AQ.head);
  const headListFields = pickList(INV_AQ.head);
  const lineFormFields = pickForm(INV_AQ.line);
  const loading = ref(false);
  const saving = ref(false);
  const custs = ref<Cust[]>([]);
  const salms = ref<Salm[]>([]);
  const depts = ref<Dept[]>([]);
  const products = ref<Product[]>([]);
  const editing = ref<string | null>(null);

  const custName = computed(() => custs.value.find((c) => c.cus_no === head.cus_no)?.name || '');
  const salName = computed(() => salms.value.find((s) => s.sal_no === head.sal_no)?.name || '');
  const depName = computed(() => depts.value.find((d) => d.dep === head.dep)?.name || '');
  const poDepName = computed(() => depts.value.find((d) => d.dep === head.po_dep)?.name || '');

  const totals = computed(() => {
    let amtn = 0;
    for (const ln of lines.value) amtn += Number(ln.amtn) || 0;
    return { amtn_net: Math.round(amtn * 100) / 100, tax: 0 };
  });

  const isFormReadonly = computed(
    () => formViewOnly.value || isBillAudited(head) || (head.sq_no ? auditedSqNos.value.has(head.sq_no) : false)
  );

  const filteredList = computed(() => {
    let rows = list.value;
    const qNo = filters.sq_no.trim().toLowerCase();
    const qCus = filters.cus_no.trim().toLowerCase();
    if (qNo) rows = rows.filter((r) => r.sq_no?.toLowerCase().includes(qNo));
    if (qCus) {
      rows = rows.filter(
        (r) =>
          r.cus_name?.toLowerCase().includes(qCus) || r.cus_no?.toLowerCase().includes(qCus)
      );
    }
    if (filters.dateFrom) rows = rows.filter((r) => (r.sq_dd || '') >= filters.dateFrom);
    if (filters.dateTo) rows = rows.filter((r) => (r.sq_dd || '') <= filters.dateTo);
    return rows;
  });

  function billStatus(row: PurchaseRequisitionHead) {
    if (isBillAudited(row)) {
      return { label: '已审核', kind: 'audited' as const };
    }
    if (row.sq_no && auditedSqNos.value.has(row.sq_no)) {
      return { label: '已审核', kind: 'audited' as const };
    }
    if (row.cls_id === 'T') return { label: '已结案', kind: 'closed' as const };
    return { label: '开立', kind: 'open' as const };
  }

  async function loadMasters() {
    const [c, s, d, p] = await Promise.all([
      api.custList({ limit: 500 }),
      api.salmList(),
      api.deptList(),
      api.productList({ limit: 500 }),
    ]);
    custs.value = c.data;
    salms.value = s.data;
    depts.value = d.data;
    products.value = p.data;
  }

  async function reloadAll() {
    loading.value = true;
    try {
      const { data } = await api.purchaseRequisitionList({
        limit: 500,
        date_from: filters.dateFrom || undefined,
        date_to: filters.dateTo || undefined,
      });
      list.value = data;
    } finally {
      loading.value = false;
    }
  }

  async function onNew() {
    const { data } = await api.nextPurchaseRequisitionNo();
    Object.assign(head, {
      sq_no: data.sq_no,
      sq_dd: today(),
      dep: '',
      cus_no: '',
      sal_no: '',
      est_dd: '',
      rem: '',
      po_dep: '',
      cur_id: 'RMB',
      exc_rto: 1,
      cls_id: '',
      amtn: 0,
      ext_fields: {},
    });
    lines.value = [];
    editing.value = null;
    formViewOnly.value = false;
  }

  function applyCust(c: Cust) {
    if (isFormReadonly.value) return;
    head.cus_no = c.cus_no;
    head.sal_no = c.sal_no || head.sal_no;
    head.cur_id = c.cur_id || 'RMB';
  }

  function addLine() {
    if (isFormReadonly.value) return;
    const est = head.est_dd || '';
    lines.value = [...lines.value, recalcLine({ ...newLine(String(lines.value.length + 1)), est_dd: est })];
  }

  function copySelectedLines(indices: number[]) {
    if (isFormReadonly.value) return;
    if (!indices.length) {
      ElMessage.warning('请先选择要复制的行');
      return;
    }
    const sorted = [...indices].sort((a, b) => a - b);
    const next = [...lines.value];
    let offset = 0;
    for (const idx of sorted) {
      const src = lines.value[idx];
      if (!src) continue;
      next.splice(idx + 1 + offset, 0, recalcLine({ ...src, _key: `c${Date.now()}${idx}` }));
      offset++;
    }
    lines.value = next.map((ln, i) => ({ ...ln, _key: String(i + 1) }));
  }

  function removeSelectedLines(indices: number[]) {
    if (isFormReadonly.value) return;
    if (!indices.length) {
      ElMessage.warning('请先选择要删除的行');
      return;
    }
    const set = new Set(indices);
    lines.value = lines.value.filter((_, i) => !set.has(i)).map((ln, i) => ({ ...ln, _key: String(i + 1) }));
  }

  function updateLine(idx: number, patch: Partial<SqLineRow>) {
    if (isFormReadonly.value) return;
    const next = [...lines.value];
    next[idx] = recalcLine({ ...next[idx], ...patch });
    lines.value = next;
  }

  async function onSave() {
    if (isFormReadonly.value) {
      ElMessage.warning('已审核单据不可修改');
      return;
    }
    if (!head.cus_no) {
      ElMessage.warning(formLabels.requirePartner);
      return;
    }
    const validLines = lines.value.filter((ln) => ln.prd_no?.trim());
    if (!validLines.length) {
      ElMessage.warning('表身至少一行有效品号');
      return;
    }
    const payload = buildBillSavePayload(
      { ...head, amtn: totals.value.amtn_net },
      validLines,
      ({ _key, spc, qty_open, ...rest }) => rest
    );
    saving.value = true;
    try {
      if (editing.value) {
        await api.updatePurchaseRequisition(editing.value, payload);
        ElMessage.success('存盘成功');
      } else {
        const { data } = await api.createPurchaseRequisition(payload);
        head.sq_no = data.head.sq_no;
        editing.value = data.head.sq_no ?? null;
        ElMessage.success('存盘成功');
      }
      await reloadAll();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      ElMessage.error(err.response?.data?.error || '存盘失败');
    } finally {
      saving.value = false;
    }
  }

  async function openOrder(sqNo: string, viewOnly = false) {
    const { data } = await api.getPurchaseRequisition(sqNo);
    Object.assign(head, data.head);
    editing.value = sqNo;
    formViewOnly.value = viewOnly;
    lines.value = data.lines.map((l, i) =>
      recalcLine({ ...l, _key: String(i + 1), spc: l.spc, ext_fields: l.ext_fields ?? {} })
    );
    viewMode.value = 'form';
  }

  async function goAdd() {
    await onNew();
    viewMode.value = 'form';
  }

  function goList() {
    viewMode.value = 'list';
    formViewOnly.value = false;
  }

  async function onDeleteBill(sqNo: string) {
    try {
      await ElMessageBox.confirm(formLabels.deleteConfirm(sqNo), '删除确认', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      });
    } catch {
      return;
    }
    loading.value = true;
    try {
      await api.deletePurchaseRequisition(sqNo);
      ElMessage.success('删除成功');
      if (editing.value === sqNo) {
        editing.value = null;
        goList();
      }
      await reloadAll();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      ElMessage.error(err.response?.data?.error || '删除失败');
    } finally {
      loading.value = false;
    }
  }

  async function onAudit() {
    if (!head.sq_no) {
      ElMessage.warning('请先存盘');
      return;
    }
    try {
      const { data } = await api.auditPurchaseRequisition(head.sq_no);
      applyBillAuditMeta(head, data);
      auditedSqNos.value = new Set(auditedSqNos.value).add(head.sq_no);
      formViewOnly.value = true;
      ElMessage.success('审核成功');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      ElMessage.error(err.response?.data?.error || '审核失败');
    }
  }

  async function onUnAudit() {
    if (!head.sq_no) return;
    try {
      await api.unauditPurchaseRequisition(head.sq_no);
      clearBillAuditMeta(head);
      const next = new Set(auditedSqNos.value);
      next.delete(head.sq_no);
      auditedSqNos.value = next;
      formViewOnly.value = false;
      ElMessage.success('已反审核');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      ElMessage.error(err.response?.data?.error || '反审核失败');
    }
  }

  return {
    formLabels,
    viewMode,
    head,
    lines,
    list,
    filters,
    headQueryFields,
    headListFields,
    lineFormFields,
    loading,
    saving,
    custs,
    salms,
    depts,
    products,
    editing,
    custName,
    salName,
    depName,
    poDepName,
    totals,
    isFormReadonly,
    filteredList,
    billStatus,
    loadMasters,
    reloadAll,
    applyCust,
    addLine,
    copySelectedLines,
    removeSelectedLines,
    updateLine,
    onSave,
    openOrder,
    goAdd,
    goList,
    onDeleteBill,
    onAudit,
    onUnAudit,
  };
}
