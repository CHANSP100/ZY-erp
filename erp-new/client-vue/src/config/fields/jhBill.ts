/**
 * 生产计划 MrpAA（MF_JH + TF_JH）
 * 同步自：analysis/字段对照/生产计划.md（CNTT_NO/CAS_NO/COMB_ID 本期不用）
 */
import type { ErpFieldMeta } from './types';

export const JH_BILL_HEAD: ErpFieldMeta[] = [
  { order: 1, dbField: 'JH_NO', key: 'jh_no', label: '计划单号', query: true, list: true, form: true, required: true, readonly: true, widget: 'input-readonly', area: 'head', width: 120 },
  { order: 2, dbField: 'JH_DD', key: 'jh_dd', label: '计划日期', query: true, list: true, form: true, widget: 'date', area: 'head', width: 110 },
  { order: 3, dbField: 'EST_DD', key: 'est_dd', label: '需求日期', list: true, form: true, widget: 'date', area: 'head', width: 110 },
  { order: 4, dbField: 'DEP', key: 'dep', label: '部门', query: true, list: true, form: true, widget: 'lookup', area: 'head', width: 100 },
  { order: 5, dbField: 'SAL_NO', key: 'sal_no', label: '业务员', list: true, form: true, widget: 'lookup', area: 'head', width: 100 },
  { order: 6, dbField: 'SO_NO', key: 'so_no', label: '受订单号', query: true, list: true, form: true, widget: 'lookup', area: 'head', width: 120 },
  { order: 7, dbField: 'CUS_NO', key: 'cus_no', label: '客户代号', query: true, list: true, form: true, widget: 'lookup', area: 'head', width: 120 },
  { order: 8, dbField: 'CUS_OS_NO', key: 'cus_os_no', label: '客户订单号', form: true, widget: 'input', area: 'head' },
  { order: 9, dbField: 'BIL_TYPE', key: 'bil_type', label: '单据类别', list: true, form: true, widget: 'lookup', area: 'head', width: 90 },
  { order: 10, dbField: 'BAT_NO', key: 'bat_no', label: '批号', form: true, widget: 'lookup', area: 'head', width: 90 },
  { order: 11, dbField: 'CLOSE_ID', key: 'close_id', label: '结案', list: true, form: true, widget: 'select', area: 'head', width: 80 },
  { order: 12, dbField: 'REM', key: 'rem', label: '备注', form: true, widget: 'textarea', area: 'head' },
];

export const JH_BILL_LINE: ErpFieldMeta[] = [
  { order: 1, dbField: 'ITM', key: 'itm', label: '项', widget: 'hidden', area: 'line', width: 48 },
  { order: 2, dbField: 'PRD_NO', key: 'prd_no', label: '品号', list: true, form: true, required: true, widget: 'lookup', area: 'line', width: 110 },
  { order: 3, dbField: 'PRD_NAME', key: 'prd_name', label: '品名', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'line', minWidth: 100 },
  { order: 4, dbField: 'PRD_MARK', key: 'prd_mark', label: '货品特征', list: true, form: true, widget: 'input', area: 'line', width: 90 },
  { order: 5, dbField: 'WH', key: 'wh', label: '仓库', list: true, form: true, widget: 'lookup', area: 'line', width: 90 },
  { order: 6, dbField: 'UNIT', key: 'unit', label: '单位', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'line', width: 60 },
  { order: 7, dbField: 'QTY', key: 'qty', label: '计划数量', list: true, form: true, required: true, widget: 'number', area: 'line', width: 100 },
  { order: 8, dbField: 'EST_DD', key: 'est_dd', label: '预交日', list: true, form: true, widget: 'date', area: 'line', width: 110 },
  { order: 9, dbField: 'BAT_NO', key: 'bat_no', label: '批号', list: true, form: true, widget: 'lookup', area: 'line', width: 90 },
  { order: 10, dbField: 'ID_NO', key: 'id_no', label: '配方号', list: true, form: true, widget: 'lookup', area: 'line', width: 110 },
  { order: 11, dbField: 'OS_NO', key: 'os_no', label: '受订单号', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'line', width: 120 },
  { order: 12, dbField: 'OS_ID', key: 'os_id', label: '受订单识别码', form: true, widget: 'hidden', area: 'line' },
  { order: 13, dbField: 'EST_ITM', key: 'est_itm', label: '受订项次', widget: 'hidden', area: 'line' },
  { order: 14, dbField: 'CUS_OS_NO', key: 'cus_os_no', label: '客户订单号', list: true, form: true, widget: 'input', area: 'line', width: 120 },
  { order: 15, dbField: 'SUP_PRD_NO', key: 'sup_prd_no', label: '对方货号', list: true, form: true, widget: 'input', area: 'line', width: 110 },
  { order: 16, dbField: 'MP_CLS_ID', key: 'mp_cls_id', label: '已结案', list: true, form: true, widget: 'select', area: 'line', width: 80 },
  { order: 17, dbField: 'REM', key: 'rem', label: '备注', list: true, form: true, widget: 'textarea', area: 'line', minWidth: 90 },
  { order: 18, dbField: 'PRE_ITM', key: 'pre_itm', label: '唯一项次', widget: 'hidden', area: 'line' },
];

export const MRP_AA = {
  menuCode: 'MrpAA',
  doc: 'analysis/字段对照/生产计划.md',
  head: JH_BILL_HEAD,
  line: JH_BILL_LINE,
};
