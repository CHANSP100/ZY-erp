<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import ErpBillPage from '@/components/erp/ErpBillPage.vue';
import ErpBillToolbar from '@/components/erp/ErpBillToolbar.vue';
import ErpBillQueryField from '@/components/erp/ErpBillQueryField.vue';
import ErpBillLineTable from '@/components/erp/ErpBillLineTable.vue';
import ErpBillHeadExtFields from '@/components/erp/ErpBillHeadExtFields.vue';
import ErpBillAuditMeta from '@/components/erp/ErpBillAuditMeta.vue';
import { INV_BB, pickQuery, pickList, pickForm } from '@/config/fields';
import LookupDialog from '@/components/LookupDialog.vue';
import LookupField from '@/components/LookupField.vue';
import LookupPicker from '@/components/LookupPicker.vue';
import { getLookupDialogProps, getInlineLookupDialogProps } from '@/config/lookups';
import { api } from '@/api';
import { useBillLineAddRows } from '@/composables/useBillLineAddRows';
import { resolveLineProductByCode } from '@/utils/billLineProductLookup';
import type {
  Cust,
  Dept,
  OpenPurchaseReceipt,
  Product,
  PurchaseReturnHead,
  PurchaseReturnLine,
  Salm,
  Warehouse,
} from '@/api/types';
import { calcLineAmounts, sumLines } from '@/utils/tax';
import { buildBillSavePayload } from '@/utils/billExtPayload';
import { useErpBillEditDelete } from '@/composables/useErpBillEditDelete';

type LineRow = PurchaseReturnLine & { _key: string; spc?: string };

const TAX_OPTIONS = [
  { value: '1', label: '不计税' },
  { value: '2', label: '应税内含' },
  { value: '3', label: '应税外加' },
];

const ZHANG_OPTIONS = [
  { value: '1', label: '单张立帐' },
  { value: '2', label: '不立帐' },
  { value: '3', label: '收到发票才立帐' },
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function newLine(key: string): LineRow {
  return {
    _key: key,
    prd_no: '',
    prd_name: '',
    prd_mark: '',
    wh: '',
    qty: 0,
    ut: '',
    up: 0,
    amtn_net: 0,
    tax_rto: 13,
    tax: 0,
    dis_cnt: 0,
    qty1: 0,
    bat_no: '',
    est_dd: '',
    sup_prd_no: '',
    rem: '',
    os_id: 'PC',
    os_no: '',
    ext_fields: {},
  };
}

function recalcLine(ln: LineRow, taxId: string): LineRow {
  const c = calcLineAmounts(ln.qty, ln.up, taxId, ln.tax_rto ?? 13);
  return { ...ln, amtn_net: c.amtn_net, tax: c.tax };
}

const head = reactive<PurchaseReturnHead>({
  ps_no: '',
  ps_dd: today(),
  cus_no: '',
  tax_id: '2',
  os_id: 'PC',
  zhang_id: '1',
  dis_cnt: 0,
  ext_fields: {},
});

const lines = ref<LineRow[]>([]);
const list = ref<PurchaseReturnHead[]>([]);
const filters = reactive({
  ps_no: '',
  cus_no: '',
  dateFrom: '',
  dateTo: '',
});
/** 字段配置 — 同步 analysis/字段对照/进货退回.md */
const headQueryFields = pickQuery(INV_BB.head);
const headListFields = pickList(INV_BB.head);
const lineFormFields = pickForm(INV_BB.line);
const loading = ref(false);
const saving = ref(false);
const custs = ref<Cust[]>([]);
const salms = ref<Salm[]>([]);
const depts = ref<Dept[]>([]);
const products = ref<Product[]>([]);
const whs = ref<Warehouse[]>([]);
const openReceipts = ref<OpenPurchaseReceipt[]>([]);
const editing = ref<string | null>(null);

const custPicker = ref(false);
const salPicker = ref(false);
const depPicker = ref(false);
const sendWhPicker = ref(false);
const pcPicker = ref(false);
const prdPicker = ref(false);
const prdLineIdx = ref<number | null>(null);

const custName = computed(
  () => custs.value.find((c) => c.cus_no === head.cus_no)?.name || ''
);
const salName = computed(
  () => salms.value.find((s) => s.sal_no === head.sal_no)?.name || ''
);
const depName = computed(
  () => depts.value.find((d) => d.dep === head.dep)?.name || ''
);
const sendWhName = computed(
  () => whs.value.find((w) => w.wh === head.send_wh)?.name || ''
);

const totals = computed(() => sumLines(lines.value));

const displayList = computed(() => {
  let rows = list.value;
  const qNo = filters.ps_no.trim().toLowerCase();
  const qCus = filters.cus_no.trim().toLowerCase();
  if (qNo) {
    rows = rows.filter(
      (r) =>
        r.ps_no?.toLowerCase().includes(qNo) ||
        r.os_no?.toLowerCase().includes(qNo)
    );
  }
  if (qCus) {
    rows = rows.filter(
      (r) =>
        r.cus_name?.toLowerCase().includes(qCus) ||
        r.cus_no?.toLowerCase().includes(qCus)
    );
  }
  if (filters.dateFrom) rows = rows.filter((r) => (r.ps_dd || '') >= filters.dateFrom);
  if (filters.dateTo) rows = rows.filter((r) => (r.ps_dd || '') <= filters.dateTo);
  return rows;
});

function resetQuery() {
  filters.ps_no = '';
  filters.cus_no = '';
  filters.dateFrom = '';
  filters.dateTo = '';
}

async function loadMasters() {
  const [c, s, d, w, p] = await Promise.all([
    api.custList({ limit: 500 }),
    api.salmList(),
    api.deptList(),
    api.warehouses(),
    api.productList({ limit: 500 }),
  ]);
  custs.value = c.data;
  salms.value = s.data;
  depts.value = d.data;
  whs.value = w.data;
  products.value = p.data;
}

async function loadList() {
  loading.value = true;
  try {
    const { data } = await api.purchaseReturnList({ limit: 200 });
    list.value = data;
  } finally {
    loading.value = false;
  }
}

async function onNew() {
  const { data } = await api.nextPurchaseReturnNo();
  Object.assign(head, {
    ps_no: data.ps_no,
    ps_dd: today(),
    cus_no: '',
    cus_name: '',
    dep: '',
    sal_no: '',
    cus_os_no: '',
    bil_type: '',
    cur_id: 'RMB',
    tax_id: '2',
    os_id: 'PC',
    os_no: '',
    zhang_id: '1',
    send_mth: '',
    send_wh: '',
    adr: '',
    pay_mth: '',
    pay_days: undefined,
    pay_dd: '',
    chk_dd: '',
    inv_no: '',
    rp_no: '',
    voh_no: '',
    contract: '',
    rem: '',
    dis_cnt: 0,
    amtn_net: 0,
    tax: 0,
    ext_fields: {},
  });
  lines.value = [];
  editing.value = null;
}

function applyCust(c: Cust) {
  head.cus_no = c.cus_no;
  head.sal_no = c.sal_no || head.sal_no;
  head.cur_id = c.cur_id || 'RMB';
  head.tax_id = c.id1_tax || '2';
  head.adr = c.adr2 || head.adr;
  lines.value = lines.value.map((ln) => recalcLine(ln, head.tax_id || '2'));
}

function addLine() {
  lines.value = [...lines.value, newLine(String(lines.value.length + 1))];
}
const { onAddLines } = useBillLineAddRows(addLine);

function removeLine(idx: number) {
  lines.value = lines.value.filter((_, i) => i !== idx);
}

function openProductPicker(idx: number) {
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

function onLineProductFromRow(index: number, p: Record<string, unknown>) {
  updateLine(index, {
    prd_no: String(p.prd_no ?? ''),
    prd_name: String(p.name || ''),
    spc: String(p.spc ?? ''),
    ut: String(p.ut ?? ''),
    wh: String(p.wh ?? ''),
    up: Number(p.upr ?? 0),
  });
}

function onTaxChange() {
  lines.value = lines.value.map((ln) => recalcLine(ln, head.tax_id || '2'));
}

function updateLine(idx: number, patch: Partial<LineRow>) {
  const next = [...lines.value];
  next[idx] = recalcLine({ ...next[idx], ...patch }, head.tax_id || '2');
  lines.value = next;
}

async function openPcTransfer() {
  if (!head.cus_no) {
    ElMessage.warning('请先选择厂商');
    return;
  }
  const { data } = await api.openPurchaseReceipts(head.cus_no);
  if (!data.length) {
    ElMessage.info('该厂商没有可退回的进货单');
    return;
  }
  openReceipts.value = data;
  pcPicker.value = true;
}

async function transferFromPc(psNo: string) {
  try {
    const { data } = await api.purchaseReceiptReturnLines(psNo);
    const h = data.head;
    head.os_id = 'PC';
    head.os_no = h.ps_no || '';
    head.cus_no = h.cus_no || head.cus_no;
    head.sal_no = h.sal_no || head.sal_no;
    head.cur_id = h.cur_id || head.cur_id;
    head.tax_id = h.tax_id || head.tax_id;
    head.cus_os_no = h.cus_os_no || '';
    head.bil_type = h.bil_type || '';
    head.dep = h.dep || '';
    lines.value = data.lines.map((ln, i) =>
      recalcLine(
        {
          ...newLine(String(i + 1)),
          prd_no: ln.prd_no,
          prd_name: ln.prd_name,
          spc: ln.spc,
          wh: ln.wh,
          qty: ln.qty_open ?? ln.qty,
          ut: ln.ut,
          up: ln.up,
          tax_rto: ln.tax_rto ?? 13,
          est_dd: ln.est_dd,
          sup_prd_no: ln.sup_prd_no,
          rem: ln.rem,
          os_id: 'PC',
          os_no: h.ps_no,
          src_itm: ln.itm,
        },
        head.tax_id || '2'
      )
    );
    pcPicker.value = false;
    ElMessage.success(`已从进货单 ${psNo} 带入表身`);
  } catch {
    ElMessage.error('转入失败');
  }
}

async function onSave() {
  if (!head.cus_no) {
    ElMessage.warning('请选择厂商');
    return;
  }
  if (!lines.value.length) {
    ElMessage.warning('请先转入或录入表身');
    return;
  }
  const validLines = lines.value.filter((ln) => ln.prd_no?.trim());
  if (!validLines.length) {
    ElMessage.warning('表身至少一行有效货品');
    return;
  }
  const payload = buildBillSavePayload(head, validLines, ({ _key, spc, qty_open, ...rest }) => rest);
  saving.value = true;
  try {
    if (editing.value) {
      await api.updatePurchaseReturn(editing.value, payload);
      ElMessage.success('更新成功');
    } else {
      await api.createPurchaseReturn(payload);
      ElMessage.success('存盘成功');
      editing.value = head.ps_no;
    }
    await loadList();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } };
    ElMessage.error(err.response?.data?.error || '存盘失败');
  } finally {
    saving.value = false;
  }
}

async function openAdd() {
  await onNew();
}

async function openEdit(row: PurchaseReturnHead) {
  await openReturn(row.ps_no);
}

async function openReturn(psNo: string) {
  const { data } = await api.getPurchaseReturn(psNo);
  Object.assign(head, data.head);
  editing.value = psNo;
  lines.value = data.lines.map((l, i) =>
    recalcLine({ ...l, _key: String(i + 1), spc: l.spc, ext_fields: l.ext_fields ?? {} }, head.tax_id || '2')
  );
}

const {
  deleting,
  editPicker,
  canDelete,
  onToolbarEdit,
  onToolbarDelete,
  onPickEdit,
} = useErpBillEditDelete({
  billLabel: '进货退回单',
  billNoKey: 'ps_no',
  getBillNo: () => head.ps_no,
  editing,
  list,
  openBill: openReturn,
  resetNew: onNew,
  reloadList: loadList,
  deleteBill: (no) => api.deletePurchaseReturn(no).then(() => undefined),
});

onMounted(async () => {
  try {
    await loadMasters();
    await loadList();
  } catch {
    ElMessage.error('加载进货退回失败');
  }
});
</script>

<template>
  <ErpBillPage title="进货退回" subtitle="顶部查询 · 表头表身页内维护 · 下方浏览历史单据" :loading="loading" :menu-code="INV_BB.menuCode">
    <template #toolbar>
      <ErpBillToolbar @search="loadList" @reset="resetQuery">
        <template #actions>
          <el-button type="primary" @click="openAdd">新增</el-button>
          <el-button type="success" :loading="saving" @click="onSave">存盘</el-button>
          <el-button @click="onToolbarEdit">编辑</el-button>
          <el-button type="danger" :loading="deleting" :disabled="!canDelete" @click="onToolbarDelete">删除</el-button>
          <el-button @click="loadList">刷新</el-button>
        </template>
        <template #query>
          <ErpBillQueryField
            v-for="f in headQueryFields"
            :key="f.dbField"
            :label="f.label"
            :width="f.key === 'ps_dd' ? 280 : undefined"
          >
            <template v-if="f.key === 'ps_dd'">
              <div style="display: flex; gap: 6px; width: 100%">
                <el-date-picker v-model="filters.dateFrom" type="date" value-format="YYYY-MM-DD" placeholder="起" style="flex: 1" />
                <el-date-picker v-model="filters.dateTo" type="date" value-format="YYYY-MM-DD" placeholder="止" style="flex: 1" />
              </div>
            </template>
            <el-input v-else-if="f.key === 'ps_no'" v-model="filters.ps_no" clearable placeholder="模糊查询" @keyup.enter="loadList" />
            <el-input v-else-if="f.key === 'cus_no'" v-model="filters.cus_no" clearable placeholder="代号/名称" @keyup.enter="loadList" />
          </ErpBillQueryField>
        </template>
      </ErpBillToolbar>
    </template>

    <template #header>
      <div class="erp-bill-section-head">
        <span>表头</span>
        <div class="erp-bill-section-actions">
          <el-button size="small" @click="addLine">增行</el-button>
          <el-button size="small" @click="openPcTransfer">从进货单转入</el-button>
        </div>
      </div>
      <el-form label-width="96px" label-position="right" class="erp-bill-header-form">
          <el-row :gutter="12">
            <el-col :span="6">
              <el-form-item label="退回日期" required data-field="PS_DD">
                <el-date-picker v-model="head.ps_dd" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="退回单号" data-field="PS_NO">
                <el-input v-model="head.ps_no" readonly />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="转入单号">
                <el-input v-model="head.os_no" readonly placeholder="从进货单转入" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="客户单号">
                <el-input v-model="head.cus_os_no" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="厂商" required>
                <LookupField :model-value="head.cus_no" :display="custName" @open="custPicker = true" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="业务人员">
                <LookupField :model-value="head.sal_no" :display="salName" @open="salPicker = true" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="单据类别">
                <el-input v-model="head.bil_type" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="12">
            <el-col :span="6">
              <el-form-item label="币别">
                <LookupPicker v-model="head.cur_id" preset="currency" placeholder="选择币别" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="扣税类别">
                <el-select v-model="head.tax_id" style="width: 100%" @change="onTaxChange">
                  <el-option v-for="o in TAX_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="部门">
                <LookupField :model-value="head.dep" :display="depName" @open="depPicker = true" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="折扣%">
                <el-input-number v-model="head.dis_cnt" :min="0" :max="100" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="12">
            <el-col :span="6">
              <el-form-item label="立帐方式">
                <el-select v-model="head.zhang_id" style="width: 100%">
                  <el-option v-for="o in ZHANG_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="交货方式">
                <el-input v-model="head.send_mth" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="交货仓">
                <LookupField :model-value="head.send_wh" :display="sendWhName" @open="sendWhPicker = true" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="交易方式">
                <el-input v-model="head.pay_mth" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="12">
            <el-col :span="6">
              <el-form-item label="付款天数">
                <el-input-number v-model="head.pay_days" :min="0" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="付款日期">
                <el-date-picker v-model="head.pay_dd" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="票据日期">
                <el-date-picker v-model="head.chk_dd" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="合同号">
                <el-input v-model="head.contract" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="12">
            <el-col :span="6">
              <el-form-item label="发票号码">
                <el-input v-model="head.inv_no" readonly />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="收付款单号">
                <el-input v-model="head.rp_no" readonly />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="凭证号码">
                <el-input v-model="head.voh_no" readonly />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="送货地址">
            <el-input v-model="head.adr" type="textarea" :rows="2" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="head.rem" type="textarea" :rows="2" />
          </el-form-item>
          <ErpBillAuditMeta :meta="head" />
          <ErpBillHeadExtFields v-model="head.ext_fields" :menu-code="INV_BB.menuCode" />
        </el-form>
    </template>

    <template #lines>
      <div class="erp-bill-section-head">
        <span>表身明细</span>
      </div>
      <ErpBillLineTable
        :fields="lineFormFields"
        :lines="lines"
        :whs="whs"
        :menu-code="INV_BB.menuCode"
        :lookup-products="(products as unknown as Record<string, unknown>[])"
        :lookup-resolve-by-code="resolveLineProductByCode"
        @add-lines="onAddLines"
        @update-line="updateLine"
        @open-product-picker="openProductPicker"
        @select-product="onLineProductFromRow"
      >
        <template #actions="{ index }">
          <el-button link type="danger" size="small" @click="removeLine(index)">删</el-button>
        </template>
      </ErpBillLineTable>
    </template>

    <template #totals>
      <div class="erp-bill-totals-row">
        <span>未税本币：<strong>{{ totals.amtn_net }}</strong></span>
        <span>税额：<strong>{{ totals.tax }}</strong></span>
        <span>合计：<strong>{{ totals.total }}</strong></span>
      </div>
    </template>

    <template #listTitle>历史单据</template>
    <template #list>
      <el-table
        :data="displayList"
        border
        stripe
        highlight-current-row
        max-height="240"
        empty-text="暂无单据，可调整筛选条件或点击「新增」"
        @row-dblclick="openEdit"
      >
        <el-table-column
          v-for="f in headListFields"
          :key="f.dbField"
          :prop="f.key"
          :label="f.label"
          :width="f.width"
          :min-width="f.minWidth"
          show-overflow-tooltip
          align="center"
        >
          <template #header>
            <span :data-field="f.dbField" :title="f.dbField">{{ f.label }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>

    <template #footer>
      <div v-if="displayList.length" class="erp-table-footer">
        <span class="erp-table-total">共 <strong>{{ displayList.length }}</strong> 条</span>
      </div>
    </template>
  </ErpBillPage>

  <LookupDialog
    v-model="custPicker"
    v-bind="getLookupDialogProps('cust')"
    :data="custs"
    @select="applyCust"
  />

  <LookupDialog
    v-model="salPicker"
    v-bind="getLookupDialogProps('salm')"
    :data="salms"
    @select="(r: Salm) => { head.sal_no = r.sal_no; }"
  />

  <LookupDialog
    v-model="depPicker"
    v-bind="getLookupDialogProps('dept')"
    :data="depts"
    @select="(r: Dept) => { head.dep = r.dep; }"
  />

  <LookupDialog
    v-model="sendWhPicker"
    v-bind="getLookupDialogProps('warehouse', { title: '选择交货仓' })"
    :data="whs"
    @select="(r: Warehouse) => { head.send_wh = r.wh; }"
  />

  <LookupDialog
    v-model="prdPicker"
    v-bind="getLookupDialogProps('product')"
    :data="products"
    @select="applyProduct"
  />

  <LookupDialog
    v-model="pcPicker"
    v-bind="getInlineLookupDialogProps({
      title: '选择进货单',
      rowKey: 'ps_no',
      searchKeys: ['ps_no', 'cus_os_no'],
      columns: [
        { prop: 'ps_no', label: 'PS_NO', width: 120 },
        { prop: 'ps_dd', label: 'PS_DD', width: 100 },
        { prop: 'cus_os_no', label: 'CUS_OS_NO', minWidth: 120 },
      ],
    })"
    :data="openReceipts"
    @select="(r: OpenPurchaseReceipt) => transferFromPc(r.ps_no)"
  />

  <LookupDialog
    v-model="editPicker"
    v-bind="getInlineLookupDialogProps({
      title: '选择进货退回单',
      rowKey: 'ps_no',
      searchKeys: ['ps_no', 'cus_no', 'cus_name', 'os_no'],
      columns: [
        { prop: 'ps_no', label: 'PS_NO', width: 120 },
        { prop: 'ps_dd', label: 'PS_DD', width: 100 },
        { prop: 'cus_no', label: 'CUS_NO', width: 90 },
        { prop: 'cus_name', label: 'CUS_NAME', minWidth: 120 },
      ],
    })"
    :data="list"
    @select="onPickEdit"
  />
</template>
