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
import { FAS_AREA, labelMap } from '@/config/fields';
import LookupDialog from '@/components/LookupDialog.vue';
import { getLookupDialogProps } from '@/config/lookups';
import LookupField from '@/components/LookupField.vue';
import { api } from '@/api';
import type { Area, AreaTreeNode } from '@/api/types';
import {
  apiErrorMessage,
  archiveRowClass,
  AREA_ROOT_NO,
  collectAreaSubtreeIds,
  fmtText,
  isValidAreaParent,
  LOAD_FAIL_HINT,
  selectableAreaParents,
} from '@/utils/sunlike';
import { buildArchiveSavePayload } from '@/utils/billExtPayload';
import { exportRowsToExcel } from '@/utils/exportExcel';

const FIELD_LABELS = labelMap(FAS_AREA.main);

const rawTree = ref<AreaTreeNode[]>([]);
const list = ref<Area[]>([]);
const loading = ref(false);
const saving = ref(false);
const loadError = ref('');
const treeKey = ref('__all__');
const dialogOpen = ref(false);
const editing = ref<string | null>(null);
const gridRef = ref<InstanceType<typeof ErpDetailGrid> | null>(null);
const extZoneRef = ref<InstanceType<typeof ErpExtFieldZone> | null>(null);
const parentPicker = ref(false);

const form = reactive<Area>({ area_no: '', name: '', ext_fields: {} });

function mapTreeNodes(nodes: AreaTreeNode[]): ErpCategoryTreeNode[] {
  return nodes.map((n) => ({
    id: n.area_no,
    label: n.title || `${n.area_no} ${n.name || ''}`.trim(),
    children: n.children?.length ? mapTreeNodes(n.children) : undefined,
  }));
}

const treeData = computed<ErpCategoryTreeNode[]>(() => [
  { id: '__all__', label: '全部分类', children: mapTreeNodes(rawTree.value) },
]);

const parentCandidates = computed(() => selectableAreaParents(list.value, editing.value));

const filteredList = computed(() => {
  if (!treeKey.value || treeKey.value === '__all__') return list.value;
  const ids = collectAreaSubtreeIds(list.value, treeKey.value);
  return list.value.filter((r) => ids.has(r.area_no));
});

const gridRows = computed(() =>
  filteredList.value.map((row) => ({ ...row }) as Record<string, unknown>)
);

async function onExtFieldsChanged() {
  gridRef.value?.reloadColumns?.();
  await loadAll();
}

function resetForm() {
  Object.assign(form, { area_no: '', name: '', area_up: '', stop_dd: '', rem: '', ext_fields: {} });
  editing.value = null;
}

const parentDisplay = computed(() => {
  const up = form.area_up?.trim();
  if (!up) return '';
  if (up === AREA_ROOT_NO) return AREA_ROOT_NO;
  return list.value.find((i) => i.area_no === up)?.name || up;
});

function gridRowClassName({ row }: { row: Record<string, unknown>; rowIndex: number }) {
  return archiveRowClass(row as unknown as Area);
}

async function loadAll() {
  loading.value = true;
  loadError.value = '';
  try {
    const [t, l] = await Promise.all([api.areaTree(), api.areaList()]);
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
    form.area_up = treeKey.value === AREA_ROOT_NO ? AREA_ROOT_NO : treeKey.value;
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
  await onEdit({ area_no: String(row.area_no ?? '') } as Area);
}

async function onEdit(row: Area) {
  const { data } = await api.getArea(row.area_no);
  Object.assign(form, {
    area_no: fmtText(data.area_no),
    name: fmtText(data.name),
    area_up: fmtText(data.area_up),
    stop_dd: fmtText(data.stop_dd),
    rem: fmtText(data.rem),
    ext_fields: data.ext_fields ?? {},
  });
  editing.value = row.area_no;
  dialogOpen.value = true;
}

function onParentPick(row: { area_no: string }) {
  if (row.area_no === AREA_ROOT_NO) {
    ElMessage.warning('不能选择根区域作为上层');
    return;
  }
  if (!isValidAreaParent(list.value, editing.value, row.area_no)) {
    ElMessage.warning('不能选择自身或下级区域作为上层');
    return;
  }
  form.area_up = row.area_no;
  parentPicker.value = false;
}

async function onSave() {
  const areaNo = form.area_no?.trim();
  const name = form.name?.trim();
  if (!areaNo) {
    ElMessage.warning('请填写区域代号');
    return;
  }
  if (!name) {
    ElMessage.warning('请填写名称');
    return;
  }
  const areaUp = form.area_up?.trim() || '';
  if (!isValidAreaParent(list.value, editing.value, areaUp)) {
    ElMessage.warning('上层区域不能为自身或下级，请重新选择');
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
      area_no: areaNo,
      name,
      area_up: areaUp,
      stop_dd: form.stop_dd?.trim() || undefined,
      rem: form.rem?.trim() || undefined,
      ext_fields: form.ext_fields,
    });
    if (editing.value) {
      await api.updateArea(editing.value, payload);
      ElMessage.success('存盘成功');
    } else {
      await api.createArea(payload);
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
  <ErpBasePage title="客户供应商区域" hide-head>
    <template #main-toolbar>
      <ErpToolBar>
        <el-button type="primary" class="erp-btn-primary" @click="onAdd">新增</el-button>
        <el-button type="primary" class="erp-btn-primary" @click="onExport">导出</el-button>
      </ErpToolBar>
    </template>
    <template #tree>
      <ErpCategoryTree title="区域树" :data="treeData" :current-key="treeKey" @select="onTreeSelect" />
    </template>

    <template #table>
      <div v-if="loadError" class="erp-load-error">{{ loadError }}</div>
      <ErpDetailGrid
        ref="gridRef"
        menu-code="FasECG"
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
    :title="editing ? '编辑区域' : '新增区域'"
    :saving="saving"
    @save="onSave"
  >
    <ErpFormSection title="基本信息">
      <div class="erp-form-grid">
        <div class="erp-form-item">
          <label class="erp-form-label"><span class="req">*</span>{{ FIELD_LABELS.area_no }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.area_no" :readonly="!!editing" maxlength="20" placeholder="如 A01" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label"><span class="req">*</span>{{ FIELD_LABELS.name }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.name" maxlength="100" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.area_up }}</label>
          <div class="erp-form-control">
            <LookupField
              :model-value="form.area_up"
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
          :menu-code="FAS_AREA.menuCode"
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
    v-bind="getLookupDialogProps('area', { title: '选择上层区域' })"
    :data="(parentCandidates as unknown as Record<string, unknown>[])"
    @select="onParentPick"
  />
</template>
