<script setup lang="ts">
import { ref } from 'vue';

withDefaults(
  defineProps<{
    /** 是否显示「更多筛选」折叠 */
    expandable?: boolean;
    expandDefault?: boolean;
  }>(),
  { expandable: true, expandDefault: false }
);

const emit = defineEmits<{
  search: [];
  reset: [];
}>();

const expanded = ref(false);

function onReset() {
  emit('reset');
}

function onSearch() {
  emit('search');
}
</script>

<template>
  <div class="erp-query-panel">
    <div class="erp-query-grid">
      <slot name="main" />
    </div>
    <el-collapse-transition>
      <div v-if="expandable && expanded" class="erp-query-grid erp-query-grid--more">
        <slot name="more" />
      </div>
    </el-collapse-transition>
    <div class="erp-query-footer">
      <el-button
        v-if="expandable"
        link
        type="primary"
        @click="expanded = !expanded"
      >
        {{ expanded ? '收起筛选' : '更多筛选' }}
      </el-button>
      <span v-else />
      <div class="erp-query-btns">
        <el-button @click="onReset">重置</el-button>
        <el-button type="primary" @click="onSearch">查询</el-button>
      </div>
    </div>
  </div>
</template>
