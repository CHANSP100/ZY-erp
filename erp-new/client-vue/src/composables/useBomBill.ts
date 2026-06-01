import { computed, reactive, ref, watch, nextTick } from 'vue';

import { ElMessage, ElMessageBox } from 'element-plus';

import { api } from '@/api';

import type { BomRecipeDetailLine, BomRecipeHead, BomRecipeLine, Dept, Product } from '@/api/types';

import { FAS_ECF, FAS_ECF_DETAIL, pickForm, pickQuery } from '@/config/fields';

import type { DetailGridSummary } from '@/config/detailGridRegistry';

import { isPrdtBomParentKnd } from '@/config/prdtTwId';

import { isBillAudited } from '@/utils/billAudit';



export type BomLineRow = BomRecipeLine & { _key: string; prd_name?: string; wh?: string };

export type ViewMode = 'list' | 'form';

export type ListTab = 'bill' | 'detail';



const KND_LABELS: Record<string, string> = {

  '1': '商品',

  '2': '制成品',

  '3': '半成品',

  '4': '原料',

  '5': '物料',

  '6': '下脚品',

  '7': '包装物',

};



function lineToUi(ln: BomRecipeLine, key: string): BomLineRow {

  return {

    ...ln,

    _key: key,

    prd_name: ln.name || ln.prd_name || '',

    wh: ln.wh_no || ln.wh || '',

  };

}



function lineToApi(ln: BomLineRow): BomRecipeLine {

  const { _key, prd_name, wh, ...rest } = ln;

  return {

    ...rest,

    name: rest.name || prd_name || '',

    wh_no: wh || rest.wh_no || '',

    unit: bomUnitFromProduct(rest.unit),

  };

}



function newLine(key: string, bomNo = ''): BomLineRow {

  return {

    _key: key,

    bom_no: bomNo,

    prd_no: '',

    name: '',

    prd_name: '',

    prd_mark: '',

    wh_no: '',

    wh: '',

    unit: '',

    qty: 0,

    los_rto: 0,

    qty_bas: 1,

    bom_id: '',

    rem: '',

    spc: '',

  };

}



function resetHead(target: BomRecipeHead) {

  Object.assign(target, {

    bom_no: '',

    prd_no: '',

    pf_no: '',

    name: '',

    prd_mark: '',

    wh_no: '',

    unit: '',

    qty: 1,

    prd_knd: '',

    spc: '',

    valid_dd: '',

    end_dd: '',

    dep: '',

    rem: '',

    usr: '',

    sys_date: '',

    chk_man: '',

    cls_date: '',

    prd_name: '',

    dep_name: '',

    wh_name: '',

  });

}



function bomUnitFromProduct(ut?: string) {

  return (ut || '').slice(0, 1);

}



/** SUNLIKE BOM 代号：母件品号 + "->" + 版本号 */

export function buildBomNo(prdNo: string, pfNo?: string) {

  const prd = (prdNo || '').trim();

  const pf = (pfNo || '').trim();

  return `${prd}->${pf}`;

}



export function useBomBill() {

  const formLabels = {

    billName: 'BOM表',

    formTitleNew: '新增BOM',

    formTitleEdit: '编辑BOM',

    formTitleView: '查看BOM',

    orderNoLabel: 'BOM代号',

    deleteConfirm: (no: string) => `确定删除 BOM ${no}？`,

    detailLoadError: 'BOM明细列表加载失败',

  };



  const viewMode = ref<ViewMode>('list');

  const listTab = ref<ListTab>('bill');

  const formViewOnly = ref(false);

  const auditedBomNos = ref<Set<string>>(new Set());



  const head = reactive<BomRecipeHead>({

    bom_no: '',

    prd_no: '',

    pf_no: '',

    name: '',

    prd_mark: '',

    wh_no: '',

    unit: '',

    qty: 1,

    prd_knd: '',

    spc: '',

    valid_dd: '',

    end_dd: '',

    dep: '',

    rem: '',

    chk_man: '',

  });



  const lines = ref<BomLineRow[]>([]);

  const list = ref<BomRecipeHead[]>([]);

  const detailLines = ref<BomRecipeDetailLine[]>([]);

  const filters = reactive({

    bom_no: '',

    prd_no: '',

    pf_no: '',

    dateFrom: '',

    dateTo: '',

  });



  const lineFormFields = pickForm(FAS_ECF.line);
  const headQueryFields = pickQuery(FAS_ECF.head);
  const detailQueryFields = pickQuery(FAS_ECF_DETAIL.line);

  const loading = ref(false);

  const saving = ref(false);

  const depts = ref<Dept[]>([]);

  const products = ref<Product[]>([]);

  /** 母件品号开窗：仅制成品、半成品（KND=2/3） */
  const headParentProducts = ref<Product[]>([]);

  const whs = ref<{ wh: string; name?: string }[]>([]);

  const editing = ref<string | null>(null);



  const prdDisplay = computed(() => head.prd_no || '');

  const depName = computed(() => depts.value.find((d) => d.dep === head.dep)?.name || head.dep_name || '');

  const whName = computed(() => whs.value.find((w) => w.wh === head.wh_no)?.name || head.wh_name || '');

  const kndLabel = computed(() => KND_LABELS[head.prd_knd || ''] || head.prd_knd || '');



  const totals = computed(() => ({

    qty: Number(head.qty) || 0,

    lineCount: lines.value.filter((ln) => ln.prd_no?.trim()).length,

  }));



  const isFormReadonly = computed(() => formViewOnly.value);



  const filteredList = computed(() => {

    let rows = list.value;

    const qNo = filters.bom_no.trim().toLowerCase();

    const qPrd = filters.prd_no.trim().toLowerCase();

    if (qNo) {

      rows = rows.filter(

        (r) =>

          r.bom_no?.toLowerCase().includes(qNo) ||

          r.prd_no?.toLowerCase().includes(qNo) ||

          r.name?.toLowerCase().includes(qNo)

      );

    }

    if (qPrd) {

      rows = rows.filter(

        (r) =>

          r.prd_no?.toLowerCase().includes(qPrd) ||

          r.name?.toLowerCase().includes(qPrd) ||

          r.prd_name?.toLowerCase().includes(qPrd)

      );

    }

    const qPf = filters.pf_no.trim().toLowerCase();

    if (qPf) {

      rows = rows.filter((r) => r.pf_no?.toLowerCase().includes(qPf));

    }

    if (filters.dateFrom) rows = rows.filter((r) => (r.sys_date || '') >= filters.dateFrom);

    if (filters.dateTo) rows = rows.filter((r) => (r.sys_date || '') <= filters.dateTo);

    return rows;

  });



  const detailSummary = ref({
    count: 0,
    qty: 0,
    los_rto: 0,
    qty_bas: 0,
  });

  function onDetailSummaryChange(s: DetailGridSummary) {
    detailSummary.value = {
      count: s.count,
      qty: s.qty ?? 0,
      los_rto: s.los_rto ?? 0,
      qty_bas: s.qty_bas ?? 0,
    };
  }

  function billStatus(row: BomRecipeHead) {

    if (isBillAudited(row)) return { label: '已审核', kind: 'audited' as const };

    if (row.bom_no && auditedBomNos.value.has(row.bom_no)) {

      return { label: '已审核', kind: 'audited' as const };

    }

    return { label: '开立', kind: 'open' as const };

  }



  async function loadMasters() {

    const [d, p, parentPrd, w] = await Promise.all([

      api.deptList(),

      api.productList({ limit: 500 }),

      api.productList({ knd_in: '2,3', limit: 500 }),

      api.whList(),

    ]);

    depts.value = d.data;

    products.value = p.data;

    headParentProducts.value = parentPrd.data;

    whs.value = w.data;

  }



  async function loadList() {

    const { data } = await api.bomRecipeList({

      limit: 500,

      date_from: filters.dateFrom || undefined,

      date_to: filters.dateTo || undefined,

    });

    list.value = data;

  }



  async function loadDetailLines() {
    try {
      const { data } = await api.bomRecipeDetailList({
        limit: 1000,
        bom_no: filters.bom_no || undefined,
        prd_no: filters.prd_no || undefined,
        date_from: filters.dateFrom || undefined,
        date_to: filters.dateTo || undefined,
      });
      detailLines.value = data;
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
    } finally {
      loading.value = false;
    }
  }

  watch(listTab, (tab) => {
    if (tab === 'detail') {
      nextTick(() => loadDetailLines());
    }
  });



  function applyHeadData(data: BomRecipeHead, dataLines: BomRecipeLine[], isNew: boolean) {

    Object.assign(head, data);

    if (isNew && (head.qty == null || Number(head.qty) === 0)) {

      head.qty = 1;

    }

    editing.value = isNew ? null : data.bom_no || null;

    formViewOnly.value = false;

    lines.value = dataLines.map((l, i) => lineToUi(l, String(i + 1)));

  }



  async function openOrder(bomNo: string, viewOnly = false) {
    const no = bomNo?.trim();
    if (!no) {
      ElMessage.warning('BOM代号无效');
      return;
    }
    loading.value = true;

    try {

      const { data } = await api.getBomRecipe(no);

      applyHeadData(data.head, data.lines, false);

      formViewOnly.value = viewOnly;

      viewMode.value = 'form';

    } catch (e: unknown) {

      const err = e as { response?: { data?: { error?: string } } };

      ElMessage.error(err.response?.data?.error || '读取BOM失败');

    } finally {

      loading.value = false;

    }

  }



  async function onNew() {

    resetHead(head);

    lines.value = [];

    editing.value = null;

    formViewOnly.value = false;

  }



  async function goAdd() {

    await onNew();

    viewMode.value = 'form';

  }



  function goList() {

    viewMode.value = 'list';

    formViewOnly.value = false;

  }



  function applyProduct(p: Product) {

    if (isFormReadonly.value) return;

    if (!isPrdtBomParentKnd(p.knd)) {

      ElMessage.warning('母件品号须为制成品或半成品');

      return;

    }

    head.prd_no = p.prd_no;

    head.name = p.name || '';

    head.unit = bomUnitFromProduct(p.ut) || '';

    head.wh_no = p.wh || '';

    head.spc = p.spc || '';

    head.prd_knd = p.knd || '';

    head.rem = p.rem ?? '';

  }



  function addLine() {

    if (isFormReadonly.value) return;

    lines.value = [...lines.value, newLine(String(lines.value.length + 1), head.bom_no || '')];

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



  function updateLine(idx: number, patch: Partial<BomLineRow>) {

    if (isFormReadonly.value) return;

    const next = [...lines.value];

    const merged = { ...next[idx], ...patch };

    if (patch.wh != null) merged.wh_no = String(patch.wh);

    if (patch.name != null) merged.prd_name = String(patch.name);

    next[idx] = merged;

    lines.value = next;

  }



  async function onSave() {

    if (formViewOnly.value) {

      ElMessage.warning('查看模式不可修改');

      return;

    }

    if (!head.prd_no?.trim()) {

      ElMessage.warning('请选择母件品号');

      return;

    }

    const headPrd =
      headParentProducts.value.find((p) => p.prd_no === head.prd_no) ||
      products.value.find((p) => p.prd_no === head.prd_no);

    if (!isPrdtBomParentKnd(headPrd?.knd ?? head.prd_knd)) {

      ElMessage.warning('母件品号须为制成品或半成品');

      return;

    }

    const validLines = lines.value.filter((ln) => ln.prd_no?.trim());

    if (!validLines.length) {

      ElMessage.warning('表身至少一行有效子件');

      return;

    }

    if (validLines.some((ln) => ln.prd_no === head.prd_no)) {

      ElMessage.warning('子件品号不可与母件相同');

      return;

    }

    if (editing.value) {

      head.bom_no = editing.value;

    } else {

      head.bom_no = buildBomNo(head.prd_no, head.pf_no);

    }

    saving.value = true;

    try {

      const payload = {

        head: { ...head },

        lines: validLines.map((ln) => lineToApi({ ...ln, bom_no: head.bom_no })),

      };

      if (editing.value) {

        const { data } = await api.updateBomRecipe(editing.value, payload);

        if (data.head) {

          Object.assign(head, data.head);

          if (data.lines) {

            lines.value = data.lines.map((l, i) => lineToUi(l, String(i + 1)));

          }

        }

        ElMessage.success('存盘成功');

      } else {

        const { data } = await api.createBomRecipe(payload);

        head.bom_no = data.head.bom_no;

        Object.assign(head, data.head);

        editing.value = data.head.bom_no;

        lines.value = data.lines.map((l, i) => lineToUi(l, String(i + 1)));

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



  async function onDeleteBill(bomNo: string) {

    try {

      await ElMessageBox.confirm(formLabels.deleteConfirm(bomNo), '删除确认', {

        type: 'warning',

        confirmButtonText: '删除',

        cancelButtonText: '取消',

      });

    } catch {

      return;

    }

    loading.value = true;

    try {

      await api.deleteBomRecipe(bomNo);

      ElMessage.success('删除成功');

      if (editing.value === bomNo) {

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



  async function initPage() {
    await loadMasters();
    await reloadAll();
  }



  return {

    formLabels,

    viewMode,

    listTab,

    head,

    lines,

    list,

    detailLines,

    filters,

    lineFormFields,

    headQueryFields,

    detailQueryFields,

    loading,

    saving,

    depts,

    products,

    whs,

    editing,

    prdDisplay,

    headParentProducts,

    depName,

    whName,

    kndLabel,

    totals,

    isFormReadonly,

    filteredList,

    detailSummary,

    billStatus,

    loadMasters,

    reloadAll,

    loadDetailLines,

    onDetailSummaryChange,

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

    initPage,

  };

}

