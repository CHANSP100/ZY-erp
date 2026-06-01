<script setup lang="ts">
/**
 * 货品主单位开窗（含弹窗内「编辑」）。
 * 新页面推荐直接用 LookupPicker preset="prdtUt" + #dialog-footer-before 插槽。
 */
import { ref } from 'vue';
import LookupDialog from '@/components/LookupDialog.vue';
import PrdtUtEditDialog from '@/components/PrdtUtEditDialog.vue';
import { getLookupDialogProps } from '@/config/lookups';
import type { PrdtUt } from '@/api/types';

const dialogProps = getLookupDialogProps('prdtUt');

defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [boolean];
  select: [PrdtUt];
}>();

const editOpen = ref(false);

function onEditSaved() {
  editOpen.value = false;
}
</script>

<template>
  <LookupDialog
    v-bind="dialogProps"
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    @select="(row) => emit('select', row as unknown as PrdtUt)"
  >
    <template #footer-before>
      <el-button @click="editOpen = true">编辑</el-button>
    </template>
  </LookupDialog>

  <PrdtUtEditDialog v-model="editOpen" @saved="onEditSaved" />
</template>
