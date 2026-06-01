<script setup lang="ts">
import { ref, watch } from 'vue';

export interface ErpBillTreeNode {
  id: string;
  label: string;
  children?: ErpBillTreeNode[];
}

const props = withDefaults(
  defineProps<{
    title?: string;
    data: ErpBillTreeNode[];
    currentKey?: string;
  }>(),
  { title: '分类', currentKey: '' }
);

const emit = defineEmits<{
  select: [id: string];
}>();

const treeRef = ref();

watch(
  () => props.currentKey,
  (key) => {
    if (key && treeRef.value) {
      treeRef.value.setCurrentKey(key);
    }
  }
);

function onNodeClick(node: ErpBillTreeNode) {
  emit('select', node.id);
}
</script>

<template>
  <aside class="erp-bill-tree">
    <div class="erp-bill-tree-head">{{ title }}</div>
    <el-tree
      ref="treeRef"
      class="erp-bill-tree-body"
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
