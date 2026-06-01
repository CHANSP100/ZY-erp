<script setup lang="ts">
import { computed, ref } from 'vue';
import ErpBillLineTable from '@/components/erp/kingdee/ErpBillLineTable.vue';
import ErpBillHeadExtFields from '@/components/erp/ErpBillHeadExtFields.vue';
import ErpBillAuditMeta from '@/components/erp/ErpBillAuditMeta.vue';
import ErpBillLineToolbar from '@/components/erp/kingdee/ErpBillLineToolbar.vue';
import ErpKingdeeBillEdit from '@/components/erp/kingdee/ErpKingdeeBillEdit.vue';
import LookupDialog from '@/components/LookupDialog.vue';
import LookupField from '@/components/LookupField.vue';
import LookupPicker from '@/components/LookupPicker.vue';
import BilSpcSalesLookupDialog from '@/components/BilSpcSalesLookupDialog.vue';
import type { BilSpc, Cust, Dept, Product, SalesOrderHead, Salm } from '@/api/types';
import type { ErpFieldMeta } from '@/config/fields/types';
import { fmtNum } from '@/utils/sunlike';
import { resolveLineProductByCode } from '@/utils/billLineProductLookup';
import { getLookupDialogProps } from '@/config/lookups';
import { useBillLineAddRows } from '@/composables/useBillLineAddRows';

const props = defineProps<{
  head: SalesOrderHead;
  lines: Record<string, unknown>[];
  lineFormFields: ErpFieldMeta[];
  whs: { wh: string; name?: string }[];
  custs: Cust[];
  salms: Salm[];
  depts: Dept[];
  currs: { cur_id: string; name?: string }[];
  products: Product[];
  taxOptions: { value: string; label: string }[];
  editing: string | null;
  isFormReadonly: boolean;
  saving: boolean;
  loading: boolean;
  custName: string;
  salName: string;
  depName: string;
  curName: string;
  totals: { amtn_net: number; tax: number };
  billStatus: (row: SalesOrderHead) => { label: string; kind: string };
  formLabels?: {
    formTitleNew: string;
    formTitleEdit: string;
    formTitleView: string;
    orderNoLabel: string;
    partnerName: string;
    partnerOrderLabel: string;
    bilTypePlaceholder: string;
    selectPartner: string;
    selectPartnerDialog: string;
  };
  /** 采购单：显示「从请购单转入」 */
  showSqTransfer?: boolean;
  /** 隐藏标题栏（单号/状态）与左侧分区导航 */
  hideBillHeadline?: boolean;
  hideSectionNav?: boolean;
  /** 隐藏底部返回/保存按钮（顶部工具栏仍保留） */
  hideFooterActions?: boolean;
  menuCode: string;
}>();

const emit = defineEmits<{
  goList: [];
  goAdd: [];
  save: [];
  audit: [];
  unAudit: [];
  deleteBill: [string];
  taxChange: [];
  addLine: [];
  copyLines: [number[]];
  removeLines: [number[]];
  updateLine: [number, Record<string, unknown>];
  openProductPicker: [number];
  applyCust: [Cust];
  openSqTransfer: [];
}>();

const custPicker = ref(false);
const salPicker = ref(false);
const depPicker = ref(false);
const bilTypePicker = ref(false);
const bilTypeName = ref('');
const prdPicker = ref(false);
const prdLineIdx = ref<number | null>(null);
const selectedLineIndexes = ref<number[]>([]);
const lineTableRef = ref<{ clearSelection?: () => void } | null>(null);
const { onAddLines } = useBillLineAddRows(() => emit('addLine'));

const bilTypeDisplay = computed(() => {
  const code = props.head.bil_type?.trim() || '';
  if (!code) return '';
  const name = bilTypeName.value.trim();
  return name ? `${code} ${name}` : code;
});

const curDisplay = computed(() => {
  const code = props.head.cur_id?.trim() || '';
  if (!code) return '';
  const name = props.curName.trim();
  return name ? `${code} ${name}` : code;
});

function applyBilSpc(row: BilSpc) {
  if (props.isFormReadonly) return;
  props.head.bil_type = row.spc_no;
  bilTypeName.value = row.name?.trim() || '';
  bilTypePicker.value = false;
}

const labels = computed(() => ({
  formTitleNew: '新增销售订单',
  formTitleEdit: '编辑销售订单',
  formTitleView: '查看销售订单',
  orderNoLabel: '销售订单号',
  partnerName: '客户',
  partnerOrderLabel: '客户订单号',
  bilTypePlaceholder: '标准销售订单',
  selectPartner: '选择客户',
  selectPartnerDialog: '选择客户',
  ...props.formLabels,
}));

const formTitle = computed(() =>
  props.editing
    ? props.isFormReadonly
      ? labels.value.formTitleView
      : labels.value.formTitleEdit
    : labels.value.formTitleNew
);

function onCopyLines() {
  emit('copyLines', selectedLineIndexes.value);
  selectedLineIndexes.value = [];
  lineTableRef.value?.clearSelection?.();
}

function onRemoveLines() {
  emit('removeLines', selectedLineIndexes.value);
  selectedLineIndexes.value = [];
  lineTableRef.value?.clearSelection?.();
}

function openPrdPicker(idx: number) {
  prdLineIdx.value = idx;
  prdPicker.value = true;
}

function onProduct(p: Product) {
  if (prdLineIdx.value == null) return;
  emit('updateLine', prdLineIdx.value, {
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
  emit('updateLine', index, {
    prd_no: p.prd_no,
    prd_name: p.name || '',
    spc: p.spc || '',
    ut: p.ut || '',
    wh: p.wh || '',
    up: Number(p.upr ?? 0),
  });
}
</script>

<template>
  <ErpKingdeeBillEdit
    :title="formTitle"
    :bill-no="head.os_no || undefined"
    :status-label="head.os_no ? billStatus(head).label : '新建'"
    :status-kind="(head.os_no ? billStatus(head).kind : 'open') as 'open' | 'audited' | 'closed' | 'analyzed'"
    :loading="loading"
    :menu-code="menuCode"
    :hide-headline="hideBillHeadline"
    :hide-section-nav="hideSectionNav"
  >
    <template #toolbar-left>
      <button type="button" class="kd-so-back" @click="emit('goList')">← 返回列表</button>
    </template>
    <template #toolbar>
      <el-button v-if="!isFormReadonly" type="primary" :loading="saving" @click="emit('save')">保存</el-button>
      <el-button v-if="!isFormReadonly && editing" type="primary" plain @click="emit('audit')">审核</el-button>
      <el-button v-if="isFormReadonly && editing && billStatus(head).kind !== 'closed'" @click="emit('unAudit')">
        反审核
      </el-button>
      <el-button
        v-if="editing && billStatus(head).kind === 'open'"
        type="danger"
        plain
        @click="emit('deleteBill', head.os_no!)"
      >
        删除
      </el-button>
      <el-button v-if="!editing && !isFormReadonly" @click="emit('goAdd')">新增</el-button>
      <el-button
        v-if="showSqTransfer && !isFormReadonly"
        type="primary"
        plain
        @click="emit('openSqTransfer')"
      >
        从请购单转入
      </el-button>
    </template>

    <template #basic>
      <el-form
        label-width="96px"
        label-position="right"
        class="kd-bill-header-form"
        :class="{ 'kd-so-form--readonly': isFormReadonly }"
        @submit.prevent
      >
        <el-row :gutter="12">
          <el-col :span="6">
            <el-form-item label="日期" required data-field="OS_DD">
              <el-date-picker
                v-model="head.os_dd"
                type="date"
                value-format="YYYY-MM-DD"
                :disabled="isFormReadonly"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item :label="labels.orderNoLabel" required data-field="OS_NO">
              <el-input :model-value="head.os_no" readonly />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="预交日" required data-field="EST_DD">
              <el-date-picker
                v-model="head.est_dd"
                type="date"
                value-format="YYYY-MM-DD"
                :disabled="isFormReadonly"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="单据类别" data-field="BIL_TYPE">
              <LookupField
                :model-value="head.bil_type"
                :display="bilTypeDisplay"
                :placeholder="labels.bilTypePlaceholder"
                :disabled="isFormReadonly"
                @open="bilTypePicker = true"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="6">
            <el-form-item :label="labels.partnerName" required data-field="CUS_NO">
              <LookupField
                :model-value="head.cus_no"
                :display="custName ? `${head.cus_no} ${custName}` : head.cus_no"
                :placeholder="labels.selectPartner"
                :disabled="isFormReadonly"
                @open="custPicker = true"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="部门" data-field="USE_DEP">
              <LookupField
                :model-value="head.use_dep"
                :display="depName ? `${head.use_dep} ${depName}` : head.use_dep"
                placeholder="选择部门"
                :disabled="isFormReadonly"
                @open="depPicker = true"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="业务员" data-field="SAL_NO">
              <LookupField
                :model-value="head.sal_no"
                :display="salName ? `${head.sal_no} ${salName}` : head.sal_no"
                placeholder="选择业务员"
                :disabled="isFormReadonly"
                @open="salPicker = true"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item :label="labels.partnerOrderLabel" data-field="CUS_OS_NO">
              <el-input v-model="head.cus_os_no" :disabled="isFormReadonly" />
            </el-form-item>
          </el-col>
          <el-col v-if="showSqTransfer && head.bil_id === 'SQ'" :span="6">
            <el-form-item label="转入请购单" data-field="BIL_NO">
              <el-input :model-value="head.bil_no" readonly />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="6">
            <el-form-item label="币别" data-field="CUR_ID">
              <LookupPicker
                v-model="head.cur_id"
                preset="currency"
                :display="curDisplay"
                placeholder="选择币别"
                :disabled="isFormReadonly"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="扣税类别" data-field="TAX_ID">
              <el-select
                v-model="head.tax_id"
                :disabled="isFormReadonly"
                style="width: 100%"
                @change="emit('taxChange')"
              >
                <el-option v-for="o in taxOptions" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="结案" data-field="CLS_ID">
              <el-input :model-value="head.cls_id || ''" readonly placeholder="—" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="24">
            <el-form-item label="备注" data-field="REM">
              <el-input v-model="head.rem" type="textarea" :rows="2" :disabled="isFormReadonly" />
            </el-form-item>
          </el-col>
        </el-row>
        <ErpBillAuditMeta :meta="head" />
        <ErpBillHeadExtFields
          v-model="head.ext_fields"
          :menu-code="menuCode"
          :readonly="isFormReadonly"
        />
      </el-form>
    </template>

    <template #section-actions-lines>
      <ErpBillLineToolbar
        :readonly="isFormReadonly"
        :has-selection="selectedLineIndexes.length > 0"
        @add="emit('addLine')"
        @copy="onCopyLines"
        @remove="onRemoveLines"
      />
    </template>

    <template #lines>
      <ErpBillLineTable
        ref="lineTableRef"
        :fields="lineFormFields"
        :lines="lines"
        :whs="whs"
        :menu-code="menuCode"
        :readonly="isFormReadonly"
        :lookup-products="(products as unknown as Record<string, unknown>[])"
        :lookup-resolve-by-code="resolveLineProductByCode"
        @add-lines="onAddLines"
        @update-line="(i, p) => emit('updateLine', i, p)"
        @open-product-picker="openPrdPicker"
        @select-product="onLineProductFromRow"
        @selection-change="selectedLineIndexes = $event"
      />
    </template>

    <template #totals>
      <div class="kd-bill-edit__totals-row">
        <span>未税合计<strong>{{ fmtNum(totals.amtn_net) }}</strong></span>
        <span>税额合计<strong>{{ fmtNum(totals.tax) }}</strong></span>
        <span>价税合计<strong>{{ fmtNum(totals.amtn_net + totals.tax) }}</strong></span>
      </div>
    </template>

    <template v-if="!hideFooterActions" #footer>
      <el-button @click="emit('goList')">返回</el-button>
      <el-button v-if="!isFormReadonly" type="primary" :loading="saving" @click="emit('save')">保存</el-button>
    </template>
  </ErpKingdeeBillEdit>

  <BilSpcSalesLookupDialog v-model="bilTypePicker" @select="applyBilSpc" />
  <LookupDialog
    v-model="custPicker"
    v-bind="getLookupDialogProps('cust', { title: labels.selectPartnerDialog })"
    :data="(custs as unknown as Record<string, unknown>[])"
    @select="(c) => { emit('applyCust', c as unknown as Cust); custPicker = false; }"
  />
  <LookupDialog
    v-model="salPicker"
    v-bind="getLookupDialogProps('salm')"
    :data="(salms as unknown as Record<string, unknown>[])"
    @select="(s) => { if (!isFormReadonly) head.sal_no = (s as unknown as Salm).sal_no; salPicker = false; }"
  />
  <LookupDialog
    v-model="depPicker"
    v-bind="getLookupDialogProps('dept')"
    :data="(depts as unknown as Record<string, unknown>[])"
    @select="(d) => { if (!isFormReadonly) head.use_dep = (d as unknown as Dept).dep; depPicker = false; }"
  />
  <LookupDialog
    v-model="prdPicker"
    v-bind="getLookupDialogProps('product')"
    :data="(products as unknown as Record<string, unknown>[])"
    @select="(p) => onProduct(p as unknown as Product)"
  />
</template>
