<script setup lang="ts">
/** 金蝶云星空 — 编辑弹窗（宽 800px，底部按钮右对齐） */
withDefaults(
  defineProps<{
    title: string;
    saving?: boolean;
    width?: string;
  }>(),
  { width: '980px' }
);

const open = defineModel<boolean>({ required: true });

defineEmits<{
  save: [];
}>();
</script>

<template>
  <el-dialog
    v-model="open"
    class="erp-edit-dialog"
    :title="title"
    :width="width"
    destroy-on-close
    align-center
    :close-on-click-modal="false"
  >
    <slot />
    <template #footer>
      <div class="erp-dialog-footer">
        <el-button class="erp-btn-default" @click="open = false">取消</el-button>
        <el-button type="primary" class="erp-btn-primary" :loading="saving" @click="$emit('save')">存盘</el-button>
      </div>
    </template>
  </el-dialog>
</template>
