/**
 * 货品 FasECA — PRDT 主表 + PRDT_PIC 子表
 * 同步自：analysis/字段对照/货品.md
 */
import type { ErpFieldMeta } from './types';

export const FAS_ECA_MAIN: ErpFieldMeta[] = [
  { order: 1, dbField: 'IDX1', key: 'idx1', label: '中类代号', query: true, list: true, form: true, widget: 'lookup', area: 'head' },
  { order: 2, dbField: 'PRD_NO', key: 'prd_no', label: '货品代号', query: true, list: true, form: true, required: true, widget: 'input', area: 'head' },
  { order: 3, dbField: 'KND', key: 'knd', label: '大类', query: true, list: true, form: true, readonly: true, widget: 'input-readonly', area: 'head' },
  { order: 4, dbField: 'NAME', key: 'name', label: '名称', query: true, list: true, form: true, required: true, widget: 'input', area: 'head' },
  { order: 5, dbField: 'SPC', key: 'spc', label: '规格', query: true, list: true, form: true, widget: 'textarea', area: 'head' },
  { order: 6, dbField: 'SNM', key: 'snm', label: '简称', query: true, list: true, form: true, widget: 'input', area: 'head' },
  { order: 7, dbField: 'UT', key: 'ut', label: '主单位', list: true, form: true, widget: 'input', area: 'head' },
  { order: 8, dbField: 'UT1', key: 'ut1', label: '副单位', form: true, widget: 'input', area: 'head' },
  { order: 9, dbField: 'UPR', key: 'upr', label: '统一定价', form: true, widget: 'number', area: 'head' },
  { order: 10, dbField: 'UP_SAL', key: 'up_sal', label: '业务成本', form: true, widget: 'number', area: 'head' },
  { order: 11, dbField: 'USE_PRDMARK', key: 'use_prdmark', label: '货品特性', form: true, widget: 'input', area: 'head' },
  { order: 12, dbField: 'TW_ID', key: 'tw_id', label: '加工方式', form: true, widget: 'select', area: 'head' },
  { order: 13, dbField: 'WH', key: 'wh', label: '预设仓库', query: true, list: true, form: true, widget: 'lookup', area: 'head' },
  { order: 14, dbField: 'WH_LC', key: 'wh_lc', label: '余料仓库', form: true, widget: 'lookup', area: 'head' },
  { order: 15, dbField: 'QTY_MIN', key: 'qty_min', label: '最小采购量', form: true, widget: 'number', area: 'head' },
  { order: 16, dbField: 'QTY_LOW', key: 'qty_low', label: '批量', form: true, widget: 'number', area: 'head' },
  { order: 17, dbField: 'VALID_DAYS', key: 'valid_days', label: '有效天数', form: true, widget: 'number', area: 'head' },
  { order: 18, dbField: 'QTY_MIN1', key: 'qty_min1', label: '安全存量', form: true, widget: 'number', area: 'head' },
  { order: 19, dbField: 'QTY_MAX', key: 'qty_max', label: '库存上限', form: true, widget: 'number', area: 'head' },
  { order: 20, dbField: 'NOUSE_DD', key: 'nouse_dd', label: '停用日期', query: true, list: true, form: true, widget: 'date', area: 'head' },
  { order: 21, dbField: 'REM', key: 'rem', label: '摘要', form: true, widget: 'textarea', area: 'head' },
  { order: 22, dbField: 'SYS_DATE', key: 'sys_date', label: '输入日期', readonly: true, widget: 'date', area: 'head' },
  { order: 23, dbField: 'DEP', key: 'dep', label: '货品所属部门', form: true, widget: 'lookup', area: 'head' },
  { order: 24, dbField: 'SAL_NO', key: 'sal_no', label: '采购员', form: true, widget: 'lookup', area: 'head' },
];

/** 子表 PRDT_PIC */
export const FAS_ECA_PIC: ErpFieldMeta[] = [
  { order: 1, dbField: 'PIC', key: 'pic', label: '图片', form: true, widget: 'upload', area: 'sub' },
  { order: 2, dbField: 'CADIMG', key: 'cadimg', label: 'cad 图档', form: true, widget: 'upload', area: 'sub' },
];

export const FAS_ECA = {
  menuCode: 'FasECA',
  doc: 'analysis/字段对照/货品.md',
  main: FAS_ECA_MAIN,
  pic: FAS_ECA_PIC,
};

/** 查询栏主区（中类 idx1 由左侧分类树筛选） */
export const FAS_ECA_QUERY_MAIN_KEYS = ['prd_no', 'knd', 'name', 'snm', 'spc'] as const;

/** 查询栏展开区 */
export const FAS_ECA_QUERY_MORE_KEYS = ['wh', 'nouse_dd'] as const;
