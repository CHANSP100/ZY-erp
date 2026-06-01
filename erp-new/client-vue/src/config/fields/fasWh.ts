/**
 * 仓库 MY_WH
 * 同步自：analysis/字段对照/仓库.md（本期字段，与 server API 一致）
 */
import type { ErpFieldMeta } from './types';

export const FAS_WH_MAIN: ErpFieldMeta[] = [
  { order: 1, dbField: 'WH', key: 'wh', label: '库位', query: true, list: true, form: true, required: true, widget: 'input', area: 'head', width: 100 },
  { order: 2, dbField: 'NAME', key: 'name', label: '名称', query: true, list: true, form: true, widget: 'input', area: 'head', minWidth: 140 },
  { order: 3, dbField: 'DEP', key: 'dep', label: '部门代号', list: true, form: true, widget: 'lookup', area: 'head', width: 100 },
  { order: 4, dbField: 'UP_WH', key: 'up_wh', label: '上层库位', form: true, widget: 'lookup', area: 'head', width: 100 },
  { order: 5, dbField: 'ADR', key: 'adr', label: '地址', form: true, widget: 'textarea', area: 'head' },
  { order: 6, dbField: 'TEL_NO', key: 'tel_no', label: '电话', form: true, widget: 'input', area: 'head' },
  { order: 7, dbField: 'STOP_DD', key: 'stop_dd', label: '停用日期', list: true, form: true, widget: 'date', area: 'head', width: 110 },
  { order: 8, dbField: 'REM', key: 'rem', label: '备注', form: true, widget: 'textarea', area: 'head' },
];

export const FAS_WH = {
  menuCode: 'FasECB',
  doc: 'analysis/字段对照/仓库.md',
  main: FAS_WH_MAIN,
};

export const FAS_WH_QUERY_MAIN_KEYS = ['wh', 'name'] as const;

export const FAS_WH_QUERY_MORE_KEYS = [] as const;
