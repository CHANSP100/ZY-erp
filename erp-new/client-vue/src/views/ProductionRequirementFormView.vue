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
import type { Cust, Dept, OpenSalesOrderForMp, ProductionRequirementHead, Product } from '@/api/types';
import type { ErpFieldMeta } from '@/config/fields/types';
import { useBillLineAddRows } from '@/composables/useBillLineAddRows';
import { resolveLineProductByCode } from '@/utils/billLineProductLookup';

const props = defineProps<{
  head: ProductionRequirementHead;
  lines: Record<string, unknown>[];
  linesPo: Record<string, unknown>[];
  linesMo: Record<string, unknown>[];
  lineFormFields: ErpFieldMeta[];
  linePoFormFields: ErpFieldMeta[];
  lineMoFormFields: ErpFieldMeta[];
  depts: Dept[];
  products: Product[];
  whs: { wh: string; name?: string }[];
  custs: Cust[];
  openSoList: OpenSalesOrderForMp[];
  editing: string | null;
  isFormReadonly: boolean;
  isAudited: boolean;
  saving: boolean;
  analyzing: boolean;
  loading: boolean;
  depName: string;
  totals: { qty: number; qtyPo: number; qtyMo: number };
  billStatus: (row: ProductionRequirementHead) => { label: string; kind: string };
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
  unAudit: [];
  deleteBill: [string];
  addLine: [];
  copyLines: [number[]];
  removeLines: [number[]];
  updateLine: [number, Record<string, unknown>];
  transferFromSo: [string];
  analyze: [];
  transferMo: [];
}>();

const navItems = [
  { id: 'basic', label: '基本信息' },
  { id: 'lines', label: '需求分析明细' },
  { id: 'lines_po', label: '采购建议' },
  { id: 'lines_mo', label: '制令建议' },
];

const soPicker = ref(false);
const depPicker = ref(false);
const prdPicker = ref(false);
const prdLineIdx = ref<number | null>(null);
const selectedLineIndexes = ref<number[]>([]);
const lineTableRef = ref<{ clearSelection?: () => void } | null>(null);
const { onAddLines } = useBillLineAddRows(() => emit('addLine'));

const labels = computed(() => ({
  formTitleNew: '新增生产需求分析单',
  formTitleEdit: '编辑生产需求分析单',
  formTitleView: '查看生产需求分析单',
  orderNoLabel: '分析单号',
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

function onSoSelect(so: OpenSalesOrderForMp) {
  if (props.isFormReadonly) return;
  emit('transferFromSo', so.os_no);
  soPicker.value = false;
}
</script>

<template>
  <ErpKingdeeBillEdit
    :title="formTitle"
    :bill-no="head.mp_no || undefined"
    :status-label="head.mp_no ? billStatus(head).label : '新建'"
    :status-kind="(head.mp_no ? billStatus(head).kind : 'open') as 'open' | 'audited' | 'closed' | 'analyzed'"
    :nav-items="navItems"
    :loading="loading"
    :menu-code="menuCode"
  >
    <template #toolbar-left>
      <button type="button" class="kd-so-back" @click="emit('goList')">← 返回列表</button>
    </template>
    <template #toolbar>
      <el-button v-if="!isFormReadonly" type="primary" plain @click="soPicker = true">从受订单转入</el-button>
      <el-button v-if="!isFormReadonly" type="primary" plain :loading="analyzing" @click="emit('analyze')">
        分析
      </el-button>
      <el-button v-if="!isFormReadonly" type="primary" :loading="saving" @click="emit('save')">存盘</el-button>
      <el-button v-if="isAudited && editing" @click="emit('unAudit')">反审核</el-button>
      <el-button v-if="isAudited && editing" type="primary" plain @click="emit('transferMo')">转制令</el-button>
      <el-button
        v-if="editing && billStatus(head).kind === 'open'"
        type="danger"
        plain
        @click="emit('deleteBill', head.mp_no!)"
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
            <el-form-item :label="labels.orderNoLabel" required data-field="MP_NO">
              <el-input :model-value="head.mp_no" readonly />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="分析日期" data-field="MP_DD">
              <el-date-picker
                v-model="head.mp_dd"
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
            <el-form-item label="分析仓库" data-field="WH">
              <el-input v-model="head.wh" placeholder="多仓库逗号分隔" :disabled="isFormReadonly" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="单据类别" data-field="BIL_TYPE">
              <el-input v-model="head.bil_type" :disabled="isFormReadonly" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="24">
            <el-form-item label="摘要" data-field="REM">
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
      <ErpBillAuditMeta v-if="head.mp_no" :meta="head" />
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
        合计需求量：<strong>{{ totals.qty.toFixed(2) }}</strong>
      </div>
    </template>

    <template #lines_po>
      <ErpBillLineTable
        :menu-code="menuCode"
        :fields="linePoFormFields"
        :lines="linesPo"
        :whs="whs"
        :custs="custs"
        :readonly="isFormReadonly"
      />
      <div class="kd-so-line-footer">
        合计建议量：<strong>{{ totals.qtyPo.toFixed(2) }}</strong>
      </div>
    </template>

    <template #lines_mo>
      <ErpBillLineTable
        :menu-code="menuCode"
        :fields="lineMoFormFields"
        :lines="linesMo"
        :whs="whs"
        :depts="depts"
        :readonly="isFormReadonly"
      />
      <div class="kd-so-line-footer">
        合计建议量：<strong>{{ totals.qtyMo.toFixed(2) }}</strong>
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
        { prop: 'use_dep', label: '部门', width: 100 },
      ],
      searchKeys: ['os_no'],
    }, { dialogClass: 'kd-so-dialog' })"
    :data="(openSoList as unknown as Record<string, unknown>[])"
    @select="(row) => onSoSelect(row as unknown as OpenSalesOrderForMp)"
  />
  <LookupDialog
    v-model="depPicker"
    v-bind="getLookupDialogProps('dept', { dialogClass: 'kd-so-dialog' })"
    :data="(depts as unknown as Record<string, unknown>[])"
    @select="(d) => { if (!isFormReadonly) head.dep = (d as unknown as Dept).dep; depPicker = false; }"
  />
  <LookupDialog
    v-model="prdPicker"
    v-bind="getLookupDialogProps('product', { title: '选择品号', dialogClass: 'kd-so-dialog' })"
    :data="(products as unknown as Record<string, unknown>[])"
    @select="(p) => onLineProduct(p as unknown as Product)"
  />
</template>
