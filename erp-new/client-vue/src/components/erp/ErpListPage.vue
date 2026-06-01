<script setup lang="ts">
/** 纯数据列表页：统计、台账、只读查询（无默认新增） */
withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    loading?: boolean;
  }>(),
  {}
);
</script>

<template>
  <div v-loading="loading" class="erp-page erp-list-page">
    <header class="erp-page-head">
      <div class="erp-page-head-text">
        <h1>{{ title }}</h1>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
      <slot name="actions" />
    </header>

    <slot name="query" />

    <section class="erp-table-panel">
      <div v-if="$slots.toolbar" class="erp-list-toolbar">
        <slot name="toolbar" />
      </div>
      <slot name="table" />
      <slot name="footer" />
    </section>
  </div>
</template>
