<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { api } from '@/api';
import type { PrintTemplate } from '@/api/types';
import { useErpUser } from '@/composables/useErpUser';

const props = defineProps<{
  modelValue: boolean;
  menuCode: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [boolean];
  select: [PrintTemplate];
}>();

const { user } = useErpUser();
const isAdmin = computed(() => user.value?.is_admin ?? false);

const templates = ref<PrintTemplate[]>([]);
const loading = ref(false);
const selected = ref<PrintTemplate | null>(null);
const editOpen = ref(false);
const editMode = ref<'add' | 'edit'>('add');
const editForm = ref({
  tpl_no: '',
  name: '',
  content: '',
  is_default: false,
  rem: '',
});

async function loadTemplates() {
  loading.value = true;
  try {
    const { data } = await api.printTemplates(props.menuCode);
    templates.value = data;
    if (selected.value) {
      selected.value = data.find((t) => t.tpl_no === selected.value!.tpl_no) ?? null;
    }
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } };
    ElMessage.error(err.response?.data?.error || '模板加载失败');
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      selected.value = null;
      loadTemplates();
    }
  }
);

function onRowClick(row: PrintTemplate) {
  selected.value = row;
}

function onRowDblclick(row: PrintTemplate) {
  selected.value = row;
  onPick();
}

function onPick() {
  if (!selected.value) {
    ElMessage.warning('请先选择模板');
    return;
  }
  emit('select', selected.value);
  emit('update:modelValue', false);
}

function openAdd() {
  if (!isAdmin.value) return;
  editMode.value = 'add';
  editForm.value = {
    tpl_no: '',
    name: '',
    content:
      '<div class="erp-print-doc"><h2 class="erp-print-title">{{title}}</h2><p class="erp-print-meta">打印时间：{{print_time}} · 共 {{row_count}} 行</p>{{table}}</div>',
    is_default: false,
    rem: '',
  };
  editOpen.value = true;
}

function openEdit() {
  if (!isAdmin.value || !selected.value) {
    ElMessage.warning('请先选择要编辑的模板');
    return;
  }
  editMode.value = 'edit';
  editForm.value = {
    tpl_no: selected.value.tpl_no,
    name: selected.value.name,
    content: selected.value.content,
    is_default: selected.value.is_default,
    rem: selected.value.rem ?? '',
  };
  editOpen.value = true;
}

async function saveEdit() {
  if (!editForm.value.tpl_no.trim() || !editForm.value.name.trim()) {
    ElMessage.warning('请填写模板代号和名称');
    return;
  }
  try {
    if (editMode.value === 'add') {
      await api.printTemplateCreate(props.menuCode, {
        tpl_no: editForm.value.tpl_no.trim(),
        name: editForm.value.name.trim(),
        content: editForm.value.content,
        is_default: editForm.value.is_default,
        rem: editForm.value.rem,
      });
      ElMessage.success('已新增模板');
    } else {
      await api.printTemplateUpdate(props.menuCode, editForm.value.tpl_no, {
        name: editForm.value.name.trim(),
        content: editForm.value.content,
        is_default: editForm.value.is_default,
        rem: editForm.value.rem,
      });
      ElMessage.success('已保存模板');
    }
    editOpen.value = false;
    await loadTemplates();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } };
    ElMessage.error(err.response?.data?.error || '保存失败');
  }
}

async function onDelete() {
  if (!isAdmin.value || !selected.value) {
    ElMessage.warning('请先选择要删除的模板');
    return;
  }
  try {
    await ElMessageBox.confirm(`确定删除模板「${selected.value.name}」？`, '删除模板', {
      type: 'warning',
    });
    await api.printTemplateDelete(props.menuCode, selected.value.tpl_no);
    ElMessage.success('已删除');
    selected.value = null;
    await loadTemplates();
  } catch {
    /* cancelled */
  }
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="打印模板"
    width="720px"
    class="kd-so-dialog erp-print-tpl-dialog"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="erp-print-tpl-toolbar">
      <el-button type="primary" :disabled="!isAdmin" @click="openAdd">新增</el-button>
      <el-button :disabled="!isAdmin || !selected" @click="onDelete">删除</el-button>
      <el-button :disabled="!isAdmin || !selected" @click="openEdit">编辑</el-button>
      <el-button type="primary" plain :disabled="!selected" @click="onPick">选取</el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="templates"
      size="small"
      border
      stripe
      highlight-current-row
      class="erp-print-tpl-table"
      max-height="360"
      @row-click="onRowClick"
      @row-dblclick="onRowDblclick"
    >
      <el-table-column prop="tpl_no" label="模板代号" width="140" />
      <el-table-column prop="name" label="模板名称" min-width="160" />
      <el-table-column label="默认" width="64" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.is_default" size="small" type="success">是</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="rem" label="备注" min-width="120" show-overflow-tooltip />
    </el-table>

    <el-dialog
      v-model="editOpen"
      :title="editMode === 'add' ? '新增模板' : '编辑模板'"
      width="560px"
      append-to-body
      destroy-on-close
      class="kd-so-dialog"
    >
      <el-form label-width="88px" @submit.prevent>
        <el-form-item label="模板代号" required>
          <el-input
            v-model="editForm.tpl_no"
            :disabled="editMode === 'edit'"
            placeholder="如 SO_DETAIL_STD"
          />
        </el-form-item>
        <el-form-item label="模板名称" required>
          <el-input v-model="editForm.name" placeholder="显示名称" />
        </el-form-item>
        <el-form-item label="设为默认">
          <el-checkbox v-model="editForm.is_default" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editForm.rem" />
        </el-form-item>
        <el-form-item label="模板内容">
          <el-input
            v-model="editForm.content"
            type="textarea"
            :rows="8"
            placeholder="HTML + 占位符，见下方说明"
          />
          <p v-pre class="erp-print-tpl-hint">
            {{title}} {{print_time}} {{row_count}} {{table}} {{doc_no}} {{qrcode_text}}
            {{qrcode}}（二维码图，内容同 doc_no / 首行单号）
          </p>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editOpen = false">取消</el-button>
        <el-button type="primary" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">关闭</el-button>
      <el-button type="primary" :disabled="!selected" @click="onPick">选取</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.erp-print-tpl-hint {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}
</style>
