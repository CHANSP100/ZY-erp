import { LOOKUP_PRESETS } from './presets';
import { normalizeLookupColumns, resolveColumnSettingsKey } from './helpers';
import type { LookupColumn, LookupConfig, LookupInteraction, LookupPresetKey } from '@/types/lookup';

export function resolveLookupConfig(
  preset?: LookupPresetKey,
  override?: Partial<LookupConfig>
): LookupConfig | null {
  if (!preset && !override?.title) return null;
  const base = preset ? { ...LOOKUP_PRESETS[preset] } : ({} as LookupConfig);
  const merged: LookupConfig = {
    ...base,
    ...override,
    columns: override?.columns ?? base.columns ?? [],
  };
  const valueKey = merged.valueKey ?? merged.rowKey;
  merged.valueKey = valueKey;
  merged.columnSettingsKey = resolveColumnSettingsKey(preset, merged);
  merged.columns = normalizeLookupColumns(merged.columns, valueKey);
  return merged;
}

export type LookupDialogBindProps = {
  title: string;
  rowKey: string;
  valueKey: string;
  columns: LookupColumn[];
  searchKeys: string[];
  columnSettingsKey: string;
  width?: number;
  interaction?: LookupInteraction;
  loader?: () => Promise<Record<string, unknown>[]>;
  loadErrorMessage?: string;
  dialogClass?: string;
};

function toLookupDialogBindProps(cfg: LookupConfig, dialogClass = 'kd-so-dialog'): LookupDialogBindProps {
  const valueKey = cfg.valueKey ?? cfg.rowKey;
  return {
    title: cfg.title,
    rowKey: cfg.rowKey,
    valueKey,
    columns: cfg.columns,
    searchKeys: cfg.searchKeys,
    columnSettingsKey: cfg.columnSettingsKey ?? resolveColumnSettingsKey(undefined, cfg),
    width: cfg.width,
    interaction: cfg.interaction,
    loader: cfg.loader,
    loadErrorMessage: cfg.loadErrorMessage,
    dialogClass,
  };
}

/** 档案类 preset → LookupDialog 标准 props */
export function getLookupDialogProps(
  preset: LookupPresetKey,
  override?: Partial<LookupConfig> & { dialogClass?: string }
): LookupDialogBindProps {
  const cfg = resolveLookupConfig(preset, override);
  if (!cfg) throw new Error(`[getLookupDialogProps] unknown preset: ${preset}`);
  return toLookupDialogBindProps(cfg, override?.dialogClass ?? 'kd-so-dialog');
}

/** 单据转单/选单等 inline 弹窗 → 同样支持表头列显示设置 */
export function getInlineLookupDialogProps(
  config: Partial<LookupConfig> & Pick<LookupConfig, 'title' | 'rowKey' | 'columns' | 'searchKeys'>,
  options?: { dialogClass?: string }
): LookupDialogBindProps {
  const cfg = resolveLookupConfig(undefined, config);
  if (!cfg) throw new Error('[getInlineLookupDialogProps] invalid config');
  return toLookupDialogBindProps(cfg, options?.dialogClass ?? 'kd-so-dialog');
}
