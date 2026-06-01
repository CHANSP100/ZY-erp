import { computed, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { api } from '@/api';
import type {
  Cust,
  Dept,
  OpenSalesOrderForJh,
  Product,
  ProductionPlanHead,
  ProductionPlanLine,
  Salm,
} from '@/api/types';
import { MRP_AA, pickForm, pickList, pickQuery } from '@/config/fields';
import { buildBillSavePayload } from '@/utils/billExtPayload';
import { applyBillAuditMeta, clearBillAuditMeta, isBillAudited } from '@/utils/billAudit';

export type JhLineRow = ProductionPlanLine & { _key: string };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function newLine(key: string): JhLineRow {
  return {
    _key: key,
    prd_no: '',
    prd_name: '',
    prd_mark: '',
    wh: '',
    unit: '',
    qty: 0,
    est_dd: '',
    bat_no: '',
    id_no: '',
    os_id: '',
    os_no: '',
    est_itm: 0,
    cus_os_no: '',
    sup_prd_no: '',
    mp_cls_id: '',
    rem: '',
  };
}

function normalizeLine(ln: JhLineRow): JhLineRow {
  return { ...ln, qty: Math.round((Number(ln.qty) || 0) * 100) / 100 };
}

export function useProductionPlanBill() {
  const formLabels = {
    billName: '生产计划',
    formTitleNew: '新增生产计划',
    formTitleEdit: '编辑生产计划',
    formTitleView: '查看生产计划',
    orderNoLabel: '计划单号',
    deleteConfirm: (no: string) => `确定删除生产计划 ${no}？`,
  };

  const viewMode = ref<'list' | 'form'>('list');
  const formViewOnly = ref(false);
  const auditedJhNos = ref<Set<string>>(new Set());

  const head = reactive<ProductionPlanHead>({
    jh_no: '',
    jh_dd: today(),
    est_dd: '',
    dep: '',
    sal_no: '',
    so_no: '',
    cus_no: '',
    cus_os_no: '',
    bil_type: '',
    bat_no: '',
    close_id: '',
    rem: '',
    ext_fields: {},
  });

  const lines = ref<JhLineRow[]>([]);
  const list = ref<ProductionPlanHead[]>([]);
  const openSoList = ref<OpenSalesOrderForJh[]>([]);
  const filters = reactive({
    jh_no: '',
    so_no: '',
    cus_no: '',
    dateFrom: '',
    dateTo: '',
  });

  const headQueryFields = pickQuery(MRP_AA.head);
  const headListFields = pickList(MRP_AA.head);
  const lineFormFields = pickForm(MRP_AA.line);
  const loading = ref(false);
  const saving = ref(false);
  const depts = ref<Dept[]>([]);
  const products = ref<Product[]>([]);
  const whs = ref<{ wh: string; name?: string }[]>([]);
  const salms = ref<Salm[]>([]);
  const custs = ref<Cust[]>([]);
  const editing = ref<string | null>(null);

  const depName = computed(() => depts.value.find((d) => d.dep === head.dep)?.name || head.dep_name || '');
  const salName = computed(() => salms.value.find((s) => s.sal_no === head.sal_no)?.name || head.sal_name || '');
  const cusName = computed(
    () => custs.value.find((c) => c.cus_no === head.cus_no)?.name || head.cus_name || head.cus_no || ''
  );

  const totals = computed(() => ({
    qty: lines.value.reduce((s, ln) => s + (Number(ln.qty) || 0), 0),
  }));

  const isAudited = computed(
    () => isBillAudited(head) || (head.jh_no ? auditedJhNos.value.has(head.jh_no) : false)
  );
  const isFormReadonly = computed(
    () => formViewOnly.value || isAudited.value || head.close_id === 'T'
  );

  const filteredList = computed(() => {
    let rows = list.value;
    const qJh = filters.jh_no.trim().toLowerCase();
    const qSo = filters.so_no.trim().toLowerCase();
    const qCus = filters.cus_no.trim().toLowerCase();
    if (qJh) rows = rows.filter((r) => r.jh_no?.toLowerCase().includes(qJh));
    if (qSo) rows = rows.filter((r) => r.so_no?.toLowerCase().includes(qSo));
    if (qCus) {
      rows = rows.filter(
        (r) =>
          r.cus_no?.toLowerCase().includes(qCus) ||
          r.cus_name?.toLowerCase().includes(qCus)
      );
    }
    if (filters.dateFrom) rows = rows.filter((r) => (r.jh_dd || '') >= filters.dateFrom);
    if (filters.dateTo) rows = rows.filter((r) => (r.jh_dd || '') <= filters.dateTo);
    return rows;
  });

  function billStatus(row: ProductionPlanHead) {
    if (isBillAudited(row)) return { label: '已审核', kind: 'audited' as const };
    if (row.jh_no && auditedJhNos.value.has(row.jh_no)) {
      return { label: '已审核', kind: 'audited' as const };
    }
    if (row.close_id === 'T') return { label: '已结案', kind: 'closed' as const };
    if (row.cancel_id === 'T') return { label: '已作废', kind: 'closed' as const };
    return { label: '开立', kind: 'open' as const };
  }

  async function loadMasters() {
    const [d, p, w, s, c, so] = await Promise.all([
      api.deptList(),
      api.productList({ limit: 500 }),
      api.whList(),
      api.salmList(),
      api.custList({ limit: 500 }),
      api.openSalesOrdersForJh({ limit: 200 }),
    ]);
    depts.value = d.data;
    products.value = p.data;
    whs.value = w.data;
    salms.value = s.data;
    custs.value = c.data;
    openSoList.value = so.data;
  }

  async function reloadAll() {
    loading.value = true;
    try {
      const { data } = await api.productionPlanList({
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
    const { data } = await api.nextProductionPlanNo();
    Object.assign(head, {
      jh_no: data.jh_no,
      jh_dd: today(),
      est_dd: '',
      dep: '',
      sal_no: '',
      so_no: '',
      cus_no: '',
      cus_os_no: '',
      bil_type: '',
      bat_no: '',
      close_id: '',
      rem: '',
      chk_man: '',
      ext_fields: {},
    });
    lines.value = [];
    editing.value = null;
    formViewOnly.value = false;
  }

  async function transferFromSo(osNo: string) {
    if (isFormReadonly.value) return;
    loading.value = true;
    try {
      const { data } = await api.productionPlanTransferFromSo(osNo);
      head.so_no = data.head.so_no || osNo;
      head.cus_no = data.head.cus_no || head.cus_no;
      head.sal_no = data.head.sal_no || head.sal_no;
      head.dep = data.head.dep || head.dep;
      head.cus_os_no = data.head.cus_os_no || head.cus_os_no;
      head.bil_type = data.head.bil_type || head.bil_type;
      head.est_dd = data.head.est_dd || head.est_dd;
      lines.value = data.lines.map((ln, i) =>
        normalizeLine({ ...newLine(String(i + 1)), ...ln, _key: String(i + 1) })
      );
      if (!lines.value.length) {
        ElMessage.warning('该受订单没有可转入的计划行');
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      ElMessage.error(err.response?.data?.error || '从受订单转入失败');
    } finally {
      loading.value = false;
    }
  }

  function addLine() {
    if (isFormReadonly.value) return;
    lines.value = [...lines.value, newLine(String(lines.value.length + 1))];
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
      next.splice(idx + 1 + offset, 0, { ...src, _key: `c${Date.now()}${idx}` });
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

  function updateLine(idx: number, patch: Partial<JhLineRow>) {
    if (isFormReadonly.value) return;
    const next = [...lines.value];
    next[idx] = normalizeLine({ ...next[idx], ...patch });
    lines.value = next;
  }

  function applyCustomer(c: Cust) {
    if (isFormReadonly.value) return;
    head.cus_no = c.cus_no;
    head.sal_no = c.sal_no || head.sal_no;
  }

  async function onSave() {
    if (isFormReadonly.value) {
      ElMessage.warning('已审核或已结案单据不可修改');
      return;
    }
    const validLines = lines.value.filter((ln) => ln.prd_no?.trim() && Number(ln.qty) > 0);
    if (!validLines.length) {
      ElMessage.warning('表身至少一行有效品号与计划数量');
      return;
    }
    const payload = buildBillSavePayload(head, validLines, ({ _key, ...rest }) => rest) as {
      head: ProductionPlanHead;
      lines: ProductionPlanLine[];
    };
    saving.value = true;
    try {
      if (editing.value) {
        await api.updateProductionPlan(editing.value, payload);
        ElMessage.success('存盘成功');
      } else {
        const { data } = await api.createProductionPlan(payload);
        head.jh_no = data.head.jh_no;
        editing.value = data.head.jh_no ?? null;
        lines.value = data.lines.map((l, i) =>
          normalizeLine({ ...l, _key: String(i + 1), ext_fields: l.ext_fields ?? {} })
        );
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

  async function openBill(jhNo: string, viewOnly = false) {
    const { data } = await api.getProductionPlan(jhNo);
    Object.assign(head, data.head);
    editing.value = jhNo;
    formViewOnly.value = viewOnly;
    lines.value = data.lines.map((l, i) =>
      normalizeLine({ ...l, _key: String(i + 1), ext_fields: l.ext_fields ?? {} })
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

  async function onDeleteBill(jhNo: string) {
    try {
      await ElMessageBox.confirm(formLabels.deleteConfirm(jhNo), '删除确认', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      });
    } catch {
      return;
    }
    loading.value = true;
    try {
      await api.deleteProductionPlan(jhNo);
      ElMessage.success('删除成功');
      if (editing.value === jhNo) {
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
    if (!head.jh_no) {
      ElMessage.warning('请先存盘');
      return;
    }
    try {
      const { data } = await api.auditProductionPlan(head.jh_no);
      applyBillAuditMeta(head, data);
      auditedJhNos.value = new Set(auditedJhNos.value).add(head.jh_no);
      formViewOnly.value = true;
      ElMessage.success('审核成功');
      await reloadAll();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      ElMessage.error(err.response?.data?.error || '审核失败');
    }
  }

  async function onUnAudit() {
    if (!head.jh_no) return;
    try {
      await api.unauditProductionPlan(head.jh_no);
      clearBillAuditMeta(head);
      const next = new Set(auditedJhNos.value);
      next.delete(head.jh_no);
      auditedJhNos.value = next;
      formViewOnly.value = false;
      ElMessage.success('已反审核');
      await reloadAll();
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
    openSoList,
    filters,
    headQueryFields,
    headListFields,
    lineFormFields,
    loading,
    saving,
    depts,
    products,
    whs,
    salms,
    custs,
    editing,
    depName,
    salName,
    cusName,
    totals,
    isFormReadonly,
    filteredList,
    billStatus,
    loadMasters,
    reloadAll,
    transferFromSo,
    applyCustomer,
    addLine,
    copySelectedLines,
    removeSelectedLines,
    updateLine,
    onSave,
    openBill,
    goAdd,
    goList,
    onDeleteBill,
    onAudit,
    onUnAudit,
  };
}
