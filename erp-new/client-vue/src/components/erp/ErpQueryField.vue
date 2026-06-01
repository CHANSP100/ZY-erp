<script setup lang="ts">
defineProps<{
  label: string;
}>();
</script>

<template>
  <div class="erp-field">
    <label>{{ label }}</label>
    <div class="erp-field-control">
      <slot />
    </div>
  </div>
</template>
