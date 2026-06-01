<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import ErpBasePage from '@/components/erp/ErpBasePage.vue';
import ErpToolBar from '@/components/erp/ErpToolBar.vue';
import ErpCategoryTree from '@/components/erp/ErpCategoryTree.vue';
import ErpDetailGrid from '@/components/erp/ErpDetailGrid.vue';
import ErpEditDialog from '@/components/erp/ErpEditDialog.vue';
import ErpFormSection from '@/components/erp/ErpFormSection.vue';
import ErpExtFieldZone from '@/components/erp/ErpExtFieldZone.vue';
import type { ErpCategoryTreeNode } from '@/components/erp/ErpCategoryTree.vue';
import { FAS_INDX, labelMap } from '@/config/fields';
import LookupDialog from '@/components/LookupDialog.vue';
import { getLookupDialogProps } from '@/config/lookups';
import LookupField from '@/components/LookupField.vue';
import { api } from '@/api';
import type { Indx, IndxTreeNode } from '@/api/types';
import {
  apiErrorMessage,
  archiveRowClass,
  collectIndxSubtreeIds,
  fmtText,
  INDX_ROOT_NO,
  isValidIndxParent,
  LOAD_FAIL_HINT,
  selectableIndxParents,
} from '@/utils/sunlike';
import { buildArchiveSavePayload } from '@/utils/billExtPayload';
import { exportRowsToExcel } from '@/utils/exportExcel';
const FIELD_LABELS = labelMap(FAS_INDX.main);

const rawTree = ref<IndxTreeNode[]>([]);
const list = ref<Indx[]>([]);
const loading = ref(false);
const saving = ref(false);
const loadError = ref('');
const treeKey = ref('__all__');
const dialogOpen = ref(false);
const editing = ref<string | null>(null);
const gridRef = ref<InstanceType<typeof ErpDetailGrid> | null>(null);
const extZoneRef = ref<InstanceType<typeof ErpExtFieldZone> | null>(null);
const parentPicker = ref(false);

const form = reactive<Indx>({ idx_no: '', name: '', ext_fields: {} });

function mapTreeNodes(nodes: IndxTreeNode[]): ErpCategoryTreeNode[] {
  return nodes.map((n) => ({
    id: n.idx_no,
    label: n.title || `${n.idx_no} ${n.name || ''}`.trim(),
    children: n.children?.length ? mapTreeNodes(n.children) : undefined,
  }));
}

const treeData = computed<ErpCategoryTreeNode[]>(() => [
  { id: '__all__', label: '全部分类', children: mapTreeNodes(rawTree.value) },
]);

const parentCandidates = computed(() => selectableIndxParents(list.value, editing.value));

const filteredList = computed(() => {
  if (!treeKey.value || treeKey.value === '__all__') return list.value;
  const ids = collectIndxSubtreeIds(list.value, treeKey.value);
  return list.value.filter((r) => ids.has(r.idx_no));
});

const gridRows = computed(() =>
  filteredList.value.map((row) => ({ ...row }) as Record<string, unknown>)
);

async function onExtFieldsChanged() {
  gridRef.value?.reloadColumns?.();
  await loadAll();
}

function resetForm() {
  Object.assign(form, { idx_no: '', name: '', idx_up: '', stop_dd: '', rem: '', ext_fields: {} });
  editing.value = null;
}

const parentDisplay = computed(() => {
  const up = form.idx_up?.trim();
  if (!up) return '';
  if (up === INDX_ROOT_NO) return INDX_ROOT_NO;
  return list.value.find((i) => i.idx_no === up)?.name || up;
});

function gridRowClassName({ row }: { row: Record<string, unknown>; rowIndex: number }) {
  return archiveRowClass(row as unknown as Indx);
}

async function loadAll() {
  loading.value = true;
  loadError.value = '';
  try {
    const [t, l] = await Promise.all([api.indxTree(), api.indxList()]);
    rawTree.value = t.data;
    list.value = l.data;
  } catch (e: unknown) {
    loadError.value = apiErrorMessage(e, LOAD_FAIL_HINT);
    ElMessage.error(loadError.value);
  } finally {
    loading.value = false;
  }
}

function onTreeSelect(id: string) {
  treeKey.value = id;
}

async function onAdd() {
  resetForm();
  if (treeKey.value && treeKey.value !== '__all__') {
    form.idx_up = treeKey.value === INDX_ROOT_NO ? INDX_ROOT_NO : treeKey.value;
  }
  dialogOpen.value = true;
}

function onExport() {
  const data = gridRef.value?.getExportData();
  if (!data?.rows.length) {
    ElMessage.warning('没有可导出的数据');
    return;
  }
  exportRowsToExcel(data);
  ElMessage.success('已开始导出 Excel');
}

async function onEditRow(row: Record<string, unknown>) {
  await onEdit({ idx_no: String(row.idx_no ?? '') } as Indx);
}

async function onEdit(row: Indx) {
  const { data } = await api.getIndx(row.idx_no);
  Object.assign(form, {
    idx_no: fmtText(data.idx_no),
    name: fmtText(data.name),
    idx_up: fmtText(data.idx_up),
    stop_dd: fmtText(data.stop_dd),
    rem: fmtText(data.rem),
    ext_fields: data.ext_fields ?? {},
  });
  editing.value = row.idx_no;
  dialogOpen.value = true;
}

function onParentPick(row: { idx_no: string }) {
  if (row.idx_no === INDX_ROOT_NO) {
    ElMessage.warning('不能选择根中类作为上层');
    return;
  }
  if (!isValidIndxParent(list.value, editing.value, row.idx_no)) {
    ElMessage.warning('不能选择自身或下级中类作为上层');
    return;
  }
  form.idx_up = row.idx_no;
  parentPicker.value = false;
}

async function onSave() {
  const idxNo = form.idx_no?.trim();
  const name = form.name?.trim();
  if (!idxNo) {
    ElMessage.warning('请填写中类代号');
    return;
  }
  if (!name) {
    ElMessage.warning('请填写名称');
    return;
  }
  const idxUp = form.idx_up?.trim() || '';
  if (!isValidIndxParent(list.value, editing.value, idxUp)) {
    ElMessage.warning('上层中类不能为自身或下级，请重新选择');
    return;
  }
  const extErr = extZoneRef.value?.validateRequired?.();
  if (extErr) {
    ElMessage.warning(extErr);
    return;
  }
  saving.value = true;
  try {
    const payload = buildArchiveSavePayload({
      idx_no: idxNo,
      name,
      idx_up: idxUp,
      stop_dd: form.stop_dd?.trim() || undefined,
      rem: form.rem?.trim() || undefined,
      ext_fields: form.ext_fields,
    });
    if (editing.value) {
      await api.updateIndx(editing.value, payload);
      ElMessage.success('存盘成功');
    } else {
      await api.createIndx(payload);
      ElMessage.success('存盘成功');
    }
    dialogOpen.value = false;
    await loadAll();
  } catch (e: unknown) {
    ElMessage.error(apiErrorMessage(e, '存盘失败'));
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  loadAll();
});
</script>

<template>
  <ErpBasePage title="中类" hide-head>
    <template #main-toolbar>
      <ErpToolBar>
        <el-button type="primary" class="erp-btn-primary" @click="onAdd">新增</el-button>
        <el-button type="primary" class="erp-btn-primary" @click="onExport">导出</el-button>
      </ErpToolBar>
    </template>
    <template #tree>
      <ErpCategoryTree title="中类树" :data="treeData" :current-key="treeKey" @select="onTreeSelect" />
    </template>

    <template #table>
      <div v-if="loadError" class="erp-load-error">{{ loadError }}</div>
      <ErpDetailGrid
        ref="gridRef"
        menu-code="OthHZYQD"
        :rows="gridRows"
        :loading="loading"
        :page-size="20"
        :action-width="120"
        :row-class-name="gridRowClassName"
        @row-dblclick="onEditRow"
      >
        <template #row-actions="{ row }">
          <el-button link type="primary" class="erp-btn-link" @click="onEditRow(row)">编辑</el-button>
        </template>
      </ErpDetailGrid>
    </template>
  </ErpBasePage>

  <ErpEditDialog
    v-model="dialogOpen"
    :title="editing ? '编辑中类' : '新增中类'"
    :saving="saving"
    @save="onSave"
  >
    <ErpFormSection title="基本信息">
      <div class="erp-form-grid">
        <div class="erp-form-item">
          <label class="erp-form-label"><span class="req">*</span>{{ FIELD_LABELS.idx_no }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.idx_no" :readonly="!!editing" maxlength="10" placeholder="如 A01" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label"><span class="req">*</span>{{ FIELD_LABELS.name }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.name" maxlength="50" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.idx_up }}</label>
          <div class="erp-form-control">
            <LookupField
              :model-value="form.idx_up"
              :display="parentDisplay"
              @open="parentPicker = true"
            />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.stop_dd }}</label>
          <div class="erp-form-control">
            <el-date-picker
              v-model="form.stop_dd"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择日期"
              style="width: 100%"
            />
          </div>
        </div>
        <div class="erp-form-item erp-form-item--full">
          <label class="erp-form-label">{{ FIELD_LABELS.rem }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.rem" type="textarea" :rows="2" maxlength="60" />
          </div>
        </div>
        <ErpExtFieldZone
          ref="extZoneRef"
          v-model="form.ext_fields"
          :menu-code="FAS_INDX.menuCode"
          area="head"
          designable
          inline
          @fields-changed="onExtFieldsChanged"
        />
      </div>
    </ErpFormSection>
  </ErpEditDialog>

  <LookupDialog
    v-model="parentPicker"
    v-bind="getLookupDialogProps('indx', { title: '选择上层中类' })"
    :data="(parentCandidates as unknown as Record<string, unknown>[])"
    @select="onParentPick"
  />
</template>
