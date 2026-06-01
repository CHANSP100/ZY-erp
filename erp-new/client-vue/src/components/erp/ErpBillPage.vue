<script setup lang="ts">
/** 单据页骨架 — 表头 / 表身 / 列表面板 */
import { provide, ref } from 'vue';
import { BILL_EXT_FIELD_RELOAD_KEY } from '@/composables/billExtFieldReload';

defineProps<{
  title: string;
  subtitle?: string;
  loading?: boolean;
  /** 传入菜单代号时，子组件扩展字段区可联动刷新 */
  menuCode?: string;
}>();

const extFieldReloadKey = ref(0);
provide(BILL_EXT_FIELD_RELOAD_KEY, extFieldReloadKey);
</script>

<template>
  <div v-loading="loading" class="erp-page erp-bill-page">
    <header class="erp-page-head erp-bill-page-head">
      <div class="erp-page-head-text">
        <h1>{{ title }}</h1>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="erp-bill-page-actions">
        <slot name="actions" />
      </div>
    </header>

    <section v-if="$slots.toolbar" class="erp-bill-toolbar-wrap">
      <slot name="toolbar" />
    </section>

    <section v-if="$slots.header" class="erp-card erp-bill-header-card">
      <slot name="header" />
    </section>

    <section v-if="$slots.lines" class="erp-card erp-bill-lines-panel">
      <slot name="lines" />
    </section>

    <section v-if="$slots.totals" class="erp-bill-totals-wrap">
      <slot name="totals" />
    </section>

    <section v-if="$slots.list" class="erp-card erp-bill-list-panel">
      <div v-if="$slots.listTitle" class="erp-bill-list-panel__title">
        <slot name="listTitle" />
      </div>
      <slot name="list" />
      <slot name="footer" />
    </section>

    <slot />
  </div>
</template>
