<script setup lang="ts">
import { computed, ref } from 'vue';
import ErpBillLineTable from '@/components/erp/kingdee/ErpBillLineTable.vue';
import ErpBillHeadExtFields from '@/components/erp/ErpBillHeadExtFields.vue';
import ErpBillAuditMeta from '@/components/erp/ErpBillAuditMeta.vue';
import ErpBillLineToolbar from '@/components/erp/kingdee/ErpBillLineToolbar.vue';
import ErpKingdeeBillEdit from '@/components/erp/kingdee/ErpKingdeeBillEdit.vue';
import LookupDialog from '@/components/LookupDialog.vue';
import LookupField from '@/components/LookupField.vue';
import { getLookupDialogProps } from '@/config/lookups';
import type { Dept, ManufacturingOrderHead, Product } from '@/api/types';
import type { ErpFieldMeta } from '@/config/fields/types';
import { fmtQty } from '@/utils/sunlike';
import { resolveLineProductByCode } from '@/utils/billLineProductLookup';
import { useBillLineAddRows } from '@/composables/useBillLineAddRows';

const props = defineProps<{
  head: ManufacturingOrderHead;
  lines: Record<string, unknown>[];
  lineFormFields: ErpFieldMeta[];
  depts: Dept[];
  products: Product[];
  whs: { wh: string; name?: string }[];
  editing: string | null;
  isFormReadonly: boolean;
  saving: boolean;
  loading: boolean;
  mrpDisplay: string;
  depName: string;
  whName: string;
  totals: { qty: number; qty_fin: number };
  billStatus: (row: ManufacturingOrderHead) => { label: string; kind: string };
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
  applyProduct: [Product];
}>();

const mrpPicker = ref(false);
const depPicker = ref(false);
const whPicker = ref(false);
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
  formTitleNew: '新增制令单',
  formTitleEdit: '编辑制令单',
  formTitleView: '查看制令单',
  orderNoLabel: '制令单号',
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

function onHeadProduct(p: Product) {
  emit('applyProduct', p);
  mrpPicker.value = false;
}
</script>

<template>
  <ErpKingdeeBillEdit
    :title="formTitle"
    :bill-no="head.mo_no || undefined"
    :status-label="head.mo_no ? billStatus(head).label : '新建'"
    :status-kind="(head.mo_no ? billStatus(head).kind : 'open') as 'open' | 'audited' | 'closed' | 'analyzed'"
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
        @click="emit('deleteBill', head.mo_no!)"
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
            <el-form-item :label="labels.orderNoLabel" required data-field="MO_NO">
              <el-input :model-value="head.mo_no" readonly />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="制单日期" data-field="MO_DD">
              <el-date-picker
                v-model="head.mo_dd"
                type="date"
                value-format="YYYY-MM-DD"
                :disabled="isFormReadonly"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="预开工日" data-field="STA_DD">
              <el-date-picker
                v-model="head.sta_dd"
                type="date"
                value-format="YYYY-MM-DD"
                :disabled="isFormReadonly"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="预完工日" data-field="END_DD">
              <el-date-picker
                v-model="head.end_dd"
                type="date"
                value-format="YYYY-MM-DD"
                :disabled="isFormReadonly"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="6">
            <el-form-item label="制造成品" required data-field="MRP_NO">
              <LookupField
                :model-value="head.mrp_no"
                :display="mrpDisplay"
                placeholder="选择制造成品"
                :disabled="isFormReadonly"
                @open="mrpPicker = true"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="货品特征" data-field="PRD_MARK">
              <el-input v-model="head.prd_mark" :disabled="isFormReadonly" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="库位" data-field="WH">
              <LookupField
                :model-value="head.wh"
                :display="whName ? `${head.wh} ${whName}` : head.wh"
                placeholder="选择库位"
                :disabled="isFormReadonly"
                @open="whPicker = true"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="单位" data-field="UNIT">
              <el-input v-model="head.unit" :disabled="isFormReadonly" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="6">
            <el-form-item label="数量" required data-field="QTY">
              <el-input-number
                v-model="head.qty"
                :min="0"
                :step="1"
                :precision="2"
                controls-position="right"
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
          <el-col :span="6">
            <el-form-item label="受订单号" data-field="SO_NO">
              <el-input v-model="head.so_no" :disabled="isFormReadonly" placeholder="受订单号" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="单据类别" data-field="BIL_TYPE">
              <el-input v-model="head.bil_type" :disabled="isFormReadonly" placeholder="单据类别" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="6">
            <el-form-item label="实际开工日" data-field="OPN_DD">
              <el-date-picker
                v-model="head.opn_dd"
                type="date"
                value-format="YYYY-MM-DD"
                :disabled="isFormReadonly"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="实际完工日" data-field="FIN_DD">
              <el-date-picker
                v-model="head.fin_dd"
                type="date"
                value-format="YYYY-MM-DD"
                :disabled="isFormReadonly"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="结案" data-field="CLOSE_ID">
              <el-select v-model="head.close_id" :disabled="isFormReadonly" clearable style="width: 100%">
                <el-option v-for="o in closeOptions" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="已缴库量" data-field="QTY_FIN">
              <el-input :model-value="fmtQty(head.qty_fin)" readonly />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="通知单" data-field="BUILD_BIL">
              <el-input v-model="head.build_bil" type="textarea" :rows="2" :disabled="isFormReadonly" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="摘要" data-field="REM">
              <el-input v-model="head.rem" type="textarea" :rows="2" :disabled="isFormReadonly" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="6">
            <el-form-item label="来源单号" data-field="BIL_NO">
              <el-input v-model="head.bil_no" :disabled="isFormReadonly" />
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
        <span>制令数量<strong>{{ fmtQty(totals.qty) }}</strong></span>
        <span>已缴库量<strong>{{ fmtQty(totals.qty_fin) }}</strong></span>
      </div>
    </template>

    <template #footer>
      <el-button @click="emit('goList')">返回</el-button>
      <el-button v-if="!isFormReadonly" type="primary" :loading="saving" @click="emit('save')">保存</el-button>
    </template>
  </ErpKingdeeBillEdit>

  <LookupDialog
    v-model="mrpPicker"
    v-bind="getLookupDialogProps('product', { title: '选择制造成品', dialogClass: 'kd-so-dialog' })"
    :data="(products as unknown as Record<string, unknown>[])"
    @select="(p) => onHeadProduct(p as unknown as Product)"
  />
  <LookupDialog
    v-model="depPicker"
    v-bind="getLookupDialogProps('dept', { dialogClass: 'kd-so-dialog' })"
    :data="(depts as unknown as Record<string, unknown>[])"
    @select="(d) => { if (!isFormReadonly) head.dep = (d as unknown as Dept).dep; depPicker = false; }"
  />
  <LookupDialog
    v-model="whPicker"
    v-bind="getLookupDialogProps('warehouse', { title: '选择库位', dialogClass: 'kd-so-dialog' })"
    :data="(whs as unknown as Record<string, unknown>[])"
    @select="(w) => { if (!isFormReadonly) head.wh = (w as { wh: string }).wh; whPicker = false; }"
  />
  <LookupDialog
    v-model="prdPicker"
    v-bind="getLookupDialogProps('product', { title: '选择材料', dialogClass: 'kd-so-dialog' })"
    :data="(products as unknown as Record<string, unknown>[])"
    @select="(p) => onLineProduct(p as unknown as Product)"
  />
</template>
