<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import BomFormView from '@/views/BomFormView.vue';
import ErpDetailGrid from '@/components/erp/ErpDetailGrid.vue';
import ErpPrintDialog from '@/components/erp/ErpPrintDialog.vue';
import { fmtNum, fmtQty } from '@/utils/sunlike';
import { exportRowsToExcel, type ExportColumn } from '@/utils/exportExcel';
import { api } from '@/api';
import type { PrintTemplate } from '@/api/types';
import { useBomBill } from '@/composables/useBomBill';
import { FAS_ECF } from '@/config/fields';
import { initErpUser } from '@/composables/useErpUser';
import { listTabForPath } from '@/config/menuRegistry';
import type { DetailGridSummary } from '@/config/detailGridRegistry';

const route = useRoute();

const {
  viewMode,
  listTab,
  head,
  lines,
  detailLines,
  filters,
  headQueryFields,
  detailQueryFields,
  lineFormFields,
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
  formLabels,
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
} = useBomBill();

const billGridRef = ref<{
  getExportData: () => { fileName: string; columns: ExportColumn[]; rows: Record<string, string>[] };
} | null>(null);
const detailGridRef = ref<{
  getExportData: () => { fileName: string; columns: ExportColumn[]; rows: Record<string, string>[] };
} | null>(null);
const printOpen = ref(false);
const printColumns = ref<ExportColumn[]>([]);
const printRows = ref<Record<string, string>[]>([]);
const printTitle = ref('BOM明细');
const defaultPrintTpl = ref<PrintTemplate | null>(null);

const isDetailList = computed(() => listTab.value === 'detail');

const billGridRows = computed(() =>
  filteredList.value.map((row) => ({
    ...row,
    __status: billStatus(row).label,
  }))
);

const billSummary = ref({ count: 0, qty: 0 });

function onBillSummaryChange(s: DetailGridSummary) {
  billSummary.value = {
    count: s.count,
    qty: s.qty ?? 0,
  };
}

function syncListTabFromRoute() {
  const tab = listTabForPath(route.path);
  if (tab) listTab.value = tab;
}

watch(
  () => route.path,
  () => syncListTabFromRoute(),
  { immediate: true }
);

onMounted(async () => {
  await initErpUser();
  loading.value = true;
  try {
    await loadMasters();
    await reloadAll();
  } finally {
    loading.value = false;
  }
  syncListTabFromRoute();
});

function onQuery() {
  reloadAll();
}

function rowClassName({ row }: { row: Record<string, unknown> }) {
  return row.bom_no === head.bom_no ? 'erp-row-current-bill' : '';
}

function billFilterKey(key: string): 'bom_no' | 'prd_no' | 'pf_no' {
  return key as 'bom_no' | 'prd_no' | 'pf_no';
}

function detailFilterKey(key: string): 'bom_no' | 'prd_no' {
  if (key === 'head_prd_no') return 'prd_no';
  return key as 'bom_no' | 'prd_no';
}

function onExport() {
  const data = isDetailList.value
    ? detailGridRef.value?.getExportData()
    : billGridRef.value?.getExportData();
  if (!data?.rows.length) {
    ElMessage.warning('没有可导出的数据');
    return;
  }
  exportRowsToExcel(data);
  ElMessage.success('已开始导出 Excel');
}

async function onPrint() {
  const data = isDetailList.value
    ? detailGridRef.value?.getExportData()
    : billGridRef.value?.getExportData();
  if (!data?.rows.length) {
    ElMessage.warning('没有可打印的数据');
    return;
  }
  printColumns.value = data.columns;
  printRows.value = data.rows;
  printTitle.value = data.fileName;
  try {
    const { data: tpls } = await api.printTemplates(FAS_ECF.menuCode);
    defaultPrintTpl.value = tpls.find((t) => t.is_default) ?? tpls[0] ?? null;
  } catch {
    defaultPrintTpl.value = null;
  }
  printOpen.value = true;
}
</script>

<template>
  <div class="kd-so-page">
    <template v-if="viewMode === 'list'">
      <div class="kd-so-toolbar">
        <div class="kd-so-toolbar__actions">
          <el-button type="primary" class="erp-btn-primary" @click="goAdd">新增</el-button>
          <el-button type="primary" class="erp-btn-primary" @click="onExport">导出</el-button>
          <el-button type="primary" class="erp-btn-primary" @click="onPrint">打印</el-button>
          <el-button type="primary" class="erp-btn-primary" @click="reloadAll">刷新</el-button>
          <span class="kd-so-toolbar__sep" />
          <label class="kd-so-toolbar__date-label">开始日期</label>
          <el-date-picker
            v-model="filters.dateFrom"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="开始日期"
            class="kd-so-toolbar__date"
            clearable
          />
          <label class="kd-so-toolbar__date-label">结束日期</label>
          <el-date-picker
            v-model="filters.dateTo"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="结束日期"
            class="kd-so-toolbar__date"
            clearable
          />
          <el-button type="primary" @click="onQuery">查询</el-button>
        </div>
      </div>

      <div v-if="!isDetailList && headQueryFields.length" class="kd-so-query">
        <div class="kd-so-query__grid">
          <div v-for="f in headQueryFields" :key="f.key" class="kd-so-query-field">
            <label class="kd-so-query-field__label">{{ f.label }}</label>
            <div class="kd-so-query-field__control">
              <el-input
                v-model="filters[billFilterKey(f.key)]"
                clearable
                :placeholder="`请输入${f.label}`"
              />
            </div>
          </div>
        </div>
      </div>

      <div v-if="isDetailList && detailQueryFields.length" class="kd-so-query">
        <div class="kd-so-query__grid">
          <div v-for="f in detailQueryFields" :key="f.key" class="kd-so-query-field">
            <label class="kd-so-query-field__label">{{ f.label }}</label>
            <div class="kd-so-query-field__control">
              <el-input
                v-model="filters[detailFilterKey(f.key)]"
                clearable
                :placeholder="`请输入${f.label}`"
              />
            </div>
          </div>
        </div>
      </div>

      <div v-if="!isDetailList" class="kd-so-card kd-so-table">
        <div class="kd-so-card__body kd-so-card__body--table">
          <ErpDetailGrid
            ref="billGridRef"
            menu-code="FasECF_BILL"
            :rows="billGridRows"
            :loading="loading"
            :action-width="168"
            :row-class-name="rowClassName"
            @summary-change="onBillSummaryChange"
            @row-dblclick="(row) => openOrder(String(row.bom_no), true)"
          >
            <template #row-actions="{ row }">
              <el-button
                class="kd-so-link-btn"
                link
                type="primary"
                @click="openOrder(String(row.bom_no), true)"
              >
                查看
              </el-button>
              <el-button
                class="kd-so-link-btn"
                link
                type="primary"
                @click="openOrder(String(row.bom_no), false)"
              >
                编辑
              </el-button>
              <el-button
                class="kd-so-link-btn kd-so-link-btn--danger"
                link
                type="danger"
                @click="onDeleteBill(String(row.bom_no))"
              >
                删除
              </el-button>
            </template>
          </ErpDetailGrid>
        </div>
      </div>

      <div v-else class="kd-so-card kd-so-table">
        <div class="kd-so-card__body kd-so-card__body--table">
          <ErpDetailGrid
            ref="detailGridRef"
            menu-code="FasECF"
            :rows="detailLines"
            :loading="loading"
            @summary-change="onDetailSummaryChange"
            @columns-reload="loadDetailLines"
            @row-dblclick="(row) => openOrder(String(row.bom_no), false)"
            @edit="(row) => openOrder(String(row.bom_no), false)"
          />
        </div>
      </div>

      <div class="kd-so-table-footer">
        <div class="kd-so-table-footer__info">
          <template v-if="!isDetailList">
            共 <strong>{{ billSummary.count }}</strong> 笔 BOM
            · 母件数量合计 <strong>{{ fmtQty(billSummary.qty) }}</strong>
          </template>
          <template v-else>
            共 <strong>{{ detailSummary.count }}</strong> 行明细
            · 用量合计 <strong>{{ fmtQty(detailSummary.qty) }}</strong>
            · 损耗率合计 <strong>{{ fmtNum(detailSummary.los_rto) }}</strong>
          </template>
        </div>
      </div>
    </template>

    <BomFormView
      v-else
      :head="head"
      :lines="lines"
      :line-form-fields="lineFormFields"
      :depts="depts"
      :products="products"
      :whs="whs"
      :editing="editing"
      :is-form-readonly="isFormReadonly"
      :saving="saving"
      :loading="loading"
      :prd-display="prdDisplay"
      :head-parent-products="headParentProducts"
      :dep-name="depName"
      :wh-name="whName"
      :knd-label="kndLabel"
      :totals="totals"
      :bill-status="billStatus"
      :form-labels="formLabels"
      :menu-code="FAS_ECF.menuCode"
      hide-bill-headline
      hide-section-nav
      hide-footer-actions
      @go-list="goList"
      @go-add="goAdd"
      @save="onSave"
      @delete-bill="onDeleteBill"
      @add-line="addLine"
      @copy-lines="copySelectedLines"
      @remove-lines="removeSelectedLines"
      @update-line="updateLine"
      @apply-product="applyProduct"
    />

    <ErpPrintDialog
      v-model="printOpen"
      :menu-code="isDetailList ? 'FasECF' : 'FasECF_BILL'"
      :title="printTitle"
      :columns="printColumns"
      :rows="printRows"
      :default-template="defaultPrintTpl"
    />
  </div>
</template>
