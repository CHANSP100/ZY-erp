/**
 * BOM物料配方输入 FasECF（MF_BOM + TF_BOM）
 * 同步自：analysis/字段对照/BOM物料配方输入.md
 */
import type { ErpFieldMeta } from './types';

export const BOM_BILL_HEAD: ErpFieldMeta[] = [
  { order: 1, dbField: 'BOM_NO', key: 'bom_no', label: 'BOM代号', query: true, list: true, form: false, widget: 'hidden', area: 'head', width: 140 },
  { order: 2, dbField: 'PRD_NO', key: 'prd_no', label: '母件品号', query: true, list: true, form: true, required: true, widget: 'lookup', area: 'head', width: 130 },
  { order: 3, dbField: 'PF_NO', key: 'pf_no', label: '版本', query: true, list: true, form: true, widget: 'input', area: 'head', width: 80 },
  { order: 4, dbField: 'NAME', key: 'name', label: '名称', list: true, form: true, widget: 'input', area: 'head', minWidth: 120 },
  { order: 5, dbField: 'PRD_MARK', key: 'prd_mark', label: '货品特征', form: true, widget: 'input', area: 'head' },
  { order: 6, dbField: 'WH_NO', key: 'wh_no', label: '仓库', list: true, form: true, widget: 'lookup', area: 'head', width: 90 },
  { order: 7, dbField: 'UNIT', key: 'unit', label: '单位', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'head', width: 60 },
  { order: 8, dbField: 'QTY', key: 'qty', label: '数量', list: true, form: true, widget: 'number', area: 'head', width: 90 },
  { order: 9, dbField: 'VALID_DD', key: 'valid_dd', label: '生效日期', list: true, form: true, widget: 'date', area: 'head', width: 110 },
  { order: 10, dbField: 'END_DD', key: 'end_dd', label: '截止日期', list: true, form: true, widget: 'date', area: 'head', width: 110 },
  { order: 11, dbField: 'DEP', key: 'dep', label: '制造部门', form: true, widget: 'lookup', area: 'head', width: 100 },
  { order: 12, dbField: 'REM', key: 'rem', label: '备注', form: true, widget: 'textarea', area: 'head' },
  { order: 13, dbField: 'SYS_DATE', key: 'sys_date', label: '创建日期', list: true, form: true, readonly: true, widget: 'date', area: 'head', width: 110 },
  { order: 14, dbField: 'USR', key: 'usr', label: '制单人', form: true, readonly: true, widget: 'input-readonly', area: 'head' },
  { order: 15, dbField: 'CHK_MAN', key: 'chk_man', label: '审核注记', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'head', width: 90 },
  { order: 16, dbField: 'CLS_DATE', key: 'cls_date', label: '终审日期', list: true, form: true, readonly: true, widget: 'date', area: 'head', width: 110 },
  { order: 17, dbField: 'SPC', key: 'spc', label: '规格', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'head', minWidth: 100 },
  { order: 18, dbField: 'PRD_KND', key: 'prd_knd', label: '类别', form: true, readonly: true, widget: 'input-readonly', area: 'head', width: 80 },
];

export const BOM_BILL_LINE: ErpFieldMeta[] = [
  { order: 1, dbField: 'ITM', key: 'itm', label: '项次', widget: 'hidden', area: 'line', width: 48 },
  { order: 2, dbField: 'PRD_NO', key: 'prd_no', label: '子件品号', list: true, form: true, required: true, widget: 'lookup', area: 'line', width: 120 },
  { order: 3, dbField: 'NAME', key: 'name', label: '名称', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'line', minWidth: 100 },
  { order: 4, dbField: 'SPC', key: 'spc', label: '规格', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'line', width: 90 },
  { order: 5, dbField: 'PRD_MARK', key: 'prd_mark', label: '货品特征', list: true, form: true, widget: 'input', area: 'line', width: 90 },
  { order: 6, dbField: 'WH_NO', key: 'wh', label: '仓号', list: true, form: true, widget: 'lookup', area: 'line', width: 90 },
  { order: 7, dbField: 'UNIT', key: 'unit', label: '单位', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'line', width: 60 },
  { order: 8, dbField: 'QTY', key: 'qty', label: '用量', list: true, form: true, required: true, widget: 'number', area: 'line', width: 100 },
  { order: 9, dbField: 'LOS_RTO', key: 'los_rto', label: '损耗率', list: true, form: true, widget: 'number', area: 'line', width: 90 },
  { order: 10, dbField: 'QTY_BAS', key: 'qty_bas', label: '基数', list: true, form: true, widget: 'number', area: 'line', width: 90 },
  { order: 11, dbField: 'BOM_ID', key: 'bom_id', label: '虚拟件', list: true, form: true, readonly: true, widget: 'input-readonly', area: 'line', width: 80 },
  { order: 12, dbField: 'REM', key: 'rem', label: '摘要', list: true, form: true, widget: 'textarea', area: 'line', minWidth: 90 },
  { order: 13, dbField: 'BOM_NO', key: 'bom_no', label: 'BOM代号', widget: 'hidden', area: 'line' },
];

export const FAS_ECF = {
  menuCode: 'FasECF',
  doc: 'analysis/字段对照/BOM物料配方输入.md',
  head: BOM_BILL_HEAD,
  line: BOM_BILL_LINE,
};
