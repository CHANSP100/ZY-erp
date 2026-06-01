/**
 * 中类 INDX
 * 同步自：docs/01_中类_功能说明.md
 */
import type { ErpFieldMeta } from './types';

export const FAS_INDX_MAIN: ErpFieldMeta[] = [
  {
    order: 1,
    dbField: 'IDX_NO',
    key: 'idx_no',
    label: '中类代号',
    query: true,
    list: true,
    form: true,
    required: true,
    widget: 'input',
    area: 'head',
    minWidth: 120,
  },
  {
    order: 2,
    dbField: 'NAME',
    key: 'name',
    label: '名称',
    query: true,
    list: true,
    form: true,
    required: true,
    widget: 'input',
    area: 'head',
    minWidth: 140,
  },
  {
    order: 3,
    dbField: 'IDX_UP',
    key: 'idx_up',
    label: '上层中类',
    query: true,
    list: true,
    form: true,
    widget: 'lookup',
    area: 'head',
    minWidth: 120,
  },
  {
    order: 4,
    dbField: 'STOP_DD',
    key: 'stop_dd',
    label: '停用日期',
    query: true,
    list: true,
    form: true,
    widget: 'date',
    area: 'head',
    width: 120,
  },
  {
    order: 5,
    dbField: 'REM',
    key: 'rem',
    label: '备注',
    query: true,
    list: true,
    form: true,
    widget: 'textarea',
    area: 'head',
    minWidth: 160,
  },
];

export const FAS_INDX = {
  menuCode: 'OthHZYQD',
  doc: 'docs/01_中类_功能说明.md',
  main: FAS_INDX_MAIN,
};

/** 查询栏主区（5 个 query 字段） */
export const FAS_INDX_QUERY_MAIN_KEYS = ['idx_no', 'name', 'idx_up', 'stop_dd', 'rem'] as const;

/** 查询栏展开区 */
export const FAS_INDX_QUERY_MORE_KEYS = [] as const;
