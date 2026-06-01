import { computed, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { api } from '@/api';
import type {
  Dept,
  ManufacturingOrderHead,
  ManufacturingOrderLine,
  Product,
} from '@/api/types';
import { MRP_AC, pickForm, pickList, pickQuery } from '@/config/fields';
import { buildBillSavePayload } from '@/utils/billExtPayload';
import { applyBillAuditMeta, clearBillAuditMeta, isBillAudited } from '@/utils/billAudit';

export type MoLineRow = ManufacturingOrderLine & { _key: string };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function newLine(key: string, moNo = ''): MoLineRow {
  return {
    _key: key,
    mo_no: moNo,
    prd_no: '',
    prd_name: '',
    prd_mark: '',
    wh: '',
    unit: '',
    qty_std: 0,
    los_rto: 0,
    qty_rsv: 0,
    qty_lost: 0,
    qty: 0,
    bat_no: '',
    rem: '',
  };
}

function calcMoLineLocal(ln: MoLineRow, headQty: number): MoLineRow {
  const std = Number(ln.qty_std) || 0;
  const rto = Number(ln.los_rto) || 0;
  const hq = Number(headQty) || 0;
  const base = Math.round(std * hq * 100) / 100;
  const lost = Math.round(base * (rto / 100) * 100) / 100;
  const rsv = Math.round((base + lost) * 100) / 100;
  return { ...ln, qty_lost: lost, qty_rsv: rsv };
}

export function useManufacturingOrderBill() {
  const formLabels = {
    billName: '制令单',
    formTitleNew: '新增制令单',
    formTitleEdit: '编辑制令单',
    formTitleView: '查看制令单',
    orderNoLabel: '制令单号',
    deleteConfirm: (no: string) => `确定删除制令单 ${no}？`,
  };

  const viewMode = ref<'list' | 'form'>('list');
  const formViewOnly = ref(false);
  const auditedMoNos = ref<Set<string>>(new Set());

  const head = reactive<ManufacturingOrderHead>({
    mo_no: '',
    mo_dd: today(),
    sta_dd: '',
    end_dd: '',
    opn_dd: '',
    fin_dd: '',
    mrp_no: '',
    prd_mark: '',
    wh: '',
    so_no: '',
    unit: '',
    qty: 0,
    dep: '',
    bil_type: '',
    build_bil: '',
    close_id: '',
    rem: '',
    qty_fin: 0,
    bil_id: '',
    bil_no: '',
    ext_fields: {},
  });

  const lines = ref<MoLineRow[]>([]);
  const list = ref<ManufacturingOrderHead[]>([]);
  const filters = reactive({
    mo_no: '',
    mrp_no: '',
    dateFrom: '',
    dateTo: '',
  });

  const headQueryFields = pickQuery(MRP_AC.head);
  const headListFields = pickList(MRP_AC.head);
  const lineFormFields = pickForm(MRP_AC.line);
  const loading = ref(false);
  const saving = ref(false);
  const depts = ref<Dept[]>([]);
  const products = ref<Product[]>([]);
  const whs = ref<{ wh: string; name?: string }[]>([]);
  const editing = ref<string | null>(null);

  const mrpDisplay = computed(() => {
    const p = products.value.find((x) => x.prd_no === head.mrp_no);
    if (p) return [head.mrp_no, p.name, p.spc].filter(Boolean).join(' ');
    if (head.mrp_name) return [head.mrp_no, head.mrp_name, head.mrp_spc].filter(Boolean).join(' ');
    return head.mrp_no;
  });
  const depName = computed(() => depts.value.find((d) => d.dep === head.dep)?.name || head.dep_name || '');
  const whName = computed(() => whs.value.find((w) => w.wh === head.wh)?.name || head.wh_name || '');

  const totals = computed(() => ({
    qty: Number(head.qty) || 0,
    qty_fin: Number(head.qty_fin) || 0,
  }));

  const isAudited = computed(() => isBillAudited(head) || (head.mo_no ? auditedMoNos.value.has(head.mo_no) : false));

  const isFormReadonly = computed(
    () => formViewOnly.value || isAudited.value || head.close_id === 'T'
  );

  const filteredList = computed(() => {
    let rows = list.value;
    const qNo = filters.mo_no.trim().toLowerCase();
    const qMrp = filters.mrp_no.trim().toLowerCase();
    if (qNo) rows = rows.filter((r) => r.mo_no?.toLowerCase().includes(qNo));
    if (qMrp) {
      rows = rows.filter(
        (r) =>
          r.mrp_no?.toLowerCase().includes(qMrp) ||
          r.mrp_name?.toLowerCase().includes(qMrp)
      );
    }
    if (filters.dateFrom) rows = rows.filter((r) => (r.mo_dd || '') >= filters.dateFrom);
    if (filters.dateTo) rows = rows.filter((r) => (r.mo_dd || '') <= filters.dateTo);
    return rows;
  });

  function billStatus(row: ManufacturingOrderHead) {
    if (isBillAudited(row)) {
      return { label: '已审核', kind: 'audited' as const };
    }
    if (row.mo_no && auditedMoNos.value.has(row.mo_no)) {
      return { label: '已审核', kind: 'audited' as const };
    }
    if (row.close_id === 'T') return { label: '已结案', kind: 'closed' as const };
    return { label: '开立', kind: 'open' as const };
  }

  async function loadMasters() {
    const [d, p, w] = await Promise.all([
      api.deptList(),
      api.productList({ limit: 500 }),
      api.whList(),
    ]);
    depts.value = d.data;
    products.value = p.data;
    whs.value = w.data;
  }

  async function reloadAll() {
    loading.value = true;
    try {
      const { data } = await api.manufacturingOrderList({
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
    const { data } = await api.nextManufacturingOrderNo();
    Object.assign(head, {
      mo_no: data.mo_no,
      mo_dd: today(),
      sta_dd: '',
      end_dd: '',
      opn_dd: '',
      fin_dd: '',
      mrp_no: '',
      prd_mark: '',
      wh: '',
      so_no: '',
      unit: '',
      qty: 0,
      dep: '',
      bil_type: '',
      build_bil: '',
      close_id: '',
      rem: '',
      qty_fin: 0,
      bil_id: '',
      bil_no: '',
      chk_man: '',
      ext_fields: {},
    });
    lines.value = [];
    editing.value = null;
    formViewOnly.value = false;
  }

  function applyProduct(p: Product) {
    if (isFormReadonly.value) return;
    head.mrp_no = p.prd_no;
    head.unit = p.ut || head.unit;
    head.wh = p.wh || head.wh;
  }

  function recalcAllLines() {
    const hq = Number(head.qty) || 0;
    lines.value = lines.value.map((ln) => calcMoLineLocal(ln, hq));
  }

  watch(
    () => head.qty,
    () => {
      if (isFormReadonly.value) return;
      recalcAllLines();
    }
  );

  function addLine() {
    if (isFormReadonly.value) return;
    const moNo = head.mo_no || '';
    lines.value = [
      ...lines.value,
      calcMoLineLocal(newLine(String(lines.value.length + 1), moNo), Number(head.qty) || 0),
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
      next.splice(idx + 1 + offset, 0, calcMoLineLocal({ ...src, _key: `c${Date.now()}${idx}` }, Number(head.qty) || 0));
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

  function updateLine(idx: number, patch: Partial<MoLineRow>) {
    if (isFormReadonly.value) return;
    const next = [...lines.value];
    next[idx] = calcMoLineLocal({ ...next[idx], ...patch }, Number(head.qty) || 0);
    lines.value = next;
  }

  async function onSave() {
    if (isFormReadonly.value) {
      ElMessage.warning('已审核或已结案单据不可修改');
      return;
    }
    if (!head.mrp_no) {
      ElMessage.warning('请选择制造成品');
      return;
    }
    if (!Number(head.qty)) {
      ElMessage.warning('数量必填且大于 0');
      return;
    }
    const validLines = lines.value.filter((ln) => ln.prd_no?.trim());
    if (!validLines.length) {
      ElMessage.warning('表身至少一行有效材料号');
      return;
    }
    const moNo = head.mo_no || '';
    const payload = buildBillSavePayload(
      head,
      validLines.map((ln) => ({ ...ln, mo_no: moNo })),
      ({ _key, ...rest }) => rest
    ) as { head: ManufacturingOrderHead; lines: ManufacturingOrderLine[] };
    saving.value = true;
    try {
      if (editing.value) {
        await api.updateManufacturingOrder(editing.value, payload);
        ElMessage.success('存盘成功');
      } else {
        const { data } = await api.createManufacturingOrder(payload);
        head.mo_no = data.head.mo_no;
        editing.value = data.head.mo_no ?? null;
        lines.value = data.lines.map((l, i) =>
          calcMoLineLocal({ ...l, _key: String(i + 1) }, Number(head.qty) || 0)
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

  async function openOrder(moNo: string, viewOnly = false) {
    const { data } = await api.getManufacturingOrder(moNo);
    Object.assign(head, data.head);
    editing.value = moNo;
    formViewOnly.value = viewOnly;
    lines.value = data.lines.map((l, i) =>
      calcMoLineLocal({ ...l, _key: String(i + 1), ext_fields: l.ext_fields ?? {} }, Number(data.head.qty) || 0)
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

  async function onDeleteBill(moNo: string) {
    try {
      await ElMessageBox.confirm(formLabels.deleteConfirm(moNo), '删除确认', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      });
    } catch {
      return;
    }
    loading.value = true;
    try {
      await api.deleteManufacturingOrder(moNo);
      ElMessage.success('删除成功');
      if (editing.value === moNo) {
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
    if (!head.mo_no) {
      ElMessage.warning('请先存盘');
      return;
    }
    try {
      const { data } = await api.auditManufacturingOrder(head.mo_no);
      applyBillAuditMeta(head, data);
      auditedMoNos.value = new Set(auditedMoNos.value).add(head.mo_no);
      formViewOnly.value = true;
      ElMessage.success('审核成功');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      ElMessage.error(err.response?.data?.error || '审核失败');
    }
  }

  async function onUnAudit() {
    if (!head.mo_no) return;
    try {
      await api.unauditManufacturingOrder(head.mo_no);
      clearBillAuditMeta(head);
      const next = new Set(auditedMoNos.value);
      next.delete(head.mo_no);
      auditedMoNos.value = next;
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
    depts,
    products,
    whs,
    editing,
    mrpDisplay,
    depName,
    whName,
    totals,
    isFormReadonly,
    filteredList,
    billStatus,
    loadMasters,
    reloadAll,
    applyProduct,
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
