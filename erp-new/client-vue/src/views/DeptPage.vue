<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import ErpBasePage from '@/components/erp/ErpBasePage.vue';
import ErpToolBar from '@/components/erp/ErpToolBar.vue';
import ErpCategoryTree from '@/components/erp/ErpCategoryTree.vue';
import ErpDetailGrid from '@/components/erp/ErpDetailGrid.vue';
import ErpEditDialog from '@/components/erp/ErpEditDialog.vue';
import ErpFormSection from '@/components/erp/ErpFormSection.vue';
import ErpArchiveExtFields from '@/components/erp/ErpArchiveExtFields.vue';
import type { ErpCategoryTreeNode } from '@/components/erp/ErpCategoryTree.vue';
import { FAS_DEPT, labelMap } from '@/config/fields';
import LookupDialog from '@/components/LookupDialog.vue';
import { getLookupDialogProps } from '@/config/lookups';
import LookupField from '@/components/LookupField.vue';
import { api } from '@/api';
import type { Dept, DeptTreeNode } from '@/api/types';
import {
  apiErrorMessage,
  archiveRowClass,
  collectDeptSubtreeIds,
  fmtText,
  isValidDeptParent,
  LOAD_FAIL_HINT,
  selectableDeptParents,
} from '@/utils/sunlike';
import { buildArchiveSavePayload } from '@/utils/billExtPayload';
import { exportRowsToExcel } from '@/utils/exportExcel';

const FIELD_LABELS = labelMap(FAS_DEPT.main);

const MAKE_ID_OPTIONS = [
  { value: '1', label: '生产' },
  { value: '2', label: '管理' },
  { value: '3', label: '管理/生产' },
];

const DEFAULT_MAKE_ID = '1';

const rawTree = ref<DeptTreeNode[]>([]);
const list = ref<Dept[]>([]);
const loading = ref(false);
const saving = ref(false);
const loadError = ref('');
const treeKey = ref('__all__');
const dialogOpen = ref(false);
const editing = ref<string | null>(null);
const gridRef = ref<InstanceType<typeof ErpDetailGrid> | null>(null);
const parentPicker = ref(false);

const form = reactive<Dept>({ dep: '', name: '', make_id: DEFAULT_MAKE_ID, ext_fields: {} });

function mapTreeNodes(nodes: DeptTreeNode[]): ErpCategoryTreeNode[] {
  return nodes.map((n) => ({
    id: n.dep,
    label: n.title || `${n.dep} ${n.name || ''}`.trim(),
    children: n.children?.length ? mapTreeNodes(n.children) : undefined,
  }));
}

const treeData = computed<ErpCategoryTreeNode[]>(() => [
  { id: '__all__', label: '全部部门', children: mapTreeNodes(rawTree.value) },
]);

const parentCandidates = computed(() => selectableDeptParents(list.value, editing.value));

const filteredList = computed(() => {
  if (!treeKey.value || treeKey.value === '__all__') return list.value;
  const ids = collectDeptSubtreeIds(list.value, treeKey.value);
  return list.value.filter((r) => ids.has(r.dep));
});

const gridRows = computed(() =>
  filteredList.value.map((row) => ({ ...row }) as Record<string, unknown>)
);

function gridRowClassName({ row }: { row: Record<string, unknown>; rowIndex: number }) {
  return archiveRowClass(row as unknown as Dept);
}

function resetForm() {
  Object.assign(form, {
    dep: '',
    name: '',
    eng_name: '',
    up: '',
    make_id: DEFAULT_MAKE_ID,
    stop_dd: '',
    ext_fields: {},
  });
  editing.value = null;
}

async function loadAll() {
  loading.value = true;
  loadError.value = '';
  try {
    const [t, l] = await Promise.all([api.deptTree(), api.deptList()]);
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
    form.up = treeKey.value;
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
  await onEdit({ dep: String(row.dep ?? '') } as Dept);
}

async function onEdit(row: Dept) {
  const { data } = await api.getDept(row.dep);
  Object.assign(form, {
    dep: fmtText(data.dep),
    name: fmtText(data.name),
    eng_name: fmtText(data.eng_name),
    up: fmtText(data.up),
    make_id: fmtText(data.make_id) || DEFAULT_MAKE_ID,
    stop_dd: fmtText(data.stop_dd),
    ext_fields: data.ext_fields ?? {},
  });
  editing.value = row.dep;
  dialogOpen.value = true;
}

function onParentPick(row: { dep: string }) {
  if (!isValidDeptParent(list.value, editing.value, row.dep)) {
    ElMessage.warning('不能选择自身或下级部门作为上层');
    return;
  }
  form.up = row.dep;
  parentPicker.value = false;
}

async function onSave() {
  const dep = form.dep?.trim();
  const name = form.name?.trim();
  if (!dep) {
    ElMessage.warning('请填写部门代号');
    return;
  }
  const up = form.up?.trim() || undefined;
  if (!isValidDeptParent(list.value, editing.value, up)) {
    ElMessage.warning('上层部门不能为自身或下级，请重新选择');
    return;
  }
  saving.value = true;
  try {
    const payload = buildArchiveSavePayload({
      dep,
      name: name || undefined,
      eng_name: form.eng_name?.trim() || undefined,
      up,
      make_id: form.make_id || DEFAULT_MAKE_ID,
      stop_dd: form.stop_dd?.trim() || undefined,
      ext_fields: form.ext_fields,
    });
    if (editing.value) {
      await api.updateDept(editing.value, payload);
      ElMessage.success('存盘成功');
    } else {
      await api.createDept(payload);
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
  <ErpBasePage title="部门代号" hide-head>
    <template #main-toolbar>
      <ErpToolBar>
        <el-button type="primary" class="erp-btn-primary" @click="onAdd">新增</el-button>
        <el-button type="primary" class="erp-btn-primary" @click="onExport">导出</el-button>
      </ErpToolBar>
    </template>
    <template #tree>
      <ErpCategoryTree title="部门树" :data="treeData" :current-key="treeKey" @select="onTreeSelect" />
    </template>

    <template #table>
      <div v-if="loadError" class="erp-load-error">{{ loadError }}</div>
      <ErpDetailGrid
        ref="gridRef"
        menu-code="FasED"
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
    :title="editing ? '编辑部门' : '新增部门'"
    :saving="saving"
    @save="onSave"
  >
    <ErpFormSection title="基本信息">
      <div class="erp-form-grid">
        <div class="erp-form-item">
          <label class="erp-form-label"><span class="req">*</span>{{ FIELD_LABELS.dep }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.dep" :readonly="!!editing" maxlength="8" placeholder="如 01" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.name }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.name" maxlength="30" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.eng_name }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.eng_name" maxlength="30" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.up }}</label>
          <div class="erp-form-control">
            <LookupField
              :model-value="form.up"
              :display="list.find((i) => i.dep === form.up)?.name"
              @open="parentPicker = true"
            />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.make_id }}</label>
          <div class="erp-form-control">
            <el-select v-model="form.make_id" style="width: 100%">
              <el-option v-for="o in MAKE_ID_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
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
      </div>
    </ErpFormSection>
    <ErpArchiveExtFields v-model="form.ext_fields" :menu-code="FAS_DEPT.menuCode" />
  </ErpEditDialog>

  <LookupDialog
    v-model="parentPicker"
    v-bind="getLookupDialogProps('dept', { title: '选择上层部门' })"
    :data="(parentCandidates as unknown as Record<string, unknown>[])"
    @select="onParentPick"
  />
</template>
