/** 开窗公共组件：字段 + 弹窗 + 预设配置 */
export { default as LookupField } from '../LookupField.vue';
export { default as LookupDialog } from '../LookupDialog.vue';
export { default as LookupPicker } from '../LookupPicker.vue';
export {
  LOOKUP_PRESETS,
  LOOKUP_TABLE_KEYS,
  LOOKUP_VALUE_KEY_TABLE,
  resolveLookupConfig,
  getLookupDialogProps,
  getInlineLookupDialogProps,
  normalizeLookupColumns,
  resolveColumnSettingsKey,
} from '@/config/lookups';
export type { LookupDialogBindProps } from '@/config/lookups';
export type { LookupColumn, LookupConfig, LookupInteraction, LookupPresetKey } from '@/types/lookup';