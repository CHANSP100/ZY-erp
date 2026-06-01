<script setup lang="ts">

import { computed, ref } from 'vue';

import ErpBillLineTable from '@/components/erp/kingdee/ErpBillLineTable.vue';

import ErpBillAuditMeta from '@/components/erp/ErpBillAuditMeta.vue';

import ErpBillLineToolbar from '@/components/erp/kingdee/ErpBillLineToolbar.vue';

import ErpEnterNavZone from '@/components/erp/ErpEnterNavZone.vue';

import ErpKingdeeBillEdit from '@/components/erp/kingdee/ErpKingdeeBillEdit.vue';

import { collectEnterNavFocusables } from '@/composables/useFormEnterNav';

import LookupPicker from '@/components/LookupPicker.vue';

import LookupDialog from '@/components/LookupDialog.vue';
import { getLookupDialogProps } from '@/config/lookups';

import type { BomRecipeHead, Dept, Product } from '@/api/types';

import type { ErpFieldMeta } from '@/config/fields/types';

import { fmtQty } from '@/utils/sunlike';
import { useBillLineAddRows } from '@/composables/useBillLineAddRows';

import { api } from '@/api';



const props = defineProps<{

  head: BomRecipeHead;

  lines: Record<string, unknown>[];

  lineFormFields: ErpFieldMeta[];

  depts: Dept[];

  products: Product[];

  /** 母件品号开窗：仅制成品、半成品 */
  headParentProducts: Product[];

  whs: { wh: string; name?: string }[];

  editing: string | null;

  isFormReadonly: boolean;

  saving: boolean;

  loading: boolean;

  prdDisplay: string;

  depName: string;

  whName: string;

  kndLabel: string;

  totals: { qty: number; lineCount: number };

  billStatus: (row: BomRecipeHead) => { label: string; kind: string };

  formLabels?: {

    formTitleNew: string;

    formTitleEdit: string;

    formTitleView: string;

    orderNoLabel: string;

  };

  menuCode: string;

  /** 树+表头表身同页布局，隐藏返回列表 */

  inline?: boolean;

  /** 与销售订单一致：列表进编辑时隐藏标题栏/左侧导航 */

  hideBillHeadline?: boolean;

  hideSectionNav?: boolean;

  /** 隐藏底部返回/保存（顶部工具栏保留） */

  hideFooterActions?: boolean;

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



const prdLinePicker = ref(false);

const prdLinePickerKeyword = ref('');

const prdLineIdx = ref<number | null>(null);

const selectedLineIndexes = ref<number[]>([]);

const lineTableRef = ref<{ clearSelection?: () => void } | null>(null);
const { onAddLines } = useBillLineAddRows(() => emit('addLine'));



const labels = computed(() => ({

  formTitleNew: '新增BOM物料配方',

  formTitleEdit: '编辑BOM物料配方',

  formTitleView: '查看BOM物料配方',

  orderNoLabel: 'BOM代号',

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



function openPrdPicker(idx: number, keyword = '') {

  prdLineIdx.value = idx;

  prdLinePickerKeyword.value = keyword;

  prdLinePicker.value = true;

}



function onLineProductFromRow(index: number, p: Record<string, unknown>) {
  emit('updateLine', index, {
    prd_no: p.prd_no,
    name: p.name || '',
    prd_name: p.name || '',
    unit: String(p.ut || '').slice(0, 1),
    wh: p.wh || '',
    wh_no: p.wh || '',
    spc: p.spc || '',
  });
}

function onLineProduct(p: Product) {

  if (prdLineIdx.value == null) return;

  emit('updateLine', prdLineIdx.value, {

    prd_no: p.prd_no,

    name: p.name || '',

    prd_name: p.name || '',

    unit: (p.ut || '').slice(0, 1),

    wh: p.wh || '',

    wh_no: p.wh || '',

    spc: p.spc || '',

  });

  prdLinePicker.value = false;

  prdLineIdx.value = null;

}



function onHeadProduct(p: Product) {

  emit('applyProduct', p);

}

function onHeadFormLastEnter() {
  const linesSection = document.getElementById('kd-bill-section-lines');
  const first = collectEnterNavFocusables(linesSection)[0];
  first?.focus();
  if (first?.tagName === 'INPUT') (first as HTMLInputElement).select();
}

function onLineTableLastEnter() {
  if (props.isFormReadonly) return;
  emit('addLine');
}

function focusNewLineProduct(focusables: HTMLElement[], _root: HTMLElement) {
  const lookups = focusables.filter((el) => el.closest('.lookup-field'));
  return lookups[lookups.length - 1] ?? null;
}

async function resolveLineProduct(code: string) {
  try {
    const { data } = await api.getProduct(code);
    return data as unknown as Record<string, unknown>;
  } catch {
    return null;
  }
}

</script>



<template>

  <ErpKingdeeBillEdit

    :class="{ 'kd-bill-edit--inline': inline }"

    :title="formTitle"

    :status-label="head.bom_no ? billStatus(head).label : '新建'"

    :status-kind="(head.bom_no ? billStatus(head).kind : 'open') as 'open' | 'audited' | 'closed' | 'analyzed'"

    :loading="loading"

    :menu-code="menuCode"

    :hide-section-nav="hideSectionNav ?? inline"

    :hide-headline="hideBillHeadline ?? inline"

  >

    <template #toolbar-left>

      <button v-if="!inline" type="button" class="kd-so-back" @click="emit('goList')">← 返回列表</button>

    </template>

    <template #toolbar>

      <template v-if="!inline">

        <el-button v-if="!isFormReadonly" type="primary" :loading="saving" @click="emit('save')">保存</el-button>

        <el-button

          v-if="editing && !isFormReadonly"

          type="danger"

          plain

          @click="emit('deleteBill', head.bom_no!)"

        >

          删除

        </el-button>

        <el-button v-if="!inline && !editing && !isFormReadonly" @click="emit('goAdd')">新增</el-button>

      </template>

    </template>



    <template #basic>

      <ErpEnterNavZone :disabled="isFormReadonly" :on-last-field="onHeadFormLastEnter">

      <el-form

        label-width="96px"

        label-position="right"

        class="kd-bill-header-form"

        :class="{ 'kd-so-form--readonly': isFormReadonly }"

        @submit.prevent

      >

        <el-row :gutter="12">

          <el-col :span="6">

            <el-form-item label="母件品号" required data-field="PRD_NO">
              <LookupPicker
                v-model="head.prd_no"
                preset="productBomParent"
                :data="(headParentProducts as unknown as Record<string, unknown>[])"
                :display="prdDisplay"
                placeholder="选择母件"
                :disabled="isFormReadonly"
                @select="(p) => onHeadProduct(p as unknown as Product)"
              />
            </el-form-item>

          </el-col>

          <el-col :span="6">

            <el-form-item label="名称" data-field="NAME">

              <el-input v-model="head.name" :disabled="isFormReadonly" />

            </el-form-item>

          </el-col>

          <el-col :span="6">

            <el-form-item label="规格" data-field="SPC">

              <el-input :model-value="head.spc" readonly />

            </el-form-item>

          </el-col>

          <el-col :span="6">

            <el-form-item label="仓库" data-field="WH_NO">
              <LookupPicker
                v-model="head.wh_no"
                preset="warehouse"
                :data="(whs as unknown as Record<string, unknown>[])"
                :display="whName ? `${head.wh_no} ${whName}` : head.wh_no"
                placeholder="选择仓库"
                :disabled="isFormReadonly"
              />
            </el-form-item>

          </el-col>

        </el-row>

        <el-row :gutter="12">

          <el-col :span="6">

            <el-form-item label="版本" data-field="PF_NO">

              <el-input

                v-model="head.pf_no"

                :disabled="isFormReadonly"

                placeholder="版本"

              />

            </el-form-item>

          </el-col>

          <el-col :span="6">

            <el-form-item label="单位" data-field="UNIT">

              <el-input v-model="head.unit" readonly />

            </el-form-item>

          </el-col>

          <el-col :span="6">

            <el-form-item label="数量" data-field="QTY">

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

            <el-form-item label="类别" data-field="PRD_KND">

              <el-input :model-value="kndLabel" readonly />

            </el-form-item>

          </el-col>

        </el-row>

        <el-row :gutter="12">

          <el-col :span="6">

            <el-form-item label="生效日期" data-field="VALID_DD">

              <el-date-picker

                v-model="head.valid_dd"

                type="date"

                value-format="YYYY-MM-DD"

                :disabled="isFormReadonly"

                style="width: 100%"

              />

            </el-form-item>

          </el-col>

          <el-col :span="6">

            <el-form-item label="截止日期" data-field="END_DD">

              <el-date-picker

                v-model="head.end_dd"

                type="date"

                value-format="YYYY-MM-DD"

                :disabled="isFormReadonly"

                style="width: 100%"

              />

            </el-form-item>

          </el-col>

          <el-col :span="6">

            <el-form-item label="制造部门" data-field="DEP">
              <LookupPicker
                v-model="head.dep"
                preset="dept"
                :data="(depts as unknown as Record<string, unknown>[])"
                :display="depName ? `${head.dep} ${depName}` : head.dep"
                placeholder="选择部门"
                :disabled="isFormReadonly"
              />
            </el-form-item>

          </el-col>

          <el-col :span="6">

            <el-form-item label="货品特征" data-field="PRD_MARK">

              <el-input v-model="head.prd_mark" :disabled="isFormReadonly" />

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

      </el-form>

      </ErpEnterNavZone>

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

      <ErpEnterNavZone
        :disabled="isFormReadonly"
        :on-row-last="onLineTableLastEnter"
        :focus-after-row-last="focusNewLineProduct"
      >

      <ErpBillLineTable

        ref="lineTableRef"

        :fields="lineFormFields"

        :lines="lines"

        :whs="whs"
        :lookup-products="(products as unknown as Record<string, unknown>[])"
        :lookup-resolve-by-code="resolveLineProduct"
        :menu-code="menuCode"

        :readonly="isFormReadonly"

        @add-lines="onAddLines"
        @update-line="(i, p) => emit('updateLine', i, p)"
        @select-product="onLineProductFromRow"
        @open-product-picker="(i, kw) => openPrdPicker(i, kw)"
        @selection-change="selectedLineIndexes = $event"

      />

      </ErpEnterNavZone>

    </template>



    <template #totals>

      <div class="kd-bill-edit__totals-row">

        <span>母件数量<strong>{{ fmtQty(totals.qty) }}</strong></span>

        <span>子件行数<strong>{{ totals.lineCount }}</strong></span>

      </div>

    </template>



    <template v-if="!hideFooterActions" #footer>

      <template v-if="!inline">

        <el-button @click="emit('goList')">返回</el-button>

        <el-button v-if="!isFormReadonly" type="primary" :loading="saving" @click="emit('save')">保存</el-button>

      </template>

    </template>

  </ErpKingdeeBillEdit>



  <LookupDialog
    v-model="prdLinePicker"
    v-bind="getLookupDialogProps('product')"
    :data="(products as unknown as Record<string, unknown>[])"
    :initial-keyword="prdLinePickerKeyword"
    @select="(p) => onLineProduct(p as unknown as Product)"
  />

</template>



<style scoped>

.kd-bill-edit--inline :deep(.kd-bill-edit__toolbar),

.kd-bill-edit--inline :deep(.kd-bill-edit__footer) {

  display: none;

}



.kd-bill-edit--inline :deep(.kd-bill-edit__section--flat .kd-bill-edit__section-head) {

  background: transparent;

  border-bottom: none;

  padding: 8px 12px 0;

}



.kd-bill-edit--inline :deep(.kd-bill-edit__section--flat + .kd-bill-edit__section--flat) {

  margin-top: 4px;

}

</style>


