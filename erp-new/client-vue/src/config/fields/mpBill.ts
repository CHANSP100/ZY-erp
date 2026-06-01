/**
 * 生产需求分析单 MrpABA（MF_MP + TF_MP1 + TF_MP2 + TF_MP3）
 * 同步自：analysis/字段对照/生产需求分析单.md
 */
import type { ErpFieldMeta } from './types';

export const MP_BILL_HEAD: ErpFieldMeta[] = [
  { order: 1, dbField: 'MP_NO', key: 'mp_no', label: '分析单号', query: true, list: true, form: true, required: true, readonly: true, widget: 'input-readonly', area: 'head', width: 120 },
  { order: 2, dbField: 'MP_DD', key: 'mp_dd', label: '分析日期', query: true, list: true, form: true, widget: 'date', area: 'head', width: 110 },
  { order: 3, dbField: 'EST_DD', key: 'est_dd', label: '需求日期', list: true, form: true, widget: 'date', area: 'head', width: 110 },
  { order: 4, dbField: 'DEP', key: 'dep', label: '部门', query: true, list: true, form: true, widget: 'lookup', area: 'head', width: 100 },
  { order: 5, dbField: 'SO_NO', key: 'so_no', label: '受订单号', query: true, list: true, form: true, widget: 'lookup', area: 'head', width: 120 },
  { order: 6, dbField: 'WH', key: 'wh', label: '分析仓库', form: true, widget: 'input', area: 'head' },
  { order: 7, dbField: 'BIL_TYPE', key: 'bil_type', label: '单据类别', list: true, form: true, widget: 'lookup', area: 'head', width: 90 },
  { order: 8, dbField: 'REM', key: 'rem', label: '摘要', form: true, widget: 'textarea', area: 'head' },
];

export const MP_BILL_LINE1: ErpFieldMeta[] = [
  { order: 1, dbField: 'ITM', key: 'itm', label: '项', widget: 'hidden', area: 'line', width: 48 },
  { order: 2, dbField: 'MRP_NO', key: 'mrp_no', label: '成品代号', list: true, form: true, widget: 'lookup', area: 'line', width: 110 },
  { order: 3, dbField: 'PRD_NO', key: 'prd_no', label: '货品代号', list: true, form: true, required: true, widget: 'lookup', area: 'line', width: 110 },
  { order: 4, dbField: 'PRD_NAME', key: 'prd_name', label: '货品名称', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'line', minWidth: 100 },
  { order: 5, dbField: 'PRD_MARK', key: 'prd_mark', label: '货品特征', list: true, form: true, widget: 'input', area: 'line', width: 90 },
  { order: 6, dbField: 'WH', key: 'wh', label: '库位', list: true, form: true, widget: 'lookup', area: 'line', width: 90 },
  { order: 7, dbField: 'UNIT', key: 'unit', label: '单位', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'line', width: 60 },
  { order: 8, dbField: 'SO_NO', key: 'so_no', label: '受订单号', list: true, form: true, widget: 'input', area: 'line', width: 120 },
  { order: 9, dbField: 'EST_DD', key: 'est_dd', label: '预交日', list: true, form: true, widget: 'date', area: 'line', width: 110 },
  { order: 10, dbField: 'QTY_SO', key: 'qty_so', label: '受订量', list: true, form: true, readonly: true, widget: 'number', area: 'line', width: 90 },
  { order: 11, dbField: 'QTY_NON', key: 'qty_non', label: '未交量', list: true, form: true, readonly: true, widget: 'number', area: 'line', width: 90 },
  { order: 12, dbField: 'QTY_MIN', key: 'qty_min', label: '安全存量', list: true, form: true, readonly: true, widget: 'number', area: 'line', width: 90 },
  { order: 13, dbField: 'QTY_ON_WAY', key: 'qty_on_way', label: '在途量', list: true, form: true, readonly: true, widget: 'number', area: 'line', width: 90 },
  { order: 14, dbField: 'QTY_ON_PRC', key: 'qty_on_prc', label: '在制量', list: true, form: true, readonly: true, widget: 'number', area: 'line', width: 90 },
  { order: 15, dbField: 'QTY_ON_RSV', key: 'qty_on_rsv', label: '未发量', list: true, form: true, readonly: true, widget: 'number', area: 'line', width: 90 },
  { order: 16, dbField: 'QTY', key: 'qty', label: '需求量', list: true, form: true, widget: 'number', area: 'line', width: 90 },
  { order: 17, dbField: 'QTY_PO', key: 'qty_po', label: '外购量', list: true, form: true, widget: 'number', area: 'line', width: 90 },
  { order: 18, dbField: 'QTY_SQ', key: 'qty_sq', label: '请购量', list: true, form: true, widget: 'number', area: 'line', width: 90 },
  { order: 19, dbField: 'ID_NO', key: 'id_no', label: '配方号', list: true, form: true, widget: 'lookup', area: 'line', width: 110 },
  { order: 20, dbField: 'BOM_NO', key: 'bom_no', label: '母件', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'line', width: 110 },
  { order: 21, dbField: 'PO_YES', key: 'po_yes', label: '采购需求否', list: true, form: true, widget: 'select', area: 'line', width: 100 },
  { order: 22, dbField: 'REM', key: 'rem', label: '摘要', list: true, form: true, widget: 'textarea', area: 'line', minWidth: 90 },
  { order: 23, dbField: 'EST_ITM', key: 'est_itm', label: '受订项次', widget: 'hidden', area: 'line' },
];

export const MP_BILL_LINE2: ErpFieldMeta[] = [
  { order: 1, dbField: 'ITM', key: 'itm', label: '项', widget: 'hidden', area: 'line', width: 48 },
  { order: 2, dbField: 'PRD_NO', key: 'prd_no', label: '货品代号', list: true, form: true, required: true, widget: 'lookup', area: 'line', width: 110 },
  { order: 3, dbField: 'PRD_NAME', key: 'prd_name', label: '货品名称', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'line', minWidth: 100 },
  { order: 4, dbField: 'PRD_MARK', key: 'prd_mark', label: '货品特征', list: true, form: true, widget: 'input', area: 'line', width: 90 },
  { order: 5, dbField: 'WH', key: 'wh', label: '库位', list: true, form: true, widget: 'lookup', area: 'line', width: 90 },
  { order: 6, dbField: 'CUS_NO', key: 'cus_no', label: '厂商代号', list: true, form: true, widget: 'lookup', area: 'line', width: 100 },
  { order: 7, dbField: 'UNIT', key: 'unit', label: '单位', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'line', width: 60 },
  { order: 8, dbField: 'QTY', key: 'qty', label: '建议量', list: true, form: true, required: true, widget: 'number', area: 'line', width: 90 },
  { order: 9, dbField: 'QTY_PO', key: 'qty_po', label: '外购量', list: true, form: true, widget: 'number', area: 'line', width: 90 },
  { order: 10, dbField: 'UP_PO', key: 'up_po', label: '采购单价', list: true, form: true, widget: 'number', area: 'line', width: 100 },
  { order: 11, dbField: 'AMTN_PO', key: 'amtn_po', label: '采购本位币', list: true, form: true, readonly: true, widget: 'number', area: 'line', width: 100 },
  { order: 12, dbField: 'EST_DD', key: 'est_dd', label: '预交日', list: true, form: true, widget: 'date', area: 'line', width: 110 },
  { order: 13, dbField: 'SO_NO', key: 'so_no', label: '受订单号', list: true, form: true, widget: 'input', area: 'line', width: 120 },
  { order: 14, dbField: 'PO_NO', key: 'po_no', label: '采购单号', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'line', width: 120 },
  { order: 15, dbField: 'BAT_NO', key: 'bat_no', label: '批号', list: true, form: true, widget: 'lookup', area: 'line', width: 90 },
  { order: 16, dbField: 'CUR_ID', key: 'cur_id', label: '币别', form: true, widget: 'input', area: 'line', width: 80 },
  { order: 17, dbField: 'SUP_PRD_NO', key: 'sup_prd_no', label: '对方货号', list: true, form: true, widget: 'input', area: 'line', width: 110 },
  { order: 18, dbField: 'REM', key: 'rem', label: '摘要', list: true, form: true, widget: 'textarea', area: 'line', minWidth: 90 },
];

export const MP_BILL_LINE3: ErpFieldMeta[] = [
  { order: 1, dbField: 'ITM', key: 'itm', label: '项', widget: 'hidden', area: 'line', width: 48 },
  { order: 2, dbField: 'PRD_NO', key: 'prd_no', label: '制造成品', list: true, form: true, required: true, widget: 'lookup', area: 'line', width: 110 },
  { order: 3, dbField: 'PRD_NAME', key: 'prd_name', label: '货品名称', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'line', minWidth: 100 },
  { order: 4, dbField: 'PRD_MARK', key: 'prd_mark', label: '货品特征', list: true, form: true, widget: 'input', area: 'line', width: 90 },
  { order: 5, dbField: 'WH', key: 'wh', label: '库位', list: true, form: true, widget: 'lookup', area: 'line', width: 90 },
  { order: 6, dbField: 'UNIT', key: 'unit', label: '单位', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'line', width: 60 },
  { order: 7, dbField: 'QTY', key: 'qty', label: '建议量', list: true, form: true, required: true, widget: 'number', area: 'line', width: 90 },
  { order: 8, dbField: 'QTY_MO', key: 'qty_mo', label: '制令量', list: true, form: true, widget: 'number', area: 'line', width: 90 },
  { order: 9, dbField: 'STA_DD', key: 'sta_dd', label: '预开工日', list: true, form: true, widget: 'date', area: 'line', width: 110 },
  { order: 10, dbField: 'END_DD', key: 'end_dd', label: '预完工日', list: true, form: true, widget: 'date', area: 'line', width: 110 },
  { order: 11, dbField: 'DEP', key: 'dep', label: '部门', list: true, form: true, widget: 'lookup', area: 'line', width: 90 },
  { order: 12, dbField: 'MO_NO', key: 'mo_no', label: '制令单号', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'line', width: 120 },
  { order: 13, dbField: 'ID_NO', key: 'id_no', label: '配方号', list: true, form: true, widget: 'lookup', area: 'line', width: 110 },
  { order: 14, dbField: 'BOM_NO', key: 'bom_no', label: '母件', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'line', width: 110 },
  { order: 15, dbField: 'SO_NO', key: 'so_no', label: '受订单号', list: true, form: true, widget: 'input', area: 'line', width: 120 },
  { order: 16, dbField: 'EST_DD', key: 'est_dd', label: '预交日', list: true, form: true, widget: 'date', area: 'line', width: 110 },
  { order: 17, dbField: 'TW_ID', key: 'tw_id', label: '托外注记', list: true, form: true, widget: 'select', area: 'line', width: 90 },
  { order: 18, dbField: 'REM', key: 'rem', label: '摘要', list: true, form: true, widget: 'textarea', area: 'line', minWidth: 90 },
];

export const MRP_ABA = {
  menuCode: 'MrpABA',
  doc: 'analysis/字段对照/生产需求分析单.md',
  head: MP_BILL_HEAD,
  line: MP_BILL_LINE1,
  linePo: MP_BILL_LINE2,
  lineMo: MP_BILL_LINE3,
};
