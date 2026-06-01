<script setup lang="ts">
/** 单据编辑弹窗：表头 + 表身 + 合计，对标金蝶云星空单据录入 */
withDefaults(
  defineProps<{
    title: string;
    saving?: boolean;
    width?: string;
  }>(),
  { width: '960px' }
);

const open = defineModel<boolean>({ required: true });

defineEmits<{
  save: [];
}>();
</script>

<template>
  <el-dialog
    v-model="open"
    class="erp-bill-edit-dialog"
    :title="title"
    :width="width"
    destroy-on-close
    align-center
    :close-on-click-modal="false"
  >
    <div v-if="$slots.toolbar" class="erp-bill-edit-toolbar">
      <slot name="toolbar" />
    </div>
    <div v-if="$slots.header" class="erp-bill-edit-header">
      <slot name="header" />
    </div>
    <div v-if="$slots.lines" class="erp-bill-edit-lines">
      <slot name="lines" />
    </div>
    <div v-if="$slots.totals" class="erp-bill-edit-totals">
      <slot name="totals" />
    </div>

    <template #footer>
      <div class="erp-dialog-footer">
        <el-button @click="open = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="$emit('save')">存盘</el-button>
      </div>
    </template>
  </el-dialog>
</template>
