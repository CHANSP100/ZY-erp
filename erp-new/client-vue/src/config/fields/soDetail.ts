/**
 * 销售订单明细（MF_POS + TF_POS 行级展开）
 * 同步自：analysis/字段对照/受订单.md 表头/表身「列表=是」
 */
import type { ErpFieldMeta } from './types';

export const SO_DETAIL_LINE: ErpFieldMeta[] = [
  { order: 1, dbField: 'OS_DD', key: 'os_dd', label: '日期', list: true, area: 'head', width: 110 },
  { order: 2, dbField: 'OS_NO', key: 'os_no', label: '单号', query: true, list: true, area: 'head', width: 120 },
  { order: 3, dbField: 'CUS_NO', key: 'cus_no', label: '客户代号', query: true, list: true, area: 'head', width: 100 },
  { order: 4, dbField: 'CUS_OS_NO', key: 'cus_os_no', label: '客户订单号', list: true, area: 'head', width: 110 },
  { order: 5, dbField: 'SAL_NO', key: 'sal_no', label: '业务人员', list: true, area: 'head', width: 90 },
  { order: 6, dbField: 'ITM', key: 'itm', label: '项次', list: true, area: 'line', width: 56 },
  { order: 7, dbField: 'PRD_NO', key: 'prd_no', label: '品号', query: true, list: true, area: 'line', width: 110 },
  { order: 8, dbField: 'PRD_NAME', key: 'prd_name', label: '品名', list: true, area: 'line', minWidth: 120 },
  { order: 9, dbField: 'SPC', key: 'spc', label: '规格', list: true, area: 'line', width: 90 },
  { order: 10, dbField: 'SUP_PRD_NO', key: 'sup_prd_no', label: '对方货号', list: true, area: 'line', width: 100 },
  { order: 11, dbField: 'WH', key: 'wh', label: '仓库', list: true, area: 'line', width: 80 },
  { order: 12, dbField: 'QTY', key: 'qty', label: '数量', list: true, area: 'line', width: 90 },
  { order: 13, dbField: 'QTY_PS', key: 'qty_ps', label: '已交量', list: true, area: 'line', width: 90 },
  { order: 14, dbField: 'QTY_OPEN', key: 'qty_open', label: '未交量', list: true, area: 'line', width: 90 },
  { order: 15, dbField: 'UNIT', key: 'ut', label: '单位', list: true, area: 'line', width: 60 },
  { order: 16, dbField: 'UP', key: 'up', label: '单价', list: true, area: 'line', width: 90 },
  { order: 17, dbField: 'AMTN', key: 'amtn', label: '未税', list: true, area: 'line', width: 90 },
  { order: 18, dbField: 'TAX', key: 'tax', label: '税额', list: true, area: 'line', width: 80 },
  { order: 19, dbField: 'TAX_RTO', key: 'tax_rto', label: '税率', list: true, area: 'line', width: 70 },
  { order: 20, dbField: 'EST_DD', key: 'line_est_dd', label: '预交日', list: true, area: 'line', width: 110 },
  { order: 21, dbField: 'CLS_ID', key: 'cls_id', label: '结案', list: true, area: 'head', width: 64 },
  { order: 22, dbField: 'REM', key: 'line_rem', label: '摘要', list: true, area: 'line', minWidth: 100 },
];

export const INV_AD_DETAIL = {
  menuCode: 'InvAD',
  doc: 'analysis/字段对照/受订单.md',
  line: SO_DETAIL_LINE,
};
