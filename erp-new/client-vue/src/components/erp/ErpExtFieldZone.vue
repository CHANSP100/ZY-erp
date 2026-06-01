<script setup lang="ts">
/**
 * 扩展字段活组件 — 单头 / 单身 / 基础资料统一入口
 */
import { computed, inject, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import ErpFormSection from '@/components/erp/ErpFormSection.vue';
import ExtFieldControl from '@/components/erp/ExtFieldControl.vue';
import ErpGridDesignDialog from '@/components/erp/ErpGridDesignDialog.vue';
import { api, getErpUserId } from '@/api';
import type { DetailGridColumn } from '@/api/types';
import { BILL_EXT_FIELD_RELOAD_KEY, useBillExtFieldReload } from '@/composables/billExtFieldReload';
import { useExtFieldColumns, useExtFieldSelectOptions } from '@/composables/useExtFieldColumns';
import { useErpUser } from '@/composables/useErpUser';
import { validateExtRequiredFields } from '@/utils/extFieldRuntime';

const props = withDefaults(
  defineProps<{
    menuCode: string;
    area?: 'head' | 'line';
    readonly?: boolean;
    designable?: boolean;
    layout?: 'form' | 'bill';
    /** 嵌入父级 erp-form-grid，不单独显示「扩展字段」区块 */
    inline?: boolean;
  }>(),
  {
    area: 'head',
    layout: 'form',
    inline: false,
  }
);

const emit = defineEmits<{
  'fields-changed': [];
}>();

const extFields = defineModel<Record<string, unknown>>({ default: () => ({}) });

const gridArea = computed(() => (props.area === 'line' ? 'line' : 'head'));
const { columns, loading, reload } = useExtFieldColumns(
  () => props.menuCode,
  () => gridArea.value
);
const { tableOptions, tableLoading, preloadForColumns } = useExtFieldSelectOptions();
const { user } = useErpUser();
const billExtReloadKey = inject(BILL_EXT_FIELD_RELOAD_KEY, null);

const designOpen = ref(false);
const editColumn = ref<DetailGridColumn | null>(null);
const ctxMenu = reactive({
  show: false,
  x: 0,
  y: 0,
  panel: 'main' as 'main' | 'manage',
});
const deletingKey = ref('');

const showBlock = computed(
  () => props.inline || loading.value || columns.value.length > 0 || props.designable
);

function isAdmin(): boolean {
  return user.value?.is_admin ?? getErpUserId() === 'admin';
}

async function refreshColumns() {
  await reload();
  await preloadForColumns(columns.value);
}

function syncExtFieldKeys() {
  const next = { ...(extFields.value || {}) };
  let changed = false;
  for (const col of columns.value) {
    if (next[col.col_key] === undefined) {
      next[col.col_key] = '';
      changed = true;
    }
  }
  if (changed) extFields.value = next;
}

watch(columns, (cols) => {
  void preloadForColumns(cols);
  syncExtFieldKeys();
});

watch(
  () => props.menuCode,
  () => {
    void refreshColumns();
  }
);

onMounted(() => {
  void refreshColumns();
});

useBillExtFieldReload(refreshColumns);

function setField(colKey: string, val: unknown) {
  extFields.value = { ...(extFields.value || {}), [colKey]: val };
}

function closeCtxMenu() {
  ctxMenu.show = false;
  ctxMenu.panel = 'main';
}

function onDocumentPointerDown(e: MouseEvent) {
  if (!ctxMenu.show || e.button !== 0) return;
  if ((e.target as HTMLElement | null)?.closest('.erp-detail-grid__ctx')) return;
  closeCtxMenu();
}

onMounted(() => {
  document.addEventListener('mousedown', onDocumentPointerDown);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocumentPointerDown);
});

function onContextMenu(e: MouseEvent) {
  if (!props.designable) return;
  e.preventDefault();
  e.stopPropagation();
  if (!isAdmin()) {
    ElMessage.warning('仅管理员可管理扩展字段');
    return;
  }
  ctxMenu.x = e.clientX;
  ctxMenu.y = e.clientY;
  ctxMenu.panel = 'main';
  ctxMenu.show = true;
}

function openAddField() {
  if (!isAdmin()) return;
  editColumn.value = null;
  closeCtxMenu();
  designOpen.value = true;
}

function openEditField(col: DetailGridColumn) {
  if (!isAdmin()) return;
  editColumn.value = col;
  closeCtxMenu();
  designOpen.value = true;
}

function onDesignDialogToggle(open: boolean) {
  designOpen.value = open;
  if (!open) editColumn.value = null;
}

function validateRequired(): string | null {
  return validateExtRequiredFields(columns.value, extFields.value);
}

function openManagePanel() {
  if (!isAdmin()) return;
  ctxMenu.panel = 'manage';
}

async function removeColumn(col: DetailGridColumn) {
  if (!isAdmin() || deletingKey.value) return;
  try {
    await ElMessageBox.confirm(`确定删除扩展字段「${col.label}」？`, '删除扩展字段', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    });
  } catch {
    return;
  }
  deletingKey.value = col.col_key;
  try {
    await api.detailGridRemoveColumn(props.menuCode, col.col_key);
    ElMessage.success('已删除');
    const next = { ...(extFields.value || {}) };
    delete next[col.col_key];
    extFields.value = next;
    await refreshColumns();
    if (billExtReloadKey) billExtReloadKey.value += 1;
    emit('fields-changed');
    if (columns.value.length === 0) closeCtxMenu();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } };
    ElMessage.error(err.response?.data?.error || '删除失败');
  } finally {
    deletingKey.value = '';
  }
}

function onDesignSaved() {
  void refreshColumns().then(() => {
    syncExtFieldKeys();
    if (billExtReloadKey) billExtReloadKey.value += 1;
    emit('fields-changed');
  });
}

defineExpose({ refreshColumns, validateRequired });
</script>

<template>
  <template v-if="showBlock">
    <div
      v-if="!inline"
      class="erp-ext-field-zone"
      :class="{ 'erp-ext-field-zone--designable': designable }"
      @contextmenu="onContextMenu"
    >
      <ErpFormSection v-if="layout === 'form'" title="扩展字段">
        <div v-if="loading" class="erp-ext-field-zone__loading">加载扩展字段…</div>
        <div v-else-if="columns.length" class="erp-form-grid">
          <div v-for="col in columns" :key="col.col_key" class="erp-form-item">
            <label class="erp-form-label">
              <span v-if="col.required" class="req">*</span>{{ col.label }}
            </label>
            <div class="erp-form-control">
              <ExtFieldControl
                :model-value="extFields?.[col.col_key] ?? ''"
                :col="col"
                :readonly="readonly"
                :table-options="tableOptions"
                :table-loading="tableLoading"
                @update:model-value="setField(col.col_key, $event)"
              />
            </div>
          </div>
        </div>
      </ErpFormSection>

      <template v-else>
        <div v-if="loading" class="erp-ext-field-zone__loading">加载扩展字段…</div>
        <el-row v-else-if="columns.length" :gutter="12" class="erp-ext-field-zone__bill-row">
          <el-col v-for="col in columns" :key="col.col_key" :span="6">
            <el-form-item :label="col.label" :required="!!col.required">
              <ExtFieldControl
                :model-value="extFields?.[col.col_key] ?? ''"
                :col="col"
                :readonly="readonly"
                :table-options="tableOptions"
                :table-loading="tableLoading"
                @update:model-value="setField(col.col_key, $event)"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </div>

    <div
      v-else
      class="erp-ext-field-zone__inline"
      :class="{ 'erp-ext-field-zone--designable': designable }"
      @contextmenu="designable ? onContextMenu : undefined"
    >
      <div
        v-if="loading"
        class="erp-form-item erp-form-item--full erp-ext-field-zone__loading"
      >
        加载扩展字段…
      </div>
      <template v-else>
        <div
          v-for="col in columns"
          :key="col.col_key"
          class="erp-form-item"
        >
          <label class="erp-form-label">
            <span v-if="col.required" class="req">*</span>{{ col.label }}
          </label>
          <div class="erp-form-control">
            <ExtFieldControl
              :model-value="extFields?.[col.col_key] ?? ''"
              :col="col"
              :readonly="readonly"
              :table-options="tableOptions"
              :table-loading="tableLoading"
              @update:model-value="setField(col.col_key, $event)"
            />
          </div>
        </div>
      </template>
    </div>
  </template>

  <teleport to="body">
    <div
      v-if="designable && ctxMenu.show"
      class="erp-detail-grid__ctx erp-detail-grid__ctx--main"
      :style="{ left: `${ctxMenu.x}px`, top: `${ctxMenu.y}px` }"
      @click.stop
    >
      <template v-if="ctxMenu.panel === 'main'">
        <div class="erp-detail-grid__ctx-menu-item" @click="openAddField">添加字段</div>
        <div class="erp-detail-grid__ctx-menu-item" @click="openManagePanel">管理扩展字段</div>
      </template>
      <template v-else>
        <div class="erp-detail-grid__ctx-title">
          <button type="button" class="erp-detail-grid__ctx-back" @click="ctxMenu.panel = 'main'">
            &larr;
          </button>
          管理扩展字段
        </div>
        <div v-if="!columns.length" class="erp-detail-grid__ctx-menu-item is-disabled">
          暂无扩展字段
        </div>
        <div
          v-for="col in columns"
          :key="col.col_key"
          class="erp-detail-grid__ctx-menu-item erp-ext-field-zone__manage-row"
        >
          <span class="erp-ext-field-zone__manage-label">{{ col.label }}</span>
          <span class="erp-ext-field-zone__manage-actions">
            <button
              type="button"
              class="erp-ext-field-zone__manage-edit"
              @click.stop="openEditField(col)"
            >
              更改
            </button>
            <button
              type="button"
              class="erp-ext-field-zone__manage-del"
              :disabled="deletingKey === col.col_key"
              @click.stop="removeColumn(col)"
            >
              删
            </button>
          </span>
        </div>
      </template>
    </div>
  </teleport>

  <ErpGridDesignDialog
    v-if="designable"
    :model-value="designOpen"
    :menu-code="menuCode"
    mode="physical"
    :grid-area="gridArea"
    :edit-column="editColumn"
    @update:model-value="onDesignDialogToggle"
    @saved="onDesignSaved"
  />
</template>

<style scoped>
.erp-ext-field-zone--designable {
  cursor: context-menu;
  border-radius: 4px;
}

.erp-ext-field-zone__loading {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  padding: 8px 0;
}

.erp-ext-field-zone__bill-row {
  margin-top: 4px;
}

.erp-ext-field-zone__manage-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.erp-ext-field-zone__manage-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.erp-ext-field-zone__manage-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}

.erp-ext-field-zone__manage-edit {
  border: none;
  background: transparent;
  color: var(--el-color-primary);
  cursor: pointer;
  font-size: 12px;
  padding: 0 4px;
}

.erp-ext-field-zone__manage-del {
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: var(--el-color-danger);
  cursor: pointer;
  font-size: 12px;
  padding: 0 4px;
}

.erp-ext-field-zone__manage-del:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
