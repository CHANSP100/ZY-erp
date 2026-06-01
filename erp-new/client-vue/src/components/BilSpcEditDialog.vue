<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { api } from '@/api';
import type { BilSpc } from '@/api/types';

const props = defineProps<{
  modelValue: boolean;
  bilId?: string;
  spcId?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [boolean];
  saved: [BilSpc[]];
}>();

type EditRow = {
  key: string;
  spc_no: string;
  name: string;
  rem: string;
  isNew: boolean;
};

const loading = ref(false);
const saving = ref(false);
const rows = ref<EditRow[]>([]);
const selectedKeys = ref<string[]>([]);
const pendingDelete = ref<string[]>([]);
let keySeq = 0;

function newRow(spcNo = '', name = '', rem = ''): EditRow {
  keySeq += 1;
  return { key: `n${keySeq}`, spc_no: spcNo, name, rem, isNew: true };
}

async function loadRows() {
  loading.value = true;
  pendingDelete.value = [];
  selectedKeys.value = [];
  try {
    const { data } = await api.bilSpcList({
      bil_id: props.bilId ?? 'SA',
      spc_id: props.spcId ?? 'OB',
    });
    rows.value = data.map((r) => ({
      key: `e-${r.spc_no}`,
      spc_no: r.spc_no,
      name: r.name ?? '',
      rem: r.rem ?? '',
      isNew: false,
    }));
    if (!rows.value.length) rows.value.push(newRow());
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } };
    ElMessage.error(err.response?.data?.error || '单据类别加载失败');
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) loadRows();
  }
);

function onAdd() {
  rows.value.push(newRow());
}

function onDelete() {
  if (!selectedKeys.value.length) {
    ElMessage.warning('请先选择要删除的行');
    return;
  }
  const keys = new Set(selectedKeys.value);
  for (const row of rows.value) {
    if (keys.has(row.key) && !row.isNew) {
      pendingDelete.value.push(row.spc_no);
    }
  }
  rows.value = rows.value.filter((r) => !keys.has(r.key));
  selectedKeys.value = [];
  if (!rows.value.length) rows.value.push(newRow());
}

function onSelectionChange(sel: EditRow[]) {
  selectedKeys.value = sel.map((r) => r.key);
}

async function onSave() {
  const upserts = rows.value
    .map((r) => ({
      spc_no: r.spc_no.trim(),
      name: (r.name || r.spc_no).trim(),
      rem: r.rem.trim(),
    }))
    .filter((r) => r.spc_no !== '');

  if (!upserts.length && !pendingDelete.value.length) {
    ElMessage.warning('请至少维护一条单据类别');
    return;
  }

  saving.value = true;
  try {
    const { data } = await api.bilSpcBatchSave({
      bil_id: props.bilId ?? 'SA',
      spc_id: props.spcId ?? 'OB',
      rows: upserts,
      deleted: [...new Set(pendingDelete.value)],
    });
    ElMessage.success('保存成功');
    emit('saved', data);
    emit('update:modelValue', false);
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } };
    ElMessage.error(err.response?.data?.error || '保存失败');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="单据类别维护"
    width="640px"
    append-to-body
    destroy-on-close
    class="kd-so-dialog"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="bil-spc-edit-toolbar">
      <el-button type="primary" @click="onAdd">新增</el-button>
      <el-button @click="onDelete">删除</el-button>
    </div>
    <el-table
      v-loading="loading"
      :data="rows"
      size="small"
      border
      stripe
      max-height="360"
      @selection-change="onSelectionChange"
    >
      <el-table-column type="selection" width="40" />
      <el-table-column label="代号" width="120">
        <template #default="{ row }">
          <el-input
            v-model="row.spc_no"
            maxlength="12"
            placeholder="代号"
            :disabled="!row.isNew"
          />
        </template>
      </el-table-column>
      <el-table-column label="名称" min-width="160">
        <template #default="{ row }">
          <el-input v-model="row.name" maxlength="100" placeholder="名称" />
        </template>
      </el-table-column>
      <el-table-column label="备注" min-width="160">
        <template #default="{ row }">
          <el-input v-model="row.rem" maxlength="100" placeholder="备注" />
        </template>
      </el-table-column>
    </el-table>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="onSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.bil-spc-edit-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
</style>
