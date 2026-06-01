<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import PurchaseRequisitionFormView from '@/views/PurchaseRequisitionFormView.vue';
import ErpDetailGrid from '@/components/erp/ErpDetailGrid.vue';
import { fmtNum } from '@/utils/sunlike';
import { exportRowsToExcel, type ExportColumn } from '@/utils/exportExcel';
import { usePurchaseRequisitionBill } from '@/composables/usePurchaseRequisitionBill';
import { INV_AQ } from '@/config/fields';
import { initErpUser } from '@/composables/useErpUser';
import type { DetailGridSummary } from '@/config/detailGridRegistry';
import type { PurchaseRequisitionHead } from '@/api/types';

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
  custs,
  salms,
  depts,
  products,
  editing,
  custName,
  salName,
  depName,
  poDepName,
  totals,
  isFormReadonly,
  filteredList,
  billStatus,
  loadMasters,
  reloadAll,
  applyCust,
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
} = usePurchaseRequisitionBill();

const billGridRef = ref<{
  getExportData: () => { fileName: string; columns: ExportColumn[]; rows: Record<string, string>[] };
} | null>(null);

const billSummary = ref({ count: 0, amtn: 0 });

function onBillSummaryChange(s: DetailGridSummary) {
  billSummary.value = {
    count: s.count,
    amtn: s.amtn ?? s.amtn_net ?? 0,
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
  return row.sq_no === head.sq_no ? 'erp-row-current-bill' : '';
}

function billRowStatus(row: Record<string, unknown>) {
  return billStatus(row as unknown as PurchaseRequisitionHead);
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
                v-model="filters[f.key === 'cus_no' ? 'cus_no' : 'sq_no']"
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
            menu-code="InvAQ_BILL"
            :rows="billGridRows"
            :loading="loading"
            :action-width="168"
            :row-class-name="rowClassName"
            @summary-change="onBillSummaryChange"
            @row-dblclick="(row) => openOrder(String(row.sq_no), true)"
          >
            <template #row-actions="{ row }">
              <el-button class="kd-so-link-btn" link type="primary" @click="openOrder(String(row.sq_no), true)">
                查看
              </el-button>
              <el-button
                class="kd-so-link-btn"
                link
                type="primary"
                :disabled="billRowStatus(row).kind === 'closed'"
                @click="openOrder(String(row.sq_no), false)"
              >
                编辑
              </el-button>
              <el-button
                class="kd-so-link-btn kd-so-link-btn--danger"
                link
                type="danger"
                :disabled="billRowStatus(row).kind !== 'open'"
                @click="onDeleteBill(String(row.sq_no))"
              >
                删除
              </el-button>
            </template>
          </ErpDetailGrid>
        </div>
      </div>

      <div class="kd-so-table-footer">
        <div class="kd-so-table-footer__info">
          共 <strong>{{ billSummary.count }}</strong> 笔请购单
          · 预估合计 <strong>{{ fmtNum(billSummary.amtn) }}</strong>
        </div>
      </div>
    </template>

    <PurchaseRequisitionFormView
      v-else
      :head="head"
      :lines="lines"
      :line-form-fields="lineFormFields"
      :custs="custs"
      :salms="salms"
      :depts="depts"
      :products="products"
      :editing="editing"
      :is-form-readonly="isFormReadonly"
      :saving="saving"
      :loading="loading"
      :cust-name="custName"
      :sal-name="salName"
      :dep-name="depName"
      :po-dep-name="poDepName"
      :totals="totals"
      :bill-status="billStatus"
      :form-labels="formLabels"
      :menu-code="INV_AQ.menuCode"
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
      @apply-cust="applyCust"
    />
  </div>
</template>
