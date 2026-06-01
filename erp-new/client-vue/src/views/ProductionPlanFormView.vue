<script setup lang="ts">
import { computed, ref } from 'vue';
import ErpBillLineTable from '@/components/erp/kingdee/ErpBillLineTable.vue';
import ErpBillHeadExtFields from '@/components/erp/ErpBillHeadExtFields.vue';
import ErpBillAuditMeta from '@/components/erp/ErpBillAuditMeta.vue';
import ErpBillLineToolbar from '@/components/erp/kingdee/ErpBillLineToolbar.vue';
import ErpKingdeeBillEdit from '@/components/erp/kingdee/ErpKingdeeBillEdit.vue';
import LookupDialog from '@/components/LookupDialog.vue';
import LookupField from '@/components/LookupField.vue';
import { getLookupDialogProps, getInlineLookupDialogProps } from '@/config/lookups';
import type { Cust, Dept, OpenSalesOrderForJh, ProductionPlanHead, Product, Salm } from '@/api/types';
import type { ErpFieldMeta } from '@/config/fields/types';
import { useBillLineAddRows } from '@/composables/useBillLineAddRows';
import { resolveLineProductByCode } from '@/utils/billLineProductLookup';

const props = defineProps<{
  head: ProductionPlanHead;
  lines: Record<string, unknown>[];
  lineFormFields: ErpFieldMeta[];
  depts: Dept[];
  products: Product[];
  whs: { wh: string; name?: string }[];
  salms: Salm[];
  custs: Cust[];
  openSoList: OpenSalesOrderForJh[];
  editing: string | null;
  isFormReadonly: boolean;
  saving: boolean;
  loading: boolean;
  depName: string;
  salName: string;
  cusName: string;
  totals: { qty: number };
  billStatus: (row: ProductionPlanHead) => { label: string; kind: string };
  formLabels?: {
    formTitleNew: string;
    formTitleEdit: string;
    formTitleView: string;
    orderNoLabel: string;
  };
  menuCode: string;
}>();

const emit = defineEmits<{
  goList: [];
  goAdd: [];
  save: [];
  audit: [];
  unAudit: [];
  deleteBill: [string];
  addLine: [];
  copyLines: [number[]];
  removeLines: [number[]];
  updateLine: [number, Record<string, unknown>];
  transferFromSo: [string];
  applyCustomer: [Cust];
}>();

const soPicker = ref(false);
const depPicker = ref(false);
const salPicker = ref(false);
const cusPicker = ref(false);
const prdPicker = ref(false);
const prdLineIdx = ref<number | null>(null);
const selectedLineIndexes = ref<number[]>([]);
const lineTableRef = ref<{ clearSelection?: () => void } | null>(null);
const { onAddLines } = useBillLineAddRows(() => emit('addLine'));

const closeOptions = [
  { value: '', label: '未结案' },
  { value: 'T', label: '已结案' },
];
const labels = computed(() => ({
  formTitleNew: '新增生产计划',
  formTitleEdit: '编辑生产计划',
  formTitleView: '查看生产计划',
  orderNoLabel: '计划单号',
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

function onLineProduct(p: Product) {
  if (prdLineIdx.value == null) return;
  emit('updateLine', prdLineIdx.value, {
    prd_no: p.prd_no,
    prd_name: p.name || '',
    unit: p.ut,
    wh: p.wh || '',
  });
  prdPicker.value = false;
  prdLineIdx.value = null;
}

function onLineProductFromRow(index: number, p: Record<string, unknown>) {
  emit('updateLine', index, {
    prd_no: p.prd_no,
    prd_name: p.name || '',
    unit: p.ut || '',
    wh: p.wh || '',
  });
}

function onSoSelect(so: OpenSalesOrderForJh) {
  if (props.isFormReadonly) return;
  emit('transferFromSo', so.os_no);
  soPicker.value = false;
}
</script>

<template>
  <ErpKingdeeBillEdit
    :title="formTitle"
    :bill-no="head.jh_no || undefined"
    :status-label="head.jh_no ? billStatus(head).label : '新建'"
    :status-kind="(head.jh_no ? billStatus(head).kind : 'open') as 'open' | 'audited' | 'closed' | 'analyzed'"
    :loading="loading"
    :menu-code="menuCode"
  >
    <template #toolbar-left>
      <button type="button" class="kd-so-back" @click="emit('goList')">← 返回列表</button>
    </template>
    <template #toolbar>
      <el-button v-if="!isFormReadonly" type="primary" plain @click="soPicker = true">从受订单转入</el-button>
      <el-button v-if="!isFormReadonly" type="primary" :loading="saving" @click="emit('save')">保存</el-button>
      <el-button v-if="!isFormReadonly && editing" type="primary" plain @click="emit('audit')">审核</el-button>
      <el-button v-if="isFormReadonly && editing && billStatus(head).kind !== 'closed'" @click="emit('unAudit')">
        反审核
      </el-button>
      <el-button
        v-if="editing && billStatus(head).kind === 'open'"
        type="danger"
        plain
        @click="emit('deleteBill', head.jh_no!)"
      >
        删除
      </el-button>
      <el-button v-if="!editing && !isFormReadonly" @click="emit('goAdd')">新增</el-button>
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
            <el-form-item :label="labels.orderNoLabel" required data-field="JH_NO">
              <el-input :model-value="head.jh_no" readonly />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="计划日期" data-field="JH_DD">
              <el-date-picker
                v-model="head.jh_dd"
                type="date"
                value-format="YYYY-MM-DD"
                :disabled="isFormReadonly"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="需求日期" data-field="EST_DD">
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
            <el-form-item label="部门" data-field="DEP">
              <LookupField
                :model-value="head.dep"
                :display="depName ? `${head.dep} ${depName}` : head.dep"
                placeholder="选择部门"
                :disabled="isFormReadonly"
                @open="depPicker = true"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
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
            <el-form-item label="受订单号" data-field="SO_NO">
              <LookupField
                :model-value="head.so_no"
                :display="head.so_no"
                placeholder="选择受订单"
                :disabled="isFormReadonly"
                @open="soPicker = true"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="客户代号" data-field="CUS_NO">
              <LookupField
                :model-value="head.cus_no"
                :display="cusName ? `${head.cus_no} ${cusName}` : head.cus_no"
                placeholder="选择客户"
                :disabled="isFormReadonly"
                @open="cusPicker = true"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="客户订单号" data-field="CUS_OS_NO">
              <el-input v-model="head.cus_os_no" :disabled="isFormReadonly" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="6">
            <el-form-item label="单据类别" data-field="BIL_TYPE">
              <el-input v-model="head.bil_type" :disabled="isFormReadonly" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="批号" data-field="BAT_NO">
              <el-input v-model="head.bat_no" :disabled="isFormReadonly" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="结案" data-field="CLOSE_ID">
              <el-select v-model="head.close_id" :disabled="isFormReadonly" clearable style="width: 100%">
                <el-option v-for="o in closeOptions" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
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
      </el-form>
      <ErpBillHeadExtFields
        v-model="head.ext_fields"
        :menu-code="menuCode"
        :readonly="isFormReadonly"
      />
      <ErpBillAuditMeta v-if="head.jh_no" :meta="head" />
    </template>

    <template #lines>
      <ErpBillLineToolbar
        :readonly="isFormReadonly"
        :has-selection="selectedLineIndexes.length > 0"
        @add="emit('addLine')"
        @copy="onCopyLines"
        @remove="onRemoveLines"
      />
      <ErpBillLineTable
        ref="lineTableRef"
        :menu-code="menuCode"
        :fields="lineFormFields"
        :lines="lines"
        :whs="whs"
        :readonly="isFormReadonly"
        :lookup-products="(products as unknown as Record<string, unknown>[])"
        :lookup-resolve-by-code="resolveLineProductByCode"
        @add-lines="onAddLines"
        @selection-change="(idx) => (selectedLineIndexes = idx)"
        @update-line="(idx, patch) => emit('updateLine', idx, patch)"
        @open-product-picker="openPrdPicker"
        @select-product="onLineProductFromRow"
      />
      <div class="kd-so-line-footer">
        合计计划数量：<strong>{{ totals.qty.toFixed(2) }}</strong>
      </div>
    </template>
  </ErpKingdeeBillEdit>

  <LookupDialog
    v-model="soPicker"
    v-bind="getInlineLookupDialogProps({
      title: '选择受订单（已审核）',
      rowKey: 'os_no',
      columns: [
        { prop: 'os_no', label: '受订单号', width: 130 },
        { prop: 'os_dd', label: '日期', width: 110 },
        { prop: 'cus_no', label: '客户', width: 100 },
        { prop: 'cus_name', label: '客户名称', minWidth: 120 },
      ],
      searchKeys: ['os_no', 'cus_no', 'cus_name'],
    }, { dialogClass: 'kd-so-dialog' })"
    :data="(openSoList as unknown as Record<string, unknown>[])"
    @select="(row) => onSoSelect(row as unknown as OpenSalesOrderForJh)"
  />
  <LookupDialog
    v-model="depPicker"
    v-bind="getLookupDialogProps('dept', { dialogClass: 'kd-so-dialog' })"
    :data="(depts as unknown as Record<string, unknown>[])"
    @select="(d) => { if (!isFormReadonly) head.dep = (d as unknown as Dept).dep; depPicker = false; }"
  />
  <LookupDialog
    v-model="salPicker"
    v-bind="getLookupDialogProps('salm', { dialogClass: 'kd-so-dialog' })"
    :data="(salms as unknown as Record<string, unknown>[])"
    @select="(s) => { if (!isFormReadonly) head.sal_no = (s as unknown as Salm).sal_no; salPicker = false; }"
  />
  <LookupDialog
    v-model="cusPicker"
    v-bind="getLookupDialogProps('cust', { dialogClass: 'kd-so-dialog' })"
    :data="(custs as unknown as Record<string, unknown>[])"
    @select="(c) => { if (!isFormReadonly) { emit('applyCustomer', c as unknown as Cust); cusPicker = false; } }"
  />
  <LookupDialog
    v-model="prdPicker"
    v-bind="getLookupDialogProps('product', { title: '选择品号', dialogClass: 'kd-so-dialog' })"
    :data="(products as unknown as Record<string, unknown>[])"
    @select="(p) => onLineProduct(p as unknown as Product)"
  />
</template>
