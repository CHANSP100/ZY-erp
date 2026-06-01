/** 侧栏菜单 ↔ SUNLIKE PGM（与 DEV-06 / server/permissions.js 一致） */

export type MenuGroup = 'base' | 'bom' | 'sales' | 'purchase' | 'manufacturing' | 'system';



export interface MenuChildItem {

  path: string;

  title: string;

  listTab: 'bill' | 'detail';

}



export interface MenuRouteItem {

  path: string;

  pgm: string;

  title: string;

  group: MenuGroup;

  /** 单据类双列表页：bill=列表 / detail=明细列表 */
  listTab?: 'bill' | 'detail';

  /** 三级子菜单（有 children 时 path 仅作分组索引） */
  children?: MenuChildItem[];

}



export const MENU_ROUTES: MenuRouteItem[] = [

  { path: '/indx', pgm: 'OthHZYQD', title: '中类', group: 'base' },

  { path: '/prdt', pgm: 'FasECA', title: '货品', group: 'base' },

  { path: '/area', pgm: 'FasECG', title: '客户供应商区域', group: 'base' },

  { path: '/cust', pgm: 'FasEA', title: '客户厂商', group: 'base' },

  { path: '/dept', pgm: 'FasED', title: '部门', group: 'base' },

  { path: '/wh', pgm: 'FasECB', title: '仓库', group: 'base' },

  { path: '/salm', pgm: 'FasEB', title: '员工', group: 'base' },

  { path: '/fasecf/list', pgm: 'FasECF', title: 'BOM列表', group: 'bom', listTab: 'bill' },

  { path: '/fasecf/tree', pgm: 'FasECF', title: 'BOM明细列表', group: 'bom', listTab: 'detail' },

  { path: '/so', pgm: 'InvAD', title: '销售订单', group: 'sales' },

  { path: '/sa', pgm: 'InvCA', title: '销货单', group: 'sales' },

  { path: '/invcc', pgm: 'InvCC', title: '销货折让', group: 'sales' },

  { path: '/sb', pgm: 'InvCB', title: '销货退回', group: 'sales' },

  { path: '/sq', pgm: 'InvAQ', title: '请购单', group: 'purchase' },

  { path: '/po', pgm: 'InvAF', title: '采购单', group: 'purchase' },

  { path: '/pc', pgm: 'InvBA', title: '进货单', group: 'purchase' },

  { path: '/invbc', pgm: 'InvBC', title: '进货折让', group: 'purchase' },

  { path: '/pb', pgm: 'InvBB', title: '进货退回', group: 'purchase' },

  { path: '/mo', pgm: 'MrpAC', title: '制令单', group: 'manufacturing' },

  { path: '/mrpag', pgm: 'MrpAG', title: '生产领料', group: 'manufacturing' },

  { path: '/mrpafc', pgm: 'MrpAFC', title: '缴库单', group: 'manufacturing' },

  { path: '/mrpaa', pgm: 'MrpAA', title: '生产计划', group: 'manufacturing' },

  { path: '/mrpaba', pgm: 'MrpABA', title: '生产需求分析单', group: 'manufacturing' },

  { path: '/sys/auth', pgm: 'SysAuth', title: '权限设置', group: 'system' },

];



export const MENU_GROUP_LABEL: Record<MenuGroup, string> = {

  base: '基础资料',

  bom: 'BOM',

  sales: '销售',

  purchase: '进货',

  manufacturing: '生产',

  system: '系统管理',

};



export function pathToPgm(path: string): string | undefined {

  if (path === '/fasecf' || path.startsWith('/fasecf/')) return 'FasECF';

  const hit = MENU_ROUTES.find((m) => m.path === path);

  if (hit) return hit.pgm;

  for (const m of MENU_ROUTES) {

    if (m.children?.some((c) => c.path === path)) return m.pgm;

  }

  return undefined;

}



export function menuTitleForPath(path: string): string | undefined {

  for (const m of MENU_ROUTES) {

    const child = m.children?.find((c) => c.path === path);

    if (child) return child.title;

    if (m.path === path) return m.title;

  }

  return undefined;

}



export function listTabForPath(path: string): 'bill' | 'detail' | undefined {

  for (const m of MENU_ROUTES) {

    if (m.path === path && m.listTab) return m.listTab;

    const child = m.children?.find((c) => c.path === path);

    if (child) return child.listTab;

  }

  if (path === '/fasecf' || path === '/fasecf/list') return 'bill';

  if (path === '/fasecf/tree' || path === '/fasecf/lines') return 'detail';

  return undefined;

}

