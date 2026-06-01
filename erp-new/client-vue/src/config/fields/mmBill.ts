/**
 * 缴库单 MrpAFC（MF_MM0 + TF_MM0）
 * 同步自：analysis/字段对照/缴库单.md
 */
import type { ErpFieldMeta } from './types';

export const MM_BILL_HEAD: ErpFieldMeta[] = [
  { order: 1, dbField: 'MM_NO', key: 'mm_no', label: '缴库单号', query: true, list: true, form: true, required: true, readonly: true, widget: 'input-readonly', area: 'head', width: 120 },
  { order: 2, dbField: 'MM_DD', key: 'mm_dd', label: '缴库日期', query: true, list: true, form: true, widget: 'date', area: 'head', width: 110 },
  { order: 3, dbField: 'MO_NO', key: 'mo_no', label: '制令单号', query: true, list: true, form: true, widget: 'lookup', area: 'head', width: 120 },
  { order: 4, dbField: 'DEP', key: 'dep', label: '生产部门', list: true, form: true, widget: 'lookup', area: 'head', width: 100 },
  { order: 5, dbField: 'BIL_TYPE', key: 'bil_type', label: '单据类别', list: true, form: true, widget: 'lookup', area: 'head', width: 90 },
  { order: 6, dbField: 'BIL_ID', key: 'bil_id', label: '来源单识别码', form: true, widget: 'hidden', area: 'head' },
  { order: 7, dbField: 'BIL_NO', key: 'bil_no', label: '来源单号', form: true, widget: 'hidden', area: 'head' },
  { order: 8, dbField: 'FIN_ID', key: 'fin_id', label: '影响已缴库量', form: true, widget: 'hidden', area: 'head' },
  { order: 9, dbField: 'REM', key: 'rem', label: '备注', form: true, widget: 'textarea', area: 'head' },
  { order: 10, dbField: 'USR_NO', key: 'usr_no', label: '经办人', form: true, widget: 'lookup', area: 'head', width: 100 },
  { order: 11, dbField: 'MM_ID', key: 'mm_id', label: '缴库类型', form: true, widget: 'hidden', area: 'head' },
  { order: 12, dbField: 'CHK_MAN', key: 'chk_man', label: '审核人', list: true, widget: 'input-readonly', area: 'head', width: 90 },
  { order: 13, dbField: 'CLS_DATE', key: 'cls_date', label: '终审日期', list: true, widget: 'date', area: 'head', width: 110 },
  { order: 14, dbField: 'CANCEL_ID', key: 'cancel_id', label: '作废', list: true, widget: 'input-readonly', area: 'head', width: 72 },
];

export const MM_BILL_LINE: ErpFieldMeta[] = [
  { order: 1, dbField: 'ITM', key: 'itm', label: '项', widget: 'hidden', area: 'line', width: 48 },
  { order: 2, dbField: 'MO_NO', key: 'mo_no', label: '制令单号', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'line', width: 120 },
  { order: 3, dbField: 'PRD_NO', key: 'prd_no', label: '产品号', list: true, form: true, required: true, widget: 'lookup', area: 'line', width: 110 },
  { order: 4, dbField: 'PRD_NAME', key: 'prd_name', label: '产品名称', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'line', minWidth: 100 },
  { order: 5, dbField: 'PRD_MARK', key: 'prd_mark', label: '货品特征', list: true, form: true, widget: 'input', area: 'line', width: 90 },
  { order: 6, dbField: 'UNIT', key: 'unit', label: '单位', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'line', width: 60 },
  { order: 7, dbField: 'WH', key: 'wh', label: '仓库', list: true, form: true, required: true, widget: 'lookup', area: 'line', width: 90 },
  { order: 8, dbField: 'BAT_NO', key: 'bat_no', label: '批号', list: true, form: true, widget: 'lookup', area: 'line', width: 90 },
  { order: 9, dbField: 'QTY', key: 'qty', label: '数量', list: true, form: true, required: true, widget: 'number', area: 'line', width: 100 },
  { order: 10, dbField: 'QTY1', key: 'qty1', label: '副单位数量', list: true, form: true, widget: 'number', area: 'line', width: 100 },
  { order: 11, dbField: 'VALID_DD', key: 'valid_dd', label: '有效日期', list: true, form: true, widget: 'date', area: 'line', width: 110 },
  { order: 12, dbField: 'FREE_ID', key: 'free_id', label: '是否赠品', form: true, widget: 'select', area: 'line', width: 80 },
  { order: 13, dbField: 'SO_NO', key: 'so_no', label: '受订单号', list: true, form: true, widget: 'lookup', area: 'line', width: 120 },
  { order: 14, dbField: 'REM', key: 'rem', label: '备注', list: true, form: true, widget: 'textarea', area: 'line', minWidth: 90 },
  { order: 15, dbField: 'MM_NO', key: 'mm_no', label: '缴库单号', widget: 'hidden', area: 'line' },
  { order: 16, dbField: 'MM_DD', key: 'mm_dd', label: '缴库日期', widget: 'hidden', area: 'line' },
];

export const MRP_AFC = {
  menuCode: 'MrpAFC',
  doc: 'analysis/字段对照/缴库单.md',
  head: MM_BILL_HEAD,
  line: MM_BILL_LINE,
};
