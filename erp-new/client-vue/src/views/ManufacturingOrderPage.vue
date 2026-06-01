<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import ManufacturingOrderFormView from '@/views/ManufacturingOrderFormView.vue';
import ErpDetailGrid from '@/components/erp/ErpDetailGrid.vue';
import { fmtQty } from '@/utils/sunlike';
import { exportRowsToExcel, type ExportColumn } from '@/utils/exportExcel';
import { useManufacturingOrderBill } from '@/composables/useManufacturingOrderBill';
import { MRP_AC } from '@/config/fields';
import { initErpUser } from '@/composables/useErpUser';
import type { DetailGridSummary } from '@/config/detailGridRegistry';
import type { ManufacturingOrderHead } from '@/api/types';

const {
  formLabels,
  viewMode,
  head,
  lines,
  filters,
  headQueryFields,
  lineFormFields,
  loading,
  saving,
  depts,
  products,
  whs,
  editing,
  mrpDisplay,
  depName,
  whName,
  totals,
  isFormReadonly,
  filteredList,
  billStatus,
  loadMasters,
  reloadAll,
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
  onAudit,
  onUnAudit,
} = useManufacturingOrderBill();

const billGridRef = ref<{
  getExportData: () => { fileName: string; columns: ExportColumn[]; rows: Record<string, string>[] };
} | null>(null);

const billSummary = ref({ count: 0, qty: 0 });

function onBillSummaryChange(s: DetailGridSummary) {
  billSummary.value = {
    count: s.count,
    qty: s.qty ?? 0,
  };
}

const billGridRows = computed(() =>
  filteredList.value.map((row) => ({
    ...row,
    __status: billStatus(row).label,
  }))
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
});

function onQuery() {
  reloadAll();
}

function rowClassName({ row }: { row: Record<string, unknown> }) {
  return row.mo_no === head.mo_no ? 'erp-row-current-bill' : '';
}

function billRowStatus(row: Record<string, unknown>) {
  return billStatus(row as unknown as ManufacturingOrderHead);
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
                v-model="filters[f.key === 'mrp_no' ? 'mrp_no' : 'mo_no']"
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
            menu-code="MrpAC_BILL"
            :rows="billGridRows"
            :loading="loading"
            :action-width="168"
            :row-class-name="rowClassName"
            @summary-change="onBillSummaryChange"
            @row-dblclick="(row) => openOrder(String(row.mo_no), true)"
          >
            <template #row-actions="{ row }">
              <el-button class="kd-so-link-btn" link type="primary" @click="openOrder(String(row.mo_no), true)">
                查看
              </el-button>
              <el-button
                class="kd-so-link-btn"
                link
                type="primary"
                :disabled="billRowStatus(row).kind === 'closed'"
                @click="openOrder(String(row.mo_no), false)"
              >
                编辑
              </el-button>
              <el-button
                class="kd-so-link-btn kd-so-link-btn--danger"
                link
                type="danger"
                :disabled="billRowStatus(row).kind !== 'open'"
                @click="onDeleteBill(String(row.mo_no))"
              >
                删除
              </el-button>
            </template>
          </ErpDetailGrid>
        </div>
      </div>

      <div class="kd-so-table-footer">
        <div class="kd-so-table-footer__info">
          共 <strong>{{ billSummary.count }}</strong> 笔制令单
          · 合计数量 <strong>{{ fmtQty(billSummary.qty) }}</strong>
        </div>
      </div>
    </template>

    <ManufacturingOrderFormView
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
      :mrp-display="mrpDisplay"
      :dep-name="depName"
      :wh-name="whName"
      :totals="totals"
      :bill-status="billStatus"
      :form-labels="formLabels"
      :menu-code="MRP_AC.menuCode"
      @go-list="goList"
      @go-add="goAdd"
      @save="onSave"
      @audit="onAudit"
      @un-audit="onUnAudit"
      @delete-bill="onDeleteBill"
      @add-line="addLine"
      @copy-lines="copySelectedLines"
      @remove-lines="removeSelectedLines"
      @update-line="updateLine"
      @apply-product="applyProduct"
    />
  </div>
</template>
