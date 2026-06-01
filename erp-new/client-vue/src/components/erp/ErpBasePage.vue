<script setup lang="ts">
import ErpToolBar from './ErpToolBar.vue';
import ErpDataTable from './ErpDataTable.vue';

/** 基础资料页：左侧分类树 + 顶部查询栏 + 右侧数据表格；弹窗在默认 slot */
defineProps<{
  title: string;
  loading?: boolean;
  /** 隐藏顶部标题栏（如中类页按钮已移至表格上方） */
  hideHead?: boolean;
}>();

defineEmits<{
  add: [];
}>();
</script>

<template>
  <div v-loading="loading" class="erp-page erp-base-page">
    <header v-if="!hideHead" class="erp-base-page__head">
      <h1 class="erp-base-page__title">{{ title }}</h1>
      <ErpToolBar v-if="!$slots['main-toolbar']" @add="$emit('add')">
        <template v-if="$slots.toolbar">
          <slot name="toolbar" />
        </template>
      </ErpToolBar>
    </header>

    <div class="erp-base-page__body">
      <slot name="tree" />
      <div class="erp-base-page__main">
        <div v-if="$slots['main-toolbar']" class="erp-base-page__main-toolbar">
          <slot name="main-toolbar" />
        </div>
        <slot name="query" />
        <ErpDataTable>
          <slot name="table" />
          <template v-if="$slots.footer" #footer>
            <slot name="footer" />
          </template>
        </ErpDataTable>
      </div>
    </div>

    <slot />
  </div>
</template>
