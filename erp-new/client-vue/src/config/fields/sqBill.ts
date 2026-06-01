/**
 * 请购单 InvAQ（MF_SQ + TF_SQ）
 * 同步自：analysis/字段对照/请购单.md
 */
import type { ErpFieldMeta } from './types';

export const SQ_BILL_HEAD: ErpFieldMeta[] = [
  { order: 1, dbField: 'SQ_DD', key: 'sq_dd', label: '请购日期', list: true, form: true, required: true, widget: 'date', area: 'head', width: 110 },
  { order: 2, dbField: 'SQ_NO', key: 'sq_no', label: '请购单号', query: true, list: true, form: true, required: true, readonly: true, widget: 'input-readonly', area: 'head', width: 120 },
  { order: 3, dbField: 'DEP', key: 'dep', label: '请购部门', list: true, form: true, widget: 'lookup', area: 'head', width: 100 },
  { order: 4, dbField: 'CUS_NO', key: 'cus_no', label: '采购对象', query: true, list: true, form: true, required: true, widget: 'lookup', area: 'head', width: 100 },
  { order: 5, dbField: 'SAL_NO', key: 'sal_no', label: '请购人', list: true, form: true, widget: 'lookup', area: 'head', width: 100 },
  { order: 6, dbField: 'EST_DD', key: 'est_dd', label: '预交日', list: true, form: true, widget: 'date', area: 'head', width: 110 },
  { order: 7, dbField: 'CUR_ID', key: 'cur_id', label: '币别', form: true, widget: 'input', area: 'head' },
  { order: 8, dbField: 'PO_DEP', key: 'po_dep', label: '采购部门', form: true, widget: 'lookup', area: 'head', width: 100 },
  { order: 9, dbField: 'CLS_ID', key: 'cls_id', label: '结案', form: true, readonly: true, widget: 'input-readonly', area: 'head' },
  { order: 10, dbField: 'REM', key: 'rem', label: '备注', form: true, widget: 'textarea', area: 'head' },
];

export const SQ_BILL_LINE: ErpFieldMeta[] = [
  { order: 1, dbField: 'ITM', key: 'itm', label: '项次', widget: 'hidden', area: 'line', width: 48 },
  { order: 2, dbField: 'PRD_NO', key: 'prd_no', label: '品号', list: true, form: true, required: true, widget: 'lookup', area: 'line', width: 110 },
  { order: 3, dbField: 'PRD_NAME', key: 'prd_name', label: '品名', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'line', minWidth: 100 },
  { order: 4, dbField: 'PRD_MARK', key: 'prd_mark', label: '货品特征', list: true, form: true, widget: 'input', area: 'line', width: 90 },
  { order: 5, dbField: 'SPC', key: 'spc', label: '规格', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'line', width: 90 },
  { order: 6, dbField: 'UNIT', key: 'unit', label: '单位', list: true, form: true, widget: 'input', area: 'line', width: 60 },
  { order: 7, dbField: 'QTY', key: 'qty', label: '数量', list: true, form: true, required: true, widget: 'number', area: 'line', width: 100 },
  { order: 8, dbField: 'UP', key: 'up', label: '单价', list: true, form: true, widget: 'number', area: 'line', width: 100 },
  { order: 9, dbField: 'AMTN', key: 'amtn', label: '预估金额', list: true, form: true, readonly: true, widget: 'number', area: 'line', width: 100 },
  { order: 10, dbField: 'EST_DD', key: 'est_dd', label: '预交日', list: true, form: true, widget: 'date', area: 'line', width: 120 },
  { order: 11, dbField: 'REM', key: 'rem', label: '用途', list: true, form: true, widget: 'input', area: 'line', minWidth: 90 },
  { order: 12, dbField: 'QTY_PO', key: 'qty_po', label: '已采购量', list: true, form: false, readonly: true, widget: 'number', area: 'line', width: 90 },
];

export const INV_AQ = {
  menuCode: 'InvAQ',
  doc: 'analysis/字段对照/请购单.md',
  head: SQ_BILL_HEAD,
  line: SQ_BILL_LINE,
};
