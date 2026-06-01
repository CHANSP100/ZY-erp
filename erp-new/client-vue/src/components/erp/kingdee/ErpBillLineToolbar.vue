<script setup lang="ts">
defineProps<{
  readonly?: boolean;
  hasSelection?: boolean;
}>();

defineEmits<{
  add: [];
  remove: [];
  copy: [];
}>();
</script>

<template>
  <div class="kd-bill-line-toolbar">
    <el-button type="primary" size="small" :disabled="readonly" @click="$emit('add')">增行</el-button>
    <el-button size="small" :disabled="readonly || !hasSelection" @click="$emit('copy')">复制行</el-button>
    <el-button size="small" :disabled="readonly || !hasSelection" @click="$emit('remove')">删行</el-button>
    <slot />
  </div>
</template>
