<script setup lang="ts">
import type { DetailGridColumn } from '@/api/types';
import {
  resolveSelectConfig,
  staticSelectOptions,
  tableNameForSelect,
} from '@/utils/extFieldRuntime';

const props = defineProps<{
  col: DetailGridColumn;
  readonly?: boolean;
  size?: 'default' | 'small';
  tableOptions?: Record<string, { value: string; label: string }[]>;
  tableLoading?: Record<string, boolean>;
}>();

const model = defineModel<unknown>();

const emit = defineEmits<{ focus: [] }>();

const isSql = () => props.col.field_source === 'sql';
const isSelect = () => props.col.field_source === 'select';
</script>

<template>
  <el-input
    v-if="isSql()"
    :model-value="String(model ?? '')"
    readonly
    :size="size"
    placeholder="保存后由 SQL 计算"
    @focus="emit('focus')"
  />

  <el-select
    v-else-if="isSelect()"
    v-model="model"
    :disabled="readonly"
    :loading="!!tableLoading?.[tableNameForSelect(col)]"
    filterable
    clearable
    placeholder="请选择"
    :size="size"
    style="width: 100%"
    @focus="emit('focus')"
  >
    <template v-if="resolveSelectConfig(col)?.mode === 'static'">
      <el-option
        v-for="opt in staticSelectOptions(col)"
        :key="opt.value"
        :label="opt.label || opt.value"
        :value="opt.value"
      />
    </template>
    <template v-else>
      <el-option
        v-for="opt in tableOptions?.[tableNameForSelect(col)] || []"
        :key="opt.value"
        :label="opt.label || opt.value"
        :value="opt.value"
      />
    </template>
  </el-select>

  <el-input-number
    v-else-if="col.phys_type === 'numeric'"
    v-model="model"
    :disabled="readonly"
    :size="size"
    controls-position="right"
    style="width: 100%"
    @focus="emit('focus')"
  />

  <el-date-picker
    v-else-if="col.phys_type === 'date' || col.phys_type === 'datetime'"
    v-model="model"
    :type="col.phys_type === 'datetime' ? 'datetime' : 'date'"
    :disabled="readonly"
    :size="size"
    :value-format="col.phys_type === 'datetime' ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD'"
    style="width: 100%"
    @focus="emit('focus')"
  />

  <el-input
    v-else
    v-model="model"
    :readonly="readonly"
    :size="size"
    @focus="emit('focus')"
  />
</template>
