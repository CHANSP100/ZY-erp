/**
 * 生产领料 MrpAG（MF_ML + TF_ML）
 * 同步自：analysis/字段对照/生产领料.md
 */
import type { ErpFieldMeta } from './types';

export const ML_BILL_HEAD: ErpFieldMeta[] = [
  { order: 1, dbField: 'ML_NO', key: 'ml_no', label: '领料单号', query: true, list: true, form: true, required: true, readonly: true, widget: 'input-readonly', area: 'head', width: 120 },
  { order: 2, dbField: 'ML_DD', key: 'ml_dd', label: '领料日期', query: true, list: true, form: true, widget: 'date', area: 'head', width: 110 },
  { order: 3, dbField: 'MO_NO', key: 'mo_no', label: '制令单号', query: true, list: true, form: true, required: true, widget: 'lookup', area: 'head', width: 120 },
  { order: 4, dbField: 'MRP_NO', key: 'mrp_no', label: '成品代号', query: true, list: true, form: true, readonly: true, widget: 'input-readonly', area: 'head', width: 130 },
  { order: 5, dbField: 'PRD_NAME', key: 'prd_name', label: '成品名称', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'head', minWidth: 120 },
  { order: 6, dbField: 'PRD_MARK', key: 'prd_mark', label: '货品特征', form: true, readonly: true, widget: 'input-readonly', area: 'head' },
  { order: 7, dbField: 'UNIT', key: 'unit', label: '单位', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'head', width: 60 },
  { order: 8, dbField: 'QTY', key: 'qty', label: '数量', list: true, form: true, readonly: true, widget: 'number', area: 'head', width: 90 },
  { order: 9, dbField: 'WH_MTL', key: 'wh_mtl', label: '原料库', query: true, list: true, form: true, widget: 'lookup', area: 'head', width: 90 },
  { order: 10, dbField: 'DEP', key: 'dep', label: '部门', form: true, widget: 'lookup', area: 'head', width: 100 },
  { order: 11, dbField: 'BIL_TYPE', key: 'bil_type', label: '单据类别', list: true, form: true, widget: 'lookup', area: 'head', width: 90 },
  { order: 12, dbField: 'ID_NO', key: 'id_no', label: '配方号', form: true, widget: 'lookup', area: 'head' },
  { order: 13, dbField: 'BAT_NO', key: 'bat_no', label: '批号', form: true, widget: 'lookup', area: 'head', width: 90 },
  { order: 14, dbField: 'USR_NO', key: 'usr_no', label: '经办人', form: true, widget: 'lookup', area: 'head', width: 100 },
  { order: 15, dbField: 'REM', key: 'rem', label: '备注', form: true, widget: 'textarea', area: 'head' },
  { order: 16, dbField: 'MLID', key: 'mlid', label: '单据ID', form: true, widget: 'hidden', area: 'head' },
  { order: 17, dbField: 'ML_ID', key: 'ml_id', label: '领退注记', form: true, widget: 'hidden', area: 'head' },
  { order: 18, dbField: 'BIL_ID', key: 'bil_id', label: '来源单识别码', form: true, widget: 'hidden', area: 'head' },
];

export const ML_BILL_LINE: ErpFieldMeta[] = [
  { order: 1, dbField: 'ITM', key: 'itm', label: '项', widget: 'hidden', area: 'line', width: 48 },
  { order: 2, dbField: 'PRD_NO', key: 'prd_no', label: '料号', list: true, form: true, required: true, widget: 'lookup', area: 'line', width: 110 },
  { order: 3, dbField: 'PRD_NAME', key: 'prd_name', label: '品名', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'line', minWidth: 100 },
  { order: 4, dbField: 'PRD_MARK', key: 'prd_mark', label: '货品特征', list: true, form: true, widget: 'input', area: 'line', width: 90 },
  { order: 5, dbField: 'WH', key: 'wh', label: '仓库', list: true, form: true, required: true, widget: 'lookup', area: 'line', width: 90 },
  { order: 6, dbField: 'UNIT', key: 'unit', label: '单位', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'line', width: 60 },
  { order: 7, dbField: 'QTY_STD', key: 'qty_std', label: '标准用量', list: true, form: true, readonly: true, widget: 'number', area: 'line', width: 100 },
  { order: 8, dbField: 'LOS_RTO', key: 'los_rto', label: '标准损耗率', list: true, form: true, readonly: true, widget: 'number', area: 'line', width: 100 },
  { order: 9, dbField: 'QTY_RSV', key: 'qty_rsv', label: '应发量', list: true, form: true, readonly: true, widget: 'number', area: 'line', width: 100 },
  { order: 10, dbField: 'QTY', key: 'qty', label: '领料数量', list: true, form: true, required: true, widget: 'number', area: 'line', width: 100 },
  { order: 11, dbField: 'QTY_WH', key: 'qty_wh', label: '库存', list: true, form: true, readonly: true, widget: 'number', area: 'line', width: 90 },
  { order: 12, dbField: 'BAT_NO', key: 'bat_no', label: '批号', list: true, form: true, widget: 'lookup', area: 'line', width: 90 },
  { order: 13, dbField: 'REM', key: 'rem', label: '备注', list: true, form: true, widget: 'textarea', area: 'line', minWidth: 90 },
  { order: 14, dbField: 'MO_NO', key: 'mo_no', label: '制令单号', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'line', width: 120 },
  { order: 15, dbField: 'BIL_ITM', key: 'bil_itm', label: '来源项次', widget: 'hidden', area: 'line' },
];

export const MRP_AG = {
  menuCode: 'MrpAG',
  doc: 'analysis/字段对照/生产领料.md',
  head: ML_BILL_HEAD,
  line: ML_BILL_LINE,
};
