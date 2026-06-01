<script setup lang="ts">
import { ref, watch } from 'vue';

export interface ErpCategoryTreeNode {
  id: string;
  label: string;
  children?: ErpCategoryTreeNode[];
}

const props = withDefaults(
  defineProps<{
    title?: string;
    data: ErpCategoryTreeNode[];
    currentKey?: string;
  }>(),
  { title: '分类', currentKey: '' }
);

const emit = defineEmits<{
  select: [id: string];
}>();

const treeRef = ref();

watch(
  () => [props.currentKey, props.data] as const,
  ([key]) => {
    if (key && treeRef.value) treeRef.value.setCurrentKey(key);
  },
  { immediate: true, flush: 'post' }
);

function onNodeClick(node: ErpCategoryTreeNode) {
  emit('select', node.id);
}
</script>

<template>
  <aside class="erp-card erp-category-tree">
    <div class="erp-category-tree__head">{{ title }}</div>
    <el-tree
      ref="treeRef"
      class="erp-category-tree__body"
      :data="data"
      node-key="id"
      :props="{ label: 'label', children: 'children' }"
      highlight-current
      default-expand-all
      :expand-on-click-node="false"
      :current-node-key="currentKey || undefined"
      @node-click="onNodeClick"
    />
  </aside>
</template>
