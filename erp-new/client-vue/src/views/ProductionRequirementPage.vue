<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import ProductionRequirementFormView from '@/views/ProductionRequirementFormView.vue';
import ErpDetailGrid from '@/components/erp/ErpDetailGrid.vue';
import { exportRowsToExcel, type ExportColumn } from '@/utils/exportExcel';
import { useProductionRequirementBill } from '@/composables/useProductionRequirementBill';
import { MRP_ABA } from '@/config/fields';
import { initErpUser } from '@/composables/useErpUser';
import type { DetailGridSummary } from '@/config/detailGridRegistry';
import type { ProductionRequirementHead } from '@/api/types';

const {
  formLabels,
  viewMode,
  head,
  lines,
  linesPo,
  linesMo,
  filters,
  headQueryFields,
  lineFormFields,
  linePoFormFields,
  lineMoFormFields,
  loading,
  saving,
  analyzing,
  depts,
  products,
  whs,
  custs,
  openSoList,
  editing,
  depName,
  totals,
  isFormReadonly,
  isAudited,
  filteredList,
  billStatus,
  loadMasters,
  reloadAll,
  transferFromSo,
  runAnalyze,
  addLine,
  copySelectedLines,
  removeSelectedLines,
  updateLine,
  onSave,
  openBill,
  goAdd,
  goList,
  onDeleteBill,
  onUnAudit,
  transferMo,
} = useProductionRequirementBill();

const billGridRef = ref<{
  getExportData: () => { fileName: string; columns: ExportColumn[]; rows: Record<string, string>[] };
} | null>(null);

const billSummary = ref({ count: 0, qty: 0 });

function onBillSummaryChange(s: DetailGridSummary) {
  billSummary.value = { count: s.count, qty: s.qty ?? 0 };
}

const billGridRows = computed(() =>
  filteredList.value.map((row) => ({
    ...row,
    __status: billStatus(row).label,
  }))
);

const filterKeyMap: Record<string, keyof typeof filters> = {
  mp_no: 'mp_no',
  so_no: 'so_no',
};

onMounted(async () => {
  await initErpUser();
  loading.value = true;
  try {
    await loadMasters();
    await reloadAll();
  } finally {
    loading.value = false;
  }
});

function onQuery() {
  reloadAll();
}

function rowClassName({ row }: { row: Record<string, unknown> }) {
  return row.mp_no === head.mp_no ? 'erp-row-current-bill' : '';
}

function billRowStatus(row: Record<string, unknown>) {
  return billStatus(row as unknown as ProductionRequirementHead);
}

function onExport() {
  const data = billGridRef.value?.getExportData();
  if (!data?.rows.length) {
    ElMessage.warning('没有可导出的数据');
    return;
  }
  exportRowsToExcel(data);
  ElMessage.success('已开始导出 Excel');
}
</script>

<template>
  <div class="kd-so-page">
    <template v-if="viewMode === 'list'">
      <div class="kd-so-toolbar">
        <div class="kd-so-toolbar__actions">
          <el-button type="primary" @click="goAdd">新增</el-button>
          <el-button @click="onExport">导出</el-button>
          <el-button @click="reloadAll">刷新</el-button>
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

      <div class="kd-so-query">
        <div class="kd-so-query__grid">
          <div v-for="f in headQueryFields" :key="f.key" class="kd-so-query-field">
            <label class="kd-so-query-field__label">{{ f.label }}</label>
            <div class="kd-so-query-field__control">
              <el-input
                v-model="filters[filterKeyMap[f.key] || 'mp_no']"
                clearable
                :placeholder="`请输入${f.label}`"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="kd-so-card kd-so-table">
        <div class="kd-so-card__body kd-so-card__body--table">
          <ErpDetailGrid
            ref="billGridRef"
            menu-code="MrpABA_BILL"
            :rows="billGridRows"
            :loading="loading"
            :action-width="168"
            :row-class-name="rowClassName"
            @summary-change="onBillSummaryChange"
            @row-dblclick="(row) => openBill(String(row.mp_no), true)"
          >
            <template #row-actions="{ row }">
              <el-button class="kd-so-link-btn" link type="primary" @click="openBill(String(row.mp_no), true)">
                查看
              </el-button>
              <el-button
                class="kd-so-link-btn"
                link
                type="primary"
                :disabled="billRowStatus(row).kind !== 'open'"
                @click="openBill(String(row.mp_no), false)"
              >
                编辑
              </el-button>
              <el-button
                class="kd-so-link-btn kd-so-link-btn--danger"
                link
                type="danger"
                :disabled="billRowStatus(row).kind !== 'open'"
                @click="onDeleteBill(String(row.mp_no))"
              >
                删除
              </el-button>
            </template>
          </ErpDetailGrid>
        </div>
      </div>

      <div class="kd-so-table-footer">
        <div class="kd-so-table-footer__info">
          共 <strong>{{ billSummary.count }}</strong> 笔生产需求分析单
        </div>
      </div>
    </template>

    <ProductionRequirementFormView
      v-else
      :head="head"
      :lines="lines"
      :lines-po="linesPo"
      :lines-mo="linesMo"
      :line-form-fields="lineFormFields"
      :line-po-form-fields="linePoFormFields"
      :line-mo-form-fields="lineMoFormFields"
      :depts="depts"
      :products="products"
      :whs="whs"
      :custs="custs"
      :open-so-list="openSoList"
      :editing="editing"
      :is-form-readonly="isFormReadonly"
      :is-audited="isAudited"
      :saving="saving"
      :analyzing="analyzing"
      :loading="loading"
      :dep-name="depName"
      :totals="totals"
      :bill-status="billStatus"
      :form-labels="formLabels"
      :menu-code="MRP_ABA.menuCode"
      @go-list="goList"
      @go-add="goAdd"
      @save="onSave"
      @un-audit="onUnAudit"
      @delete-bill="onDeleteBill"
      @add-line="addLine"
      @copy-lines="copySelectedLines"
      @remove-lines="removeSelectedLines"
      @update-line="updateLine"
      @transfer-from-so="transferFromSo"
      @analyze="runAnalyze"
      @transfer-mo="transferMo"
    />
  </div>
</template>
