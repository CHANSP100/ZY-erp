import { computed, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { api } from '@/api';
import type {
  Dept,
  ManufacturingOrderHead,
  OverDepositWarning,
  Product,
  Salm,
  WarehouseDepositHead,
  WarehouseDepositLine,
} from '@/api/types';
import { MRP_AFC, pickForm, pickList, pickQuery } from '@/config/fields';
import { buildBillSavePayload } from '@/utils/billExtPayload';
import { applyBillAuditMeta, clearBillAuditMeta, isBillAudited } from '@/utils/billAudit';
import { fmtQty } from '@/utils/sunlike';

export type MmLineRow = WarehouseDepositLine & { _key: string };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function newLine(key: string, moNo = '', wh = ''): MmLineRow {
  return {
    _key: key,
    mo_no: moNo,
    prd_no: '',
    prd_name: '',
    prd_mark: '',
    unit: '',
    wh,
    bat_no: '',
    qty: 0,
    qty1: 0,
    valid_dd: '',
    free_id: '',
    so_no: '',
    rem: '',
  };
}

function formatOverWarnings(warnings: OverDepositWarning[]): string {
  return warnings
    .map(
      (w) =>
        `制令 ${w.mo_no}：制令数量 ${fmtQty(w.mo_qty)}，已缴 ${fmtQty(w.qty_fin_before)}，本次 ${fmtQty(w.qty_add)}，审核后将达 ${fmtQty(w.qty_fin_after)}（超 ${fmtQty(w.over_qty)}）`
    )
    .join('\n');
}

export function useWarehouseDepositBill() {
  const formLabels = {
    billName: '缴库单',
    formTitleNew: '新增缴库单',
    formTitleEdit: '编辑缴库单',
    formTitleView: '查看缴库单',
    orderNoLabel: '缴库单号',
    deleteConfirm: (no: string) => `确定删除缴库单 ${no}？`,
  };

  const viewMode = ref<'list' | 'form'>('list');
  const formViewOnly = ref(false);
  const auditedMmNos = ref<Set<string>>(new Set());

  const head = reactive<WarehouseDepositHead>({
    mm_no: '',
    mm_dd: today(),
    mo_no: '',
    dep: '',
    bil_type: '',
    bil_id: '',
    bil_no: '',
    fin_id: 'Y',
    usr_no: '',
    rem: '',
    mm_id: 'MM',
    ext_fields: {},
  });

  const lines = ref<MmLineRow[]>([]);
  const list = ref<WarehouseDepositHead[]>([]);
  const openMoList = ref<ManufacturingOrderHead[]>([]);
  const filters = reactive({
    mm_no: '',
    mo_no: '',
    dateFrom: '',
    dateTo: '',
  });

  const headQueryFields = pickQuery(MRP_AFC.head);
  const headListFields = pickList(MRP_AFC.head);
  const lineFormFields = pickForm(MRP_AFC.line);
  const loading = ref(false);
  const saving = ref(false);
  const depts = ref<Dept[]>([]);
  const products = ref<Product[]>([]);
  const whs = ref<{ wh: string; name?: string }[]>([]);
  const salms = ref<Salm[]>([]);
  const editing = ref<string | null>(null);

  const depName = computed(() => depts.value.find((d) => d.dep === head.dep)?.name || head.dep_name || '');
  const usrName = computed(() => salms.value.find((s) => s.sal_no === head.usr_no)?.name || head.usr_name || '');

  const totals = computed(() => ({
    qty: lines.value.reduce((s, ln) => s + (Number(ln.qty) || 0), 0),
  }));

  const isAudited = computed(() => isBillAudited(head) || (head.mm_no ? auditedMmNos.value.has(head.mm_no) : false));
  const isFormReadonly = computed(() => formViewOnly.value || isAudited.value);

  const filteredList = computed(() => {
    let rows = list.value;
    const qMm = filters.mm_no.trim().toLowerCase();
    const qMo = filters.mo_no.trim().toLowerCase();
    if (qMm) rows = rows.filter((r) => r.mm_no?.toLowerCase().includes(qMm));
    if (qMo) rows = rows.filter((r) => r.mo_no?.toLowerCase().includes(qMo));
    if (filters.dateFrom) rows = rows.filter((r) => (r.mm_dd || '') >= filters.dateFrom);
    if (filters.dateTo) rows = rows.filter((r) => (r.mm_dd || '') <= filters.dateTo);
    return rows;
  });

  function billStatus(row: WarehouseDepositHead) {
    if (isBillAudited(row)) return { label: '已审核', kind: 'audited' as const };
    if (row.mm_no && auditedMmNos.value.has(row.mm_no)) {
      return { label: '已审核', kind: 'audited' as const };
    }
    return { label: '开立', kind: 'open' as const };
  }

  async function loadMasters() {
    const [d, p, w, s, mo] = await Promise.all([
      api.deptList(),
      api.productList({ limit: 500 }),
      api.whList(),
      api.salmList(),
      api.openManufacturingOrdersForMm({ limit: 200 }),
    ]);
    depts.value = d.data;
    products.value = p.data;
    whs.value = w.data;
    salms.value = s.data;
    openMoList.value = mo.data;
  }

  async function reloadAll() {
    loading.value = true;
    try {
      const { data } = await api.warehouseDepositList({
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
    const { data } = await api.nextWarehouseDepositNo();
    Object.assign(head, {
      mm_no: data.mm_no,
      mm_dd: today(),
      mo_no: '',
      dep: '',
      bil_type: '',
      bil_id: '',
      bil_no: '',
      fin_id: 'Y',
      usr_no: '',
      rem: '',
      mm_id: 'MM',
      chk_man: '',
      ext_fields: {},
    });
    lines.value = [];
    editing.value = null;
    formViewOnly.value = false;
  }

  async function appendFromMo(moNo: string): Promise<boolean> {
    const { data } = await api.manufacturingOrderMmLines(moNo);
    const mo = data.head;
    if (!head.dep && mo.dep) head.dep = mo.dep;
    if (!lines.value.length && !head.mo_no) head.mo_no = mo.mo_no || moNo;

    let added = false;
    for (const ln of data.lines) {
      const qtyOpen = Number(ln.qty) || 0;
      if (qtyOpen <= 0.0001) continue;
      const existIdx = lines.value.findIndex((x) => x.mo_no === moNo);
      if (existIdx >= 0) {
        const cur = lines.value[existIdx];
        lines.value[existIdx] = {
          ...cur,
          qty: Math.round(((Number(cur.qty) || 0) + qtyOpen) * 100) / 100,
        };
      } else {
        lines.value.push({
          ...newLine(String(lines.value.length + 1), moNo, ln.wh || mo.wh || ''),
          ...ln,
          mo_no: moNo,
          _key: String(lines.value.length + 1),
        });
      }
      added = true;
    }
    return added;
  }

  async function transferFromMos(moNos: string[]) {
    if (isFormReadonly.value || !moNos.length) return;
    loading.value = true;
    let totalAdded = 0;
    try {
      for (const moNo of moNos) {
        if (await appendFromMo(moNo)) totalAdded++;
      }
      lines.value = lines.value.map((ln, i) => ({ ...ln, _key: String(i + 1) }));
      if (!totalAdded) {
        ElMessage.warning('所选制令单无可缴库余量');
      } else {
        ElMessage.success(`已转入 ${totalAdded} 笔制令`);
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      ElMessage.error(err.response?.data?.error || '从制令单转入失败');
    } finally {
      loading.value = false;
    }
  }

  function addLine() {
    if (isFormReadonly.value) return;
    lines.value = [...lines.value, newLine(String(lines.value.length + 1), head.mo_no || '', '')];
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

  function updateLine(idx: number, patch: Partial<MmLineRow>) {
    if (isFormReadonly.value) return;
    const next = [...lines.value];
    next[idx] = { ...next[idx], ...patch };
    lines.value = next;
  }

  async function confirmOverDepositIfNeeded(): Promise<boolean> {
    const validLines = lines.value.filter((ln) => ln.prd_no?.trim() && Number(ln.qty) > 0);
    const { data } = await api.checkWarehouseDepositOver({
      lines: validLines.map(({ _key, ...rest }) => rest),
      mm_no: head.mm_no || undefined,
    });
    if (!data.warnings?.length) return true;
    try {
      await ElMessageBox.confirm(
        `以下制令单缴库后将超过制令数量，是否继续审核？\n\n${formatOverWarnings(data.warnings)}`,
        '超缴提醒',
        { type: 'warning', confirmButtonText: '继续审核', cancelButtonText: '取消' }
      );
      return true;
    } catch {
      return false;
    }
  }

  async function onSave() {
    if (isFormReadonly.value) {
      ElMessage.warning('已审核单据不可修改');
      return;
    }
    const validLines = lines.value.filter((ln) => ln.prd_no?.trim() && ln.mo_no?.trim() && Number(ln.qty) > 0);
    if (!validLines.length) {
      ElMessage.warning('表身至少一行有效数据（制令、产品、数量）');
      return;
    }
    const headMo = head.mo_no || validLines[0].mo_no || '';
    const payload = buildBillSavePayload(
      { ...head, mo_no: headMo, fin_id: 'Y', mm_id: 'MM' },
      validLines.map((ln) => ({
        ...ln,
        mm_no: head.mm_no,
        mm_dd: head.mm_dd,
      })),
      ({ _key, mo_qty, qty_fin, ...rest }) => rest
    ) as { head: WarehouseDepositHead; lines: WarehouseDepositLine[] };

    saving.value = true;
    try {
      if (editing.value) {
        await api.updateWarehouseDeposit(editing.value, payload);
        ElMessage.success('存盘成功');
      } else {
        const { data } = await api.createWarehouseDeposit(payload);
        head.mm_no = data.head.mm_no;
        editing.value = data.head.mm_no ?? null;
        lines.value = data.lines.map((l, i) => ({ ...l, _key: String(i + 1) }));
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

  async function openBill(mmNo: string, viewOnly = false) {
    const { data } = await api.getWarehouseDeposit(mmNo);
    Object.assign(head, data.head);
    editing.value = mmNo;
    formViewOnly.value = viewOnly;
    lines.value = data.lines.map((l, i) => ({ ...l, _key: String(i + 1), ext_fields: l.ext_fields ?? {} }));
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

  async function onDeleteBill(mmNo: string) {
    try {
      await ElMessageBox.confirm(formLabels.deleteConfirm(mmNo), '删除确认', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      });
    } catch {
      return;
    }
    loading.value = true;
    try {
      await api.deleteWarehouseDeposit(mmNo);
      ElMessage.success('删除成功');
      if (editing.value === mmNo) {
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
    if (!head.mm_no) {
      ElMessage.warning('请先存盘');
      return;
    }
    if (!(await confirmOverDepositIfNeeded())) return;
    try {
      const { data } = await api.auditWarehouseDeposit(head.mm_no);
      applyBillAuditMeta(head, data);
      auditedMmNos.value = new Set(auditedMmNos.value).add(head.mm_no);
      formViewOnly.value = true;
      if (data.warnings?.length) {
        ElMessage.warning(`审核完成（${data.warnings.length} 笔制令超缴）`);
      } else {
        ElMessage.success('审核成功');
      }
      await loadMasters();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      ElMessage.error(err.response?.data?.error || '审核失败');
    }
  }

  async function onUnAudit() {
    if (!head.mm_no) return;
    try {
      await api.unauditWarehouseDeposit(head.mm_no);
      clearBillAuditMeta(head);
      const next = new Set(auditedMmNos.value);
      next.delete(head.mm_no);
      auditedMmNos.value = next;
      formViewOnly.value = false;
      ElMessage.success('已反审核');
      await loadMasters();
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
    openMoList,
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
    editing,
    depName,
    usrName,
    totals,
    isFormReadonly,
    filteredList,
    billStatus,
    loadMasters,
    reloadAll,
    transferFromMos,
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
