import { computed, reactive, ref, watch, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { api } from '@/api';
import type {
  Cust,
  Curr,
  Dept,
  OpenPurchaseRequisition,
  Product,
  PurchaseRequisitionLine,
  SalesOrderDetailLine,
  SalesOrderHead,
  SalesOrderLine,
  Salm,
} from '@/api/types';
import { INV_AD, INV_AD_DETAIL, INV_AF, INV_AF_DETAIL, pickForm, pickList, pickQuery } from '@/config/fields';
import type { DetailGridSummary } from '@/config/detailGridRegistry';
import { calcLineAmounts, sumLines } from '@/utils/tax';
import { isSoBillClosed, resolveSoBillStatus } from '@/utils/soBillStatus';
import { applyBillAuditMeta, clearBillAuditMeta, isBillAudited } from '@/utils/billAudit';

export type LineRow = SalesOrderLine & { _key: string };
export type ViewMode = 'list' | 'form';
export type ListTab = 'bill' | 'detail';

const TAX_OPTIONS = [
  { value: '1', label: '不计税' },
  { value: '2', label: '应税内含' },
  { value: '3', label: '应税外加' },
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function newLine(key: string): LineRow {
  return {
    _key: key,
    prd_no: '',
    prd_name: '',
    spc: '',
    wh: '',
    qty: 0,
    ut: '',
    up: 0,
    amtn: 0,
    tax_rto: 13,
    tax: 0,
    est_dd: '',
    sup_prd_no: '',
    rem: '',
    qty_ps: 0,
    ext_fields: {},
  };
}

function recalcLine(ln: LineRow, taxId: string): LineRow {
  const c = calcLineAmounts(ln.qty, ln.up, taxId, ln.tax_rto ?? 13);
  return { ...ln, amtn: c.amtn_net, tax: c.tax };
}

export type PosOrderKind = 'SO' | 'PO';

export function useSalesOrderBill(kind: PosOrderKind = 'SO') {
  const isPo = kind === 'PO';
  const billName = isPo ? '采购单' : '销售订单';
  const partnerName = isPo ? '厂商' : '客户';

  const formLabels = {
    billName,
    partnerName,
    formTitleNew: `新增${billName}`,
    formTitleEdit: `编辑${billName}`,
    formTitleView: `查看${billName}`,
    orderNoLabel: `${billName}号`,
    partnerOrderLabel: isPo ? '厂商订单号' : '客户订单号',
    bilTypePlaceholder: isPo ? '标准采购单' : '标准销售订单',
    selectPartner: `选择${partnerName}`,
    selectPartnerDialog: `选择${partnerName}`,
    detailLoadError: `${billName}明细加载失败，请确认后端已重启（端口 3001）`,
    requirePartner: `请选择${partnerName}`,
    deleteConfirm: (no: string) => `确定删除${billName} ${no}？`,
  };

  const viewMode = ref<ViewMode>('list');
  const listTab = ref<ListTab>('bill');
  const formViewOnly = ref(false);
  const auditedOsNos = ref<Set<string>>(new Set());

  const head = reactive<SalesOrderHead>({
    os_no: '',
    os_dd: today(),
    cus_no: '',
    tax_id: '2',
    dis_cnt: 0,
  });

  const lines = ref<LineRow[]>([]);
  const list = ref<SalesOrderHead[]>([]);
  const detailLines = ref<SalesOrderDetailLine[]>([]);
  const filters = reactive({
    os_no: '',
    cus_no: '',
    prd_no: '',
    dateFrom: '',
    dateTo: '',
  });

  const invHead = isPo ? INV_AF.head : INV_AD.head;
  const invLine = isPo ? INV_AF.line : INV_AD.line;
  const invDetail = isPo ? INV_AF_DETAIL.line : INV_AD_DETAIL.line;

  const headQueryFields = pickQuery(invHead);
  const detailQueryFields = pickQuery(invDetail);
  const headListFields = pickList(invHead);
  const detailListFields = pickList(invDetail);
  const lineFormFields = pickForm(invLine);

  const loading = ref(false);
  const saving = ref(false);
  const custs = ref<Cust[]>([]);
  const salms = ref<Salm[]>([]);
  const depts = ref<Dept[]>([]);
  const currs = ref<Curr[]>([]);
  const products = ref<Product[]>([]);
  const whs = ref<{ wh: string; name?: string }[]>([]);
  const editing = ref<string | null>(null);

  const listPage = ref(1);
  const listPageSize = ref(20);
  const detailPage = ref(1);
  const detailPageSize = ref(50);
  const sortProp = ref<string>('os_dd');
  const sortOrder = ref<'ascending' | 'descending' | null>('descending');

  const custPicker = ref(false);
  const salPicker = ref(false);
  const depPicker = ref(false);
  const prdPicker = ref(false);
  const prdLineIdx = ref<number | null>(null);
  const openSqList = ref<OpenPurchaseRequisition[]>([]);
  const sqPicker = ref(false);

  const custName = computed(
    () => custs.value.find((c) => c.cus_no === head.cus_no)?.name || ''
  );
  const salName = computed(
    () => salms.value.find((s) => s.sal_no === head.sal_no)?.name || ''
  );
  const depName = computed(
    () => depts.value.find((d) => d.dep === head.use_dep)?.name || ''
  );
  const curName = computed(
    () => currs.value.find((c) => c.cur_id === head.cur_id)?.name || ''
  );

  const totals = computed(() =>
    sumLines(lines.value.map((ln) => ({ amtn_net: ln.amtn, tax: ln.tax })))
  );

  const isFormReadonly = computed(
    () =>
      formViewOnly.value ||
      isSoBillClosed(head) ||
      isBillAudited(head) ||
      (head.os_no ? auditedOsNos.value.has(head.os_no) : false)
  );

  const filteredList = computed(() => {
    let rows = list.value;
    const qNo = filters.os_no.trim().toLowerCase();
    const qCus = filters.cus_no.trim().toLowerCase();
    if (qNo) {
      rows = rows.filter(
        (r) =>
          r.os_no?.toLowerCase().includes(qNo) ||
          r.cus_os_no?.toLowerCase().includes(qNo)
      );
    }
    if (qCus) {
      rows = rows.filter(
        (r) =>
          r.cus_name?.toLowerCase().includes(qCus) ||
          r.cus_no?.toLowerCase().includes(qCus)
      );
    }
    if (filters.dateFrom) rows = rows.filter((r) => (r.os_dd || '') >= filters.dateFrom);
    if (filters.dateTo) rows = rows.filter((r) => (r.os_dd || '') <= filters.dateTo);
    return rows;
  });

  const sortedList = computed(() => {
    const rows = [...filteredList.value];
    const prop = sortProp.value;
    const order = sortOrder.value;
    if (!prop || !order) return rows;
    rows.sort((a, b) => {
      const av = a[prop as keyof SalesOrderHead];
      const bv = b[prop as keyof SalesOrderHead];
      const sa = av == null ? '' : String(av);
      const sb = bv == null ? '' : String(bv);
      if (sa === sb) return 0;
      const gt = sa > sb ? 1 : -1;
      return order === 'ascending' ? gt : -gt;
    });
    return rows;
  });

  const paginatedList = computed(() => {
    const start = (listPage.value - 1) * listPageSize.value;
    return sortedList.value.slice(start, start + listPageSize.value);
  });

  const detailSummary = ref({
    count: 0,
    qty: 0,
    qtyOpen: 0,
    amtn: 0,
    tax: 0,
  });

  function onDetailSummaryChange(s: DetailGridSummary) {
    detailSummary.value = {
      count: s.count,
      qty: s.qty ?? 0,
      qtyOpen: s.qty_open ?? 0,
      amtn: s.amtn ?? 0,
      tax: s.tax ?? 0,
    };
  }

  function resetQuery() {
    filters.os_no = '';
    filters.cus_no = '';
    filters.prd_no = '';
    filters.dateFrom = '';
    filters.dateTo = '';
  }

  function billStatus(row: SalesOrderHead) {
    return resolveSoBillStatus(row, auditedOsNos.value);
  }

  async function loadMasters() {
    const [c, s, d, cur, w, p] = await Promise.all([
      api.custList({ limit: 500 }),
      api.salmList(),
      api.deptList(),
      api.curList(),
      api.warehouses(),
      api.productList({ limit: 500 }),
    ]);
    custs.value = c.data;
    salms.value = s.data;
    depts.value = d.data;
    currs.value = cur.data;
    whs.value = w.data;
    products.value = p.data;
  }

  async function loadList() {
    const { data } = isPo
      ? await api.purchaseOrderList({
          limit: 500,
          date_from: filters.dateFrom || undefined,
          date_to: filters.dateTo || undefined,
        })
      : await api.salesOrderList({
          limit: 500,
          date_from: filters.dateFrom || undefined,
          date_to: filters.dateTo || undefined,
        });
    list.value = data;
  }

  async function loadDetailLines() {
    try {
      const { data } = isPo
        ? await api.purchaseOrderDetailList({
            limit: 1000,
            os_no: filters.os_no || undefined,
            cus_no: filters.cus_no || undefined,
            prd_no: filters.prd_no || undefined,
            date_from: filters.dateFrom || undefined,
            date_to: filters.dateTo || undefined,
          })
        : await api.salesOrderDetailList({
            limit: 1000,
            os_no: filters.os_no || undefined,
            cus_no: filters.cus_no || undefined,
            prd_no: filters.prd_no || undefined,
            date_from: filters.dateFrom || undefined,
            date_to: filters.dateTo || undefined,
          });
      detailLines.value = data;
      detailPage.value = 1;
    } catch (e: unknown) {
      detailLines.value = [];
      const err = e as { response?: { data?: { error?: string } } };
      ElMessage.error(err.response?.data?.error || formLabels.detailLoadError);
    }
  }

  async function reloadAll() {
    loading.value = true;
    try {
      await Promise.all([loadList(), loadDetailLines()]);
      listPage.value = 1;
    } finally {
      loading.value = false;
    }
  }

  watch(listTab, (tab) => {
    if (tab === 'detail') {
      nextTick(() => loadDetailLines());
    }
  });

  async function onNew() {
    const { data } = isPo ? await api.nextPurchaseOrderNo() : await api.nextSalesOrderNo();
    Object.assign(head, {
      os_no: data.os_no,
      os_dd: today(),
      est_dd: '',
      cus_no: '',
      cus_name: '',
      use_dep: '',
      sal_no: '',
      cus_os_no: '',
      bil_type: '',
      cur_id: 'RMB',
      tax_id: '2',
      rem: '',
      cls_mp_id: '',
      cls_id: '',
      dis_cnt: 0,
      amtn_net: 0,
      tax: 0,
      bil_id: '',
      bil_no: '',
      ext_fields: {},
    });
    lines.value = [];
    editing.value = null;
    formViewOnly.value = false;
  }

  function applyCust(c: Cust) {
    if (isFormReadonly.value) return;
    head.cus_no = c.cus_no;
    head.cus_name = c.name;
    head.sal_no = c.sal_no || head.sal_no;
    head.cur_id = c.cur_id || 'RMB';
    head.tax_id = c.id1_tax || '2';
    lines.value = lines.value.map((ln) => recalcLine(ln, head.tax_id || '2'));
  }

  function addLine() {
    if (isFormReadonly.value) return;
    const est = head.est_dd || '';
    lines.value = [
      ...lines.value,
      recalcLine({ ...newLine(String(lines.value.length + 1)), est_dd: est }, head.tax_id || '2'),
    ];
  }

  function removeLine(idx: number) {
    if (isFormReadonly.value) return;
    lines.value = lines.value.filter((_, i) => i !== idx);
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
      next.splice(idx + 1 + offset, 0, recalcLine({ ...src, _key: `c${Date.now()}${idx}` }, head.tax_id || '2'));
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

  function openProductPicker(idx: number) {
    if (isFormReadonly.value) return;
    prdLineIdx.value = idx;
    prdPicker.value = true;
  }

  function applyProduct(p: Product) {
    if (prdLineIdx.value == null) return;
    updateLine(prdLineIdx.value, {
      prd_no: p.prd_no,
      prd_name: p.name || '',
      spc: p.spc,
      ut: p.ut,
      wh: p.wh,
      up: p.upr ?? 0,
    });
    prdPicker.value = false;
    prdLineIdx.value = null;
  }

  function onTaxChange() {
    if (isFormReadonly.value) return;
    lines.value = lines.value.map((ln) => recalcLine(ln, head.tax_id || '2'));
  }

  async function openSqTransfer() {
    if (!isPo) return;
    if (!head.cus_no) {
      ElMessage.warning('请先选择厂商');
      return;
    }
    const { data } = await api.openPurchaseRequisitions(head.cus_no);
    if (!data.length) {
      ElMessage.info('该厂商没有未转完的请购单');
      return;
    }
    openSqList.value = data;
    sqPicker.value = true;
  }

  async function transferFromSq(sqNo: string) {
    if (!isPo) return;
    try {
      const { data } = await api.purchaseRequisitionPoLines(sqNo);
      const h = data.head;
      head.bil_id = 'SQ';
      head.bil_no = sqNo;
      head.cus_no = h.cus_no || head.cus_no;
      head.sal_no = h.sal_no || head.sal_no;
      head.cur_id = h.cur_id || head.cur_id || 'RMB';
      head.use_dep = h.dep || head.use_dep;
      head.est_dd = h.est_dd || head.est_dd;
      head.rem = h.rem || head.rem;
      const taxId = head.tax_id || '2';
      lines.value = (data.lines as PurchaseRequisitionLine[]).map((ln, i) =>
        recalcLine(
          {
            ...newLine(String(i + 1)),
            prd_no: ln.prd_no,
            prd_name: ln.prd_name || '',
            spc: ln.spc,
            qty: ln.qty_open ?? ln.qty ?? 0,
            ut: ln.unit || '',
            up: ln.up ?? 0,
            est_dd: ln.est_dd || h.est_dd || '',
            rem: ln.rem || '',
            bil_id: 'SQ',
            bil_no: sqNo,
            bil_itm: ln.itm,
          },
          taxId
        )
      );
      sqPicker.value = false;
      ElMessage.success(`已从请购单 ${sqNo} 带入表身`);
    } catch {
      ElMessage.error('从请购单转入失败');
    }
  }

  function updateLine(idx: number, patch: Partial<LineRow>) {
    if (isFormReadonly.value) return;
    const next = [...lines.value];
    next[idx] = recalcLine({ ...next[idx], ...patch }, head.tax_id || '2');
    lines.value = next;
  }

  async function onSave() {
    if (isFormReadonly.value) {
      ElMessage.warning('已审核或已结案单据不可修改');
      return;
    }
    if (!head.cus_no) {
      ElMessage.warning(formLabels.requirePartner);
      return;
    }
    if (!head.est_dd?.trim()) {
      ElMessage.warning('请填写表头预交日');
      return;
    }
    if (!lines.value.length) {
      ElMessage.warning('请录入表身');
      return;
    }
    const validLines = lines.value.filter((ln) => ln.prd_no?.trim());
    if (!validLines.length) {
      ElMessage.warning('表身至少一行有效品号');
      return;
    }
    for (let i = 0; i < lines.value.length; i++) {
      const ln = lines.value[i];
      if (!ln.prd_no?.trim()) continue;
      if (!ln.est_dd?.trim()) {
        ElMessage.warning(`表身第 ${i + 1} 行预交日不能为空`);
        return;
      }
    }
    const payload = {
      head: {
        ...head,
        ext_fields: head.ext_fields ?? {},
      },
      lines: validLines.map(({ _key, spc, wh_name, qty_open, ...rest }) => ({
        ...rest,
        ext_fields: rest.ext_fields ?? {},
      })),
    };
    saving.value = true;
    try {
      if (editing.value) {
        if (isPo) await api.updatePurchaseOrder(editing.value, payload);
        else await api.updateSalesOrder(editing.value, payload);
        ElMessage.success('存盘成功');
      } else {
        if (isPo) await api.createPurchaseOrder(payload);
        else await api.createSalesOrder(payload);
        ElMessage.success('存盘成功');
        editing.value = head.os_no;
      }
      await reloadAll();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      ElMessage.error(err.response?.data?.error || '存盘失败');
    } finally {
      saving.value = false;
    }
  }

  async function openOrder(osNo: string, viewOnly = false) {
    const { data } = isPo ? await api.getPurchaseOrder(osNo) : await api.getSalesOrder(osNo);
    Object.assign(head, data.head);
    if (!head.ext_fields) head.ext_fields = {};
    editing.value = osNo;
    formViewOnly.value = viewOnly;
    lines.value = data.lines.map((l, i) =>
      recalcLine(
        { ...l, _key: String(i + 1), spc: l.spc, ext_fields: l.ext_fields ?? {} },
        head.tax_id || '2'
      )
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

  async function onDeleteBill(osNo: string) {
    try {
      await ElMessageBox.confirm(formLabels.deleteConfirm(osNo), '删除确认', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      });
    } catch {
      return;
    }
    loading.value = true;
    try {
      if (isPo) await api.deletePurchaseOrder(osNo);
      else await api.deleteSalesOrder(osNo);
      ElMessage.success('删除成功');
      if (editing.value === osNo) {
        editing.value = null;
        await onNew();
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
    if (!head.os_no) {
      ElMessage.warning('请先存盘');
      return;
    }
    if (isSoBillClosed(head)) {
      ElMessage.warning('已结案单据不可审核');
      return;
    }
    try {
      const auditFn = kind === 'PO' ? api.auditPurchaseOrder : api.auditSalesOrder;
      const { data } = await auditFn(head.os_no);
      applyBillAuditMeta(head, data);
      auditedOsNos.value = new Set(auditedOsNos.value).add(head.os_no);
      formViewOnly.value = true;
      ElMessage.success('审核成功');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      ElMessage.error(err.response?.data?.error || '审核失败');
    }
  }

  async function onUnAudit() {
    if (!head.os_no) return;
    try {
      const unauditFn = kind === 'PO' ? api.unauditPurchaseOrder : api.unauditSalesOrder;
      await unauditFn(head.os_no);
      clearBillAuditMeta(head);
      const next = new Set(auditedOsNos.value);
      next.delete(head.os_no);
      auditedOsNos.value = next;
      formViewOnly.value = false;
      ElMessage.success('已反审核');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      ElMessage.error(err.response?.data?.error || '反审核失败');
    }
  }

  function onSortChange(payload: { prop: string; order: string | null }) {
    sortProp.value = payload.prop;
    sortOrder.value =
      payload.order === 'ascending' || payload.order === 'descending' ? payload.order : null;
  }

  function listCell(row: SalesOrderHead, key: string) {
    if (key === 'cus_no') {
      return row.cus_name ? `${row.cus_no} ${row.cus_name}` : row.cus_no;
    }
    if (key === 'sal_no') {
      return row.sal_name ? `${row.sal_no} ${row.sal_name}` : row.sal_no;
    }
    return row[key as keyof SalesOrderHead];
  }

  return {
    formLabels,
    TAX_OPTIONS,
    viewMode,
    listTab,
    head,
    lines,
    list,
    detailLines,
    filters,
    headQueryFields,
    detailQueryFields,
    headListFields,
    detailListFields,
    lineFormFields,
    loading,
    saving,
    custs,
    salms,
    depts,
    currs,
    products,
    whs,
    editing,
    listPage,
    listPageSize,
    detailPage,
    detailPageSize,
    sortProp,
    sortOrder,
    custPicker,
    salPicker,
    depPicker,
    prdPicker,
    custName,
    salName,
    depName,
    curName,
    totals,
    isFormReadonly,
    filteredList,
    paginatedList,
    detailSummary,
    resetQuery,
    billStatus,
    loadMasters,
    reloadAll,
    loadDetailLines,
    onDetailSummaryChange,
    applyCust,
    addLine,
    removeLine,
    copySelectedLines,
    removeSelectedLines,
    openProductPicker,
    applyProduct,
    onTaxChange,
    openSqList,
    sqPicker,
    openSqTransfer,
    transferFromSq,
    updateLine,
    onSave,
    openOrder,
    goAdd,
    goList,
    onDeleteBill,
    onAudit,
    onUnAudit,
    onSortChange,
    listCell,
  };
}

export function usePurchaseOrderBill() {
  return useSalesOrderBill('PO');
}
