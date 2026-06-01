/**
 * 明细网格骨架 — 菜单注册表
 *
 * 标准 5 项能力（ErpDetailGrid 内置，新菜单只需在此注册）：
 * 1. 列头筛选行 — 与表头列宽同步的筛选行
 * 2. 表头右键菜单 — 列显示设置
 * 3. 列拖动排序 — 拖拽表头调整列序并持久化
 * 4. 单元格框选复制 — 拖选 + Ctrl+C
 * 5. 列模糊查询 — 筛选行每列独立模糊匹配
 */
import type { DetailGridColumn } from '@/api/types';
import { FAS_INDX, FAS_AREA, FAS_ECA, FAS_WH, FAS_DEPT, FAS_CUST, FAS_SALM, pickList } from '@/config/fields';
import { fmtNum, fmtQty, fmtText, stopYesLabel } from '@/utils/sunlike';

const KND_LABELS: Record<string, string> = {
  '1': '商品',
  '2': '制成品',
  '3': '半成品',
  '4': '原料',
  '5': '物料',
  '6': '下脚品',
  '7': '包装物',
};

const DEPT_MAKE_ID_LABELS: Record<string, string> = {
  '1': '生产',
  '2': '管理',
  '3': '管理/生产',
};

function fmtByDisplayFormat(value: unknown, fmt: string | undefined): string {
  if (value == null || value === '') return '';
  if (fmt === 'qty') return fmtQty(value);
  if (fmt === 'price' || fmt === 'amount' || fmt === 'rate') return fmtNum(value);
  return String(value);
}

export interface DetailGridSummary {
  count: number;
  [metric: string]: number;
}

export interface DetailGridMenuConfig {
  menuCode: string;
  /** 导出/打印默认文件名 */
  title: string;
  defaultSort?: { prop: string; order: 'ascending' | 'descending' | null };
  /** 底部合计要汇总的数值字段（来自行数据 key） */
  summaryNumericFields?: string[];
  /** 自定义单元格展示；返回 undefined 则走默认格式化 */
  formatCell?: (
    row: Record<string, unknown>,
    col: DetailGridColumn,
    defaultFormat: (row: Record<string, unknown>, col: DetailGridColumn) => string
  ) => string | undefined;
}

export const DETAIL_GRID_REGISTRY: Record<string, DetailGridMenuConfig> = {
  InvAD_BILL: {
    menuCode: 'InvAD_BILL',
    title: '销售订单列表',
    defaultSort: { prop: 'os_dd', order: 'descending' },
    summaryNumericFields: ['amtn_net', 'tax'],
    formatCell(row, col, defaultFormat) {
      if (col.col_key === '__status') return String(row.__status ?? '');
      if (col.col_key === 'cus_no') {
        const name = row.cus_name;
        return name ? `${row.cus_no} ${name}` : String(row.cus_no ?? '');
      }
      if (col.col_key === 'sal_no') {
        const name = row.sal_name;
        return name ? `${row.sal_no} ${name}` : String(row.sal_no ?? '');
      }
      return defaultFormat(row, col);
    },
  },
  InvAQ_BILL: {
    menuCode: 'InvAQ_BILL',
    title: '请购单列表',
    defaultSort: { prop: 'sq_dd', order: 'descending' },
    summaryNumericFields: ['amtn'],
    formatCell(row, col, defaultFormat) {
      if (col.col_key === '__status') return String(row.__status ?? '');
      if (col.col_key === 'cus_no') {
        const name = row.cus_name;
        return name ? `${row.cus_no} ${name}` : String(row.cus_no ?? '');
      }
      if (col.col_key === 'sal_no') {
        const name = row.sal_name;
        return name ? `${row.sal_no} ${name}` : String(row.sal_no ?? '');
      }
      return defaultFormat(row, col);
    },
  },
  MrpAC_BILL: {
    menuCode: 'MrpAC_BILL',
    title: '制令单列表',
    defaultSort: { prop: 'mo_dd', order: 'descending' },
    summaryNumericFields: ['qty', 'qty_fin'],
    formatCell(row, col, defaultFormat) {
      if (col.col_key === '__status') return String(row.__status ?? '');
      if (col.col_key === 'mrp_no') {
        const name = row.mrp_name;
        const spc = row.mrp_spc;
        const parts = [row.mrp_no, name, spc].filter(Boolean);
        return parts.length ? parts.join(' ') : String(row.mrp_no ?? '');
      }
      if (col.col_key === 'wh') {
        const name = row.wh_name;
        return name ? `${row.wh} ${name}` : String(row.wh ?? '');
      }
      if (col.col_key === 'close_id') {
        return row.close_id === 'T' ? '已结案' : '未结案';
      }
      return defaultFormat(row, col);
    },
  },
  MrpAG_BILL: {
    menuCode: 'MrpAG_BILL',
    title: '生产领料列表',
    defaultSort: { prop: 'ml_dd', order: 'descending' },
    summaryNumericFields: ['qty'],
    formatCell(row, col, defaultFormat) {
      if (col.col_key === '__status') return String(row.__status ?? '');
      if (col.col_key === 'mrp_no') {
        const name = row.prd_name;
        const spc = row.mrp_spc;
        const parts = [row.mrp_no, name, spc].filter(Boolean);
        return parts.length ? parts.join(' ') : String(row.mrp_no ?? '');
      }
      if (col.col_key === 'wh_mtl') {
        const name = row.wh_mtl_name;
        return name ? `${row.wh_mtl} ${name}` : String(row.wh_mtl ?? '');
      }
      if (col.col_key === 'dep') {
        const name = row.dep_name;
        return name ? `${row.dep} ${name}` : String(row.dep ?? '');
      }
      return defaultFormat(row, col);
    },
  },
  MrpAFC_BILL: {
    menuCode: 'MrpAFC_BILL',
    title: '缴库单列表',
    defaultSort: { prop: 'mm_dd', order: 'descending' },
    formatCell(row, col, defaultFormat) {
      if (col.col_key === '__status') return String(row.__status ?? '');
      if (col.col_key === 'dep') {
        const name = row.dep_name;
        return name ? `${row.dep} ${name}` : String(row.dep ?? '');
      }
      return defaultFormat(row, col);
    },
  },
  MrpAA_BILL: {
    menuCode: 'MrpAA_BILL',
    title: '生产计划列表',
    defaultSort: { prop: 'jh_dd', order: 'descending' },
    formatCell(row, col, defaultFormat) {
      if (col.col_key === '__status') return String(row.__status ?? '');
      if (col.col_key === 'cus_no') {
        const name = row.cus_name;
        return name ? `${row.cus_no} ${name}` : String(row.cus_no ?? '');
      }
      if (col.col_key === 'dep') {
        const name = row.dep_name;
        return name ? `${row.dep} ${name}` : String(row.dep ?? '');
      }
      if (col.col_key === 'close_id') {
        return row.close_id === 'T' ? '已结案' : '未结案';
      }
      return defaultFormat(row, col);
    },
  },
  MrpABA_BILL: {
    menuCode: 'MrpABA_BILL',
    title: '生产需求分析单列表',
    defaultSort: { prop: 'mp_dd', order: 'descending' },
    formatCell(row, col, defaultFormat) {
      if (col.col_key === '__status') return String(row.__status ?? '');
      if (col.col_key === 'dep') {
        const name = row.dep_name;
        return name ? `${row.dep} ${name}` : String(row.dep ?? '');
      }
      return defaultFormat(row, col);
    },
  },
  FasECF_BILL: {
    menuCode: 'FasECF_BILL',
    title: 'BOM列表',
    defaultSort: { prop: 'sys_date', order: 'descending' },
    summaryNumericFields: ['qty'],
    formatCell(row, col, defaultFormat) {
      if (col.col_key === '__status') return String(row.__status ?? '');
      if (col.col_key === 'prd_no') {
        const name = row.name || row.prd_name;
        const spc = row.spc;
        const parts = [row.prd_no, name, spc].filter(Boolean);
        return parts.length ? parts.join(' ') : String(row.prd_no ?? '');
      }
      if (col.col_key === 'wh_no') {
        const name = row.wh_name;
        return name ? `${row.wh_no} ${name}` : String(row.wh_no ?? '');
      }
      if (col.col_key === 'prd_knd') {
        return KND_LABELS[String(row.prd_knd ?? '')] || String(row.prd_knd ?? '');
      }
      return defaultFormat(row, col);
    },
  },
  FasECF: {
    menuCode: 'FasECF',
    title: 'BOM明细列表',
    defaultSort: { prop: 'sys_date', order: 'descending' },
    summaryNumericFields: ['qty', 'los_rto', 'qty_bas'],
    formatCell(row, col, defaultFormat) {
      if (col.col_key === 'head_prd_no') {
        const name = row.head_name;
        const spc = row.spc;
        const parts = [row.head_prd_no, name].filter(Boolean);
        return parts.length ? parts.join(' ') : String(row.head_prd_no ?? '');
      }
      if (col.col_key === 'prd_no') {
        const name = row.prd_name;
        return name ? `${row.prd_no} ${name}` : String(row.prd_no ?? '');
      }
      if (col.col_key === 'wh_no') {
        const name = row.wh_name;
        return name ? `${row.wh_no} ${name}` : String(row.wh_no ?? '');
      }
      return defaultFormat(row, col);
    },
  },
  InvAF_BILL: {
    menuCode: 'InvAF_BILL',
    title: '采购单列表',
    defaultSort: { prop: 'os_dd', order: 'descending' },
    summaryNumericFields: ['amtn_net', 'tax'],
    formatCell(row, col, defaultFormat) {
      if (col.col_key === '__status') return String(row.__status ?? '');
      if (col.col_key === 'cus_no') {
        const name = row.cus_name;
        return name ? `${row.cus_no} ${name}` : String(row.cus_no ?? '');
      }
      if (col.col_key === 'sal_no') {
        const name = row.sal_name;
        return name ? `${row.sal_no} ${name}` : String(row.sal_no ?? '');
      }
      return defaultFormat(row, col);
    },
  },
  InvAF: {
    menuCode: 'InvAF',
    title: '采购单明细',
    defaultSort: { prop: 'os_dd', order: 'descending' },
    summaryNumericFields: ['qty', 'qty_open', 'amtn', 'tax'],
    formatCell(row, col, defaultFormat) {
      if (col.col_key === 'cus_no') {
        const name = row.cus_name;
        return name ? `${row.cus_no} ${name}` : String(row.cus_no ?? '');
      }
      if (col.col_key === 'sal_no') {
        const name = row.sal_name;
        return name ? `${row.sal_no} ${name}` : String(row.sal_no ?? '');
      }
      return defaultFormat(row, col);
    },
  },
  InvAD: {
    menuCode: 'InvAD',
    title: '销售订单明细',
    defaultSort: { prop: 'os_dd', order: 'descending' },
    summaryNumericFields: ['qty', 'qty_open', 'amtn', 'tax'],
    formatCell(row, col, defaultFormat) {
      if (col.col_key === 'cus_no') {
        const name = row.cus_name;
        return name ? `${row.cus_no} ${name}` : String(row.cus_no ?? '');
      }
      if (col.col_key === 'sal_no') {
        const name = row.sal_name;
        return name ? `${row.sal_no} ${name}` : String(row.sal_no ?? '');
      }
      return defaultFormat(row, col);
    },
  },
  OthHZYQD: {
    menuCode: 'OthHZYQD',
    title: '中类',
    defaultSort: { prop: 'idx_no', order: 'ascending' },
    summaryNumericFields: [],
  },
  FasECG: {
    menuCode: 'FasECG',
    title: '客户供应商区域',
    defaultSort: { prop: 'area_no', order: 'ascending' },
    summaryNumericFields: [],
  },
  FasECA: {
    menuCode: 'FasECA',
    title: '货品',
    defaultSort: { prop: 'prd_no', order: 'ascending' },
    summaryNumericFields: [],
    formatCell(row, col, defaultFormat) {
      if (col.col_key === 'knd') {
        return KND_LABELS[String(row.knd ?? '')] ?? fmtText(row.knd);
      }
      if (col.col_key === 'nouse_dd') {
        return fmtText(row.nouse_dd);
      }
      return defaultFormat(row, col);
    },
  },
  FasECB: {
    menuCode: 'FasECB',
    title: '仓库',
    defaultSort: { prop: 'wh', order: 'ascending' },
    summaryNumericFields: [],
    formatCell(row, col, defaultFormat) {
      if (col.col_key === 'dep') {
        const name = row.dep_name;
        return name ? `${row.dep} ${name}` : fmtText(row.dep);
      }
      return defaultFormat(row, col);
    },
  },
  FasED: {
    menuCode: 'FasED',
    title: '部门',
    defaultSort: { prop: 'dep', order: 'ascending' },
    summaryNumericFields: [],
    formatCell(row, col, defaultFormat) {
      if (col.col_key === 'make_id') {
        const code = String(row.make_id ?? '');
        const label = DEPT_MAKE_ID_LABELS[code];
        return label ? `${code} ${label}` : fmtText(row.make_id);
      }
      return defaultFormat(row, col);
    },
  },
  FasEB: {
    menuCode: 'FasEB',
    title: '员工',
    defaultSort: { prop: 'sal_no', order: 'ascending' },
    summaryNumericFields: [],
    formatCell(row, col, defaultFormat) {
      if (col.col_key === 'sex') {
        const labels: Record<string, string> = { T: '男', F: '女' };
        return labels[String(row.sex ?? '')] ?? fmtText(row.sex);
      }
      if (col.col_key === 'dep') {
        const name = row.dep_name;
        return name ? `${row.dep} ${name}` : fmtText(row.dep);
      }
      return defaultFormat(row, col);
    },
  },
  FasEA: {
    menuCode: 'FasEA',
    title: '客户厂商',
    defaultSort: { prop: 'cus_no', order: 'ascending' },
    summaryNumericFields: [],
    formatCell(row, col, defaultFormat) {
      if (col.col_key === 'obj_id') {
        const labels: Record<string, string> = {
          '1': '客户',
          '2': '厂商',
          '3': '客户与厂商',
        };
        return labels[String(row.obj_id ?? '')] ?? fmtText(row.obj_id);
      }
      if (col.col_key === 'sal') {
        const name = row.sal_name;
        return name ? `${row.sal} ${name}` : fmtText(row.sal);
      }
      if (col.col_key === 'sal_no') {
        const name = row.sal_no_name;
        return name ? `${row.sal_no} ${name}` : fmtText(row.sal_no);
      }
      return defaultFormat(row, col);
    },
  },
};

/** 后端列配置缺失/请求失败时的内置列（保证表格始终有列可显示） */
export function getDetailGridFallbackColumns(menuCode: string): DetailGridColumn[] {
  if (menuCode === 'OthHZYQD') {
    return pickList(FAS_INDX.main).map((f, i) => ({
      col_key: f.key,
      db_field: f.dbField,
      label: f.label,
      width: f.width,
      min_width: f.minWidth,
      sort_order: f.order ?? i + 1,
      visible_global: true,
      visible: true,
      is_system: true,
      widget: f.widget === 'number' ? 'number' : 'text',
    }));
  }
  if (menuCode === 'FasECG') {
    return pickList(FAS_AREA.main).map((f, i) => ({
      col_key: f.key,
      db_field: f.dbField,
      label: f.label,
      width: f.width,
      min_width: f.minWidth,
      sort_order: f.order ?? i + 1,
      visible_global: true,
      visible: true,
      is_system: true,
      widget: f.widget === 'number' ? 'number' : 'text',
    }));
  }
  if (menuCode === 'FasECA') {
    return pickList(FAS_ECA.main).map((f, i) => ({
      col_key: f.key,
      db_field: f.dbField,
      label: f.label,
      width: f.width,
      min_width: f.minWidth ?? (f.key === 'name' || f.key === 'spc' ? 140 : 96),
      sort_order: f.order ?? i + 1,
      visible_global: true,
      visible: true,
      is_system: true,
      widget: f.widget === 'number' ? 'number' : 'text',
    }));
  }
  if (menuCode === 'FasECB') {
    return pickList(FAS_WH.main).map((f, i) => ({
      col_key: f.key,
      db_field: f.dbField,
      label: f.label,
      width: f.width,
      min_width: f.minWidth,
      sort_order: f.order ?? i + 1,
      visible_global: true,
      visible: true,
      is_system: true,
      widget: f.widget === 'number' ? 'number' : 'text',
    }));
  }
  if (menuCode === 'FasEB') {
    return pickList(FAS_SALM.main).map((f, i) => ({
      col_key: f.key,
      db_field: f.dbField,
      label: f.label,
      width: f.width,
      min_width: f.minWidth ?? 96,
      sort_order: f.order ?? i + 1,
      visible_global: true,
      visible: true,
      is_system: true,
      widget: f.widget === 'number' ? 'number' : 'text',
    }));
  }
  if (menuCode === 'FasED') {
    return pickList(FAS_DEPT.main).map((f, i) => ({
      col_key: f.key,
      db_field: f.dbField,
      label: f.label,
      width: f.width,
      min_width: f.minWidth,
      sort_order: f.order ?? i + 1,
      visible_global: true,
      visible: true,
      is_system: true,
      widget: f.widget === 'number' ? 'number' : 'text',
    }));
  }
  if (menuCode === 'FasEA') {
    return pickList(FAS_CUST.main).map((f, i) => ({
      col_key: f.key,
      db_field: f.dbField,
      label: f.label,
      width: f.width,
      min_width: f.minWidth,
      sort_order: f.order ?? i + 1,
      visible_global: true,
      visible: true,
      is_system: true,
      widget: f.widget === 'number' ? 'number' : 'text',
    }));
  }
  return [];
}

export function getDetailGridConfig(menuCode: string): DetailGridMenuConfig {
  return (
    DETAIL_GRID_REGISTRY[menuCode] ?? {
      menuCode,
      title: menuCode,
      defaultSort: { prop: '', order: null },
      summaryNumericFields: [],
    }
  );
}

export function registerDetailGrid(config: DetailGridMenuConfig) {
  DETAIL_GRID_REGISTRY[config.menuCode] = config;
}

export function defaultFormatDetailCell(
  row: Record<string, unknown>,
  col: DetailGridColumn
): string {
  const key = col.col_key;
  const fmt = col.display_format;
  if (col.widget === 'number' || fmt === 'qty' || fmt === 'price' || fmt === 'amount' || fmt === 'rate') {
    if (fmt === 'qty' || key === 'qty' || key === 'qty_ps' || key === 'qty_open') return fmtQty(row[key]);
    return fmtNum(row[key]);
  }
  if (fmt && fmt !== 'text') {
    return fmtByDisplayFormat(row[key], fmt);
  }
  const v = row[key];
  return v == null ? '' : String(v);
}
