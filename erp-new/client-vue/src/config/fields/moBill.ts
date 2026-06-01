/**
 * 制令单 MrpAC（MF_MO + TF_MO）
 * 同步自：analysis/字段对照/制令单.md
 */
import type { ErpFieldMeta } from './types';

export const MO_BILL_HEAD: ErpFieldMeta[] = [
  { order: 1, dbField: 'MO_NO', key: 'mo_no', label: '制令单号', query: true, list: true, form: true, required: true, readonly: true, widget: 'input-readonly', area: 'head', width: 120 },
  { order: 2, dbField: 'MO_DD', key: 'mo_dd', label: '制单日期', query: true, list: true, form: true, widget: 'date', area: 'head', width: 110 },
  { order: 3, dbField: 'STA_DD', key: 'sta_dd', label: '预开工日', list: true, form: true, widget: 'date', area: 'head', width: 110 },
  { order: 4, dbField: 'END_DD', key: 'end_dd', label: '预完工日', list: true, form: true, widget: 'date', area: 'head', width: 110 },
  { order: 5, dbField: 'OPN_DD', key: 'opn_dd', label: '实际开工日', form: true, widget: 'date', area: 'head', width: 110 },
  { order: 6, dbField: 'FIN_DD', key: 'fin_dd', label: '实际完工日', form: true, widget: 'date', area: 'head', width: 110 },
  { order: 7, dbField: 'MRP_NO', key: 'mrp_no', label: '制造成品', query: true, list: true, form: true, required: true, widget: 'lookup', area: 'head', width: 140 },
  { order: 8, dbField: 'PRD_MARK', key: 'prd_mark', label: '货品特征', form: true, widget: 'input', area: 'head' },
  { order: 9, dbField: 'WH', key: 'wh', label: '库位', list: true, form: true, widget: 'lookup', area: 'head', width: 90 },
  { order: 10, dbField: 'SO_NO', key: 'so_no', label: '受订单号', form: true, widget: 'lookup', area: 'head' },
  { order: 11, dbField: 'UNIT', key: 'unit', label: '单位', list: true, form: true, widget: 'input', area: 'head', width: 60 },
  { order: 12, dbField: 'QTY', key: 'qty', label: '数量', list: true, form: true, required: true, widget: 'number', area: 'head', width: 90 },
  { order: 13, dbField: 'DEP', key: 'dep', label: '部门代号', form: true, widget: 'lookup', area: 'head', width: 100 },
  { order: 14, dbField: 'BIL_TYPE', key: 'bil_type', label: '单据类别', list: true, form: true, widget: 'lookup', area: 'head', width: 90 },
  { order: 15, dbField: 'BUILD_BIL', key: 'build_bil', label: '通知单', form: true, widget: 'textarea', area: 'head' },
  { order: 16, dbField: 'CLOSE_ID', key: 'close_id', label: '结案', list: true, form: true, widget: 'select', area: 'head', width: 80 },
  { order: 17, dbField: 'REM', key: 'rem', label: '摘要', form: true, widget: 'textarea', area: 'head' },
  { order: 18, dbField: 'QTY_FIN', key: 'qty_fin', label: '已缴库量', list: true, form: true, readonly: true, widget: 'number', area: 'head', width: 90 },
  { order: 19, dbField: 'BIL_ID', key: 'bil_id', label: '来源单识别码', form: true, widget: 'hidden', area: 'head' },
  { order: 20, dbField: 'BIL_NO', key: 'bil_no', label: '来源单号', form: true, widget: 'lookup', area: 'head' },
];

export const MO_BILL_LINE: ErpFieldMeta[] = [
  { order: 1, dbField: 'ITM', key: 'itm', label: '项', widget: 'hidden', area: 'line', width: 48 },
  { order: 2, dbField: 'PRD_NO', key: 'prd_no', label: '材料号', list: true, form: true, required: true, widget: 'lookup', area: 'line', width: 110 },
  { order: 3, dbField: 'PRD_NAME', key: 'prd_name', label: '材料名称', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'line', minWidth: 100 },
  { order: 4, dbField: 'PRD_MARK', key: 'prd_mark', label: '货品特征', list: true, form: true, widget: 'input', area: 'line', width: 90 },
  { order: 5, dbField: 'WH', key: 'wh', label: '仓库', list: true, form: true, widget: 'lookup', area: 'line', width: 90 },
  { order: 6, dbField: 'UNIT', key: 'unit', label: '单位', list: true, form: true, widget: 'input', area: 'line', width: 60 },
  { order: 7, dbField: 'QTY_STD', key: 'qty_std', label: '标准用量', list: true, form: true, widget: 'number', area: 'line', width: 100 },
  { order: 8, dbField: 'LOS_RTO', key: 'los_rto', label: '标准损耗率', list: true, form: true, widget: 'number', area: 'line', width: 100 },
  { order: 9, dbField: 'QTY_RSV', key: 'qty_rsv', label: '应发量', list: true, form: true, readonly: true, widget: 'number', area: 'line', width: 100 },
  { order: 10, dbField: 'QTY_LOST', key: 'qty_lost', label: '损耗量', list: true, form: true, readonly: true, widget: 'number', area: 'line', width: 100 },
  { order: 11, dbField: 'QTY', key: 'qty', label: '已领数量', list: true, form: true, readonly: true, widget: 'number', area: 'line', width: 100 },
  { order: 12, dbField: 'BAT_NO', key: 'bat_no', label: '批号', list: true, form: true, widget: 'lookup', area: 'line', width: 90 },
  { order: 13, dbField: 'REM', key: 'rem', label: '备注', list: true, form: true, widget: 'textarea', area: 'line', minWidth: 90 },
  { order: 14, dbField: 'MO_NO', key: 'mo_no', label: '制令单号', list: true, form: true, required: true, readonly: true, widget: 'input-readonly', area: 'line', width: 120 },
];

export const MRP_AC = {
  menuCode: 'MrpAC',
  doc: 'analysis/字段对照/制令单.md',
  head: MO_BILL_HEAD,
  line: MO_BILL_LINE,
};
