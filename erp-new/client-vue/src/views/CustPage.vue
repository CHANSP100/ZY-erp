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
import { FAS_CUST, labelMap } from '@/config/fields';
import LookupDialog from '@/components/LookupDialog.vue';
import { getLookupDialogProps } from '@/config/lookups';
import LookupField from '@/components/LookupField.vue';
import LookupPicker from '@/components/LookupPicker.vue';
import { api } from '@/api';
import type { Area, Cust, Salm } from '@/api/types';
import {
  apiErrorMessage,
  archiveRowClass,
  AREA_ROOT_NO,
  fmtText,
  isIndxStopped,
  LOAD_FAIL_HINT,
} from '@/utils/sunlike';
import { buildArchiveSavePayload } from '@/utils/billExtPayload';
import { exportRowsToExcel } from '@/utils/exportExcel';

const AREA_EMPTY_KEY = '__empty__';

const OBJ_OPTIONS = [
  { value: '1', label: '客户' },
  { value: '2', label: '厂商' },
  { value: '3', label: '客户与厂商' },
];

const TAX_OPTIONS = [
  { value: '1', label: '不计税' },
  { value: '2', label: '应税内含' },
  { value: '3', label: '应税外加' },
];

const FIELD_LABELS = labelMap(FAS_CUST.main);

const list = ref<Cust[]>([]);
const salms = ref<Salm[]>([]);
const areas = ref<Area[]>([]);
const loading = ref(false);
const saving = ref(false);
const loadError = ref('');
const treeKey = ref('__all__');
const dialogOpen = ref(false);
const editing = ref<string | null>(null);
const gridRef = ref<InstanceType<typeof ErpDetailGrid> | null>(null);
const salPicker = ref(false);
const salPickTarget = ref<'sal' | 'sal_no'>('sal');

const form = reactive<Cust>({
  cus_no: '',
  obj_id: '1',
  name: '',
  id1_tax: '2',
  ext_fields: {},
});

const salBizName = computed(
  () => salms.value.find((s) => s.sal_no === form.sal)?.name || ''
);
const salNoName = computed(
  () => salms.value.find((s) => s.sal_no === form.sal_no)?.name || ''
);
const selectableAreas = computed(() =>
  areas.value.filter((a) => a.area_no !== AREA_ROOT_NO && !isIndxStopped(a))
);
const areaName = computed(
  () => areas.value.find((a) => a.area_no === form.cus_are)?.name || ''
);

function areaDisplayLabel(areaNo: string): string {
  const row = areas.value.find((a) => a.area_no === areaNo);
  return row?.name?.trim() || areaNo;
}

function openSalPicker(target: 'sal' | 'sal_no') {
  salPickTarget.value = target;
  salPicker.value = true;
}

function onSalSelect(r: Salm) {
  if (salPickTarget.value === 'sal') form.sal = r.sal_no;
  else form.sal_no = r.sal_no;
}

const treeData = computed<ErpCategoryTreeNode[]>(() => {
  const areas = new Map<string, string>();
  for (const row of list.value) {
    const area = fmtText(row.cus_are);
    if (area) areas.set(area, area);
    else areas.set(AREA_EMPTY_KEY, '未分区');
  }
  const children = [...areas.entries()]
    .sort(([a], [b]) => {
      if (a === AREA_EMPTY_KEY) return 1;
      if (b === AREA_EMPTY_KEY) return -1;
      return a.localeCompare(b, 'zh-CN');
    })
    .map(([id]) => ({
      id,
      label: id === AREA_EMPTY_KEY ? '未分区' : areaDisplayLabel(id),
    }));
  return [{ id: '__all__', label: '全部区域', children }];
});

const filteredList = computed(() => {
  if (!treeKey.value || treeKey.value === '__all__') return list.value;
  if (treeKey.value === AREA_EMPTY_KEY) {
    return list.value.filter((r) => !fmtText(r.cus_are));
  }
  return list.value.filter((r) => fmtText(r.cus_are) === treeKey.value);
});

const gridRows = computed(() =>
  filteredList.value.map((row) => {
    const biz = salms.value.find((s) => s.sal_no === row.sal);
    const broker = salms.value.find((s) => s.sal_no === row.sal_no);
    return {
      ...row,
      sal_name: biz?.name || '',
      sal_no_name: broker?.name || '',
    } as Record<string, unknown>;
  })
);

function gridRowClassName({ row }: { row: Record<string, unknown>; rowIndex: number }) {
  return archiveRowClass({ stop_dd: row.end_dd as string | undefined });
}

function resetForm() {
  Object.assign(form, {
    cus_no: '',
    obj_id: '1',
    name: '',
    snm: '',
    cus_are: '',
    cnt_man1: '',
    cnt_man2: '',
    tel1: '',
    tel2: '',
    uni_no: '',
    biz_dsc: '',
    adr2: '',
    end_dd: '',
    cur_id: 'RMB',
    id1_tax: '2',
    sal: '',
    sal_no: '',
    bnk_name: '',
    id_code: '',
    rem: '',
    ext_fields: {},
  });
  editing.value = null;
}

function onNameBlur() {
  if (!form.snm?.trim() && form.name?.trim()) {
    form.snm = form.name.trim().slice(0, 30);
  }
}

async function loadAll() {
  loading.value = true;
  loadError.value = '';
  try {
    const [c, s, a] = await Promise.all([
      api.custList({ limit: 5000 }),
      api.salmList(),
      api.areaList(),
    ]);
    list.value = c.data;
    salms.value = s.data;
    areas.value = a.data;
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
    form.cus_are = treeKey.value === AREA_EMPTY_KEY ? '' : treeKey.value;
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
  await onEdit({ cus_no: String(row.cus_no ?? '') } as Cust);
}

async function onEdit(row: Cust) {
  const { data } = await api.getCust(row.cus_no);
  Object.assign(form, {
    cus_no: fmtText(data.cus_no),
    obj_id: data.obj_id || '1',
    name: fmtText(data.name),
    snm: fmtText(data.snm),
    cus_are: fmtText(data.cus_are),
    cnt_man1: fmtText(data.cnt_man1),
    cnt_man2: fmtText(data.cnt_man2),
    tel1: fmtText(data.tel1),
    tel2: fmtText(data.tel2),
    uni_no: fmtText(data.uni_no),
    biz_dsc: fmtText(data.biz_dsc),
    adr2: fmtText(data.adr2),
    end_dd: fmtText(data.end_dd),
    cur_id: fmtText(data.cur_id) || 'RMB',
    id1_tax: data.id1_tax || '2',
    sal: fmtText(data.sal),
    sal_no: fmtText(data.sal_no),
    bnk_name: fmtText(data.bnk_name),
    id_code: fmtText(data.id_code),
    rem: fmtText(data.rem),
    ext_fields: data.ext_fields ?? {},
  });
  editing.value = row.cus_no;
  dialogOpen.value = true;
}

async function onSave() {
  const cusNo = form.cus_no?.trim();
  const name = form.name?.trim();
  if (!cusNo) {
    ElMessage.warning('请填写客户代号');
    return;
  }
  if (!name) {
    ElMessage.warning('请填写全称');
    return;
  }
  saving.value = true;
  try {
    const payload = buildArchiveSavePayload({
      ...form,
      cus_no: cusNo,
      name,
      snm: form.snm?.trim() || name.slice(0, 30),
      obj_id: form.obj_id || '1',
      id1_tax: form.id1_tax || '2',
      end_dd: form.end_dd?.trim() || undefined,
    });
    if (editing.value) {
      await api.updateCust(editing.value, payload);
      ElMessage.success('存盘成功');
    } else {
      await api.createCust(payload);
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
  <ErpBasePage title="客户厂商资料" hide-head>
    <template #main-toolbar>
      <ErpToolBar>
        <el-button type="primary" class="erp-btn-primary" @click="onAdd">新增</el-button>
        <el-button type="primary" class="erp-btn-primary" @click="onExport">导出</el-button>
      </ErpToolBar>
    </template>
    <template #tree>
      <ErpCategoryTree title="区域" :data="treeData" :current-key="treeKey" @select="onTreeSelect" />
    </template>

    <template #table>
      <div v-if="loadError" class="erp-load-error">{{ loadError }}</div>
      <ErpDetailGrid
        ref="gridRef"
        menu-code="FasEA"
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
    :title="editing ? '编辑客户' : '新增客户'"
    :saving="saving"
    width="880px"
    @save="onSave"
  >
    <ErpFormSection title="基本资料">
      <div class="erp-form-grid">
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.obj_id }}</label>
          <div class="erp-form-control">
            <el-select v-model="form.obj_id" style="width: 100%">
              <el-option v-for="o in OBJ_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label"><span class="req">*</span>{{ FIELD_LABELS.cus_no }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.cus_no" :readonly="!!editing" maxlength="12" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label"><span class="req">*</span>{{ FIELD_LABELS.name }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.name" maxlength="100" @blur="onNameBlur" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.snm }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.snm" maxlength="30" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.cus_are }}</label>
          <div class="erp-form-control">
            <LookupPicker
              v-model="form.cus_are"
              preset="area"
              :data="selectableAreas"
              :display="areaName"
            />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.end_dd }}</label>
          <div class="erp-form-control">
            <el-date-picker v-model="form.end_dd" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.cnt_man1 }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.cnt_man1" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.cnt_man2 }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.cnt_man2" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.tel1 }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.tel1" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.tel2 }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.tel2" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.sal }}</label>
          <div class="erp-form-control">
            <LookupField
              :model-value="form.sal"
              :display="salBizName"
              @open="openSalPicker('sal')"
            />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.uni_no }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.uni_no" maxlength="20" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.biz_dsc }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.biz_dsc" maxlength="10" />
          </div>
        </div>
        <div class="erp-form-item erp-form-item--full">
          <label class="erp-form-label">{{ FIELD_LABELS.adr2 }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.adr2" type="textarea" :rows="2" />
          </div>
        </div>
      </div>
    </ErpFormSection>

    <ErpFormSection title="交易资料">
      <div class="erp-form-grid">
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.cur_id }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.cur_id" maxlength="4" placeholder="RMB" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.id1_tax }}</label>
          <div class="erp-form-control">
            <el-select v-model="form.id1_tax" style="width: 100%">
              <el-option v-for="o in TAX_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.sal_no }}</label>
          <div class="erp-form-control">
            <LookupField
              :model-value="form.sal_no"
              :display="salNoName"
              @open="openSalPicker('sal_no')"
            />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.bnk_name }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.bnk_name" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.id_code }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.id_code" maxlength="30" />
          </div>
        </div>
        <div class="erp-form-item erp-form-item--full">
          <label class="erp-form-label">{{ FIELD_LABELS.rem }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.rem" type="textarea" :rows="2" />
          </div>
        </div>
      </div>
    </ErpFormSection>
    <ErpArchiveExtFields v-model="form.ext_fields" :menu-code="FAS_CUST.menuCode" />
  </ErpEditDialog>

  <LookupDialog
    v-model="salPicker"
    v-bind="getLookupDialogProps('salm')"
    :data="(salms as unknown as Record<string, unknown>[])"
    @select="onSalSelect"
  />
</template>
