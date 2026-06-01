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
import { FAS_SALM, labelMap } from '@/config/fields';
import LookupDialog from '@/components/LookupDialog.vue';
import { getLookupDialogProps } from '@/config/lookups';
import LookupField from '@/components/LookupField.vue';
import { api } from '@/api';
import type { Dept, DeptTreeNode, Salm } from '@/api/types';
import {
  apiErrorMessage,
  archiveRowClass,
  collectDeptSubtreeIds,
  fmtText,
  isValidSalmParent,
  LOAD_FAIL_HINT,
  selectableSalmParents,
} from '@/utils/sunlike';
import { buildArchiveSavePayload } from '@/utils/billExtPayload';
import { exportRowsToExcel } from '@/utils/exportExcel';

const DEP_EMPTY_KEY = '__empty__';

const SEX_OPTIONS = [
  { value: 'T', label: '男' },
  { value: 'F', label: '女' },
];

const FIELD_LABELS = labelMap(FAS_SALM.main);

const rawTree = ref<DeptTreeNode[]>([]);
const list = ref<Salm[]>([]);
const depts = ref<Dept[]>([]);
const loading = ref(false);
const saving = ref(false);
const loadError = ref('');
const treeKey = ref('__all__');
const dialogOpen = ref(false);
const editing = ref<string | null>(null);
const gridRef = ref<InstanceType<typeof ErpDetailGrid> | null>(null);
const deptPicker = ref(false);
const upSalPicker = ref(false);

const form = reactive<Salm>({ sal_no: '', name: '', ext_fields: {} });

const depName = computed(() => depts.value.find((d) => d.dep === form.dep)?.name || '');
const upSalName = computed(() => list.value.find((s) => s.sal_no === form.up_sal_no)?.name || '');
const parentCandidates = computed(() => selectableSalmParents(list.value, editing.value));

function mapTreeNodes(nodes: DeptTreeNode[]): ErpCategoryTreeNode[] {
  return nodes.map((n) => ({
    id: n.dep,
    label: n.title || `${n.dep} ${n.name || ''}`.trim(),
    children: n.children?.length ? mapTreeNodes(n.children) : undefined,
  }));
}

const treeData = computed<ErpCategoryTreeNode[]>(() => {
  const children = mapTreeNodes(rawTree.value);
  if (list.value.some((r) => !fmtText(r.dep))) {
    children.push({ id: DEP_EMPTY_KEY, label: '未分部门' });
  }
  return [{ id: '__all__', label: '全部部门', children }];
});

const filteredList = computed(() => {
  if (!treeKey.value || treeKey.value === '__all__') return list.value;
  if (treeKey.value === DEP_EMPTY_KEY) {
    return list.value.filter((r) => !fmtText(r.dep));
  }
  const ids = collectDeptSubtreeIds(depts.value, treeKey.value);
  return list.value.filter((r) => ids.has(fmtText(r.dep)));
});

const gridRows = computed(() =>
  filteredList.value.map((row) => ({ ...row }) as Record<string, unknown>)
);

function gridRowClassName({ row }: { row: Record<string, unknown>; rowIndex: number }) {
  return archiveRowClass(row as unknown as Salm);
}

function resetForm() {
  Object.assign(form, {
    sal_no: '',
    name: '',
    sex: '',
    eng_name: '',
    name_py: '',
    pos: '',
    dep: '',
    up_sal_no: '',
    tel1: '',
    tel2: '',
    e_mail: '',
    con_adr: '',
    id_num: '',
    bth: '',
    dut_in_d: '',
    dut_ot_d: '',
    rem: '',
    ext_fields: {},
  });
  editing.value = null;
}

async function loadAll() {
  loading.value = true;
  loadError.value = '';
  try {
    const [t, s, d] = await Promise.all([
      api.deptTree(),
      api.salmList({ limit: 5000 }),
      api.deptList(),
    ]);
    rawTree.value = t.data;
    list.value = s.data;
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
  if (treeKey.value && treeKey.value !== '__all__' && treeKey.value !== DEP_EMPTY_KEY) {
    form.dep = treeKey.value;
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
  await onEdit({ sal_no: String(row.sal_no ?? '') } as Salm);
}

async function onEdit(row: Salm) {
  const { data } = await api.getSalm(row.sal_no);
  Object.assign(form, {
    sal_no: fmtText(data.sal_no),
    name: fmtText(data.name),
    sex: fmtText(data.sex),
    eng_name: fmtText(data.eng_name),
    name_py: fmtText(data.name_py),
    pos: fmtText(data.pos),
    dep: fmtText(data.dep),
    up_sal_no: fmtText(data.up_sal_no),
    tel1: fmtText(data.tel1),
    tel2: fmtText(data.tel2),
    e_mail: fmtText(data.e_mail),
    con_adr: fmtText(data.con_adr),
    id_num: fmtText(data.id_num),
    bth: fmtText(data.bth),
    dut_in_d: fmtText(data.dut_in_d),
    dut_ot_d: fmtText(data.dut_ot_d),
    rem: fmtText(data.rem),
    ext_fields: data.ext_fields ?? {},
  });
  editing.value = row.sal_no;
  dialogOpen.value = true;
}

function onUpSalPick(row: Pick<Salm, 'sal_no'>) {
  if (!isValidSalmParent(list.value, editing.value, row.sal_no)) {
    ElMessage.warning('不能选择自身或下级员工作为上级');
    return;
  }
  form.up_sal_no = row.sal_no;
  upSalPicker.value = false;
}

async function onSave() {
  const salNo = form.sal_no?.trim();
  const name = form.name?.trim();
  if (!salNo) {
    ElMessage.warning('请填写员工代号');
    return;
  }
  if (!name) {
    ElMessage.warning('请填写名称');
    return;
  }
  const upSal = form.up_sal_no?.trim() || undefined;
  if (!isValidSalmParent(list.value, editing.value, upSal)) {
    ElMessage.warning('上级业务不能为自身或下级，请重新选择');
    return;
  }
  saving.value = true;
  try {
    const payload = buildArchiveSavePayload({
      sal_no: salNo,
      name,
      sex: form.sex?.trim() || undefined,
      eng_name: form.eng_name?.trim() || undefined,
      name_py: form.name_py?.trim() || undefined,
      pos: form.pos?.trim() || undefined,
      dep: form.dep?.trim() || undefined,
      up_sal_no: upSal,
      tel1: form.tel1?.trim() || undefined,
      tel2: form.tel2?.trim() || undefined,
      e_mail: form.e_mail?.trim() || undefined,
      con_adr: form.con_adr?.trim() || undefined,
      id_num: form.id_num?.trim() || undefined,
      bth: form.bth?.trim() || undefined,
      dut_in_d: form.dut_in_d?.trim() || undefined,
      dut_ot_d: form.dut_ot_d?.trim() || undefined,
      rem: form.rem?.trim() || undefined,
      ext_fields: form.ext_fields,
    });
    if (editing.value) {
      await api.updateSalm(editing.value, payload);
      ElMessage.success('存盘成功');
    } else {
      await api.createSalm(payload);
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
  <ErpBasePage title="员工资料" hide-head>
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
        menu-code="FasEB"
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
    :title="editing ? '编辑员工' : '新增员工'"
    :saving="saving"
    width="880px"
    @save="onSave"
  >
    <ErpFormSection title="基本资料">
      <div class="erp-form-grid">
        <div class="erp-form-item">
          <label class="erp-form-label"><span class="req">*</span>{{ FIELD_LABELS.sal_no }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.sal_no" :readonly="!!editing" maxlength="12" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label"><span class="req">*</span>{{ FIELD_LABELS.name }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.name" maxlength="50" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.sex }}</label>
          <div class="erp-form-control">
            <el-select v-model="form.sex" clearable style="width: 100%">
              <el-option v-for="o in SEX_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.eng_name }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.eng_name" maxlength="40" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.name_py }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.name_py" maxlength="50" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.pos }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.pos" maxlength="20" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.dep }}</label>
          <div class="erp-form-control">
            <LookupField :model-value="form.dep" :display="depName" @open="deptPicker = true" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.up_sal_no }}</label>
          <div class="erp-form-control">
            <LookupField :model-value="form.up_sal_no" :display="upSalName" @open="upSalPicker = true" />
          </div>
        </div>
      </div>
    </ErpFormSection>

    <ErpFormSection title="联络与任职">
      <div class="erp-form-grid">
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.tel1 }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.tel1" maxlength="20" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.tel2 }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.tel2" maxlength="20" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.e_mail }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.e_mail" maxlength="50" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.id_num }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.id_num" maxlength="20" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.bth }}</label>
          <div class="erp-form-control">
            <el-date-picker v-model="form.bth" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.dut_in_d }}</label>
          <div class="erp-form-control">
            <el-date-picker v-model="form.dut_in_d" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.dut_ot_d }}</label>
          <div class="erp-form-control">
            <el-date-picker v-model="form.dut_ot_d" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
          </div>
        </div>
        <div class="erp-form-item erp-form-item--full">
          <label class="erp-form-label">{{ FIELD_LABELS.con_adr }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.con_adr" maxlength="120" />
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
    <ErpArchiveExtFields v-model="form.ext_fields" :menu-code="FAS_SALM.menuCode" />
  </ErpEditDialog>

  <LookupDialog
    v-model="deptPicker"
    v-bind="getLookupDialogProps('dept')"
    :data="(depts as unknown as Record<string, unknown>[])"
    @select="(r: Dept) => { form.dep = r.dep; }"
  />

  <LookupDialog
    v-model="upSalPicker"
    v-bind="getLookupDialogProps('salm', { title: '选择上级业务' })"
    :data="(parentCandidates as unknown as Record<string, unknown>[])"
    @select="onUpSalPick"
  />
</template>
