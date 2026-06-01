<script setup lang="ts">
import type { DetailGridColumn } from '@/api/types';

defineProps<{
  headerMenu: { show: boolean; x: number; y: number; panel: 'main' | 'columns' };
  columns: DetailGridColumn[];
  isAdmin: boolean;
}>();

const emit = defineEmits<{
  openColumnPanel: [];
  backToMain: [];
  toggleColumn: [col: DetailGridColumn, visible: boolean];
  removeCustomCol: [col: DetailGridColumn];
}>();
</script>

<template>
  <teleport to="body">
    <div
      v-if="headerMenu.show"
      class="erp-detail-grid__ctx"
      :class="{ 'erp-detail-grid__ctx--main': headerMenu.panel === 'main' }"
      :style="{ left: `${headerMenu.x}px`, top: `${headerMenu.y}px` }"
      @click.stop
    >
      <template v-if="headerMenu.panel === 'main'">
        <div class="erp-detail-grid__ctx-menu-item" @click="emit('openColumnPanel')">列显示设置</div>
      </template>
      <template v-else>
        <div class="erp-detail-grid__ctx-title">
          <button type="button" class="erp-detail-grid__ctx-back" @click="emit('backToMain')">←</button>
          {{ isAdmin ? '列显示设置（全局）' : '列显示设置（个人）' }}
        </div>
        <div v-for="col in columns" :key="col.col_key" class="erp-detail-grid__ctx-item">
          <el-checkbox :model-value="col.visible" @change="(v: boolean) => emit('toggleColumn', col, v)">
            {{ col.label }}
            <span v-if="!col.is_system" class="erp-detail-grid__ctx-tag">扩展</span>
          </el-checkbox>
          <el-button
            v-if="isAdmin && !col.is_system"
            link
            type="danger"
            size="small"
            @click="emit('removeCustomCol', col)"
          >
            删
          </el-button>
        </div>
      </template>
    </div>
  </teleport>
</template>
