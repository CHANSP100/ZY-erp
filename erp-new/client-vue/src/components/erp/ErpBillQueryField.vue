<script setup lang="ts">
/** 单据页顶栏内联查询字段（标签左、控件右） */
defineProps<{
  label: string;
  width?: number;
}>();
</script>

<template>
  <div class="erp-bill-query-field" :style="width ? { '--erp-bill-query-w': `${width}px` } : undefined">
    <label>{{ label }}</label>
    <div class="erp-bill-query-control">
      <slot />
    </div>
  </div>
</template>
