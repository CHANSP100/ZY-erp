<script setup lang="ts">
import type { LookupDialogColumnState } from '@/composables/useLookupDialogColumns';

defineProps<{
  headerMenu: { show: boolean; x: number; y: number; panel: 'main' | 'columns' };
  columns: LookupDialogColumnState[];
}>();

const emit = defineEmits<{
  openColumnPanel: [];
  backToMain: [];
  toggleColumn: [prop: string, visible: boolean];
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
          列显示设置（个人）
        </div>
        <div v-for="col in columns" :key="col.prop" class="erp-detail-grid__ctx-item">
          <el-checkbox
            :model-value="col.visible"
            :disabled="!col.hideable"
            @change="(v: boolean) => emit('toggleColumn', col.prop, v)"
          >
            {{ col.label }}
          </el-checkbox>
        </div>
      </template>
    </div>
  </teleport>
</template>
