<script setup lang="ts">
import { ref } from 'vue';
import LookupDialog from '@/components/LookupDialog.vue';
import BilSpcEditDialog from '@/components/BilSpcEditDialog.vue';
import { getLookupDialogProps } from '@/config/lookups';
import type { BilSpc } from '@/api/types';

const dialogProps = getLookupDialogProps('bilSpcSales');

defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [boolean];
  select: [BilSpc];
}>();

const editOpen = ref(false);
const lookupRef = ref<InstanceType<typeof LookupDialog> | null>(null);

function onEditSaved() {
  editOpen.value = false;
  lookupRef.value?.reload();
}
</script>

<template>
  <LookupDialog
    ref="lookupRef"
    v-bind="dialogProps"
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    @select="(row) => emit('select', row as unknown as BilSpc)"
  >
    <template #footer-before>
      <el-button @click="editOpen = true">编辑</el-button>
    </template>
  </LookupDialog>

  <BilSpcEditDialog v-model="editOpen" @saved="onEditSaved" />
</template>
