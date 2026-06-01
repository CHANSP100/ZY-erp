<script setup lang="ts">
import { ref } from 'vue';

/** 金蝶云星空 — 顶部多条件查询栏（2×5 网格，查询/重置右下角） */
withDefaults(
  defineProps<{
    expandable?: boolean;
  }>(),
  { expandable: true }
);

const emit = defineEmits<{
  search: [];
  reset: [];
}>();

const expanded = ref(false);
</script>

<template>
  <section class="erp-card erp-query-bar">
    <div class="erp-query-bar-grid">
      <slot name="main" />
    </div>
    <el-collapse-transition>
      <div v-if="expandable && expanded" class="erp-query-bar-grid erp-query-bar-grid--more">
        <slot name="more" />
      </div>
    </el-collapse-transition>
    <div class="erp-query-bar-footer">
      <el-button v-if="expandable" link type="primary" class="erp-btn-link" @click="expanded = !expanded">
        {{ expanded ? '收起筛选' : '更多筛选' }}
      </el-button>
      <span v-else />
      <div class="erp-query-bar-btns">
        <el-button class="erp-btn-default" @click="emit('reset')">重置</el-button>
        <el-button type="primary" class="erp-btn-primary" @click="emit('search')">查询</el-button>
      </div>
    </div>
  </section>
</template>
