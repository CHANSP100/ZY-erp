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
import type { Dept, ManufacturingOrderHead, MaterialIssueHead, Product, Salm } from '@/api/types';
import type { ErpFieldMeta } from '@/config/fields/types';
import { fmtQty } from '@/utils/sunlike';
import { resolveLineProductByCode } from '@/utils/billLineProductLookup';
import { useBillLineAddRows } from '@/composables/useBillLineAddRows';

const props = defineProps<{
  head: MaterialIssueHead;
  lines: Record<string, unknown>[];
  lineFormFields: ErpFieldMeta[];
  depts: Dept[];
  products: Product[];
  whs: { wh: string; name?: string }[];
  salms: Salm[];
  openMoList: ManufacturingOrderHead[];
  editing: string | null;
  isFormReadonly: boolean;
  saving: boolean;
  loading: boolean;
  mrpDisplay: string;
  depName: string;
  whMtlName: string;
  usrName: string;
  totals: { qty: number };
  billStatus: (row: MaterialIssueHead) => { label: string; kind: string };
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
  transferFromMo: [string];
}>();

const moPicker = ref(false);
const depPicker = ref(false);
const whPicker = ref(false);
const usrPicker = ref(false);
const prdPicker = ref(false);
const prdLineIdx = ref<number | null>(null);
const selectedLineIndexes = ref<number[]>([]);
const lineTableRef = ref<{ clearSelection?: () => void } | null>(null);
const { onAddLines } = useBillLineAddRows(() => emit('addLine'));

const labels = computed(() => ({
  formTitleNew: '新增生产领料',
  formTitleEdit: '编辑生产领料',
  formTitleView: '查看生产领料',
  orderNoLabel: '领料单号',
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
    wh: p.wh || props.head.wh_mtl || '',
  });
  prdPicker.value = false;
  prdLineIdx.value = null;
}

function onLineProductFromRow(index: number, p: Record<string, unknown>) {
  emit('updateLine', index, {
    prd_no: p.prd_no,
    prd_name: p.name || '',
    unit: p.ut || '',
    wh: p.wh || props.head.wh_mtl || '',
  });
}

function onMoSelect(mo: ManufacturingOrderHead) {
  if (props.isFormReadonly) return;
  emit('transferFromMo', mo.mo_no!);
  moPicker.value = false;
}
</script>

<template>
  <ErpKingdeeBillEdit
    :title="formTitle"
    :bill-no="head.ml_no || undefined"
    :status-label="head.ml_no ? billStatus(head).label : '新建'"
    :status-kind="(head.ml_no ? billStatus(head).kind : 'open') as 'open' | 'audited' | 'closed' | 'analyzed'"
    :loading="loading"
    :menu-code="menuCode"
  >
    <template #toolbar-left>
      <button type="button" class="kd-so-back" @click="emit('goList')">← 返回列表</button>
    </template>
    <template #toolbar>
      <el-button v-if="!isFormReadonly" type="primary" plain @click="moPicker = true">从制令单转入</el-button>
      <el-button v-if="!isFormReadonly" type="primary" :loading="saving" @click="emit('save')">保存</el-button>
      <el-button v-if="!isFormReadonly && editing" type="primary" plain @click="emit('audit')">审核</el-button>
      <el-button v-if="isFormReadonly && editing" @click="emit('unAudit')">反审核</el-button>
      <el-button
        v-if="editing && billStatus(head).kind === 'open'"
        type="danger"
        plain
        @click="emit('deleteBill', head.ml_no!)"
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
            <el-form-item :label="labels.orderNoLabel" required data-field="ML_NO">
              <el-input :model-value="head.ml_no" readonly />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="领料日期" data-field="ML_DD">
              <el-date-picker
                v-model="head.ml_dd"
                type="date"
                value-format="YYYY-MM-DD"
                :disabled="isFormReadonly"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="制令单号" required data-field="MO_NO">
              <LookupField
                :model-value="head.mo_no"
                :display="head.mo_no"
                placeholder="选择制令单"
                :disabled="isFormReadonly"
                @open="moPicker = true"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="成品代号" data-field="MRP_NO">
              <el-input :model-value="mrpDisplay" readonly />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="6">
            <el-form-item label="货品特征" data-field="PRD_MARK">
              <el-input v-model="head.prd_mark" readonly />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="单位" data-field="UNIT">
              <el-input v-model="head.unit" readonly />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="数量" data-field="QTY">
              <el-input :model-value="fmtQty(head.qty)" readonly />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="原料库" data-field="WH_MTL">
              <LookupField
                :model-value="head.wh_mtl"
                :display="whMtlName ? `${head.wh_mtl} ${whMtlName}` : head.wh_mtl"
                placeholder="选择原料库"
                :disabled="isFormReadonly"
                @open="whPicker = true"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
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
          <el-col :span="6">
            <el-form-item label="单据类别" data-field="BIL_TYPE">
              <el-input v-model="head.bil_type" :disabled="isFormReadonly" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="配方号" data-field="ID_NO">
              <el-input v-model="head.id_no" :disabled="isFormReadonly" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="批号" data-field="BAT_NO">
              <el-input v-model="head.bat_no" :disabled="isFormReadonly" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="6">
            <el-form-item label="经办人" data-field="USR_NO">
              <LookupField
                :model-value="head.usr_no"
                :display="usrName ? `${head.usr_no} ${usrName}` : head.usr_no"
                placeholder="选择经办人"
                :disabled="isFormReadonly"
                @open="usrPicker = true"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
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
        <span>合计领料数量<strong>{{ fmtQty(totals.qty) }}</strong></span>
      </div>
    </template>

    <template #footer>
      <el-button @click="emit('goList')">返回</el-button>
      <el-button v-if="!isFormReadonly" type="primary" :loading="saving" @click="emit('save')">保存</el-button>
    </template>
  </ErpKingdeeBillEdit>

  <LookupDialog
    v-model="moPicker"
    v-bind="getInlineLookupDialogProps({
      title: '选择制令单（已审核未结案）',
      rowKey: 'mo_no',
      columns: [
        { prop: 'mo_no', label: '制令单号', width: 120 },
        { prop: 'mrp_no', label: '成品', width: 120 },
        { prop: 'mrp_name', label: '品名', minWidth: 140 },
        { prop: 'qty', label: '数量', width: 90 },
      ],
      searchKeys: ['mo_no', 'mrp_no', 'mrp_name'],
    }, { dialogClass: 'kd-so-dialog' })"
    :data="(openMoList as unknown as Record<string, unknown>[])"
    @select="(row) => onMoSelect(row as unknown as ManufacturingOrderHead)"
  />
  <LookupDialog
    v-model="depPicker"
    v-bind="getLookupDialogProps('dept', { dialogClass: 'kd-so-dialog' })"
    :data="(depts as unknown as Record<string, unknown>[])"
    @select="(d) => { if (!isFormReadonly) head.dep = (d as unknown as Dept).dep; depPicker = false; }"
  />
  <LookupDialog
    v-model="whPicker"
    v-bind="getLookupDialogProps('warehouse', { title: '选择原料库', dialogClass: 'kd-so-dialog' })"
    :data="(whs as unknown as Record<string, unknown>[])"
    @select="(w) => { if (!isFormReadonly) head.wh_mtl = (w as { wh: string }).wh; whPicker = false; }"
  />
  <LookupDialog
    v-model="usrPicker"
    v-bind="getLookupDialogProps('salm', { title: '选择经办人', dialogClass: 'kd-so-dialog' })"
    :data="(salms as unknown as Record<string, unknown>[])"
    @select="(s) => { if (!isFormReadonly) head.usr_no = (s as unknown as Salm).sal_no; usrPicker = false; }"
  />
  <LookupDialog
    v-model="prdPicker"
    v-bind="getLookupDialogProps('product', { title: '选择料号', dialogClass: 'kd-so-dialog' })"
    :data="(products as unknown as Record<string, unknown>[])"
    @select="(p) => onLineProduct(p as unknown as Product)"
  />
</template>
