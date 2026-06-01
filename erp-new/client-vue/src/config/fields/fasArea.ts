/**
 * 客户供应商区域 AREA
 * 同步自：docs/02_客户供应商区域_功能说明.md
 */
import type { ErpFieldMeta } from './types';

export const FAS_AREA_MAIN: ErpFieldMeta[] = [
  {
    order: 1,
    dbField: 'AREA_NO',
    key: 'area_no',
    label: '区域代号',
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
    dbField: 'AREA_UP',
    key: 'area_up',
    label: '上层区域',
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

export const FAS_AREA = {
  menuCode: 'FasECG',
  doc: 'docs/02_客户供应商区域_功能说明.md',
  main: FAS_AREA_MAIN,
};

export const FAS_AREA_QUERY_MAIN_KEYS = ['area_no', 'name', 'area_up', 'stop_dd', 'rem'] as const;

export const FAS_AREA_QUERY_MORE_KEYS = [] as const;
