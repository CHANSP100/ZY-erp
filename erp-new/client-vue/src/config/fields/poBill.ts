/**
 * 采购单 InvAF（MF_POS + TF_POS，OS_ID=PO）
 * 同步自：analysis/字段对照/采购单.md
 */
import type { ErpFieldMeta } from './types';

export const PO_BILL_HEAD: ErpFieldMeta[] = [
  { order: 1, dbField: 'OS_DD', key: 'os_dd', label: '日期', list: true, form: true, required: true, widget: 'date', area: 'head', width: 110 },
  { order: 2, dbField: 'OS_NO', key: 'os_no', label: '单号', query: true, list: true, form: true, required: true, readonly: true, widget: 'input-readonly', area: 'head', width: 120 },
  { order: 3, dbField: 'EST_DD', key: 'est_dd', label: '预交日', list: true, form: true, required: true, widget: 'date', area: 'head', width: 110 },
  { order: 4, dbField: 'CUS_NO', key: 'cus_no', label: '厂商代号', query: true, list: true, form: true, required: true, widget: 'lookup', area: 'head', width: 100 },
  { order: 5, dbField: 'CUS_OS_NO', key: 'cus_os_no', label: '厂商订单号', form: true, widget: 'input', area: 'head' },
  { order: 6, dbField: 'BIL_TYPE', key: 'bil_type', label: '单据类型', form: true, widget: 'input', area: 'head' },
  { order: 7, dbField: 'USE_DEP', key: 'use_dep', label: '部门代号', form: true, widget: 'lookup', area: 'head', width: 100 },
  { order: 8, dbField: 'SAL_NO', key: 'sal_no', label: '业务人员', list: true, form: true, widget: 'lookup', area: 'head', width: 100 },
  { order: 9, dbField: 'CUR_ID', key: 'cur_id', label: '币别', form: true, widget: 'lookup', area: 'head' },
  { order: 10, dbField: 'TAX_ID', key: 'tax_id', label: '扣税类别', form: true, widget: 'select', area: 'head' },
  { order: 11, dbField: 'DIS_CNT', key: 'dis_cnt', label: '折扣%', form: true, widget: 'number', area: 'head' },
  { order: 12, dbField: 'CLS_MP_ID', key: 'cls_mp_id', label: '已分析登记', form: true, readonly: true, widget: 'input-readonly', area: 'head' },
  { order: 13, dbField: 'CLS_ID', key: 'cls_id', label: '结案', form: true, readonly: true, widget: 'input-readonly', area: 'head' },
  { order: 14, dbField: 'REM', key: 'rem', label: '备注', form: true, widget: 'textarea', area: 'head' },
  { order: 15, dbField: 'OS_ID', key: 'os_id', label: '识别代号', widget: 'hidden', area: 'head' },
];

export const PO_BILL_LINE: ErpFieldMeta[] = [
  { order: 1, dbField: 'ITM', key: 'itm', label: '项次', widget: 'hidden', area: 'line', width: 48 },
  { order: 2, dbField: 'PRD_NO', key: 'prd_no', label: '品号', list: true, form: true, required: true, widget: 'lookup', area: 'line', width: 110 },
  { order: 3, dbField: 'PRD_NAME', key: 'prd_name', label: '品名', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'line', minWidth: 100 },
  { order: 4, dbField: 'SPC', key: 'spc', label: '规格', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'line', width: 90 },
  { order: 5, dbField: 'WH', key: 'wh', label: '仓库', list: true, form: true, widget: 'lookup', area: 'line', width: 100 },
  { order: 6, dbField: 'QTY', key: 'qty', label: '数量', list: true, form: true, required: true, widget: 'number', area: 'line', width: 100 },
  { order: 7, dbField: 'UNIT', key: 'ut', label: '单位', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'line', width: 60 },
  { order: 8, dbField: 'UP', key: 'up', label: '单价', list: true, form: true, widget: 'number', area: 'line', width: 100 },
  { order: 9, dbField: 'AMTN', key: 'amtn', label: '未税', list: true, form: true, readonly: true, widget: 'number', area: 'line', width: 90 },
  { order: 10, dbField: 'TAX', key: 'tax', label: '税额', list: true, form: true, readonly: true, widget: 'number', area: 'line', width: 70 },
  { order: 11, dbField: 'TAX_RTO', key: 'tax_rto', label: '税率', list: true, form: true, widget: 'number', area: 'line', width: 70 },
  { order: 12, dbField: 'EST_DD', key: 'est_dd', label: '预交日', list: true, form: true, required: true, widget: 'date', area: 'line', width: 120 },
  { order: 13, dbField: 'SUP_PRD_NO', key: 'sup_prd_no', label: '对方货号', list: true, form: true, widget: 'input', area: 'line', width: 100 },
  { order: 14, dbField: 'REM', key: 'rem', label: '摘要', list: true, form: true, widget: 'input', area: 'line', minWidth: 90 },
];

export const INV_AF = {
  menuCode: 'InvAF',
  doc: 'analysis/字段对照/采购单.md',
  head: PO_BILL_HEAD,
  line: PO_BILL_LINE,
};
