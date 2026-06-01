<script setup lang="ts">
import { provide, ref, toRef } from 'vue';
import {
  ENTER_NAV_KEY,
  useFormEnterNav,
  type EnterNavJumpOptions,
} from '@/composables/useFormEnterNav';

const props = defineProps<{
  disabled?: boolean;
  onLastField?: EnterNavJumpOptions['onLastField'];
  focusAfterLast?: EnterNavJumpOptions['focusAfterLast'];
  onRowLast?: EnterNavJumpOptions['onRowLast'];
  focusAfterRowLast?: EnterNavJumpOptions['focusAfterRowLast'];
}>();

const zoneRef = ref<HTMLElement | null>(null);

const navOptions: EnterNavJumpOptions = {
  disabled: toRef(props, 'disabled'),
  onLastField: () => props.onLastField?.(),
  focusAfterLast: props.focusAfterLast,
  onRowLast: () => props.onRowLast?.(),
  focusAfterRowLast: props.focusAfterRowLast,
};

provide(ENTER_NAV_KEY, navOptions);

useFormEnterNav(zoneRef, navOptions);
</script>

<template>
  <div ref="zoneRef" class="erp-enter-nav-zone">
    <slot />
  </div>
</template>

<style scoped>
.erp-enter-nav-zone {
  display: contents;
}
</style>
