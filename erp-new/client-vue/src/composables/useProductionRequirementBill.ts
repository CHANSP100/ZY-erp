import { computed, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { api } from '@/api';
import type {
  Cust,
  Dept,
  OpenSalesOrderForMp,
  Product,
  ProductionRequirementHead,
  ProductionRequirementLine1,
  ProductionRequirementLine2,
  ProductionRequirementLine3,
} from '@/api/types';
import { MRP_ABA, pickForm, pickList, pickQuery } from '@/config/fields';
import { applyBillAuditMeta, clearBillAuditMeta, isBillAudited } from '@/utils/billAudit';

export type MpLine1Row = ProductionRequirementLine1 & { _key: string };
export type MpLine2Row = ProductionRequirementLine2 & { _key: string };
export type MpLine3Row = ProductionRequirementLine3 & { _key: string };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function newLine1(key: string): MpLine1Row {
  return {
    _key: key,
    mrp_no: '',
    prd_no: '',
    prd_name: '',
    prd_mark: '',
    wh: '',
    unit: '',
    so_no: '',
    est_dd: '',
    qty_so: 0,
    qty_non: 0,
    qty_min: 0,
    qty_on_way: 0,
    qty_on_prc: 0,
    qty_on_rsv: 0,
    qty: 0,
    qty_po: 0,
    qty_sq: 0,
    id_no: '',
    bom_no: '',
    po_yes: 'N',
    rem: '',
    est_itm: 0,
  };
}

function mapLines<T extends { _key: string }>(rows: T[]): T[] {
  return rows.map((ln, i) => ({ ...ln, _key: String(i + 1) }));
}

export function useProductionRequirementBill() {
  const formLabels = {
    billName: '生产需求分析单',
    formTitleNew: '新增生产需求分析单',
    formTitleEdit: '编辑生产需求分析单',
    formTitleView: '查看生产需求分析单',
    orderNoLabel: '分析单号',
    deleteConfirm: (no: string) => `确定删除生产需求分析单 ${no}？`,
  };

  const viewMode = ref<'list' | 'form'>('list');
  const formViewOnly = ref(false);

  const head = reactive<ProductionRequirementHead>({
    mp_no: '',
    mp_dd: today(),
    est_dd: '',
    dep: '',
    so_no: '',
    wh: '',
    bil_type: '',
    rem: '',
    ext_fields: {},
  });

  const lines = ref<MpLine1Row[]>([]);
  const linesPo = ref<MpLine2Row[]>([]);
  const linesMo = ref<MpLine3Row[]>([]);
  const list = ref<ProductionRequirementHead[]>([]);
  const openSoList = ref<OpenSalesOrderForMp[]>([]);
  const filters = reactive({ mp_no: '', so_no: '', dateFrom: '', dateTo: '' });

  const headQueryFields = pickQuery(MRP_ABA.head);
  const headListFields = pickList(MRP_ABA.head);
  const lineFormFields = pickForm(MRP_ABA.line);
  const linePoFormFields = pickForm(MRP_ABA.linePo);
  const lineMoFormFields = pickForm(MRP_ABA.lineMo);

  const loading = ref(false);
  const saving = ref(false);
  const analyzing = ref(false);
  const depts = ref<Dept[]>([]);
  const products = ref<Product[]>([]);
  const whs = ref<{ wh: string; name?: string }[]>([]);
  const custs = ref<Cust[]>([]);
  const editing = ref<string | null>(null);

  const depName = computed(() => depts.value.find((d) => d.dep === head.dep)?.name || head.dep_name || '');

  const totals = computed(() => ({
    qty: lines.value.reduce((s, ln) => s + (Number(ln.qty) || 0), 0),
    qtyPo: linesPo.value.reduce((s, ln) => s + (Number(ln.qty) || 0), 0),
    qtyMo: linesMo.value.reduce((s, ln) => s + (Number(ln.qty) || 0), 0),
  }));

  const isAudited = computed(() => isBillAudited(head));
  const isFormReadonly = computed(() => formViewOnly.value || isAudited.value);

  const filteredList = computed(() => {
    let rows = list.value;
    const qMp = filters.mp_no.trim().toLowerCase();
    const qSo = filters.so_no.trim().toLowerCase();
    if (qMp) rows = rows.filter((r) => r.mp_no?.toLowerCase().includes(qMp));
    if (qSo) rows = rows.filter((r) => r.so_no?.toLowerCase().includes(qSo));
    if (filters.dateFrom) rows = rows.filter((r) => (r.mp_dd || '') >= filters.dateFrom);
    if (filters.dateTo) rows = rows.filter((r) => (r.mp_dd || '') <= filters.dateTo);
    return rows;
  });

  function billStatus(row: ProductionRequirementHead) {
    if (isBillAudited(row)) return { label: '已审核', kind: 'audited' as const };
    if (row.cancel_id === 'T') return { label: '已作废', kind: 'closed' as const };
    return { label: '开立', kind: 'open' as const };
  }

  async function loadMasters() {
    const [d, p, w, c, so] = await Promise.all([
      api.deptList(),
      api.productList({ limit: 500 }),
      api.whList(),
      api.custList({ limit: 500 }),
      api.openSalesOrdersForMp({ limit: 200 }),
    ]);
    depts.value = d.data;
    products.value = p.data;
    whs.value = w.data;
    custs.value = c.data;
    openSoList.value = so.data;
  }

  async function reloadAll() {
    loading.value = true;
    try {
      const { data } = await api.productionRequirementList({
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
    const { data } = await api.nextProductionRequirementNo();
    Object.assign(head, {
      mp_no: data.mp_no,
      mp_dd: today(),
      est_dd: today(),
      dep: '',
      so_no: '',
      wh: '',
      bil_type: '',
      rem: '',
      chk_man: '',
      cls_date: '',
      ext_fields: {},
    });
    lines.value = [];
    linesPo.value = [];
    linesMo.value = [];
    editing.value = null;
    formViewOnly.value = false;
  }

  async function transferFromSo(osNo: string) {
    if (isFormReadonly.value) return;
    loading.value = true;
    try {
      const { data } = await api.productionRequirementTransferFromSo(osNo);
      head.so_no = data.head.so_no || osNo;
      head.dep = data.head.dep || head.dep;
      head.bil_type = data.head.bil_type || head.bil_type;
      head.est_dd = data.head.est_dd || head.est_dd;
      head.mp_dd = data.head.mp_dd || head.mp_dd;
      lines.value = mapLines(data.lines.map((ln, i) => ({ ...newLine1(String(i + 1)), ...ln })));
      linesPo.value = mapLines((data.lines_po || []).map((ln, i) => ({ ...ln, _key: String(i + 1) })));
      linesMo.value = mapLines((data.lines_mo || []).map((ln, i) => ({ ...ln, _key: String(i + 1) })));
      if (!lines.value.length) ElMessage.warning('该受订单没有可转入的分析行');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      ElMessage.error(err.response?.data?.error || '从受订单转入失败');
    } finally {
      loading.value = false;
    }
  }

  async function runAnalyze() {
    if (isFormReadonly.value) return;
    if (!lines.value.length) {
      ElMessage.warning('请先录入需求分析明细');
      return;
    }
    analyzing.value = true;
    try {
      const payload = {
        head: { ...head },
        lines: lines.value.map(({ _key, ...rest }) => rest),
      };
      const { data } = await api.analyzeProductionRequirement(payload);
      lines.value = mapLines(data.lines1.map((ln, i) => ({ ...newLine1(String(i + 1)), ...ln })));
      linesPo.value = mapLines(data.lines2.map((ln, i) => ({ ...ln, _key: String(i + 1) })));
      linesMo.value = mapLines(data.lines3.map((ln, i) => ({ ...ln, _key: String(i + 1) })));
      ElMessage.success('分析完成');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      ElMessage.error(err.response?.data?.error || '分析失败');
    } finally {
      analyzing.value = false;
    }
  }

  function addLine() {
    if (isFormReadonly.value) return;
    lines.value = [...lines.value, newLine1(String(lines.value.length + 1))];
  }

  function copySelectedLines(indices: number[]) {
    if (isFormReadonly.value || !indices.length) return;
    const sorted = [...indices].sort((a, b) => a - b);
    const next = [...lines.value];
    let offset = 0;
    for (const idx of sorted) {
      const src = lines.value[idx];
      if (!src) continue;
      next.splice(idx + 1 + offset, 0, { ...src, _key: `c${Date.now()}${idx}` });
      offset++;
    }
    lines.value = mapLines(next);
  }

  function removeSelectedLines(indices: number[]) {
    if (isFormReadonly.value || !indices.length) return;
    const set = new Set(indices);
    lines.value = mapLines(lines.value.filter((_, i) => !set.has(i)));
  }

  function updateLine(idx: number, patch: Partial<MpLine1Row>) {
    if (isFormReadonly.value) return;
    const next = [...lines.value];
    next[idx] = { ...next[idx], ...patch };
    lines.value = next;
  }

  async function onSave() {
    if (isFormReadonly.value) {
      ElMessage.warning('已审核单据不可修改');
      return;
    }
    const validLines = lines.value.filter((ln) => ln.prd_no?.trim());
    if (!validLines.length) {
      ElMessage.warning('需求分析明细至少一行有效品号');
      return;
    }
    const payload = {
      head: { ...head },
      lines: validLines.map(({ _key, ...rest }) => rest),
      lines_po: linesPo.value.map(({ _key, ...rest }) => rest),
      lines_mo: linesMo.value.map(({ _key, ...rest }) => rest),
    };
    saving.value = true;
    try {
      if (editing.value) {
        await api.updateProductionRequirement(editing.value, payload);
        const { data } = await api.getProductionRequirement(editing.value);
        Object.assign(head, data.head);
        applyBillAuditMeta(head, data.head);
        lines.value = mapLines(data.lines.map((l, i) => ({ ...l, _key: String(i + 1) })));
        linesPo.value = mapLines((data.lines_po || []).map((l, i) => ({ ...l, _key: String(i + 1) })));
        linesMo.value = mapLines((data.lines_mo || []).map((l, i) => ({ ...l, _key: String(i + 1) })));
        formViewOnly.value = true;
        ElMessage.success('存盘并审核成功');
      } else {
        const { data } = await api.createProductionRequirement(payload);
        Object.assign(head, data.head);
        applyBillAuditMeta(head, data.head);
        editing.value = data.head.mp_no ?? null;
        lines.value = mapLines(data.lines.map((l, i) => ({ ...l, _key: String(i + 1) })));
        linesPo.value = mapLines((data.lines_po || []).map((l, i) => ({ ...l, _key: String(i + 1) })));
        linesMo.value = mapLines((data.lines_mo || []).map((l, i) => ({ ...l, _key: String(i + 1) })));
        formViewOnly.value = true;
        ElMessage.success('存盘并审核成功');
      }
      await reloadAll();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      ElMessage.error(err.response?.data?.error || '存盘失败');
    } finally {
      saving.value = false;
    }
  }

  async function openBill(mpNo: string, viewOnly = false) {
    loading.value = true;
    try {
      const { data } = await api.getProductionRequirement(mpNo);
      Object.assign(head, data.head);
      editing.value = mpNo;
      formViewOnly.value = viewOnly || isBillAudited(data.head);
      lines.value = mapLines(data.lines.map((l, i) => ({ ...l, _key: String(i + 1) })));
      linesPo.value = mapLines((data.lines_po || []).map((l, i) => ({ ...l, _key: String(i + 1) })));
      linesMo.value = mapLines((data.lines_mo || []).map((l, i) => ({ ...l, _key: String(i + 1) })));
      viewMode.value = 'form';
    } finally {
      loading.value = false;
    }
  }

  async function goAdd() {
    await onNew();
    viewMode.value = 'form';
  }

  function goList() {
    viewMode.value = 'list';
    formViewOnly.value = false;
  }

  async function onDeleteBill(mpNo: string) {
    try {
      await ElMessageBox.confirm(formLabels.deleteConfirm(mpNo), '删除确认', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      });
    } catch {
      return;
    }
    loading.value = true;
    try {
      await api.deleteProductionRequirement(mpNo);
      ElMessage.success('删除成功');
      if (editing.value === mpNo) {
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

  async function onUnAudit() {
    if (!head.mp_no) return;
    try {
      await api.unauditProductionRequirement(head.mp_no);
      clearBillAuditMeta(head);
      formViewOnly.value = false;
      ElMessage.success('已反审核');
      await reloadAll();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      ElMessage.error(err.response?.data?.error || '反审核失败');
    }
  }

  async function transferMo() {
    if (!head.mp_no) {
      ElMessage.warning('请先存盘');
      return;
    }
    if (!isAudited.value) {
      ElMessage.warning('须已审核方可转制令');
      return;
    }
    loading.value = true;
    try {
      const { data } = await api.transferProductionRequirementMo(head.mp_no);
      ElMessage.success(`已生成 ${data.created.length} 张制令单`);
      await openBill(head.mp_no, true);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      ElMessage.error(err.response?.data?.error || '转制令失败');
    } finally {
      loading.value = false;
    }
  }

  return {
    formLabels,
    viewMode,
    head,
    lines,
    linesPo,
    linesMo,
    list,
    openSoList,
    filters,
    headQueryFields,
    headListFields,
    lineFormFields,
    linePoFormFields,
    lineMoFormFields,
    loading,
    saving,
    analyzing,
    depts,
    products,
    whs,
    custs,
    editing,
    depName,
    totals,
    isFormReadonly,
    isAudited,
    filteredList,
    billStatus,
    loadMasters,
    reloadAll,
    transferFromSo,
    runAnalyze,
    addLine,
    copySelectedLines,
    removeSelectedLines,
    updateLine,
    onSave,
    openBill,
    goAdd,
    goList,
    onDeleteBill,
    onUnAudit,
    transferMo,
  };
}
