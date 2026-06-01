/**
 * 菜单 → 业务原表映射（扩展字段 _Z 表依据）
 */
const MENU_TABLE_REGISTRY = {
  InvAD: {
    listOnly: false,
    hasLine: true,
    head: { table: 'MF_POS', keys: [{ db: 'OS_NO', col: 'os_no', type: 'varchar', len: 20 }] },
    line: {
      table: 'TF_POS',
      keys: [
        { db: 'OS_NO', col: 'os_no', type: 'varchar', len: 20 },
        { db: 'ITM', col: 'itm', type: 'int', len: null },
      ],
    },
  },
  InvAD_BILL: {
    listOnly: true,
    hasLine: false,
    head: { table: 'MF_POS', keys: [{ db: 'OS_NO', col: 'os_no', type: 'varchar', len: 20 }] },
  },
  InvAF: {
    listOnly: false,
    hasLine: true,
    head: { table: 'MF_POS', keys: [{ db: 'OS_NO', col: 'os_no', type: 'varchar', len: 20 }] },
    line: {
      table: 'TF_POS',
      keys: [
        { db: 'OS_NO', col: 'os_no', type: 'varchar', len: 20 },
        { db: 'ITM', col: 'itm', type: 'int', len: null },
      ],
    },
  },
  InvAF_BILL: {
    listOnly: true,
    hasLine: false,
    head: { table: 'MF_POS', keys: [{ db: 'OS_NO', col: 'os_no', type: 'varchar', len: 20 }] },
  },
  InvAQ: {
    listOnly: false,
    hasLine: true,
    head: { table: 'MF_SQ', keys: [{ db: 'SQ_NO', col: 'sq_no', type: 'varchar', len: 20 }] },
    line: {
      table: 'TF_SQ',
      keys: [
        { db: 'SQ_NO', col: 'sq_no', type: 'varchar', len: 20 },
        { db: 'ITM', col: 'itm', type: 'int', len: null },
      ],
    },
  },
  InvAQ_BILL: {
    listOnly: true,
    hasLine: false,
    head: { table: 'MF_SQ', keys: [{ db: 'SQ_NO', col: 'sq_no', type: 'varchar', len: 20 }] },
  },
  MrpAC: {
    listOnly: false,
    hasLine: true,
    head: { table: 'MF_MO', keys: [{ db: 'MO_NO', col: 'mo_no', type: 'varchar', len: 20 }] },
    line: {
      table: 'TF_MO',
      keys: [
        { db: 'MO_NO', col: 'mo_no', type: 'varchar', len: 20 },
        { db: 'ITM', col: 'itm', type: 'int', len: null },
      ],
    },
  },
  MrpAC_BILL: {
    listOnly: true,
    hasLine: false,
    head: { table: 'MF_MO', keys: [{ db: 'MO_NO', col: 'mo_no', type: 'varchar', len: 20 }] },
  },
  MrpAG: {
    listOnly: false,
    hasLine: true,
    head: { table: 'MF_ML', keys: [{ db: 'ML_NO', col: 'ml_no', type: 'varchar', len: 20 }] },
    line: {
      table: 'TF_ML',
      keys: [
        { db: 'ML_NO', col: 'ml_no', type: 'varchar', len: 20 },
        { db: 'ITM', col: 'itm', type: 'int', len: null },
      ],
    },
  },
  MrpAG_BILL: {
    listOnly: true,
    hasLine: false,
    head: { table: 'MF_ML', keys: [{ db: 'ML_NO', col: 'ml_no', type: 'varchar', len: 20 }] },
  },
  MrpAFC: {
    listOnly: false,
    hasLine: true,
    head: { table: 'MF_MM0', keys: [{ db: 'MM_NO', col: 'mm_no', type: 'varchar', len: 20 }] },
    line: {
      table: 'TF_MM0',
      keys: [
        { db: 'MM_NO', col: 'mm_no', type: 'varchar', len: 20 },
        { db: 'ITM', col: 'itm', type: 'int', len: null },
      ],
    },
  },
  MrpAFC_BILL: {
    listOnly: true,
    hasLine: false,
    head: { table: 'MF_MM0', keys: [{ db: 'MM_NO', col: 'mm_no', type: 'varchar', len: 20 }] },
  },
  MrpAA: {
    listOnly: false,
    hasLine: true,
    head: { table: 'MF_JH', keys: [{ db: 'JH_NO', col: 'jh_no', type: 'varchar', len: 20 }] },
    line: {
      table: 'TF_JH',
      keys: [
        { db: 'JH_NO', col: 'jh_no', type: 'varchar', len: 20 },
        { db: 'ITM', col: 'itm', type: 'int', len: null },
      ],
    },
  },
  MrpAA_BILL: {
    listOnly: true,
    hasLine: false,
    head: { table: 'MF_JH', keys: [{ db: 'JH_NO', col: 'jh_no', type: 'varchar', len: 20 }] },
  },
  MrpABA: {
    listOnly: false,
    hasLine: true,
    head: { table: 'MF_MP', keys: [{ db: 'MP_NO', col: 'mp_no', type: 'varchar', len: 20 }] },
    line: {
      table: 'TF_MP1',
      keys: [
        { db: 'MP_NO', col: 'mp_no', type: 'varchar', len: 20 },
        { db: 'ITM', col: 'itm', type: 'int', len: null },
      ],
    },
  },
  MrpABA_BILL: {
    listOnly: true,
    hasLine: false,
    head: { table: 'MF_MP', keys: [{ db: 'MP_NO', col: 'mp_no', type: 'varchar', len: 20 }] },
  },
  FasECF: {
    listOnly: false,
    hasLine: true,
    head: { table: 'MF_BOM', keys: [{ db: 'BOM_NO', col: 'bom_no', type: 'varchar', len: 38 }] },
    line: {
      table: 'TF_BOM',
      keys: [
        { db: 'BOM_NO', col: 'bom_no', type: 'varchar', len: 38 },
        { db: 'ITM', col: 'itm', type: 'int', len: null },
      ],
    },
  },
  FasECF_BILL: {
    listOnly: true,
    hasLine: false,
    head: { table: 'MF_BOM', keys: [{ db: 'BOM_NO', col: 'bom_no', type: 'varchar', len: 38 }] },
  },
  OthHZYQD: {
    listOnly: false,
    hasLine: false,
    head: { table: 'INDX', keys: [{ db: 'IDX_NO', col: 'idx_no', type: 'varchar', len: 20 }] },
  },
  FasECA: {
    listOnly: false,
    hasLine: false,
    head: { table: 'PRDT', keys: [{ db: 'PRD_NO', col: 'prd_no', type: 'varchar', len: 30 }] },
  },
  FasECG: {
    listOnly: false,
    hasLine: false,
    head: { table: 'AREA', keys: [{ db: 'AREA_NO', col: 'area_no', type: 'varchar', len: 20 }] },
  },
  FasEA: {
    listOnly: false,
    hasLine: false,
    head: { table: 'CUST', keys: [{ db: 'CUS_NO', col: 'cus_no', type: 'varchar', len: 20 }] },
  },
  FasEB: {
    listOnly: false,
    hasLine: false,
    head: { table: 'SALM', keys: [{ db: 'SAL_NO', col: 'sal_no', type: 'varchar', len: 10 }] },
  },
  FasED: {
    listOnly: false,
    hasLine: false,
    head: { table: 'DEPT', keys: [{ db: 'DEP', col: 'dep', type: 'varchar', len: 10 }] },
  },
  FasECB: {
    listOnly: false,
    hasLine: false,
    head: { table: 'MY_WH', keys: [{ db: 'WH', col: 'wh', type: 'varchar', len: 10 }] },
  },
  /** 进销单 MF_PSS / TF_PSS — 各菜单共用同一 _Z 表，按 ps_no / itm 关联 */
  InvCA: {
    listOnly: false,
    hasLine: true,
    head: { table: 'MF_PSS', keys: [{ db: 'PS_NO', col: 'ps_no', type: 'varchar', len: 20 }] },
    line: {
      table: 'TF_PSS',
      keys: [
        { db: 'PS_NO', col: 'ps_no', type: 'varchar', len: 20 },
        { db: 'ITM', col: 'itm', type: 'int', len: null },
      ],
    },
  },
  InvCB: {
    listOnly: false,
    hasLine: true,
    head: { table: 'MF_PSS', keys: [{ db: 'PS_NO', col: 'ps_no', type: 'varchar', len: 20 }] },
    line: {
      table: 'TF_PSS',
      keys: [
        { db: 'PS_NO', col: 'ps_no', type: 'varchar', len: 20 },
        { db: 'ITM', col: 'itm', type: 'int', len: null },
      ],
    },
  },
  InvCC: {
    listOnly: false,
    hasLine: true,
    head: { table: 'MF_PSS', keys: [{ db: 'PS_NO', col: 'ps_no', type: 'varchar', len: 20 }] },
    line: {
      table: 'TF_PSS',
      keys: [
        { db: 'PS_NO', col: 'ps_no', type: 'varchar', len: 20 },
        { db: 'ITM', col: 'itm', type: 'int', len: null },
      ],
    },
  },
  InvBA: {
    listOnly: false,
    hasLine: true,
    head: { table: 'MF_PSS', keys: [{ db: 'PS_NO', col: 'ps_no', type: 'varchar', len: 20 }] },
    line: {
      table: 'TF_PSS',
      keys: [
        { db: 'PS_NO', col: 'ps_no', type: 'varchar', len: 20 },
        { db: 'ITM', col: 'itm', type: 'int', len: null },
      ],
    },
  },
  InvBB: {
    listOnly: false,
    hasLine: true,
    head: { table: 'MF_PSS', keys: [{ db: 'PS_NO', col: 'ps_no', type: 'varchar', len: 20 }] },
    line: {
      table: 'TF_PSS',
      keys: [
        { db: 'PS_NO', col: 'ps_no', type: 'varchar', len: 20 },
        { db: 'ITM', col: 'itm', type: 'int', len: null },
      ],
    },
  },
  InvBC: {
    listOnly: false,
    hasLine: true,
    head: { table: 'MF_PSS', keys: [{ db: 'PS_NO', col: 'ps_no', type: 'varchar', len: 20 }] },
    line: {
      table: 'TF_PSS',
      keys: [
        { db: 'PS_NO', col: 'ps_no', type: 'varchar', len: 20 },
        { db: 'ITM', col: 'itm', type: 'int', len: null },
      ],
    },
  },
};

function getMenuMeta(menuCode) {
  const meta = MENU_TABLE_REGISTRY[menuCode];
  if (!meta) {
    return { menuCode, listOnly: true, hasLine: false, head: null, line: null };
  }
  return { menuCode, ...meta };
}

function getAreaTable(menuCode, area) {
  const meta = getMenuMeta(menuCode);
  if (area === 'line') return meta.line || null;
  return meta.head || null;
}

function zTableName(baseTable) {
  return `${String(baseTable).toUpperCase()}_Z`;
}

function resolveArea(menuCode, area) {
  const a = area === 'line' ? 'line' : 'head';
  const tbl = getAreaTable(menuCode, a);
  if (!tbl) throw new Error(a === 'line' ? '当前菜单无表身，不可添加表身字段' : '未配置原表');
  return { area: a, ...tbl, zTable: zTableName(tbl.table) };
}

module.exports = {
  MENU_TABLE_REGISTRY,
  getMenuMeta,
  getAreaTable,
  zTableName,
  resolveArea,
};
