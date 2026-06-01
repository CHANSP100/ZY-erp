import { api } from '@/api';
import type { LookupConfig, LookupPresetKey } from '@/types/lookup';

async function fetchRow<T extends Record<string, unknown>>(
  fn: () => Promise<{ data: T }>
): Promise<Record<string, unknown> | null> {
  try {
    const { data } = await fn();
    return data as unknown as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** 档案类开窗预设：页面传入 :data；异步类在 preset 内配置 loader */
export const LOOKUP_PRESETS: Record<LookupPresetKey, LookupConfig> = {
  dept: {
    title: '选择部门',
    rowKey: 'dep',
    valueKey: 'dep',
    searchKeys: ['dep', 'name', 'eng_name'],
    columns: [
      { prop: 'dep', label: 'DEP', width: 100 },
      { prop: 'name', label: 'NAME', minWidth: 140 },
      { prop: 'eng_name', label: 'ENG_NAME', minWidth: 120, defaultVisible: false },
      { prop: 'up', label: 'UP', width: 80, defaultVisible: false },
    ],
    resolveByCode: (code) => fetchRow(() => api.getDept(code)),
  },
  warehouse: {
    title: '选择仓库',
    rowKey: 'wh',
    valueKey: 'wh',
    searchKeys: ['wh', 'name', 'dep'],
    columns: [
      { prop: 'wh', label: 'WH', width: 100 },
      { prop: 'name', label: 'NAME', minWidth: 140 },
      { prop: 'dep', label: 'DEP', width: 80, defaultVisible: false },
      { prop: 'dep_name', label: 'DEP_NAME', minWidth: 120, defaultVisible: false },
    ],
    resolveByCode: (code) => fetchRow(() => api.getWh(code)),
  },
  cust: {
    title: '选择客户',
    rowKey: 'cus_no',
    valueKey: 'cus_no',
    searchKeys: ['cus_no', 'name', 'snm'],
    columns: [
      { prop: 'cus_no', label: 'CUS_NO', width: 100 },
      { prop: 'name', label: 'NAME', minWidth: 160 },
      { prop: 'snm', label: 'SNM', minWidth: 120, defaultVisible: false },
      { prop: 'tel1', label: 'TEL1', width: 110, defaultVisible: false },
    ],
    resolveByCode: (code) => fetchRow(() => api.getCust(code)),
  },
  salm: {
    title: '选择业务员',
    rowKey: 'sal_no',
    valueKey: 'sal_no',
    searchKeys: ['sal_no', 'name', 'dep'],
    columns: [
      { prop: 'sal_no', label: 'SAL_NO', width: 100 },
      { prop: 'name', label: 'NAME', minWidth: 140 },
      { prop: 'dep', label: 'DEP', width: 80, defaultVisible: false },
      { prop: 'dep_name', label: 'DEP_NAME', minWidth: 120, defaultVisible: false },
      { prop: 'tel1', label: 'TEL1', width: 110, defaultVisible: false },
    ],
    resolveByCode: (code) => fetchRow(() => api.getSalm(code)),
  },
  product: {
    title: '选择货品',
    rowKey: 'prd_no',
    valueKey: 'prd_no',
    searchKeys: ['prd_no', 'name', 'spc', 'snm'],
    columns: [
      { prop: 'prd_no', label: 'PRD_NO', width: 110 },
      { prop: 'name', label: 'NAME', minWidth: 140 },
      { prop: 'spc', label: 'SPC', width: 90 },
      { prop: 'snm', label: 'SNM', minWidth: 100, defaultVisible: false },
      { prop: 'ut', label: 'UT', width: 70, defaultVisible: false },
      { prop: 'wh', label: 'WH', width: 80, defaultVisible: false },
    ],
    resolveByCode: (code) => fetchRow(() => api.getProduct(code)),
  },
  productBomParent: {
    title: '选择母件品号',
    rowKey: 'prd_no',
    valueKey: 'prd_no',
    searchKeys: ['prd_no', 'name', 'spc'],
    columns: [
      { prop: 'prd_no', label: 'PRD_NO', width: 110 },
      { prop: 'name', label: 'NAME', minWidth: 140 },
      { prop: 'spc', label: 'SPC', width: 90 },
      { prop: 'snm', label: 'SNM', minWidth: 100, defaultVisible: false },
    ],
    resolveByCode: (code) => fetchRow(() => api.getProduct(code)),
  },
  indx: {
    title: '选择中类',
    rowKey: 'idx_no',
    valueKey: 'idx_no',
    searchKeys: ['idx_no', 'name'],
    columns: [
      { prop: 'idx_no', label: 'IDX_NO', width: 100 },
      { prop: 'name', label: 'NAME', minWidth: 140 },
    ],
    resolveByCode: (code) => fetchRow(() => api.getIndx(code)),
  },
  area: {
    title: '选择区域',
    rowKey: 'area_no',
    valueKey: 'area_no',
    searchKeys: ['area_no', 'name'],
    columns: [
      { prop: 'area_no', label: 'AREA_NO', width: 100 },
      { prop: 'name', label: 'NAME', minWidth: 140 },
    ],
    resolveByCode: (code) => fetchRow(() => api.getArea(code)),
  },
  currency: {
    title: '选择币别',
    rowKey: 'cur_id',
    valueKey: 'cur_id',
    searchKeys: ['cur_id', 'name'],
    columns: [
      { prop: 'cur_id', label: 'CUR_ID', width: 90 },
      { prop: 'name', label: 'NAME', minWidth: 140 },
      { prop: 'exc_rto', label: 'EXC_RTO', width: 100, defaultVisible: false },
    ],
    loadErrorMessage: '币别加载失败',
    loader: async () => {
      const { data } = await api.curList();
      return data as unknown as Record<string, unknown>[];
    },
    resolveByCode: (code) => fetchRow(() => api.getCurr(code)),
  },
  prdtUt: {
    title: '选择主单位',
    rowKey: 'ut',
    valueKey: 'ut',
    interaction: 'confirm',
    width: 520,
    searchKeys: ['ut'],
    columns: [{ prop: 'ut', label: 'UT', minWidth: 160 }],
    loadErrorMessage: '单位加载失败',
    loader: async () => {
      const { data } = await api.prdtUtList();
      return data as unknown as Record<string, unknown>[];
    },
  },
  bilSpcSales: {
    title: '选择单据类别',
    rowKey: 'spc_no',
    valueKey: 'spc_no',
    interaction: 'confirm',
    width: 640,
    searchKeys: ['spc_no', 'name', 'rem'],
    columns: [
      { prop: 'spc_no', label: 'SPC_NO', width: 100 },
      { prop: 'name', label: 'NAME', minWidth: 140 },
      { prop: 'rem', label: 'REM', minWidth: 120 },
    ],
    loadErrorMessage: '单据类别加载失败',
    loader: async () => {
      const { data } = await api.bilSpcList();
      return data as unknown as Record<string, unknown>[];
    },
  },
};

