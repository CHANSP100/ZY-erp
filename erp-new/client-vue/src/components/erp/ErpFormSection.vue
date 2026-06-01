<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<template>
  <div class="erp-form-section">
    <h3 class="erp-form-section-title">{{ title }}</h3>
    <slot />
  </div>
</template>
