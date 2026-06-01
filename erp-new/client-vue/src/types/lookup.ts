/** 开窗表格列 */
export type LookupColumn = {
  prop: string;
  label: string;
  width?: number;
  minWidth?: number;
  /** 弹窗列显示设置：默认是否显示（默认 true） */
  defaultVisible?: boolean;
  /** 是否允许用户在表头右键菜单中隐藏（valueKey 对应列始终不可隐藏） */
  hideable?: boolean;
};

/** 开窗交互：单击行即选中 | 点行高亮后点「选取」确认（SUNLIKE 部分档案如单位） */
export type LookupInteraction = 'click' | 'confirm';

/** 开窗配置（可被 preset 或页面 inline 覆盖） */
export type LookupConfig = {
  title: string;
  rowKey: string;
  /** 写入 v-model 的字段名，默认与 rowKey 相同 */
  valueKey?: string;
  columns: LookupColumn[];
  searchKeys: string[];
  interaction?: LookupInteraction;
  width?: number;
  dialogClass?: string;
  multiple?: boolean;
  /** 打开弹窗时拉数；与 :data 二选一，loader 优先 */
  loader?: () => Promise<Record<string, unknown>[]>;
  loadErrorMessage?: string;
  /** Enter 本地未命中时按编码服务端补查 */
  resolveByCode?: (code: string) => Promise<Record<string, unknown> | null | undefined>;
  /** 弹窗表头右键「列显示设置」持久化键（未设则按 preset 表名或 valueKey 大写） */
  columnSettingsKey?: string;
  /** 是否启用表头右键列显示设置（默认 true；仅 1 列时自动不显示菜单） */
  enableColumnSettings?: boolean;
};

/** 内置开窗类型（config/lookups/presets.ts） */
export type LookupPresetKey =
  | 'dept'
  | 'warehouse'
  | 'cust'
  | 'salm'
  | 'product'
  | 'productBomParent'
  | 'indx'
  | 'area'
  | 'currency'
  | 'prdtUt'
  | 'bilSpcSales';
