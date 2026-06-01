<script setup lang="ts">
/** 金蝶云星空 — 页面左上角操作栏 */
defineEmits<{
  add: [];
}>();
</script>

<template>
  <div class="erp-toolbar">
    <slot>
      <el-button type="primary" class="erp-btn-primary" @click="$emit('add')">新增</el-button>
    </slot>
  </div>
</template>
