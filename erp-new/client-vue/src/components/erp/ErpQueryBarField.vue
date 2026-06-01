<script setup lang="ts">
/** 金蝶云星空 — 查询栏字段（标签右对齐 + 200px 控件） */
defineProps<{
  label: string;
  dbField?: string;
}>();
</script>

<template>
  <div class="erp-query-bar-field" :data-field="dbField">
    <label>{{ label }}</label>
    <div class="erp-query-bar-control">
      <slot />
    </div>
  </div>
</template>
