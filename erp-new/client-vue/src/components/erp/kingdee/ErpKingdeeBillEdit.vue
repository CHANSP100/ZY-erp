<script setup lang="ts">
/**
 * 金蝶云星空 — 单据新增/编辑页骨架
 */
import { provide, ref, watch } from 'vue';
import { BILL_EXT_FIELD_RELOAD_KEY } from '@/composables/billExtFieldReload';

export interface KingdeeBillNavItem {
  id: string;
  label: string;
}

const props = withDefaults(
  defineProps<{
    title: string;
    billNo?: string;
    statusLabel?: string;
    statusKind?: 'open' | 'audited' | 'closed' | 'analyzed';
    navItems?: KingdeeBillNavItem[];
    loading?: boolean;
    menuCode?: string;
    /** 不显示左侧锚点导航与分区标题，表头表身直接平铺 */
    hideSectionNav?: boolean;
    /** 隐藏顶部标题栏（单号/状态） */
    hideHeadline?: boolean;
  }>(),
  {
    navItems: () => [
      { id: 'basic', label: '基本信息' },
      { id: 'lines', label: '明细信息' },
    ],
    statusKind: 'open',
  }
);

const activeNav = ref(props.navItems[0]?.id ?? 'basic');
const extFieldReloadKey = ref(0);

provide(BILL_EXT_FIELD_RELOAD_KEY, extFieldReloadKey);

watch(
  () => props.navItems,
  (items) => {
    if (items.length && !items.some((i) => i.id === activeNav.value)) {
      activeNav.value = items[0].id;
    }
  }
);

function scrollToSection(id: string) {
  activeNav.value = id;
  document.getElementById(`kd-bill-section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
</script>

<template>
  <div v-loading="loading" class="kd-bill-edit">
    <div class="kd-bill-edit__toolbar">
      <div class="kd-bill-edit__toolbar-left">
        <slot name="toolbar-left" />
      </div>
      <div class="kd-bill-edit__toolbar-center">
        <slot name="toolbar" />
      </div>
      <div class="kd-bill-edit__toolbar-right">
        <slot name="toolbar-right" />
      </div>
    </div>

    <div v-if="!hideHeadline" class="kd-bill-edit__headline">
      <div class="kd-bill-edit__headline-main">
        <h1 class="kd-bill-edit__title">{{ title }}</h1>
        <span v-if="billNo" class="kd-bill-edit__bill-no">{{ billNo }}</span>
        <span
          v-if="statusLabel"
          class="kd-so-tag kd-bill-edit__status"
          :class="statusKind ? `kd-so-tag--${statusKind}` : ''"
        >
          {{ statusLabel }}
        </span>
      </div>
      <div class="kd-bill-edit__headline-extra">
        <slot name="headline-extra" />
      </div>
    </div>

    <div class="kd-bill-edit__body" :class="{ 'kd-bill-edit__body--flat': hideSectionNav }">
      <nav v-if="!hideSectionNav" class="kd-bill-edit__nav">
        <button
          v-for="item in navItems"
          :key="item.id"
          type="button"
          class="kd-bill-edit__nav-item"
          :class="{ 'is-active': activeNav === item.id }"
          @click="scrollToSection(item.id)"
        >
          {{ item.label }}
        </button>
      </nav>

      <div class="kd-bill-edit__content">
        <section
          v-for="item in navItems"
          :id="`kd-bill-section-${item.id}`"
          :key="item.id"
          class="kd-bill-edit__section"
          :class="{ 'kd-bill-edit__section--flat': hideSectionNav }"
        >
          <div v-if="!hideSectionNav || $slots[`section-actions-${item.id}`]" class="kd-bill-edit__section-head">
            <span v-if="!hideSectionNav" class="kd-bill-edit__section-title">{{ item.label }}</span>
            <div v-if="$slots[`section-actions-${item.id}`]" class="kd-bill-edit__section-actions">
              <slot :name="`section-actions-${item.id}`" />
            </div>
          </div>
          <div class="kd-bill-edit__section-body">
            <slot :name="item.id" />
          </div>
        </section>
      </div>
    </div>

    <div class="kd-bill-edit__footer">
      <div class="kd-bill-edit__footer-totals">
        <slot name="totals" />
      </div>
      <div class="kd-bill-edit__footer-actions">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>
