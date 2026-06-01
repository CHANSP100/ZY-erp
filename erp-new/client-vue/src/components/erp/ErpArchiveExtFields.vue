<script setup lang="ts">

/** 基础资料扩展字段 — 新增/编辑表单内右键管理 */

import ErpExtFieldZone from '@/components/erp/ErpExtFieldZone.vue';



defineProps<{

  menuCode: string;

  readonly?: boolean;

  inline?: boolean;

}>();



const emit = defineEmits<{

  'fields-changed': [];

}>();



const extFields = defineModel<Record<string, unknown>>({ default: () => ({}) });

</script>



<template>

  <ErpExtFieldZone

    v-model="extFields"

    :menu-code="menuCode"

    area="head"

    layout="form"

    :inline="inline"

    :readonly="readonly"

    :designable="!readonly"

    @fields-changed="emit('fields-changed')"

  />

</template>

