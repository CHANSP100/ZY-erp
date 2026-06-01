/**
 * 销货单 / 销货折让 共用字段（MF_PSS + TF_PSS 本期）
 * 同步自：analysis/字段对照/销货单.md、销货折让.md
 * 修改对照表后请同步更新本文件（# 序号、中文名称、查询/列表/表单 标记）
 */
import type { ErpFieldMeta } from './types';

export const INV_BILL_HEAD: ErpFieldMeta[] = [
  { order: 1, dbField: 'PS_DD', key: 'ps_dd', label: '日期', query: true, list: true, form: true, required: true, widget: 'date', area: 'head', width: 110 },
  { order: 2, dbField: 'PS_NO', key: 'ps_no', label: '单号', query: true, list: true, form: true, required: true, readonly: true, widget: 'input-readonly', area: 'head', width: 120 },
  { order: 3, dbField: 'CUS_NO', key: 'cus_no', label: '客户代号', query: true, list: true, form: true, required: true, widget: 'lookup', area: 'head', width: 100 },
  { order: 4, dbField: 'OS_NO', key: 'os_no', label: '转入单号', list: false, form: true, readonly: true, widget: 'input-readonly', area: 'head', minWidth: 120 },
  { order: 5, dbField: 'OS_ID', key: 'os_id', label: '转入单号区分', widget: 'hidden', area: 'head' },
  { order: 6, dbField: 'CUS_OS_NO', key: 'cus_os_no', label: '客户订单号', form: true, widget: 'lookup', area: 'head' },
  { order: 7, dbField: 'SAL_NO', key: 'sal_no', label: '业务员代号', list: true, form: true, widget: 'lookup', area: 'head', width: 100 },
  { order: 8, dbField: 'BIL_TYPE', key: 'bil_type', label: '单据类别', form: true, widget: 'lookup', area: 'head' },
  { order: 9, dbField: 'CUR_ID', key: 'cur_id', label: '币别', form: true, widget: 'lookup', area: 'head' },
  { order: 10, dbField: 'TAX_ID', key: 'tax_id', label: '扣税类别', form: true, widget: 'select', area: 'head' },
  { order: 11, dbField: 'DEP', key: 'dep', label: '部门代号', form: true, widget: 'lookup', area: 'head' },
  { order: 12, dbField: 'DIS_CNT', key: 'dis_cnt', label: '折扣', form: true, widget: 'number', area: 'head' },
  { order: 13, dbField: 'ZHANG_ID', key: 'zhang_id', label: '立帐方式', form: true, widget: 'select', area: 'head' },
  { order: 14, dbField: 'SEND_MTH', key: 'send_mth', label: '交货方式', form: true, widget: 'input', area: 'head' },
  { order: 15, dbField: 'SEND_WH', key: 'send_wh', label: '交货仓', form: true, widget: 'lookup', area: 'head' },
  { order: 16, dbField: 'ADR', key: 'adr', label: '送货地址', form: true, widget: 'textarea', area: 'head' },
  { order: 17, dbField: 'PAY_MTH', key: 'pay_mth', label: '交易方式', form: true, widget: 'input', area: 'head' },
  { order: 18, dbField: 'PAY_DAYS', key: 'pay_days', label: '付款天数', form: true, widget: 'number', area: 'head' },
  { order: 19, dbField: 'PAY_DD', key: 'pay_dd', label: '付款日期', form: true, widget: 'date', area: 'head' },
  { order: 20, dbField: 'CHK_DD', key: 'chk_dd', label: '票据日期', form: true, widget: 'date', area: 'head' },
  { order: 21, dbField: 'INV_NO', key: 'inv_no', label: '发票号码', form: true, readonly: true, widget: 'input-readonly', area: 'head' },
  { order: 22, dbField: 'RP_NO', key: 'rp_no', label: '收付款单号', form: true, readonly: true, widget: 'input-readonly', area: 'head' },
  { order: 23, dbField: 'REM', key: 'rem', label: '备注', form: true, widget: 'textarea', area: 'head' },
  { order: 24, dbField: 'PS_ID', key: 'ps_id', label: '识别代号', widget: 'hidden', area: 'head' },
  { order: 25, dbField: 'VOH_NO', key: 'voh_no', label: '凭证号码', form: true, readonly: true, widget: 'input-readonly', area: 'head' },
  { order: 26, dbField: 'CONTRACT', key: 'contract', label: '合同号', form: true, widget: 'input', area: 'head' },
];

export const INV_BILL_LINE: ErpFieldMeta[] = [
  { order: 1, dbField: 'ITM', key: 'itm', label: '项次', list: true, readonly: true, widget: 'hidden', area: 'line', width: 48 },
  { order: 2, dbField: 'PRD_NO', key: 'prd_no', label: '货品代号', list: true, form: true, required: true, widget: 'lookup', area: 'line', width: 110 },
  { order: 3, dbField: 'PRD_NAME', key: 'prd_name', label: '货品名称', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'line', minWidth: 100 },
  { order: 4, dbField: 'PRD_MARK', key: 'prd_mark', label: '货品特征', list: true, form: true, widget: 'input', area: 'line', width: 90 },
  { order: 5, dbField: 'WH', key: 'wh', label: '库位', list: true, form: true, widget: 'lookup', area: 'line', width: 100 },
  { order: 6, dbField: 'QTY', key: 'qty', label: '数量', list: true, form: true, required: true, widget: 'number', area: 'line', width: 100 },
  { order: 7, dbField: 'UNIT', key: 'ut', label: '单位', list: true, form: true, widget: 'input', area: 'line', width: 60 },
  { order: 8, dbField: 'UP', key: 'up', label: '单价', list: true, form: true, widget: 'number', area: 'line', width: 100 },
  { order: 9, dbField: 'AMTN_NET', key: 'amtn_net', label: '未税本位币', list: true, form: true, widget: 'number', area: 'line', width: 90 },
  { order: 10, dbField: 'TAX', key: 'tax', label: '税额', list: true, form: true, widget: 'number', area: 'line', width: 70 },
  { order: 11, dbField: 'TAX_RTO', key: 'tax_rto', label: '税率', list: true, form: true, widget: 'number', area: 'line', width: 70 },
  { order: 12, dbField: 'REM', key: 'rem', label: '摘要', list: true, form: true, widget: 'textarea', area: 'line', minWidth: 90 },
  { order: 13, dbField: 'EST_DD', key: 'est_dd', label: '预交日', list: true, form: true, widget: 'date', area: 'line', width: 120 },
  { order: 14, dbField: 'OS_NO', key: 'os_no', label: '转入单号', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'line', width: 100 },
  { order: 15, dbField: 'DIS_CNT', key: 'dis_cnt', label: '折扣', list: true, form: true, widget: 'number', area: 'line', width: 80 },
  { order: 16, dbField: 'QTY1', key: 'qty1', label: '副单位数量', list: true, form: true, widget: 'number', area: 'line', width: 100 },
  { order: 17, dbField: 'PS_ID', key: 'ps_id', label: '进、销、退、折识别码', list: true, widget: 'hidden', area: 'line' },
  { order: 18, dbField: 'PS_NO', key: 'ps_no', label: '单号', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'line', width: 100 },
  { order: 19, dbField: 'PS_DD', key: 'ps_dd', label: '日期', list: true, form: true, widget: 'date', area: 'line', width: 110 },
  { order: 20, dbField: 'BAT_NO', key: 'bat_no', label: '批号', list: true, form: true, widget: 'lookup', area: 'line', width: 90 },
  { order: 21, dbField: 'CST_SAL', key: 'cst_sal', label: '销售外币成本', list: true, form: true, widget: 'number', area: 'line', width: 100 },
  { order: 22, dbField: 'AMT', key: 'amt', label: '外币金额', list: true, form: true, widget: 'number', area: 'line', width: 90 },
  { order: 23, dbField: 'QTY_RTN', key: 'qty_rtn', label: '已退数量', list: true, readonly: true, widget: 'number', area: 'line', width: 90 },
  { order: 24, dbField: 'AMTN', key: 'amtn', label: '金额', list: true, form: true, widget: 'number', area: 'line', width: 90 },
  { order: 25, dbField: 'SAL_NO', key: 'sal_no', label: '主业务代号', list: true, form: true, widget: 'lookup', area: 'line', width: 100 },
];

/** 销货单 InvCA */
export const INV_CA = {
  menuCode: 'InvCA',
  doc: 'analysis/字段对照/销货单.md',
  head: INV_BILL_HEAD,
  line: INV_BILL_LINE,
};

/** 销货折让 InvCC */
export const INV_CC = {
  menuCode: 'InvCC',
  doc: 'analysis/字段对照/销货折让.md',
  head: INV_BILL_HEAD,
  line: INV_BILL_LINE,
};

/** 销货退回 InvCB */
export const INV_CB = {
  menuCode: 'InvCB',
  doc: 'analysis/字段对照/销货退回.md',
  head: INV_BILL_HEAD,
  line: INV_BILL_LINE,
};

/** 进货单 InvBA */
export const INV_BA = {
  menuCode: 'InvBA',
  doc: 'analysis/字段对照/进货单.md',
  head: INV_BILL_HEAD,
  line: INV_BILL_LINE,
};

/** 进货退回 InvBB */
export const INV_BB = {
  menuCode: 'InvBB',
  doc: 'analysis/字段对照/进货退回.md',
  head: INV_BILL_HEAD,
  line: INV_BILL_LINE,
};

/** 进货折让 InvBC */
export const INV_BC = {
  menuCode: 'InvBC',
  doc: 'analysis/字段对照/进货折让.md',
  head: INV_BILL_HEAD,
  line: INV_BILL_LINE,
};
