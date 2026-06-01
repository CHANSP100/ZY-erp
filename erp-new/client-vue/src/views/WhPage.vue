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
import { FAS_WH, labelMap } from '@/config/fields';
import { LookupPicker } from '@/components/lookup';
import { api } from '@/api';
import type { Dept, Warehouse } from '@/api/types';
import {
  apiErrorMessage,
  archiveRowClass,
  collectWhSubtreeIds,
  fmtText,
  isValidWhParent,
  LOAD_FAIL_HINT,
  selectableWhParents,
} from '@/utils/sunlike';
import { buildArchiveSavePayload } from '@/utils/billExtPayload';
import { exportRowsToExcel } from '@/utils/exportExcel';

const FIELD_LABELS = labelMap(FAS_WH.main);

const list = ref<Warehouse[]>([]);
const depts = ref<Dept[]>([]);
const loading = ref(false);
const saving = ref(false);
const loadError = ref('');
const treeKey = ref('__all__');
const dialogOpen = ref(false);
const editing = ref<string | null>(null);
const gridRef = ref<InstanceType<typeof ErpDetailGrid> | null>(null);

const form = reactive<Warehouse>({ wh: '', name: '', ext_fields: {} });

const depName = computed(() => depts.value.find((d) => d.dep === form.dep)?.name || '');
const upWhName = computed(() => list.value.find((w) => w.wh === form.up_wh)?.name || '');
const parentCandidates = computed(() => selectableWhParents(list.value, editing.value));

type WhTreeNode = { wh: string; name?: string; title: string; children: WhTreeNode[] };

function buildWhTree(rows: Warehouse[]): WhTreeNode[] {
  const map = new Map<string, WhTreeNode>();
  for (const r of rows) {
    map.set(r.wh, {
      wh: r.wh,
      name: r.name,
      title: `${r.wh} ${r.name || ''}`.trim(),
      children: [],
    });
  }
  const roots: WhTreeNode[] = [];
  for (const r of rows) {
    const node = map.get(r.wh);
    if (!node) continue;
    const up = r.up_wh?.trim();
    if (up && up !== r.wh && map.has(up)) {
      map.get(up)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortTree = (nodes: WhTreeNode[]) => {
    nodes.sort((a, b) => fmtText(a.wh).localeCompare(fmtText(b.wh), 'zh-CN'));
    nodes.forEach((n) => sortTree(n.children));
  };
  sortTree(roots);
  return roots;
}

function mapTreeNodes(nodes: WhTreeNode[]): ErpCategoryTreeNode[] {
  return nodes.map((n) => ({
    id: n.wh,
    label: n.title,
    children: n.children.length ? mapTreeNodes(n.children) : undefined,
  }));
}

const treeData = computed<ErpCategoryTreeNode[]>(() => [
  { id: '__all__', label: '全部仓库', children: mapTreeNodes(buildWhTree(list.value)) },
]);

const filteredList = computed(() => {
  if (!treeKey.value || treeKey.value === '__all__') return list.value;
  const ids = collectWhSubtreeIds(list.value, treeKey.value);
  return list.value.filter((r) => ids.has(r.wh));
});

const gridRows = computed(() =>
  [...filteredList.value]
    .sort((a, b) => fmtText(a.wh).localeCompare(fmtText(b.wh), 'zh-CN'))
    .map((row) => ({ ...row }) as Record<string, unknown>)
);

function gridRowClassName({ row }: { row: Record<string, unknown>; rowIndex: number }) {
  return archiveRowClass(row as unknown as Warehouse);
}

function resetForm() {
  Object.assign(form, {
    wh: '',
    name: '',
    dep: '',
    up_wh: '',
    adr: '',
    tel_no: '',
    stop_dd: '',
    rem: '',
    ext_fields: {},
  });
  editing.value = null;
}

async function loadAll() {
  loading.value = true;
  loadError.value = '';
  try {
    const [w, d] = await Promise.all([api.whList(), api.deptList()]);
    list.value = w.data;
    depts.value = d.data;
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

function onAdd() {
  resetForm();
  if (treeKey.value && treeKey.value !== '__all__') {
    form.up_wh = treeKey.value;
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
  await onEdit({ wh: String(row.wh ?? '') } as Warehouse);
}

async function onEdit(row: Warehouse) {
  const { data } = await api.getWh(row.wh);
  Object.assign(form, {
    wh: fmtText(data.wh),
    name: fmtText(data.name),
    dep: fmtText(data.dep),
    up_wh: fmtText(data.up_wh),
    adr: fmtText(data.adr),
    tel_no: fmtText(data.tel_no),
    stop_dd: fmtText(data.stop_dd),
    rem: fmtText(data.rem),
    ext_fields: data.ext_fields ?? {},
  });
  editing.value = row.wh;
  dialogOpen.value = true;
}

function onUpWhPick(row: Pick<Warehouse, 'wh'>) {
  if (!isValidWhParent(list.value, editing.value, row.wh)) {
    ElMessage.warning('不能选择自身或下级库位作为上层');
    return;
  }
  form.up_wh = row.wh;
}

async function onSave() {
  const wh = form.wh?.trim();
  if (!wh) {
    ElMessage.warning('请填写库位代号');
    return;
  }
  const upWh = form.up_wh?.trim() || undefined;
  if (!isValidWhParent(list.value, editing.value, upWh)) {
    ElMessage.warning('上层库位不能为自身或下级，请重新选择');
    return;
  }
  saving.value = true;
  try {
    const payload = buildArchiveSavePayload({
      wh,
      name: form.name?.trim() || undefined,
      dep: form.dep?.trim() || undefined,
      up_wh: upWh,
      adr: form.adr?.trim() || undefined,
      tel_no: form.tel_no?.trim() || undefined,
      stop_dd: form.stop_dd?.trim() || undefined,
      rem: form.rem?.trim() || undefined,
      ext_fields: form.ext_fields,
    });
    if (editing.value) {
      await api.updateWh(editing.value, payload);
      ElMessage.success('存盘成功');
    } else {
      await api.createWh(payload);
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
  <ErpBasePage title="仓库资料" hide-head>
    <template #main-toolbar>
      <ErpToolBar>
        <el-button type="primary" class="erp-btn-primary" @click="onAdd">新增</el-button>
        <el-button type="primary" class="erp-btn-primary" @click="onExport">导出</el-button>
      </ErpToolBar>
    </template>
    <template #tree>
      <ErpCategoryTree title="仓库树" :data="treeData" :current-key="treeKey" @select="onTreeSelect" />
    </template>

    <template #table>
      <div v-if="loadError" class="erp-load-error">{{ loadError }}</div>
      <ErpDetailGrid
        ref="gridRef"
        menu-code="FasECB"
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
    :title="editing ? '编辑仓库' : '新增仓库'"
    :saving="saving"
    @save="onSave"
  >
    <ErpFormSection title="基本信息">
      <div class="erp-form-grid">
        <div class="erp-form-item">
          <label class="erp-form-label"><span class="req">*</span>{{ FIELD_LABELS.wh }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.wh" :readonly="!!editing" maxlength="12" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.name }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.name" maxlength="100" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.dep }}</label>
          <div class="erp-form-control">
            <LookupPicker
              v-model="form.dep"
              preset="dept"
              :data="depts"
              :display="depName"
            />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.up_wh }}</label>
          <div class="erp-form-control">
            <LookupPicker
              :model-value="form.up_wh"
              preset="warehouse"
              :data="parentCandidates"
              :display="upWhName"
              :config="{ title: '选择上层库位' }"
              :bind-value="false"
              @select="onUpWhPick"
            />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.tel_no }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.tel_no" maxlength="20" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.stop_dd }}</label>
          <div class="erp-form-control">
            <el-date-picker v-model="form.stop_dd" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
          </div>
        </div>
        <div class="erp-form-item erp-form-item--full">
          <label class="erp-form-label">{{ FIELD_LABELS.adr }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.adr" type="textarea" :rows="2" />
          </div>
        </div>
        <div class="erp-form-item erp-form-item--full">
          <label class="erp-form-label">{{ FIELD_LABELS.rem }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.rem" type="textarea" :rows="2" maxlength="100" />
          </div>
        </div>
      </div>
    </ErpFormSection>
    <ErpArchiveExtFields v-model="form.ext_fields" :menu-code="FAS_WH.menuCode" />
  </ErpEditDialog>

</template>
