/**
 * 部门 DEPT
 * 同步自：analysis/字段对照/部门.md
 */
import type { ErpFieldMeta } from './types';

export const FAS_DEPT_MAIN: ErpFieldMeta[] = [
  {
    order: 1,
    dbField: 'DEP',
    key: 'dep',
    label: '部门代号',
    query: true,
    list: true,
    form: true,
    required: true,
    widget: 'input',
    area: 'head',
    width: 100,
  },
  {
    order: 2,
    dbField: 'NAME',
    key: 'name',
    label: '名称',
    query: true,
    list: true,
    form: true,
    widget: 'input',
    area: 'head',
    minWidth: 140,
  },
  {
    order: 3,
    dbField: 'ENG_NAME',
    key: 'eng_name',
    label: '英文名称',
    list: true,
    form: true,
    widget: 'input',
    area: 'head',
    width: 120,
  },
  {
    order: 4,
    dbField: 'UP',
    key: 'up',
    label: '上层部门',
    list: true,
    form: true,
    widget: 'lookup',
    area: 'head',
    width: 100,
  },
  {
    order: 5,
    dbField: 'MAKE_ID',
    key: 'make_id',
    label: '部门性质',
    list: true,
    form: true,
    widget: 'select',
    area: 'head',
    width: 110,
  },
  {
    order: 6,
    dbField: 'STOP_DD',
    key: 'stop_dd',
    label: '停用日期',
    list: true,
    form: true,
    widget: 'date',
    area: 'head',
    width: 110,
  },
];

export const FAS_DEPT = {
  menuCode: 'FasED',
  doc: 'analysis/字段对照/部门.md',
  main: FAS_DEPT_MAIN,
};

export const FAS_DEPT_QUERY_MAIN_KEYS = ['dep', 'name'] as const;

export const FAS_DEPT_QUERY_MORE_KEYS = [] as const;
