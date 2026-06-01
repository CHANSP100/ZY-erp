/**
 * 客户厂商 CUST（本期字段，与 server API 一致）
 * 同步自：analysis/字段对照/客户厂商.md
 */
import type { ErpFieldMeta } from './types';

export const FAS_CUST_MAIN: ErpFieldMeta[] = [
  { order: 1, dbField: 'OBJ_ID', key: 'obj_id', label: '客户类别', form: true, widget: 'select', area: 'head' },
  { order: 2, dbField: 'CUS_NO', key: 'cus_no', label: '客户代号', query: true, list: true, form: true, required: true, widget: 'input', area: 'head', width: 100 },
  { order: 3, dbField: 'NAME', key: 'name', label: '全称', query: true, list: true, form: true, required: true, widget: 'input', area: 'head', minWidth: 160 },
  { order: 4, dbField: 'SNM', key: 'snm', label: '简称', query: true, list: true, form: true, widget: 'input', area: 'head', width: 120 },
  { order: 5, dbField: 'CUS_ARE', key: 'cus_are', label: '区域', list: true, form: true, widget: 'lookup', area: 'head', width: 90 },
  { order: 6, dbField: 'CNT_MAN1', key: 'cnt_man1', label: '联络人1', form: true, widget: 'input', area: 'head' },
  { order: 7, dbField: 'CNT_MAN2', key: 'cnt_man2', label: '联络人2', form: true, widget: 'input', area: 'head' },
  { order: 8, dbField: 'TEL1', key: 'tel1', label: '电话1', list: true, form: true, widget: 'input', area: 'head', width: 110 },
  { order: 9, dbField: 'TEL2', key: 'tel2', label: '电话2', form: true, widget: 'input', area: 'head' },
  { order: 10, dbField: 'SAL', key: 'sal', label: '业务员', list: true, form: true, widget: 'lookup', area: 'head', width: 100 },
  { order: 11, dbField: 'UNI_NO', key: 'uni_no', label: '统一编号', form: true, widget: 'input', area: 'head' },
  { order: 12, dbField: 'BIZ_DSC', key: 'biz_dsc', label: '行业别', form: true, widget: 'input', area: 'head' },
  { order: 13, dbField: 'ADR2', key: 'adr2', label: '公司地址', form: true, widget: 'textarea', area: 'head' },
  { order: 14, dbField: 'END_DD', key: 'end_dd', label: '截止往来日期', list: true, form: true, widget: 'date', area: 'head', width: 110 },
  { order: 15, dbField: 'ID1_TAX', key: 'id1_tax', label: '扣税类别', form: true, widget: 'select', area: 'head' },
  { order: 16, dbField: 'SAL_NO', key: 'sal_no', label: '主报关员', list: true, form: true, widget: 'lookup', area: 'head', width: 100 },
  { order: 17, dbField: 'BNK_NAME', key: 'bnk_name', label: '开户银行', form: true, widget: 'input', area: 'head' },
  { order: 18, dbField: 'ID_CODE', key: 'id_code', label: '银行帐号', form: true, widget: 'input', area: 'head' },
  { order: 19, dbField: 'REM', key: 'rem', label: '摘要', form: true, widget: 'textarea', area: 'head' },
  { order: 20, dbField: 'CUR', key: 'cur_id', label: '使用币别', form: true, widget: 'input', area: 'head' },
];

export const FAS_CUST = {
  menuCode: 'FasEA',
  doc: 'analysis/字段对照/客户厂商.md',
  main: FAS_CUST_MAIN,
};

export const FAS_CUST_QUERY_MAIN_KEYS = ['cus_no', 'name', 'snm'] as const;

export const FAS_CUST_QUERY_MORE_KEYS = [] as const;
