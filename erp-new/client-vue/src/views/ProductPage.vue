<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import ErpBasePage from '@/components/erp/ErpBasePage.vue';
import ErpToolBar from '@/components/erp/ErpToolBar.vue';
import ErpCategoryTree from '@/components/erp/ErpCategoryTree.vue';
import ErpDetailGrid from '@/components/erp/ErpDetailGrid.vue';
import ErpEditDialog from '@/components/erp/ErpEditDialog.vue';
import ErpFormSection from '@/components/erp/ErpFormSection.vue';
import ErpArchiveExtFields from '@/components/erp/ErpArchiveExtFields.vue';
import ErpBillAuditMeta from '@/components/erp/ErpBillAuditMeta.vue';
import type { ErpCategoryTreeNode } from '@/components/erp/ErpCategoryTree.vue';
import {
  FAS_ECA,
  labelMap,
} from '@/config/fields';
import {
  isPrdtMaterialKnd,
  isPrdtTwIdReadonly,
  isPrdtTwIdVisible,
  PRDT_TW_ID_OPTIONS,
  PRDT_TW_ID_PURCHASE,
  PRDT_TW_ID_PURCHASE_LABEL,
} from '@/config/prdtTwId';
import LookupDialog from '@/components/LookupDialog.vue';
import { getLookupDialogProps } from '@/config/lookups';
import LookupField from '@/components/LookupField.vue';
import PrdtUtLookupDialog from '@/components/PrdtUtLookupDialog.vue';
import { api } from '@/api';
import type { Dept, Indx, IndxTreeNode, Product, Salm, Warehouse } from '@/api/types';
import {
  SUNLIKE_PRECISION,
  apiErrorMessage,
  archiveRowClass,
  collectIndxSubtreeIds,
  fmtText,
  isIndxLeaf,
  LOAD_FAIL_HINT,
  selectableIndxForProduct,
} from '@/utils/sunlike';
import { buildPrdtSavePayload } from '@/utils/prdtSavePayload';
import { exportRowsToExcel } from '@/utils/exportExcel';
const FIELD_LABELS = labelMap([...FAS_ECA.main, ...FAS_ECA.pic]);

const KND_OPTIONS = [
  { value: '1', label: '商品' },
  { value: '2', label: '制成品' },
  { value: '3', label: '半成品' },
  { value: '4', label: '原料' },
  { value: '5', label: '物料' },
  { value: '6', label: '下脚品' },
  { value: '7', label: '包装物' },
];

const showTwIdField = computed(() => isPrdtTwIdVisible(form.knd));
const showTwIdReadonly = computed(() => isPrdtTwIdReadonly(form.knd));
const utRequired = computed(() => isPrdtMaterialKnd(form.knd));

const kndLabel = computed(
  () => KND_OPTIONS.find((o) => o.value === form.knd)?.label || form.knd || '制成品'
);

const auditMeta = computed(() => ({
  usr: fmtText(form.usr),
  sys_date: fmtText(form.sys_date),
  chk_man: fmtText(form.chk_man),
  cls_date: fmtText(form.cls_date),
}));

const PREC = SUNLIKE_PRECISION;

const list = ref<Product[]>([]);
const loading = ref(false);
const saving = ref(false);
const loadError = ref('');
const indxs = ref<Indx[]>([]);
const rawIndxTree = ref<IndxTreeNode[]>([]);
const whs = ref<Warehouse[]>([]);
const depts = ref<Dept[]>([]);
const salms = ref<Salm[]>([]);

const dialogOpen = ref(false);
const treeKey = ref('__all__');
const editing = ref<string | null>(null);
const gridRef = ref<InstanceType<typeof ErpDetailGrid> | null>(null);
const formRef = ref<FormInstance>();
const idxPicker = ref(false);
const whPicker = ref(false);
const whLcPicker = ref(false);
const depPicker = ref(false);
const salPicker = ref(false);
const utPicker = ref(false);
/** 编辑载入期间不响应 idx1 联动，避免覆盖已存大类/加工方式 */
const idx1WatchEnabled = ref(false);

const form = reactive<Product>({ prd_no: '', idx1: '', knd: '2', name: '', ext_fields: {} });

const formRules = computed<FormRules>(() => ({
  idx1: [{ required: true, message: '请选择中类代号', trigger: 'change' }],
  name: [{ required: true, message: '请填写名称', trigger: 'blur' }],
  ut: [
    {
      validator: (_rule, value, callback) => {
        if (utRequired.value && !fmtText(String(value ?? ''))) {
          callback(new Error('请选择主单位'));
        } else {
          callback();
        }
      },
      trigger: 'change',
    },
  ],
}));

function applyKndSideEffects(knd: string) {
  if (isPrdtMaterialKnd(knd)) {
    form.tw_id = PRDT_TW_ID_PURCHASE;
  } else if (isPrdtTwIdVisible(knd)) {
    form.tw_id = '2';
  } else {
    form.tw_id = '';
  }
}

async function applyIdx1Knd(idxNo: string) {
  const code = fmtText(idxNo);
  if (!code) return;
  try {
    const { data } = await api.indxKnd(code);
    form.knd = data.knd || '2';
  } catch {
    form.knd = '2';
  }
  applyKndSideEffects(form.knd);
}

/** 列表数据：左侧树（含下级中类）筛选 */
const displayList = computed(() => {
  if (!treeKey.value || treeKey.value === '__all__') return list.value;
  const ids = collectIndxSubtreeIds(indxs.value, treeKey.value);
  return list.value.filter((r) => r.idx1 && ids.has(r.idx1));
});

const gridRows = computed(() =>
  displayList.value.map((row) => ({ ...row }) as Record<string, unknown>)
);

function mapTreeNodes(nodes: IndxTreeNode[]): ErpCategoryTreeNode[] {
  return nodes.map((n) => ({
    id: n.idx_no,
    label: n.title || `${n.idx_no} ${n.name || ''}`.trim(),
    children: n.children?.length ? mapTreeNodes(n.children) : undefined,
  }));
}

const treeData = computed<ErpCategoryTreeNode[]>(() => [
  { id: '__all__', label: '全部分类', children: mapTreeNodes(rawIndxTree.value) },
]);

const activeIndxs = computed(() => selectableIndxForProduct(indxs.value));

function normalizeProduct(data: Product): Product {
  return {
    ...data,
    prd_no: fmtText(data.prd_no),
    idx1: fmtText(data.idx1),
    idx2: fmtText(data.idx2),
    knd: fmtText(data.knd) || '2',
    name: fmtText(data.name),
    snm: fmtText(data.snm),
    spc: fmtText(data.spc),
    ut: fmtText(data.ut),
    ut1: fmtText(data.ut1),
    wh: fmtText(data.wh),
    wh_lc: fmtText(data.wh_lc),
    use_prdmark: fmtText(data.use_prdmark),
    tw_id: fmtText(data.tw_id),
    nouse_dd: fmtText(data.nouse_dd),
    usr: fmtText(data.usr),
    chk_man: fmtText(data.chk_man),
    cls_date: fmtText(data.cls_date),
    rem: fmtText(data.rem),
    dep: fmtText(data.dep),
    sal_no: fmtText(data.sal_no),
    pic: fmtText(data.pic),
    cadimg: fmtText(data.cadimg),
    sys_date: fmtText(data.sys_date),
    upr: data.upr ?? 0,
    up_sal: data.up_sal ?? 0,
    qty_min: data.qty_min ?? 0,
    qty_low: data.qty_low ?? 0,
    valid_days: data.valid_days ?? 0,
    qty_min1: data.qty_min1 ?? 0,
    qty_max: data.qty_max ?? 0,
  };
}

function gridRowClassName({ row }: { row: Record<string, unknown>; rowIndex: number }) {
  const p = row as unknown as Product;
  return archiveRowClass({ stop_dd: p.nouse_dd });
}

function resetForm() {
  Object.assign(form, {
    prd_no: '',
    idx1: '',
    idx2: '',
    knd: '2',
    name: '',
    snm: '',
    spc: '',
    ut: '',
    ut1: '',
    upr: 0,
    up_sal: 0,
    use_prdmark: '',
    tw_id: '',
    wh: '',
    wh_lc: '',
    qty_min: 0,
    qty_low: 0,
    valid_days: 0,
    qty_min1: 0,
    qty_max: 0,
    nouse_dd: '',
    usr: '',
    chk_man: '',
    cls_date: '',
    rem: '',
    dep: '',
    sal_no: '',
    pic: '',
    cadimg: '',
    ext_fields: {},
  });
  editing.value = null;
}

async function loadMasters() {
  const [i, tree, w, d, s] = await Promise.all([
    api.indxList(),
    api.indxTree(),
    api.warehouses(),
    api.deptList(),
    api.salmList(),
  ]);
  indxs.value = i.data.filter((x) => x.idx_no !== '0000000000');
  rawIndxTree.value = tree.data;
  whs.value = w.data;
  depts.value = d.data;
  salms.value = s.data;
}

async function loadList() {
  loading.value = true;
  loadError.value = '';
  try {
    const { data } = await api.productList({ limit: 5000 });
    list.value = data;
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

function onExport() {
  const data = gridRef.value?.getExportData();
  if (!data?.rows.length) {
    ElMessage.warning('没有可导出的数据');
    return;
  }
  exportRowsToExcel(data);
  ElMessage.success('已开始导出 Excel');
}

async function onAdd() {
  idx1WatchEnabled.value = false;
  resetForm();
  dialogOpen.value = true;
  await nextTick();
  idx1WatchEnabled.value = true;
  if (treeKey.value && treeKey.value !== '__all__' && isIndxLeaf(indxs.value, treeKey.value)) {
    form.idx1 = treeKey.value;
  }
}

async function onEditRow(row: Record<string, unknown>) {
  await onEdit({ prd_no: String(row.prd_no ?? '') } as Product);
}

async function onEdit(row: Product) {
  idx1WatchEnabled.value = false;
  const { data } = await api.getProduct(row.prd_no);
  Object.assign(form, normalizeProduct(data));
  editing.value = row.prd_no;
  dialogOpen.value = true;
  await nextTick();
  idx1WatchEnabled.value = true;
}

async function onIdx1Pick(idx: { idx_no: string }) {
  form.idx1 = idx.idx_no;
  idxPicker.value = false;
  await nextTick();
  formRef.value?.validateField('idx1').catch(() => undefined);
}

async function uploadPic(file: File) {
  const { data } = await api.uploadFile(file);
  form.pic = data.path;
}

async function uploadCad(file: File) {
  const { data } = await api.uploadFile(file);
  form.cadimg = data.path;
  ElMessage.success(`已上传: ${data.filename}`);
}

watch(
  () => form.idx1,
  async (idxNo, prev) => {
    if (!idx1WatchEnabled.value) return;
    const v = fmtText(idxNo);
    const p = fmtText(prev);
    if (!v || v === p) return;
    await applyIdx1Knd(v);
    if (!editing.value) {
      try {
        const { data } = await api.nextPrdNo(v, form.idx2);
        form.prd_no = data.prd_no;
      } catch {
        ElMessage.warning('无法生成流水号');
      }
    }
  }
);

watch(dialogOpen, (open) => {
  if (!open) {
    idx1WatchEnabled.value = false;
    formRef.value?.clearValidate();
  }
});

async function onSave() {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
  } catch {
    return;
  }
  if (!isIndxLeaf(indxs.value, form.idx1)) {
    ElMessage.warning('请选择末阶中类');
    return;
  }
  saving.value = true;
  try {
    const payload = buildPrdtSavePayload(normalizeProduct({ ...form }), !editing.value);
    if (editing.value) {
      await api.updateProduct(editing.value, payload);
      ElMessage.success('存盘成功');
    } else {
      await api.createProduct(payload);
      ElMessage.success('存盘成功');
    }
    dialogOpen.value = false;
    await loadList();
  } catch (e: unknown) {
    ElMessage.error(apiErrorMessage(e, '存盘失败'));
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  try {
    await loadMasters();
    await loadList();
  } catch (e: unknown) {
    loadError.value = apiErrorMessage(e, LOAD_FAIL_HINT);
    ElMessage.error(loadError.value);
  }
});
</script>

<template>
  <ErpBasePage title="货品" hide-head>
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
        menu-code="FasECA"
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
    :title="editing ? '编辑货品' : '新增货品'"
    :saving="saving"
    @save="onSave"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="formRules"
      label-width="0"
      class="erp-edit-form"
      @submit.prevent
    >
    <ErpFormSection title="基础信息">
      <div class="erp-form-grid erp-form-grid--3">
        <div class="erp-form-item">
          <label class="erp-form-label"><span class="req">*</span>{{ FIELD_LABELS.idx1 }}</label>
          <div class="erp-form-control">
            <el-form-item prop="idx1">
              <LookupField
                :model-value="form.idx1"
                :display="indxs.find((i) => i.idx_no === form.idx1)?.name"
                placeholder="开窗选择"
                @open="idxPicker = true"
              />
            </el-form-item>
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.knd }}</label>
          <div class="erp-form-control">
            <el-input :model-value="kndLabel" readonly placeholder="选中类自动带出" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">
            <span v-if="utRequired" class="req">*</span>{{ FIELD_LABELS.ut }}
          </label>
          <div class="erp-form-control">
            <el-form-item prop="ut">
              <LookupField
                :model-value="form.ut"
                :display="form.ut"
                placeholder="开窗选择"
                @open="utPicker = true"
              />
            </el-form-item>
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.ut1 }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.ut1" placeholder="如 PCS、KG" maxlength="8" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.use_prdmark }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.use_prdmark" maxlength="1" placeholder="请输入特性码" />
          </div>
        </div>
        <div v-if="showTwIdField" class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.tw_id }}</label>
          <div class="erp-form-control">
            <el-select v-model="form.tw_id" clearable placeholder="请选择加工方式" style="width: 100%">
              <el-option v-for="o in PRDT_TW_ID_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </div>
        </div>
        <div v-else-if="showTwIdReadonly" class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.tw_id }}</label>
          <div class="erp-form-control">
            <el-input :model-value="PRDT_TW_ID_PURCHASE_LABEL" readonly />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label"><span class="req">*</span>{{ FIELD_LABELS.prd_no }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.prd_no" readonly placeholder="依中类自动生成" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label"><span class="req">*</span>{{ FIELD_LABELS.name }}</label>
          <div class="erp-form-control">
            <el-form-item prop="name">
              <el-input v-model="form.name" placeholder="请输入名称" maxlength="100" />
            </el-form-item>
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.spc }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.spc" placeholder="请输入规格" maxlength="200" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.snm }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.snm" placeholder="请输入简称" maxlength="20" />
          </div>
        </div>
      </div>
    </ErpFormSection>

    <ErpFormSection title="价格与库存">
      <div class="erp-form-grid erp-form-grid--3">
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.upr }}</label>
          <div class="erp-form-control">
            <el-input-number
              v-model="form.upr"
              :min="0"
              :step="0.0001"
              :precision="PREC.price"
              controls-position="right"
              style="width: 100%"
            />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.up_sal }}</label>
          <div class="erp-form-control">
            <el-input-number
              v-model="form.up_sal"
              :min="0"
              :step="0.0001"
              :precision="PREC.price"
              controls-position="right"
              style="width: 100%"
            />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.wh }}</label>
          <div class="erp-form-control">
            <LookupField
              :model-value="form.wh"
              :display="whs.find((w) => w.wh === form.wh)?.name || form.wh"
              placeholder="开窗选择"
              @open="whPicker = true"
            />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.wh_lc }}</label>
          <div class="erp-form-control">
            <LookupField
              :model-value="form.wh_lc"
              :display="whs.find((w) => w.wh === form.wh_lc)?.name || form.wh_lc"
              placeholder="开窗选择"
              @open="whLcPicker = true"
            />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.qty_min }}</label>
          <div class="erp-form-control">
            <el-input-number
              v-model="form.qty_min"
              :min="0"
              :precision="PREC.qty"
              controls-position="right"
              style="width: 100%"
            />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.qty_low }}</label>
          <div class="erp-form-control">
            <el-input-number
              v-model="form.qty_low"
              :min="0"
              :precision="PREC.qty"
              controls-position="right"
              style="width: 100%"
            />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.valid_days }}</label>
          <div class="erp-form-control">
            <el-input-number
              v-model="form.valid_days"
              :min="0"
              :precision="0"
              controls-position="right"
              style="width: 100%"
            />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.qty_min1 }}</label>
          <div class="erp-form-control">
            <el-input-number
              v-model="form.qty_min1"
              :min="0"
              :precision="PREC.qty"
              controls-position="right"
              style="width: 100%"
            />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.qty_max }}</label>
          <div class="erp-form-control">
            <el-input-number
              v-model="form.qty_max"
              :min="0"
              :precision="PREC.qty"
              controls-position="right"
              style="width: 100%"
            />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.nouse_dd }}</label>
          <div class="erp-form-control">
            <el-date-picker
              v-model="form.nouse_dd"
              type="date"
              value-format="YYYY-MM-DD"
              clearable
              placeholder="选择停用日期"
              style="width: 100%"
            />
          </div>
        </div>
      </div>
    </ErpFormSection>

    <ErpFormSection title="其他">
      <div class="erp-form-grid erp-form-grid--3">
        <div class="erp-form-item erp-form-item--full">
          <label class="erp-form-label">{{ FIELD_LABELS.rem }}</label>
          <div class="erp-form-control">
            <el-input v-model="form.rem" type="textarea" :rows="2" placeholder="请输入摘要" maxlength="100" />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.dep }}</label>
          <div class="erp-form-control">
            <LookupField
              :model-value="form.dep"
              :display="depts.find((d) => d.dep === form.dep)?.name"
              placeholder="开窗选择"
              @open="depPicker = true"
            />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.sal_no }}</label>
          <div class="erp-form-control">
            <LookupField
              :model-value="form.sal_no"
              :display="salms.find((s) => s.sal_no === form.sal_no)?.name"
              placeholder="开窗选择"
              @open="salPicker = true"
            />
          </div>
        </div>
      </div>
    </ErpFormSection>

    <ErpFormSection title="附件">
      <div class="erp-form-grid erp-form-grid--3">
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.pic }}</label>
          <div class="erp-form-control">
            <div class="erp-upload-box" @dblclick="($refs.picInput as HTMLInputElement)?.click()">
              <img v-if="form.pic" :src="form.pic" alt="图片" class="erp-upload-preview" />
              <span v-else class="erp-upload-hint">双击上传</span>
            </div>
            <input
              ref="picInput"
              type="file"
              accept="image/*"
              hidden
              @change="(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) uploadPic(f); }"
            />
          </div>
        </div>
        <div class="erp-form-item">
          <label class="erp-form-label">{{ FIELD_LABELS.cadimg }}</label>
          <div class="erp-form-control">
            <el-button class="erp-btn-default" @click="($refs.cadInput as HTMLInputElement)?.click()">上传 CAD</el-button>
            <div v-if="form.cadimg" class="erp-upload-link">
              <a :href="form.cadimg" target="_blank" rel="noreferrer">查看已上传文件</a>
            </div>
            <input
              ref="cadInput"
              type="file"
              hidden
              @change="(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) uploadCad(f); }"
            />
          </div>
        </div>
      </div>
    </ErpFormSection>
    <ErpFormSection title="制单审核">
      <ErpBillAuditMeta :meta="auditMeta" />
    </ErpFormSection>
    <ErpArchiveExtFields v-model="form.ext_fields" :menu-code="FAS_ECA.menuCode" />
    </el-form>
  </ErpEditDialog>

  <LookupDialog
    v-model="idxPicker"
    v-bind="getLookupDialogProps('indx')"
    :data="(activeIndxs as unknown as Record<string, unknown>[])"
    @select="onIdx1Pick"
  />
  <LookupDialog
    v-model="whPicker"
    v-bind="getLookupDialogProps('warehouse')"
    :data="(whs as unknown as Record<string, unknown>[])"
    @select="(r: Warehouse) => { form.wh = r.wh; }"
  />
  <LookupDialog
    v-model="whLcPicker"
    v-bind="getLookupDialogProps('warehouse', { title: '选择余料仓库' })"
    :data="(whs as unknown as Record<string, unknown>[])"
    @select="(r: Warehouse) => { form.wh_lc = r.wh; }"
  />
  <LookupDialog
    v-model="depPicker"
    v-bind="getLookupDialogProps('dept')"
    :data="(depts as unknown as Record<string, unknown>[])"
    @select="(r: Dept) => { form.dep = r.dep; }"
  />
  <LookupDialog
    v-model="salPicker"
    v-bind="getLookupDialogProps('salm', { title: '选择采购员' })"
    :data="(salms as unknown as Record<string, unknown>[])"
    @select="(r: Salm) => { form.sal_no = r.sal_no; }"
  />
  <PrdtUtLookupDialog
    v-model="utPicker"
    @select="(r) => { form.ut = r.ut; nextTick(() => formRef?.validateField('ut').catch(() => undefined)); }"
  />
</template>
