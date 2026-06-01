<script setup lang="ts">

import ErpExtFieldZone from '@/components/erp/ErpExtFieldZone.vue';



defineProps<{

  menuCode: string;

  readonly?: boolean;

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

    layout="bill"

    :readonly="readonly"

    :designable="!readonly"

    @fields-changed="emit('fields-changed')"

  />

</template>

