<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import SalesOrderFormView from '@/views/SalesOrderFormView.vue';
import ErpDetailGrid from '@/components/erp/ErpDetailGrid.vue';
import ErpPrintDialog from '@/components/erp/ErpPrintDialog.vue';
import { fmtNum, fmtQty } from '@/utils/sunlike';
import { exportRowsToExcel, type ExportColumn } from '@/utils/exportExcel';
import { api } from '@/api';
import type { PrintTemplate, SalesOrderHead } from '@/api/types';
import { useSalesOrderBill } from '@/composables/useSalesOrderBill';
import { INV_AD } from '@/config/fields';
import { initErpUser } from '@/composables/useErpUser';
import type { DetailGridSummary } from '@/config/detailGridRegistry';

const {
  TAX_OPTIONS,
  viewMode,
  listTab,
  head,
  lines,
  detailLines,
  filters,
  lineFormFields,
  loading,
  saving,
  custs,
  salms,
  depts,
  currs,
  products,
  whs,
  editing,
  custName,
  salName,
  depName,
  curName,
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
  applyCust,
  addLine,
  copySelectedLines,
  removeSelectedLines,
  onTaxChange,
  updateLine,
  onSave,
  openOrder,
  goAdd,
  goList,
  onDeleteBill,
  onAudit,
  onUnAudit,
} = useSalesOrderBill();

const billGridRef = ref<{
  getExportData: () => { fileName: string; columns: ExportColumn[]; rows: Record<string, string>[] };
} | null>(null);
const detailGridRef = ref<{
  getExportData: () => { fileName: string; columns: ExportColumn[]; rows: Record<string, string>[] };
} | null>(null);
const printOpen = ref(false);
const printColumns = ref<ExportColumn[]>([]);
const printRows = ref<Record<string, string>[]>([]);
const printTitle = ref('销售订单明细');
const defaultPrintTpl = ref<PrintTemplate | null>(null);

const billGridRows = computed(() =>
  filteredList.value.map((row) => ({
    ...row,
    __status: billStatus(row).label,
  }))
);

const billSummary = ref({ count: 0, amtn_net: 0, tax: 0 });

function onBillSummaryChange(s: DetailGridSummary) {
  billSummary.value = {
    count: s.count,
    amtn_net: s.amtn_net ?? 0,
    tax: s.tax ?? 0,
  };
}

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
  return row.os_no === head.os_no ? 'erp-row-current-bill' : '';
}

function billRowStatus(row: Record<string, unknown>) {
  return billStatus(row as unknown as SalesOrderHead);
}

function onExport() {
  const data =
    listTab.value === 'detail'
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
  const data =
    listTab.value === 'detail'
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
    const { data: tpls } = await api.printTemplates('InvAD');
    defaultPrintTpl.value = tpls.find((t) => t.is_default) ?? tpls[0] ?? null;
  } catch {
    defaultPrintTpl.value = null;
  }
  printOpen.value = true;
}
</script>

<template>
  <div class="kd-so-page">
    <!-- ========== 列表模式 ========== -->
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
        <div class="kd-so-toolbar__actions">
          <el-tabs v-model="listTab" class="kd-so-tabs">
            <el-tab-pane label="订单列表" name="bill" />
            <el-tab-pane label="销售订单明细" name="detail" />
          </el-tabs>
        </div>
      </div>

      <!-- 订单列表 -->
      <div v-if="listTab === 'bill'" class="kd-so-card kd-so-table">
        <div class="kd-so-card__body kd-so-card__body--table">
          <ErpDetailGrid
            ref="billGridRef"
            menu-code="InvAD_BILL"
            :rows="billGridRows"
            :loading="loading"
            :action-width="168"
            :row-class-name="rowClassName"
            @summary-change="onBillSummaryChange"
            @row-dblclick="(row) => openOrder(String(row.os_no), true)"
          >
            <template #row-actions="{ row }">
              <el-button
                class="kd-so-link-btn"
                link
                type="primary"
                @click="openOrder(String(row.os_no), true)"
              >
                查看
              </el-button>
              <el-button
                class="kd-so-link-btn"
                link
                type="primary"
                :disabled="billRowStatus(row).kind === 'closed'"
                @click="openOrder(String(row.os_no), false)"
              >
                编辑
              </el-button>
              <el-button
                class="kd-so-link-btn kd-so-link-btn--danger"
                link
                type="danger"
                :disabled="billRowStatus(row).kind !== 'open'"
                @click="onDeleteBill(String(row.os_no))"
              >
                删除
              </el-button>
            </template>
          </ErpDetailGrid>
        </div>
      </div>

      <!-- 销售订单明细 -->
      <div v-if="listTab === 'detail'" class="kd-so-card kd-so-table">
        <div class="kd-so-card__body kd-so-card__body--table">
          <ErpDetailGrid
            ref="detailGridRef"
            menu-code="InvAD"
            :rows="detailLines"
            :loading="loading"
            @summary-change="onDetailSummaryChange"
            @columns-reload="loadDetailLines"
            @row-dblclick="(row) => openOrder(String(row.os_no), false)"
            @edit="(row) => openOrder(String(row.os_no), false)"
          />
        </div>
      </div>

      <div class="kd-so-table-footer">
        <div class="kd-so-table-footer__info">
          <template v-if="listTab === 'bill'">
            共 <strong>{{ billSummary.count }}</strong> 笔订单
            · 未税合计 <strong>{{ fmtNum(billSummary.amtn_net) }}</strong>
            · 税额合计 <strong>{{ fmtNum(billSummary.tax) }}</strong>
          </template>
          <template v-else>
            数量合计 <strong>{{ fmtQty(detailSummary.qty) }}</strong>
            · 未交 <strong>{{ fmtQty(detailSummary.qtyOpen) }}</strong>
            · 未税 <strong>{{ fmtNum(detailSummary.amtn) }}</strong>
            · 税额 <strong>{{ fmtNum(detailSummary.tax) }}</strong>
          </template>
        </div>
      </div>
    </template>

    <SalesOrderFormView
      v-else
      :head="head"
      :lines="lines"
      :line-form-fields="lineFormFields"
      :whs="whs"
      :custs="custs"
      :salms="salms"
      :depts="depts"
      :currs="currs"
      :products="products"
      :tax-options="TAX_OPTIONS"
      :editing="editing"
      :is-form-readonly="isFormReadonly"
      :saving="saving"
      :loading="loading"
      :cust-name="custName"
      :sal-name="salName"
      :dep-name="depName"
      :cur-name="curName"
      :totals="totals"
      :bill-status="billStatus"
      :form-labels="formLabels"
      :menu-code="INV_AD.menuCode"
      hide-bill-headline
      hide-section-nav
      hide-footer-actions
      @go-list="goList"
      @go-add="goAdd"
      @save="onSave"
      @audit="onAudit"
      @un-audit="onUnAudit"
      @delete-bill="onDeleteBill"
      @tax-change="onTaxChange"
      @add-line="addLine"
      @copy-lines="copySelectedLines"
      @remove-lines="removeSelectedLines"
      @update-line="updateLine"
      @apply-cust="applyCust"
    />

    <!-- 打印弹窗 -->
    <ErpPrintDialog
      v-model="printOpen"
      menu-code="InvAD"
      :title="printTitle"
      :columns="printColumns"
      :rows="printRows"
      :default-template="defaultPrintTpl"
    />
  </div>
</template>
