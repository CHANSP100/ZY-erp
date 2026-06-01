<script setup lang="ts">
/** 单据页顶栏：左侧操作按钮 + 中间查询条件 + 右侧查询/重置 */
defineEmits<{
  search: [];
  reset: [];
}>();
</script>

<template>
  <div class="erp-bill-toolbar">
    <div class="erp-bill-toolbar-actions">
      <slot name="actions" />
    </div>
    <div class="erp-bill-toolbar-query">
      <slot name="query" />
    </div>
    <div class="erp-bill-toolbar-btns">
      <el-button size="default" @click="$emit('reset')">重置</el-button>
      <el-button type="primary" size="default" @click="$emit('search')">查询</el-button>
    </div>
  </div>
</template>
