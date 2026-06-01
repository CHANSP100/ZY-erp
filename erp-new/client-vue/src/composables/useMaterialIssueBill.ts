import { computed, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { api } from '@/api';
import type {
  Dept,
  MaterialIssueHead,
  MaterialIssueLine,
  ManufacturingOrderHead,
  Product,
  Salm,
} from '@/api/types';
import { MRP_AG, pickForm, pickList, pickQuery } from '@/config/fields';
import { buildBillSavePayload } from '@/utils/billExtPayload';
import { applyBillAuditMeta, clearBillAuditMeta, isBillAudited } from '@/utils/billAudit';

export type MlLineRow = MaterialIssueLine & { _key: string };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function newLine(key: string, moNo = '', wh = ''): MlLineRow {
  return {
    _key: key,
    mo_no: moNo,
    prd_no: '',
    prd_name: '',
    prd_mark: '',
    wh,
    unit: '',
    qty_std: 0,
    los_rto: 0,
    qty_rsv: 0,
    qty: 0,
    qty_wh: 0,
    bat_no: '',
    rem: '',
    bil_itm: 0,
  };
}

function calcMlLineLocal(ln: MlLineRow, headQty: number): MlLineRow {
  const std = Number(ln.qty_std) || 0;
  const rto = Number(ln.los_rto) || 0;
  const hq = Number(headQty) || 0;
  const base = Math.round(std * hq * 100) / 100;
  const lost = Math.round(base * (rto / 100) * 100) / 100;
  const rsv = Math.round((base + lost) * 100) / 100;
  return { ...ln, qty_rsv: rsv };
}

export function useMaterialIssueBill() {
  const formLabels = {
    billName: '生产领料',
    formTitleNew: '新增生产领料',
    formTitleEdit: '编辑生产领料',
    formTitleView: '查看生产领料',
    orderNoLabel: '领料单号',
    deleteConfirm: (no: string) => `确定删除生产领料 ${no}？`,
  };

  const viewMode = ref<'list' | 'form'>('list');
  const formViewOnly = ref(false);
  const auditedMlNos = ref<Set<string>>(new Set());

  const head = reactive<MaterialIssueHead>({
    ml_no: '',
    ml_dd: today(),
    mo_no: '',
    mrp_no: '',
    prd_name: '',
    prd_mark: '',
    unit: '',
    qty: 0,
    wh_mtl: '',
    dep: '',
    bil_type: '',
    id_no: '',
    bat_no: '',
    usr_no: '',
    rem: '',
    mlid: 'ML',
    ml_id: '1',
    bil_id: '',
    bil_no: '',
    ext_fields: {},
  });

  const lines = ref<MlLineRow[]>([]);
  const list = ref<MaterialIssueHead[]>([]);
  const openMoList = ref<ManufacturingOrderHead[]>([]);
  const filters = reactive({
    ml_no: '',
    mo_no: '',
    mrp_no: '',
    dateFrom: '',
    dateTo: '',
  });

  const headQueryFields = pickQuery(MRP_AG.head);
  const headListFields = pickList(MRP_AG.head);
  const lineFormFields = pickForm(MRP_AG.line);
  const loading = ref(false);
  const saving = ref(false);
  const depts = ref<Dept[]>([]);
  const products = ref<Product[]>([]);
  const whs = ref<{ wh: string; name?: string }[]>([]);
  const salms = ref<Salm[]>([]);
  const editing = ref<string | null>(null);

  const mrpDisplay = computed(() => {
    const p = products.value.find((x) => x.prd_no === head.mrp_no);
    if (p) return [head.mrp_no, p.name, p.spc].filter(Boolean).join(' ');
    return [head.mrp_no, head.prd_name, head.mrp_spc].filter(Boolean).join(' ');
  });
  const depName = computed(() => depts.value.find((d) => d.dep === head.dep)?.name || head.dep_name || '');
  const whMtlName = computed(() => whs.value.find((w) => w.wh === head.wh_mtl)?.name || head.wh_mtl_name || '');
  const usrName = computed(() => salms.value.find((s) => s.sal_no === head.usr_no)?.name || head.usr_name || '');

  const totals = computed(() => ({
    qty: lines.value.reduce((s, ln) => s + (Number(ln.qty) || 0), 0),
  }));

  const isAudited = computed(() => isBillAudited(head) || (head.ml_no ? auditedMlNos.value.has(head.ml_no) : false));
  const isFormReadonly = computed(() => formViewOnly.value || isAudited.value);

  const filteredList = computed(() => {
    let rows = list.value;
    const qMl = filters.ml_no.trim().toLowerCase();
    const qMo = filters.mo_no.trim().toLowerCase();
    const qMrp = filters.mrp_no.trim().toLowerCase();
    if (qMl) rows = rows.filter((r) => r.ml_no?.toLowerCase().includes(qMl));
    if (qMo) rows = rows.filter((r) => r.mo_no?.toLowerCase().includes(qMo));
    if (qMrp) {
      rows = rows.filter(
        (r) =>
          r.mrp_no?.toLowerCase().includes(qMrp) ||
          r.prd_name?.toLowerCase().includes(qMrp)
      );
    }
    if (filters.dateFrom) rows = rows.filter((r) => (r.ml_dd || '') >= filters.dateFrom);
    if (filters.dateTo) rows = rows.filter((r) => (r.ml_dd || '') <= filters.dateTo);
    return rows;
  });

  function billStatus(row: MaterialIssueHead) {
    if (isBillAudited(row)) return { label: '已审核', kind: 'audited' as const };
    if (row.ml_no && auditedMlNos.value.has(row.ml_no)) {
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
      api.openManufacturingOrdersForMl({ limit: 200 }),
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
      const { data } = await api.materialIssueList({
        limit: 500,
        date_from: filters.dateFrom || undefined,
        date_to: filters.dateTo || undefined,
      });
      list.value = data;
    } finally {
      loading.value = false;
    }
  }

  async function refreshStockForLine(ln: MlLineRow) {
    if (!ln.prd_no || !ln.wh) return ln;
    try {
      const { data } = await api.stockQty(ln.prd_no, ln.wh);
      return { ...ln, qty_wh: data.qty };
    } catch {
      return ln;
    }
  }

  async function onNew() {
    const { data } = await api.nextMaterialIssueNo();
    Object.assign(head, {
      ml_no: data.ml_no,
      ml_dd: today(),
      mo_no: '',
      mrp_no: '',
      prd_name: '',
      prd_mark: '',
      unit: '',
      qty: 0,
      wh_mtl: '',
      dep: '',
      bil_type: '',
      id_no: '',
      bat_no: '',
      usr_no: '',
      rem: '',
      mlid: 'ML',
      ml_id: '1',
      bil_id: '',
      bil_no: '',
      chk_man: '',
      ext_fields: {},
    });
    lines.value = [];
    editing.value = null;
    formViewOnly.value = false;
  }

  async function transferFromMo(moNo: string) {
    if (isFormReadonly.value) return;
    loading.value = true;
    try {
      const { data } = await api.manufacturingOrderMlLines(moNo);
      const mo = data.head;
      head.mo_no = mo.mo_no || moNo;
      head.mrp_no = mo.mrp_no || '';
      head.prd_name = mo.mrp_name || '';
      head.prd_mark = mo.prd_mark || '';
      head.unit = mo.unit || '';
      head.qty = Number(mo.qty) || 0;
      head.dep = mo.dep || head.dep;
      head.wh_mtl = mo.wh || head.wh_mtl;
      head.bil_id = 'MO';
      head.bil_no = mo.mo_no || moNo;
      const whDefault = head.wh_mtl || '';
      lines.value = await Promise.all(
        data.lines.map(async (ln, i) => {
          const row = calcMlLineLocal(
            {
              ...newLine(String(i + 1), head.mo_no, ln.wh || whDefault),
              ...ln,
              _key: String(i + 1),
            },
            Number(head.qty) || 0
          );
          return refreshStockForLine(row);
        })
      );
      if (!lines.value.length) {
        ElMessage.warning('该制令单没有可领料的 BOM 行');
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
    const moNo = head.mo_no || '';
    const wh = head.wh_mtl || '';
    lines.value = [
      ...lines.value,
      calcMlLineLocal(newLine(String(lines.value.length + 1), moNo, wh), Number(head.qty) || 0),
    ];
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
      next.splice(idx + 1 + offset, 0, calcMlLineLocal({ ...src, _key: `c${Date.now()}${idx}` }, Number(head.qty) || 0));
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

  async function updateLine(idx: number, patch: Partial<MlLineRow>) {
    if (isFormReadonly.value) return;
    const next = [...lines.value];
    let row = calcMlLineLocal({ ...next[idx], ...patch }, Number(head.qty) || 0);
    if (patch.prd_no || patch.wh) {
      row = await refreshStockForLine(row);
    }
    next[idx] = row;
    lines.value = next;
  }

  async function onSave() {
    if (isFormReadonly.value) {
      ElMessage.warning('已审核单据不可修改');
      return;
    }
    if (!head.mo_no) {
      ElMessage.warning('请选择制令单号');
      return;
    }
    const validLines = lines.value.filter((ln) => ln.prd_no?.trim() && Number(ln.qty) > 0);
    if (!validLines.length) {
      ElMessage.warning('表身至少一行有效领料数量');
      return;
    }
    const payload = buildBillSavePayload(
      head,
      validLines.map((ln) => ({
        ...ln,
        mo_no: head.mo_no,
        wh: ln.wh || head.wh_mtl,
      })),
      ({ _key, ...rest }) => rest
    ) as { head: MaterialIssueHead; lines: MaterialIssueLine[] };
    saving.value = true;
    try {
      if (editing.value) {
        await api.updateMaterialIssue(editing.value, payload);
        ElMessage.success('存盘成功');
      } else {
        const { data } = await api.createMaterialIssue(payload);
        head.ml_no = data.head.ml_no;
        editing.value = data.head.ml_no ?? null;
        lines.value = data.lines.map((l, i) =>
          calcMlLineLocal({ ...l, _key: String(i + 1) }, Number(head.qty) || 0)
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

  async function openBill(mlNo: string, viewOnly = false) {
    const { data } = await api.getMaterialIssue(mlNo);
    Object.assign(head, data.head);
    editing.value = mlNo;
    formViewOnly.value = viewOnly;
    lines.value = data.lines.map((l, i) =>
      calcMlLineLocal({ ...l, _key: String(i + 1), ext_fields: l.ext_fields ?? {} }, Number(data.head.qty) || 0)
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

  async function onDeleteBill(mlNo: string) {
    try {
      await ElMessageBox.confirm(formLabels.deleteConfirm(mlNo), '删除确认', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      });
    } catch {
      return;
    }
    loading.value = true;
    try {
      await api.deleteMaterialIssue(mlNo);
      ElMessage.success('删除成功');
      if (editing.value === mlNo) {
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
    if (!head.ml_no) {
      ElMessage.warning('请先存盘');
      return;
    }
    try {
      const { data } = await api.auditMaterialIssue(head.ml_no);
      applyBillAuditMeta(head, data);
      auditedMlNos.value = new Set(auditedMlNos.value).add(head.ml_no);
      formViewOnly.value = true;
      ElMessage.success('审核成功');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      ElMessage.error(err.response?.data?.error || '审核失败');
    }
  }

  async function onUnAudit() {
    if (!head.ml_no) return;
    try {
      await api.unauditMaterialIssue(head.ml_no);
      clearBillAuditMeta(head);
      const next = new Set(auditedMlNos.value);
      next.delete(head.ml_no);
      auditedMlNos.value = next;
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
    mrpDisplay,
    depName,
    whMtlName,
    usrName,
    totals,
    isFormReadonly,
    filteredList,
    billStatus,
    loadMasters,
    reloadAll,
    transferFromMo,
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
