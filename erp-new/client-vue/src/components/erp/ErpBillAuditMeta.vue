<script setup lang="ts">
import type { BillAuditMeta } from '@/api/types';

defineProps<{
  meta: BillAuditMeta;
}>();
</script>

<template>
  <el-row :gutter="12" class="erp-bill-audit-meta">
    <el-col :span="6">
      <el-form-item label="制单人" data-field="USR">
        <el-input :model-value="meta.usr || ''" readonly placeholder="—" />
      </el-form-item>
    </el-col>
    <el-col :span="6">
      <el-form-item label="制单时间" data-field="SYS_DATE">
        <el-input :model-value="meta.sys_date || ''" readonly placeholder="—" />
      </el-form-item>
    </el-col>
    <el-col :span="6">
      <el-form-item label="审核人" data-field="CHK_MAN">
        <el-input :model-value="meta.chk_man || ''" readonly placeholder="—" />
      </el-form-item>
    </el-col>
    <el-col :span="6">
      <el-form-item label="审核时间" data-field="CLS_DATE">
        <el-input :model-value="meta.cls_date || ''" readonly placeholder="—" />
      </el-form-item>
    </el-col>
  </el-row>
</template>

<style scoped>
.erp-bill-audit-meta {
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px dashed var(--el-border-color-lighter);
}
</style>
