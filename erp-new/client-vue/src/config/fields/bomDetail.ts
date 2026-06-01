/**
 * BOM 明细列表（MF_BOM + TF_BOM 行级展开）FasECF
 */
import type { ErpFieldMeta } from './types';

export const BOM_DETAIL_LINE: ErpFieldMeta[] = [
  { order: 1, dbField: 'SYS_DATE', key: 'sys_date', label: '创建日期', list: true, area: 'head', width: 110 },
  { order: 2, dbField: 'BOM_NO', key: 'bom_no', label: 'BOM代号', query: true, list: true, area: 'head', width: 140 },
  { order: 3, dbField: 'PRD_NO', key: 'head_prd_no', label: '母件品号', query: true, list: true, area: 'head', width: 130 },
  { order: 4, dbField: 'PF_NO', key: 'pf_no', label: '版本', list: true, area: 'head', width: 80 },
  { order: 5, dbField: 'NAME', key: 'head_name', label: '母件名称', list: true, area: 'head', minWidth: 120 },
  { order: 6, dbField: 'VALID_DD', key: 'valid_dd', label: '生效日期', list: true, area: 'head', width: 110 },
  { order: 7, dbField: 'ITM', key: 'itm', label: '项次', list: true, area: 'line', width: 56 },
  { order: 8, dbField: 'PRD_NO', key: 'prd_no', label: '子件品号', query: true, list: true, area: 'line', width: 120 },
  { order: 9, dbField: 'NAME', key: 'prd_name', label: '名称', list: true, area: 'line', minWidth: 100 },
  { order: 10, dbField: 'SPC', key: 'spc', label: '规格', list: true, area: 'line', width: 90 },
  { order: 11, dbField: 'PRD_MARK', key: 'prd_mark', label: '货品特征', list: true, area: 'line', width: 90 },
  { order: 12, dbField: 'WH_NO', key: 'wh_no', label: '仓号', list: true, area: 'line', width: 90 },
  { order: 13, dbField: 'UNIT', key: 'unit', label: '单位', list: true, area: 'line', width: 60 },
  { order: 14, dbField: 'QTY', key: 'qty', label: '用量', list: true, area: 'line', width: 90 },
  { order: 15, dbField: 'LOS_RTO', key: 'los_rto', label: '损耗率', list: true, area: 'line', width: 90 },
  { order: 16, dbField: 'QTY_BAS', key: 'qty_bas', label: '基数', list: true, area: 'line', width: 90 },
  { order: 17, dbField: 'BOM_ID', key: 'bom_id', label: '虚拟件', list: true, area: 'line', width: 80 },
  { order: 18, dbField: 'REM', key: 'line_rem', label: '摘要', list: true, area: 'line', minWidth: 90 },
];

export const FAS_ECF_DETAIL = {
  menuCode: 'FasECF',
  doc: 'analysis/字段对照/BOM物料配方输入.md',
  line: BOM_DETAIL_LINE,
};
