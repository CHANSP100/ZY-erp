/**
 * 明细网格骨架 — 统一导出
 *
 * 用法：
 * ```vue
 * <ErpDetailGrid menu-code="InvAD" :rows="lines" :loading="loading" @summary-change="..." />
 * ```
 *
 * 新菜单在 config/detailGridRegistry.ts 注册。
 */
export { default as ErpDetailGrid } from '../ErpDetailGrid.vue';
export {
  getDetailGridConfig,
  getDetailGridFallbackColumns,
  registerDetailGrid,
  DETAIL_GRID_REGISTRY,
  type DetailGridMenuConfig,
  type DetailGridSummary,
} from '@/config/detailGridRegistry';
export { useErpDetailGrid } from '@/composables/useErpDetailGrid';
