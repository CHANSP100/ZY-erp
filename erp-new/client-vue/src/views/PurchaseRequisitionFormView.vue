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
import { getLookupDialogProps } from '@/config/lookups';
import type { Cust, Dept, Product, PurchaseRequisitionHead, Salm } from '@/api/types';
import type { ErpFieldMeta } from '@/config/fields/types';
import { fmtNum } from '@/utils/sunlike';
import { resolveLineProductByCode } from '@/utils/billLineProductLookup';
import { useBillLineAddRows } from '@/composables/useBillLineAddRows';

const props = defineProps<{
  head: PurchaseRequisitionHead;
  lines: Record<string, unknown>[];
  lineFormFields: ErpFieldMeta[];
  custs: Cust[];
  salms: Salm[];
  depts: Dept[];
  products: Product[];
  editing: string | null;
  isFormReadonly: boolean;
  saving: boolean;
  loading: boolean;
  custName: string;
  salName: string;
  depName: string;
  poDepName: string;
  totals: { amtn_net: number; tax: number };
  billStatus: (row: PurchaseRequisitionHead) => { label: string; kind: string };
  formLabels?: {
    formTitleNew: string;
    formTitleEdit: string;
    formTitleView: string;
    orderNoLabel: string;
    partnerName: string;
    selectPartner: string;
    selectPartnerDialog: string;
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
  applyCust: [Cust];
}>();

const custPicker = ref(false);
const salPicker = ref(false);
const depPicker = ref(false);
const poDepPicker = ref(false);
const prdPicker = ref(false);
const prdLineIdx = ref<number | null>(null);
const selectedLineIndexes = ref<number[]>([]);
const lineTableRef = ref<{ clearSelection?: () => void } | null>(null);
const { onAddLines } = useBillLineAddRows(() => emit('addLine'));

const labels = computed(() => ({
  formTitleNew: '新增请购单',
  formTitleEdit: '编辑请购单',
  formTitleView: '查看请购单',
  orderNoLabel: '请购单号',
  partnerName: '采购对象',
  selectPartner: '选择采购对象',
  selectPartnerDialog: '选择采购对象',
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
    unit: p.ut,
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
    unit: p.ut || '',
    up: Number(p.upr ?? 0),
  });
}
</script>

<template>
  <ErpKingdeeBillEdit
    :title="formTitle"
    :bill-no="head.sq_no || undefined"
    :status-label="head.sq_no ? billStatus(head).label : '新建'"
    :status-kind="(head.sq_no ? billStatus(head).kind : 'open') as 'open' | 'audited' | 'closed' | 'analyzed'"
    :loading="loading"
    :menu-code="menuCode"
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
        @click="emit('deleteBill', head.sq_no!)"
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
            <el-form-item label="请购日期" required data-field="SQ_DD">
              <el-date-picker
                v-model="head.sq_dd"
                type="date"
                value-format="YYYY-MM-DD"
                :disabled="isFormReadonly"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item :label="labels.orderNoLabel" required data-field="SQ_NO">
              <el-input :model-value="head.sq_no" readonly />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="预交日" data-field="EST_DD">
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
            <el-form-item label="币别" data-field="CUR_ID">
              <LookupPicker
                v-model="head.cur_id"
                preset="currency"
                placeholder="选择币别"
                :disabled="isFormReadonly"
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
            <el-form-item label="请购部门" data-field="DEP">
              <LookupField
                :model-value="head.dep"
                :display="depName ? `${head.dep} ${depName}` : head.dep"
                placeholder="选择部门"
                :disabled="isFormReadonly"
                @open="depPicker = true"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="请购人" data-field="SAL_NO">
              <LookupField
                :model-value="head.sal_no"
                :display="salName ? `${head.sal_no} ${salName}` : head.sal_no"
                placeholder="选择请购人"
                :disabled="isFormReadonly"
                @open="salPicker = true"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="采购部门" data-field="PO_DEP">
              <LookupField
                :model-value="head.po_dep"
                :display="poDepName ? `${head.po_dep} ${poDepName}` : head.po_dep"
                placeholder="选择采购部门"
                :disabled="isFormReadonly"
                @open="poDepPicker = true"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="6">
            <el-form-item label="结案" data-field="CLS_ID">
              <el-input :model-value="head.cls_id || ''" readonly placeholder="—" />
            </el-form-item>
          </el-col>
          <el-col :span="18">
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
        :whs="[]"
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
        <span>预估合计<strong>{{ fmtNum(totals.amtn_net) }}</strong></span>
      </div>
    </template>

    <template #footer>
      <el-button @click="emit('goList')">返回</el-button>
      <el-button v-if="!isFormReadonly" type="primary" :loading="saving" @click="emit('save')">保存</el-button>
    </template>
  </ErpKingdeeBillEdit>

  <LookupDialog
    v-model="custPicker"
    v-bind="getLookupDialogProps('cust', { title: labels.selectPartnerDialog, dialogClass: 'kd-so-dialog' })"
    :data="(custs as unknown as Record<string, unknown>[])"
    @select="(c) => { emit('applyCust', c as unknown as Cust); custPicker = false; }"
  />
  <LookupDialog
    v-model="salPicker"
    v-bind="getLookupDialogProps('salm', { title: '选择请购人', dialogClass: 'kd-so-dialog' })"
    :data="(salms as unknown as Record<string, unknown>[])"
    @select="(s) => { if (!isFormReadonly) head.sal_no = (s as unknown as Salm).sal_no; salPicker = false; }"
  />
  <LookupDialog
    v-model="depPicker"
    v-bind="getLookupDialogProps('dept', { title: '选择请购部门', dialogClass: 'kd-so-dialog' })"
    :data="(depts as unknown as Record<string, unknown>[])"
    @select="(d) => { if (!isFormReadonly) head.dep = (d as unknown as Dept).dep; depPicker = false; }"
  />
  <LookupDialog
    v-model="poDepPicker"
    v-bind="getLookupDialogProps('dept', { title: '选择采购部门', dialogClass: 'kd-so-dialog' })"
    :data="(depts as unknown as Record<string, unknown>[])"
    @select="(d) => { if (!isFormReadonly) head.po_dep = (d as unknown as Dept).dep; poDepPicker = false; }"
  />
  <LookupDialog
    v-model="prdPicker"
    v-bind="getLookupDialogProps('product', { dialogClass: 'kd-so-dialog' })"
    :data="(products as unknown as Record<string, unknown>[])"
    @select="(p) => onProduct(p as unknown as Product)"
  />
</template>
