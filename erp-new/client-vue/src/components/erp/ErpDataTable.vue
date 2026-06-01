<script setup lang="ts">
/** 金蝶云星空 — 数据表格容器 */
</script>

<template>
  <section class="erp-card erp-data-table">
    <div class="erp-table-wrap">
      <slot />
    </div>
    <div v-if="$slots.footer" class="erp-data-table__footer">
      <slot name="footer" />
    </div>
  </section>
</template>
