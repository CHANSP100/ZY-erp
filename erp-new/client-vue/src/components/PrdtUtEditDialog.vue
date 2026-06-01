<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { api } from '@/api';
import type { PrdtUt } from '@/api/types';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [boolean];
  saved: [PrdtUt[]];
}>();

type EditRow = { key: string; ut: string; isNew: boolean };

const loading = ref(false);
const saving = ref(false);
const rows = ref<EditRow[]>([]);
let keySeq = 0;

function newRow(ut = ''): EditRow {
  keySeq += 1;
  return { key: `r${keySeq}`, ut, isNew: true };
}

async function loadRows() {
  loading.value = true;
  try {
    const { data } = await api.prdtUtList();
    rows.value = data.map((r) => ({ key: `e-${r.ut}`, ut: r.ut, isNew: false }));
    if (!rows.value.length) rows.value.push(newRow());
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } };
    ElMessage.error(err.response?.data?.error || '单位加载失败');
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

async function onSave() {
  const toSave = rows.value.map((r) => r.ut.trim()).filter(Boolean);
  if (!toSave.length) {
    ElMessage.warning('请至少填写一个单位');
    return;
  }
  saving.value = true;
  try {
    const { data } = await api.prdtUtBatchSave({ rows: toSave.map((ut) => ({ ut })) });
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
    title="单位维护"
    width="480px"
    append-to-body
    destroy-on-close
    class="kd-so-dialog"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="prdt-ut-edit-toolbar">
      <el-button type="primary" @click="onAdd">新增</el-button>
    </div>
    <el-table v-loading="loading" :data="rows" size="small" border stripe max-height="360">
      <el-table-column label="单位" min-width="200">
        <template #default="{ row }">
          <el-input v-model="row.ut" maxlength="8" placeholder="单位名称" />
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
.prdt-ut-edit-toolbar {
  margin-bottom: 8px;
}
</style>
