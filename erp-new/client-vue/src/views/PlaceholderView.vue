<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const title = computed(() => (route.meta.title as string) || '页面');
</script>

<template>
  <el-card shadow="never">
    <template #header>
      <span>{{ title }}</span>
    </template>
    <el-alert
      type="info"
      :closable="false"
      title="页面待开发"
      description="DEV-04 已确认。本菜单须先完成 analysis/字段对照/ 对照表并经「字段确认」后，再在此实现 Element Plus 页面。"
    />
  </el-card>
</template>
