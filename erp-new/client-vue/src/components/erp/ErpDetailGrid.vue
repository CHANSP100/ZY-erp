<script setup lang="ts">
/**
 * ErpDetailGrid — 明细网格标准骨架
 *
 * 内置 5 项能力（所有业务明细表统一套用）：
 * 1. 列头筛选行 — 筛选行与表头列宽/滚动同步
 * 2. 表头右键菜单 — 列显示设置
 * 3. 列拖动排序 — 拖拽表头调序，个人/管理员持久化
 * 4. 单元格框选复制 — 拖选区域，Ctrl+C 复制
 * 5. 列模糊查询 — 筛选行每列独立模糊匹配
 *
 * 新菜单：在 config/detailGridRegistry.ts 注册 menuCode 即可。
 */
import { toRef } from 'vue';
import { useErpDetailGrid } from '@/composables/useErpDetailGrid';
import type { DetailGridSummary } from '@/config/detailGridRegistry';

const props = defineProps<{
  menuCode: string;
  rows: Record<string, unknown>[];
  loading?: boolean;
  pageSize?: number;
  actionWidth?: number;
  rowClassName?: (data: { row: Record<string, unknown>; rowIndex: number }) => string;
}>();

const emit = defineEmits<{
  'row-dblclick': [Record<string, unknown>];
  edit: [Record<string, unknown>];
  'summary-change': [DetailGridSummary];
  'columns-reload': [];
}>();

const {
  columns,
  columnFilters,
  tableRef,
  filterScrollRef,
  tableWrapRef,
  page,
  pageSizeLocal,
  measuredIndexW,
  measuredActionW,
  scrollInnerWidth,
  headerMenu,
  sortProp,
  sortOrder,
  selectionStart,
  selectionEnd,
  dragSourceColKey,
  dragOverColKey,
  visibleColumns,
  filteredRows,
  paginatedRows,
  summary,
  filterCellStyle,
  formatCell,
  onFilterScroll,
  onHeaderDragEnd,
  onColHeaderMouseDown,
  colTableWidth,
  colIndexOf,
  cellClassName,
  onCellMouseDown,
  onCellMouseEnter,
  onSortChange,
  isAdmin,
  closeMenus,
  openHeaderMenu,
  onHeaderContextmenu,
  openColumnPanel,
  toggleColumn,
  removeCustomCol,
  loadColumns,
  getExportData,
} = useErpDetailGrid({
  menuCode: props.menuCode,
  rows: toRef(props, 'rows'),
  loading: toRef(props, 'loading'),
  pageSize: props.pageSize,
  actionWidth: props.actionWidth,
  onSummaryChange: (s) => emit('summary-change', s),
  onColumnsReload: () => emit('columns-reload'),
});

const PAGE_SIZE_PRESETS = [20, 50, 100, 200] as const;

function onPageSizeChange(val?: number) {
  const n = Math.floor(Number(val ?? pageSizeLocal.value) || PAGE_SIZE_PRESETS[0]);
  pageSizeLocal.value = Math.min(999, Math.max(1, n));
  page.value = 1;
}

defineExpose({
  summary,
  filteredRows,
  reloadColumns: loadColumns,
  getExportData,
  tableRef,
  filterScrollRef,
  tableWrapRef,
});
</script>

<template>
  <div class="erp-detail-grid" @click="closeMenus">
    <div
      v-if="visibleColumns.length"
      class="erp-detail-grid__filters-row"
      @contextmenu.prevent="openHeaderMenu"
    >
      <div ref="filterScrollRef" class="erp-detail-grid__filters-scroll" @scroll="onFilterScroll">
        <div
          class="erp-detail-grid__filters-inner"
          :style="{ width: `${scrollInnerWidth}px` }"
        >
          <div
            class="erp-detail-grid__filter-index"
            :style="{ width: `${measuredIndexW}px`, minWidth: `${measuredIndexW}px` }"
          />
          <div
            v-for="col in visibleColumns"
            :key="col.col_key"
            class="erp-detail-grid__filter-cell"
            :class="{
              'is-col-drag-source': dragSourceColKey === col.col_key,
              'is-col-drag-over': dragOverColKey === col.col_key && dragSourceColKey !== col.col_key,
            }"
            :style="filterCellStyle(col)"
          >
            <el-input
              v-model="columnFilters[col.col_key]"
              size="small"
              clearable
              :placeholder="col.label"
            />
          </div>
        </div>
      </div>
      <div
        class="erp-detail-grid__filter-actions"
        :style="{ width: `${measuredActionW}px`, minWidth: `${measuredActionW}px` }"
      />
    </div>

    <div ref="tableWrapRef" class="erp-detail-grid__table-wrap">
      <div v-if="!visibleColumns.length && !loading" class="erp-detail-grid__empty">
        正在加载列配置…
      </div>
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="paginatedRows"
        size="small"
        border
        stripe
        class="erp-detail-grid__table"
        :cell-class-name="cellClassName"
        :row-class-name="rowClassName"
        :default-sort="{ prop: sortProp, order: sortOrder }"
        @sort-change="onSortChange"
        @header-contextmenu="onHeaderContextmenu"
        @header-dragend="onHeaderDragEnd"
        @row-dblclick="(row: Record<string, unknown>) => emit('row-dblclick', row)"
      >
        <el-table-column label="序" :width="measuredIndexW" align="center">
          <template #header>
            <span class="erp-detail-grid__header-label" @contextmenu.prevent="openHeaderMenu">
              序
            </span>
          </template>
          <template #default="{ $index }">
            <span
              class="erp-detail-grid__cell"
              @mousedown="onCellMouseDown($index, 0, $event)"
              @mouseenter="onCellMouseEnter($index, 0)"
            >
              {{ (page - 1) * pageSizeLocal + $index + 1 }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          v-for="col in visibleColumns"
          :key="col.col_key"
          :prop="col.col_key"
          :label="col.label"
          :width="colTableWidth(col)"
          sortable="custom"
          show-overflow-tooltip
        >
          <template #header>
            <span
              class="erp-detail-grid__header-label"
              :class="{
                'is-col-drag-source': dragSourceColKey === col.col_key,
                'is-col-drag-over': dragOverColKey === col.col_key && dragSourceColKey !== col.col_key,
              }"
              @mousedown="onColHeaderMouseDown(col, $event)"
              @contextmenu.prevent="openHeaderMenu"
            >
              {{ col.label }}
            </span>
          </template>
          <template #default="{ row, $index }">
            <span
              class="erp-detail-grid__cell"
              @mousedown="onCellMouseDown($index, colIndexOf(col), $event)"
              @mouseenter="onCellMouseEnter($index, colIndexOf(col))"
            >
              {{ formatCell(row, col) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" :width="measuredActionW" fixed="right" align="center">
          <template #header>
            <span class="erp-detail-grid__header-label" @contextmenu.prevent="openHeaderMenu">
              操作
            </span>
          </template>
          <template #default="{ row }">
            <slot name="row-actions" :row="row">
              <el-button class="kd-so-link-btn" link type="primary" @click="emit('edit', row)">
                编辑
              </el-button>
            </slot>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="erp-detail-grid__pager">
      <span class="erp-detail-grid__pager-info">
        筛选后 <strong>{{ summary.count }}</strong> 行
        <span v-if="selectionStart && selectionEnd" class="erp-detail-grid__copy-hint">
          · Ctrl+C 复制
        </span>
      </span>
      <div class="erp-detail-grid__pager-right">
        <div class="erp-detail-grid__page-size">
          <el-select
            v-model="pageSizeLocal"
            size="small"
            class="erp-detail-grid__page-size-select"
            @change="onPageSizeChange"
          >
            <el-option
              v-for="s in PAGE_SIZE_PRESETS"
              :key="s"
              :label="`${s}条/页`"
              :value="s"
            />
          </el-select>
          <el-input-number
            v-model="pageSizeLocal"
            :min="1"
            :max="999"
            :step="1"
            size="small"
            controls-position="right"
            class="erp-detail-grid__page-size-input"
            @change="onPageSizeChange"
          />
        </div>
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSizeLocal"
          :total="summary.count"
          layout="total, prev, pager, next, jumper"
          small
          background
        />
      </div>
    </div>

    <teleport to="body">
      <div
        v-if="headerMenu.show"
        class="erp-detail-grid__ctx"
        :class="{ 'erp-detail-grid__ctx--main': headerMenu.panel === 'main' }"
        :style="{ left: `${headerMenu.x}px`, top: `${headerMenu.y}px` }"
        @click.stop
      >
        <template v-if="headerMenu.panel === 'main'">
          <div class="erp-detail-grid__ctx-menu-item" @click="openColumnPanel">列显示设置</div>
        </template>
        <template v-else>
          <div class="erp-detail-grid__ctx-title">
            <button type="button" class="erp-detail-grid__ctx-back" @click="headerMenu.panel = 'main'">
              ←
            </button>
            {{ isAdmin() ? '列显示设置（全局）' : '列显示设置（个人）' }}
          </div>
          <div v-for="col in columns" :key="col.col_key" class="erp-detail-grid__ctx-item">
            <el-checkbox :model-value="col.visible" @change="(v: boolean) => toggleColumn(col, v)">
              {{ col.label }}
              <span v-if="!col.is_system" class="erp-detail-grid__ctx-tag">扩展</span>
            </el-checkbox>
            <el-button
              v-if="isAdmin() && !col.is_system"
              link
              type="danger"
              size="small"
              @click="removeCustomCol(col)"
            >
              删
            </el-button>
          </div>
        </template>
      </div>
    </teleport>
  </div>
</template>
