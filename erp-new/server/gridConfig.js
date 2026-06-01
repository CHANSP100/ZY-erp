/**
 * 明细表列配置 — 全局 / 个人 / SQL 扩展字段 / _Z 物理字段
 */
const { db } = require('./db');
const { translateSunlikeSqlExpr, listSunlikeSqlFields } = require('./sunlikeSqlExpr');
const { getMenuMeta } = require('./menuTableRegistry');
const { addZColumn, colKeyToDbField } = require('./extField');

const SQ_BILL_LIST_SEED = [
  { col_key: '__status', db_field: '', label: '状态', width: 88, sort_order: 1 },
  { col_key: 'sq_dd', db_field: 'SQ_DD', label: '请购日期', width: 110, sort_order: 2 },
  { col_key: 'sq_no', db_field: 'SQ_NO', label: '请购单号', width: 120, sort_order: 3 },
  { col_key: 'est_dd', db_field: 'EST_DD', label: '预交日', width: 110, sort_order: 4 },
  { col_key: 'cus_no', db_field: 'CUS_NO', label: '采购对象', width: 120, sort_order: 5 },
  { col_key: 'sal_no', db_field: 'SAL_NO', label: '请购人', width: 100, sort_order: 6 },
  { col_key: 'amtn', db_field: 'AMTN', label: '预估合计', width: 100, sort_order: 7, widget: 'number' },
];

const MO_BILL_LIST_SEED = [
  { col_key: '__status', db_field: '', label: '状态', width: 88, sort_order: 1 },
  { col_key: 'mo_dd', db_field: 'MO_DD', label: '制单日期', width: 110, sort_order: 2 },
  { col_key: 'mo_no', db_field: 'MO_NO', label: '制令单号', width: 120, sort_order: 3 },
  { col_key: 'sta_dd', db_field: 'STA_DD', label: '预开工日', width: 110, sort_order: 4 },
  { col_key: 'end_dd', db_field: 'END_DD', label: '预完工日', width: 110, sort_order: 5 },
  { col_key: 'mrp_no', db_field: 'MRP_NO', label: '制造成品', width: 140, sort_order: 6 },
  { col_key: 'qty', db_field: 'QTY', label: '数量', width: 90, sort_order: 7, widget: 'number' },
  { col_key: 'wh', db_field: 'WH', label: '库位', width: 90, sort_order: 8 },
  { col_key: 'bil_type', db_field: 'BIL_TYPE', label: '单据类别', width: 90, sort_order: 9 },
  { col_key: 'qty_fin', db_field: 'QTY_FIN', label: '已缴库量', width: 90, sort_order: 10, widget: 'number' },
];

const MM_BILL_LIST_SEED = [
  { col_key: '__status', db_field: '', label: '状态', width: 88, sort_order: 1 },
  { col_key: 'mm_dd', db_field: 'MM_DD', label: '缴库日期', width: 110, sort_order: 2 },
  { col_key: 'mm_no', db_field: 'MM_NO', label: '缴库单号', width: 120, sort_order: 3 },
  { col_key: 'mo_no', db_field: 'MO_NO', label: '制令单号', width: 120, sort_order: 4 },
  { col_key: 'dep', db_field: 'DEP', label: '生产部门', width: 90, sort_order: 5 },
  { col_key: 'bil_type', db_field: 'BIL_TYPE', label: '单据类别', width: 90, sort_order: 6 },
  { col_key: 'usr_no', db_field: 'USR_NO', label: '经办人', width: 90, sort_order: 7 },
];

const JH_BILL_LIST_SEED = [
  { col_key: '__status', db_field: '', label: '状态', width: 88, sort_order: 1 },
  { col_key: 'jh_dd', db_field: 'JH_DD', label: '计划日期', width: 110, sort_order: 2 },
  { col_key: 'jh_no', db_field: 'JH_NO', label: '计划单号', width: 120, sort_order: 3 },
  { col_key: 'so_no', db_field: 'SO_NO', label: '受订单号', width: 120, sort_order: 4 },
  { col_key: 'cus_no', db_field: 'CUS_NO', label: '客户', width: 120, sort_order: 5 },
  { col_key: 'dep', db_field: 'DEP', label: '部门', width: 90, sort_order: 6 },
  { col_key: 'est_dd', db_field: 'EST_DD', label: '需求日期', width: 110, sort_order: 7 },
  { col_key: 'bil_type', db_field: 'BIL_TYPE', label: '单据类别', width: 90, sort_order: 8 },
  { col_key: 'close_id', db_field: 'CLOSE_ID', label: '结案', width: 80, sort_order: 9 },
];

const MP_BILL_LIST_SEED = [
  { col_key: '__status', db_field: '', label: '状态', width: 88, sort_order: 1 },
  { col_key: 'mp_dd', db_field: 'MP_DD', label: '分析日期', width: 110, sort_order: 2 },
  { col_key: 'mp_no', db_field: 'MP_NO', label: '分析单号', width: 120, sort_order: 3 },
  { col_key: 'so_no', db_field: 'SO_NO', label: '受订单号', width: 120, sort_order: 4 },
  { col_key: 'est_dd', db_field: 'EST_DD', label: '需求日期', width: 110, sort_order: 5 },
  { col_key: 'dep', db_field: 'DEP', label: '部门', width: 90, sort_order: 6 },
  { col_key: 'bil_type', db_field: 'BIL_TYPE', label: '单据类别', width: 90, sort_order: 7 },
  { col_key: 'chk_man', db_field: 'CHK_MAN', label: '审核人', width: 90, sort_order: 8 },
];

const ML_BILL_LIST_SEED = [
  { col_key: '__status', db_field: '', label: '状态', width: 88, sort_order: 1 },
  { col_key: 'ml_dd', db_field: 'ML_DD', label: '领料日期', width: 110, sort_order: 2 },
  { col_key: 'ml_no', db_field: 'ML_NO', label: '领料单号', width: 120, sort_order: 3 },
  { col_key: 'mo_no', db_field: 'MO_NO', label: '制令单号', width: 120, sort_order: 4 },
  { col_key: 'mrp_no', db_field: 'MRP_NO', label: '成品代号', width: 130, sort_order: 5 },
  { col_key: 'prd_name', db_field: 'PRD_NAME', label: '成品名称', min_width: 120, sort_order: 6 },
  { col_key: 'qty', db_field: 'QTY', label: '数量', width: 90, sort_order: 7, widget: 'number' },
  { col_key: 'wh_mtl', db_field: 'WH_MTL', label: '原料库', width: 90, sort_order: 8 },
  { col_key: 'dep', db_field: 'DEP', label: '部门', width: 90, sort_order: 9 },
  { col_key: 'bil_type', db_field: 'BIL_TYPE', label: '单据类别', width: 90, sort_order: 10 },
];

const BOM_DETAIL_SEED = [
  { col_key: 'sys_date', db_field: 'SYS_DATE', label: '创建日期', width: 110, sort_order: 1 },
  { col_key: 'bom_no', db_field: 'BOM_NO', label: 'BOM代号', width: 140, sort_order: 2 },
  { col_key: 'head_prd_no', db_field: 'PRD_NO', label: '母件品号', width: 130, sort_order: 3 },
  { col_key: 'pf_no', db_field: 'PF_NO', label: '版本', width: 80, sort_order: 4 },
  { col_key: 'head_name', db_field: 'NAME', label: '母件名称', min_width: 120, sort_order: 5 },
  { col_key: 'valid_dd', db_field: 'VALID_DD', label: '生效日期', width: 110, sort_order: 6 },
  { col_key: 'itm', db_field: 'ITM', label: '项次', width: 56, sort_order: 7 },
  { col_key: 'prd_no', db_field: 'PRD_NO', label: '子件品号', width: 120, sort_order: 8 },
  { col_key: 'prd_name', db_field: 'NAME', label: '名称', min_width: 100, sort_order: 9 },
  { col_key: 'spc', db_field: 'SPC', label: '规格', width: 90, sort_order: 10 },
  { col_key: 'prd_mark', db_field: 'PRD_MARK', label: '货品特征', width: 90, sort_order: 11 },
  { col_key: 'wh_no', db_field: 'WH_NO', label: '仓号', width: 90, sort_order: 12 },
  { col_key: 'unit', db_field: 'UNIT', label: '单位', width: 60, sort_order: 13 },
  { col_key: 'qty', db_field: 'QTY', label: '用量', width: 90, sort_order: 14, widget: 'number' },
  { col_key: 'los_rto', db_field: 'LOS_RTO', label: '损耗率', width: 90, sort_order: 15, widget: 'number' },
  { col_key: 'qty_bas', db_field: 'QTY_BAS', label: '基数', width: 90, sort_order: 16, widget: 'number' },
  { col_key: 'bom_id', db_field: 'BOM_ID', label: '虚拟件', width: 80, sort_order: 17 },
  { col_key: 'line_rem', db_field: 'REM', label: '摘要', min_width: 90, sort_order: 18 },
];

const BOM_BILL_LIST_SEED = [
  { col_key: '__status', db_field: '', label: '状态', width: 88, sort_order: 1 },
  { col_key: 'bom_no', db_field: 'BOM_NO', label: 'BOM代号', width: 140, sort_order: 2 },
  { col_key: 'prd_no', db_field: 'PRD_NO', label: '母件品号', width: 130, sort_order: 3 },
  { col_key: 'pf_no', db_field: 'PF_NO', label: '版本', width: 80, sort_order: 4 },
  { col_key: 'name', db_field: 'NAME', label: '名称', min_width: 120, sort_order: 5 },
  { col_key: 'qty', db_field: 'QTY', label: '数量', width: 90, sort_order: 6, widget: 'number' },
  { col_key: 'wh_no', db_field: 'WH_NO', label: '仓号', width: 90, sort_order: 7 },
  { col_key: 'valid_dd', db_field: 'VALID_DD', label: '生效日期', width: 110, sort_order: 8 },
  { col_key: 'end_dd', db_field: 'END_DD', label: '截止日期', width: 110, sort_order: 9 },
  { col_key: 'sys_date', db_field: 'SYS_DATE', label: '创建日期', width: 110, sort_order: 10 },
  { col_key: 'chk_man', db_field: 'CHK_MAN', label: '审核注记', width: 90, sort_order: 11 },
];

const SO_BILL_LIST_SEED = [
  { col_key: '__status', db_field: '', label: '状态', width: 88, sort_order: 1 },
  { col_key: 'os_dd', db_field: 'OS_DD', label: '日期', width: 110, sort_order: 2 },
  { col_key: 'os_no', db_field: 'OS_NO', label: '单号', width: 120, sort_order: 3 },
  { col_key: 'est_dd', db_field: 'EST_DD', label: '预交日', width: 110, sort_order: 4 },
  { col_key: 'cus_no', db_field: 'CUS_NO', label: '客户代号', width: 120, sort_order: 5 },
  { col_key: 'sal_no', db_field: 'SAL_NO', label: '业务人员', width: 100, sort_order: 6 },
  { col_key: 'amtn_net', db_field: 'AMTN_NET', label: '未税合计', width: 100, sort_order: 7, widget: 'number' },
  { col_key: 'tax', db_field: 'TAX', label: '税额', width: 80, sort_order: 8, widget: 'number' },
];

const SO_DETAIL_SEED = [
  { col_key: 'os_dd', db_field: 'OS_DD', label: '日期', width: 110, sort_order: 1 },
  { col_key: 'os_no', db_field: 'OS_NO', label: '单号', width: 120, sort_order: 2 },
  { col_key: 'cus_no', db_field: 'CUS_NO', label: '客户代号', width: 120, sort_order: 3 },
  { col_key: 'cus_os_no', db_field: 'CUS_OS_NO', label: '客户订单号', width: 110, sort_order: 4 },
  { col_key: 'sal_no', db_field: 'SAL_NO', label: '业务人员', width: 90, sort_order: 5 },
  { col_key: 'itm', db_field: 'ITM', label: '项次', width: 56, sort_order: 6 },
  { col_key: 'prd_no', db_field: 'PRD_NO', label: '品号', width: 110, sort_order: 7 },
  { col_key: 'prd_name', db_field: 'PRD_NAME', label: '品名', width: 140, min_width: 140, sort_order: 8 },
  { col_key: 'spc', db_field: 'SPC', label: '规格', width: 90, sort_order: 9 },
  { col_key: 'sup_prd_no', db_field: 'SUP_PRD_NO', label: '对方货号', width: 100, sort_order: 10 },
  { col_key: 'wh', db_field: 'WH', label: '仓库', width: 80, sort_order: 11 },
  { col_key: 'qty', db_field: 'QTY', label: '数量', width: 90, sort_order: 12, widget: 'number' },
  { col_key: 'qty_ps', db_field: 'QTY_PS', label: '已交量', width: 90, sort_order: 13, widget: 'number' },
  { col_key: 'qty_open', db_field: 'QTY_OPEN', label: '未交量', width: 90, sort_order: 14, widget: 'number' },
  { col_key: 'ut', db_field: 'UNIT', label: '单位', width: 60, sort_order: 15 },
  { col_key: 'up', db_field: 'UP', label: '单价', width: 90, sort_order: 16, widget: 'number' },
  { col_key: 'amtn', db_field: 'AMTN', label: '未税', width: 90, sort_order: 17, widget: 'number' },
  { col_key: 'tax', db_field: 'TAX', label: '税额', width: 80, sort_order: 18, widget: 'number' },
  { col_key: 'tax_rto', db_field: 'TAX_RTO', label: '税率', width: 70, sort_order: 19, widget: 'number' },
  { col_key: 'line_est_dd', db_field: 'EST_DD', label: '预交日', width: 110, sort_order: 20 },
  { col_key: 'cls_id', db_field: 'CLS_ID', label: '结案', width: 64, sort_order: 21 },
  { col_key: 'line_rem', db_field: 'REM', label: '摘要', width: 120, min_width: 120, sort_order: 22 },
];

const INDX_LIST_SEED = [
  { col_key: 'idx_no', db_field: 'IDX_NO', label: '中类代号', width: 120, min_width: 120, sort_order: 1 },
  { col_key: 'name', db_field: 'NAME', label: '名称', min_width: 140, sort_order: 2 },
  { col_key: 'idx_up', db_field: 'IDX_UP', label: '上层中类', width: 120, min_width: 120, sort_order: 3 },
  { col_key: 'stop_dd', db_field: 'STOP_DD', label: '停用日期', width: 120, sort_order: 4 },
  { col_key: 'rem', db_field: 'REM', label: '备注', min_width: 160, sort_order: 5 },
];

const AREA_LIST_SEED = [
  { col_key: 'area_no', db_field: 'AREA_NO', label: '区域代号', width: 120, min_width: 120, sort_order: 1 },
  { col_key: 'name', db_field: 'NAME', label: '名称', min_width: 140, sort_order: 2 },
  { col_key: 'area_up', db_field: 'AREA_UP', label: '上层区域', width: 120, min_width: 120, sort_order: 3 },
  { col_key: 'stop_dd', db_field: 'STOP_DD', label: '停用日期', width: 120, sort_order: 4 },
  { col_key: 'rem', db_field: 'REM', label: '备注', min_width: 160, sort_order: 5 },
];

/** 货品 FasECA — 与 fasECA.ts list:true 及字段对照表一致 */
const PRDT_LIST_SEED = [
  { col_key: 'idx1', db_field: 'IDX1', label: '中类代号', width: 100, sort_order: 1 },
  { col_key: 'prd_no', db_field: 'PRD_NO', label: '货品代号', width: 120, min_width: 120, sort_order: 2 },
  { col_key: 'knd', db_field: 'KND', label: '大类', width: 80, sort_order: 3 },
  { col_key: 'name', db_field: 'NAME', label: '名称', min_width: 140, sort_order: 4 },
  { col_key: 'spc', db_field: 'SPC', label: '规格', min_width: 140, sort_order: 5 },
  { col_key: 'snm', db_field: 'SNM', label: '简称', width: 96, sort_order: 6 },
  { col_key: 'ut', db_field: 'UT', label: '主单位', width: 80, sort_order: 7 },
  { col_key: 'wh', db_field: 'WH', label: '预设仓库', width: 96, sort_order: 8 },
  { col_key: 'nouse_dd', db_field: 'NOUSE_DD', label: '停用日期', width: 110, sort_order: 9 },
];

const MENU_SEEDS = {
  InvAD: SO_DETAIL_SEED,
  InvAD_BILL: SO_BILL_LIST_SEED,
  InvAF: SO_DETAIL_SEED,
  InvAF_BILL: SO_BILL_LIST_SEED,
  InvAQ_BILL: SQ_BILL_LIST_SEED,
  MrpAC_BILL: MO_BILL_LIST_SEED,
  MrpAG_BILL: ML_BILL_LIST_SEED,
  MrpAFC_BILL: MM_BILL_LIST_SEED,
  MrpAA_BILL: JH_BILL_LIST_SEED,
  MrpABA_BILL: MP_BILL_LIST_SEED,
  FasECF: BOM_DETAIL_SEED,
  FasECF_BILL: BOM_BILL_LIST_SEED,
  OthHZYQD: INDX_LIST_SEED,
  FasECG: AREA_LIST_SEED,
  FasECA: PRDT_LIST_SEED,
};

function seedMenuColumns(menuCode) {
  const defs = MENU_SEEDS[menuCode];
  if (!defs?.length) return false;
  const ins = db.prepare(`
    INSERT OR IGNORE INTO erp_detail_grid_col
      (menu_code, col_key, db_field, label, width, min_width, sort_order, visible_global, is_system, widget)
    VALUES (@menu_code, @col_key, @db_field, @label, @width, @min_width, @sort_order, 1, 1, @widget)
  `);
  for (const c of defs) {
    ins.run({
      menu_code: menuCode,
      col_key: c.col_key,
      db_field: c.db_field,
      label: c.label,
      width: c.width ?? null,
      min_width: c.min_width ?? null,
      sort_order: c.sort_order,
      widget: c.widget || 'text',
    });
  }
  return true;
}

function initGridSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sys_user (
      usr_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS erp_detail_grid_col (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      menu_code TEXT NOT NULL,
      col_key TEXT NOT NULL,
      db_field TEXT,
      label TEXT NOT NULL,
      width INTEGER,
      min_width INTEGER,
      sort_order INTEGER NOT NULL DEFAULT 0,
      visible_global INTEGER NOT NULL DEFAULT 1,
      is_system INTEGER NOT NULL DEFAULT 1,
      sql_expr TEXT,
      widget TEXT DEFAULT 'text',
      UNIQUE(menu_code, col_key)
    );
    CREATE TABLE IF NOT EXISTS erp_detail_grid_user_col (
      usr_id TEXT NOT NULL,
      menu_code TEXT NOT NULL,
      col_key TEXT NOT NULL,
      visible INTEGER NOT NULL,
      PRIMARY KEY (usr_id, menu_code, col_key)
    );
  `);

  const userCols = db.prepare('PRAGMA table_info(sys_user)').all().map((c) => c.name);
  if (!userCols.includes('pwd')) {
    db.exec(`ALTER TABLE sys_user ADD COLUMN pwd TEXT NOT NULL DEFAULT '123456'`);
  }

  const userCount = db.prepare('SELECT COUNT(*) AS c FROM sys_user').get().c;
  if (userCount === 0) {
    db.prepare(
      `INSERT INTO sys_user (usr_id, name, is_admin, pwd) VALUES ('admin', '管理员', 1, '123456'), ('user01', '业务员01', 0, '123456')`
    ).run();
  } else {
    db.prepare(`UPDATE sys_user SET pwd = '123456' WHERE pwd IS NULL OR pwd = ''`).run();
  }

  for (const [menuCode] of Object.entries(MENU_SEEDS)) {
    seedMenuColumns(menuCode);
  }

  const colMigrations = [
    'sql_expr_src TEXT',
    'grid_area TEXT',
    'field_source TEXT',
    'required INTEGER NOT NULL DEFAULT 0',
    'phys_type TEXT',
    'phys_len INTEGER',
    'display_format TEXT DEFAULT \'text\'',
    'select_config TEXT',
    'z_table TEXT',
    'persist INTEGER NOT NULL DEFAULT 0',
  ];
  for (const def of colMigrations) {
    try {
      db.exec(`ALTER TABLE erp_detail_grid_col ADD COLUMN ${def}`);
    } catch {
      /* already exists */
    }
  }

  const widthPatches = [
    { col_key: 'cus_no', width: 120, min_width: 120 },
    { col_key: 'prd_name', width: 140, min_width: 140 },
    { col_key: 'line_rem', width: 120, min_width: 120 },
  ];
  const patchCol = db.prepare(
    `UPDATE erp_detail_grid_col SET width = ?, min_width = ? WHERE menu_code = 'InvAD' AND col_key = ?`
  );
  for (const p of widthPatches) {
    patchCol.run(p.width, p.min_width, p.col_key);
  }

  const labelPatches = [
    { col_key: 'os_dd', label: '日期' },
    { col_key: 'os_no', label: '单号' },
  ];
  const patchLabel = db.prepare(
    `UPDATE erp_detail_grid_col SET label = ? WHERE menu_code = ? AND col_key = ?`
  );
  for (const menuCode of ['InvAD', 'InvAD_BILL', 'InvAF', 'InvAF_BILL']) {
    for (const p of labelPatches) {
      patchLabel.run(p.label, menuCode, p.col_key);
    }
  }
}

function getUser(usrId) {
  return db.prepare('SELECT usr_id, name, is_admin FROM sys_user WHERE usr_id = ?').get(usrId);
}

function getUserForLogin(usrId) {
  return db.prepare('SELECT usr_id, name, is_admin, pwd FROM sys_user WHERE usr_id = ?').get(usrId);
}

function listUsers() {
  return db
    .prepare('SELECT usr_id, name, is_admin FROM sys_user ORDER BY is_admin DESC, usr_id')
    .all()
    .map((r) => ({ usr_id: r.usr_id, name: r.name, is_admin: !!r.is_admin }));
}

function getColumns(menuCode, usrId) {
  // 有自定义列时也要补种系统列（INSERT OR IGNORE），避免只显示扩展字段
  seedMenuColumns(menuCode);
  let cols = db
    .prepare(
      `SELECT * FROM erp_detail_grid_col WHERE menu_code = ? ORDER BY sort_order, col_key`
    )
    .all(menuCode);
  const userPrefs = db
    .prepare(`SELECT col_key, visible FROM erp_detail_grid_user_col WHERE menu_code = ? AND usr_id = ?`)
    .all(menuCode, usrId);
  const prefMap = Object.fromEntries(userPrefs.map((p) => [p.col_key, !!p.visible]));

  return cols.map((c) => ({
    col_key: c.col_key,
    db_field: c.db_field,
    label: c.label,
    width: c.width,
    min_width: c.min_width,
    sort_order: c.sort_order,
    visible_global: !!c.visible_global,
    visible_user: prefMap[c.col_key],
    visible: prefMap[c.col_key] ?? !!c.visible_global,
    is_system: !!c.is_system,
    sql_expr: c.sql_expr,
    sql_expr_src: c.sql_expr_src,
    widget: c.widget || 'text',
    grid_area: c.grid_area || null,
    field_source: c.field_source || null,
    required: !!c.required,
    phys_type: c.phys_type || null,
    phys_len: c.phys_len ?? null,
    display_format: c.display_format || 'text',
    select_config: c.select_config ? JSON.parse(c.select_config) : null,
    z_table: c.z_table || null,
    persist: !!c.persist,
  }));
}

function displayFormatToWidget(fmt) {
  if (['qty', 'price', 'amount', 'rate'].includes(fmt)) return 'number';
  if (fmt === 'date' || fmt === 'datetime') return 'date';
  return 'text';
}

function setGlobalVisibility(menuCode, colKey, visible) {
  const r = db
    .prepare(
      `UPDATE erp_detail_grid_col SET visible_global = ? WHERE menu_code = ? AND col_key = ?`
    )
    .run(visible ? 1 : 0, menuCode, colKey);
  return r.changes > 0;
}

function setUserVisibility(menuCode, usrId, colKey, visible) {
  db.prepare(
    `INSERT INTO erp_detail_grid_user_col (usr_id, menu_code, col_key, visible)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(usr_id, menu_code, col_key) DO UPDATE SET visible = excluded.visible`
  ).run(usrId, menuCode, colKey, visible ? 1 : 0);
}

function validateSqlExpr(expr) {
  const s = String(expr || '').trim();
  if (!s) return { ok: false, error: 'SQL 表达式不能为空' };
  if (s.length > 500) return { ok: false, error: 'SQL 表达式过长' };
  const upper = s.toUpperCase();
  const banned = [';', '--', 'UPDATE', 'DELETE', 'INSERT', 'DROP', 'ALTER', 'CREATE', 'ATTACH', 'PRAGMA'];
  for (const b of banned) {
    if (upper.includes(b)) return { ok: false, error: `不允许包含 ${b}` };
  }
  return { ok: true, expr: s };
}

function validateSelectConfig(selectConfig) {
  if (!selectConfig) throw new Error('下拉框配置必填');
  const c = typeof selectConfig === 'string' ? JSON.parse(selectConfig) : selectConfig;

  if (c.mode === 'static') {
    if (!Array.isArray(c.options) || !c.options.length) throw new Error('请至少添加一个固定选项');
    for (const o of c.options) {
      if (!String(o?.value ?? '').trim()) throw new Error('固定选项的存盘值不能为空');
    }
    return c;
  }

  if (c.mode === 'table') {
    if (!String(c.table_name || '').trim()) throw new Error('表/视图名称必填');
    return { mode: 'table', table_name: String(c.table_name).trim() };
  }

  /** 兼容旧版 text_select：仅保留表名，落库规则统一为第 1 列 */
  if (c.mode === 'text_select') {
    const table_name = String(c.table_name || '').trim();
    if (!table_name) throw new Error('表/视图名称必填');
    return { mode: 'table', table_name };
  }

  if (c.mode === 'lookup') {
    if (!c.lookup_table || !c.save_field) throw new Error('请选择关联表及保存字段');
    return c;
  }

  throw new Error('无效的下拉配置（须为 static 或 table）');
}

/** 物理字段来源：仅 list 模式强制 sql；physical 下未识别值一律 input */
function normalizeFieldSource(fieldSource, isListMode) {
  if (isListMode) return 'sql';
  const s = String(fieldSource || '')
    .trim()
    .toLowerCase();
  if (s === 'sql') return 'sql';
  if (s === 'select') return 'select';
  return 'input';
}

async function addCustomColumn(menuCode, payload) {
  const {
    col_key,
    label,
    sql_expr,
    sql_expr_src,
    width,
    min_width,
    grid_area,
    field_source,
    required,
    phys_type,
    phys_len,
    display_format,
    select_config,
    mode,
  } = payload;

  if (!col_key || !/^[a-z][a-z0-9_]{0,31}$/.test(col_key)) {
    throw new Error('col_key 须为小写英文下划线，如 ext_amtn');
  }

  const meta = getMenuMeta(menuCode);
  /** 仅以 mode=list 为列表 SQL 列；physical 不因 listOnly 误判（表单扩展字段落 _Z） */
  const isListMode = mode === 'list';
  const source = normalizeFieldSource(field_source, isListMode);

  let execExpr = null;
  let srcExpr = null;
  if (source === 'sql') {
    execExpr = String(sql_expr || '').trim();
    srcExpr = String(sql_expr_src || sql_expr || '').trim();
    if (srcExpr.includes(':')) {
      execExpr = translateSunlikeSqlExpr(srcExpr, menuCode);
    } else if (!execExpr && srcExpr) {
      execExpr = srcExpr;
    }
    if (!execExpr && !srcExpr) {
      throw new Error('SQL 表达式必填');
    }
    const v = validateSqlExpr(execExpr);
    if (!v.ok) throw new Error(v.error);
    execExpr = v.expr;
  }

  const fmt = display_format || 'text';
  const widget = !isListMode && source === 'select' ? 'select' : displayFormatToWidget(fmt);
  const area = isListMode ? null : grid_area === 'line' ? 'line' : 'head';
  const persist = isListMode ? 0 : 1;

  if (!isListMode) {
    if (!phys_type) throw new Error('物理类型必填');
  }

  let normalizedSelectConfig = null;
  if (!isListMode && source === 'select') {
    normalizedSelectConfig = validateSelectConfig(select_config);
  }

  let zTable = null;
  let dbField = colKeyToDbField(col_key);

  if (persist) {
    const colPhysType = phys_type === 'text_select' ? 'varchar' : phys_type;
    const zInfo = await addZColumn(menuCode, area, col_key, colPhysType, phys_len);
    zTable = zInfo.zTable;
    dbField = zInfo.dbField;
  }

  const maxOrder =
    db.prepare(`SELECT COALESCE(MAX(sort_order), 0) AS m FROM erp_detail_grid_col WHERE menu_code = ?`).get(menuCode)
      .m + 1;

  db.prepare(
    `INSERT INTO erp_detail_grid_col
      (menu_code, col_key, db_field, label, width, min_width, sort_order, visible_global, is_system,
       sql_expr, sql_expr_src, widget, grid_area, field_source, required, phys_type, phys_len,
       display_format, select_config, z_table, persist)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    menuCode,
    col_key,
    dbField,
    label || col_key,
    width ?? null,
    min_width ?? null,
    maxOrder,
    execExpr || null,
    srcExpr || null,
    widget,
    area,
    source,
    required ? 1 : 0,
    phys_type || null,
    phys_len ?? null,
    fmt,
    select_config ? JSON.stringify(normalizedSelectConfig ?? select_config) : null,
    zTable,
    persist
  );
}

async function updateCustomColumn(menuCode, colKey, payload) {
  const col = db
    .prepare(`SELECT * FROM erp_detail_grid_col WHERE menu_code = ? AND col_key = ?`)
    .get(menuCode, colKey);
  if (!col) throw new Error('列不存在');
  if (col.is_system) throw new Error('系统字段不可修改');
  if (!col.persist) throw new Error('列表列不可在此修改');

  const {
    label,
    sql_expr,
    sql_expr_src,
    width,
    min_width,
    field_source,
    required,
    phys_len,
    display_format,
    select_config,
  } = payload;

  const source =
    field_source !== undefined
      ? normalizeFieldSource(field_source, false)
      : normalizeFieldSource(col.field_source, false);

  let execExpr = col.sql_expr;
  let srcExpr = col.sql_expr_src;
  if (source === 'sql') {
    execExpr = String(sql_expr !== undefined ? sql_expr : col.sql_expr || '').trim();
    srcExpr = String(
      sql_expr_src !== undefined ? sql_expr_src : col.sql_expr_src || col.sql_expr || ''
    ).trim();
    if (srcExpr.includes(':')) {
      execExpr = translateSunlikeSqlExpr(srcExpr, menuCode);
    } else if (!execExpr && srcExpr) {
      execExpr = srcExpr;
    }
    if (!execExpr && !srcExpr) {
      throw new Error('SQL 表达式必填');
    }
    const v = validateSqlExpr(execExpr);
    if (!v.ok) throw new Error(v.error);
    execExpr = v.expr;
  } else {
    execExpr = null;
    srcExpr = null;
  }

  const fmt = display_format || col.display_format || 'text';
  const widget = source === 'select' ? 'select' : displayFormatToWidget(fmt);

  let normalizedSelectConfig = col.select_config ? JSON.parse(col.select_config) : null;
  if (source === 'select') {
    if (select_config !== undefined) {
      normalizedSelectConfig = validateSelectConfig(select_config);
    } else if (!normalizedSelectConfig) {
      throw new Error('下拉配置必填');
    }
  } else {
    normalizedSelectConfig = null;
  }

  db.prepare(
    `UPDATE erp_detail_grid_col SET
       label = ?, width = ?, min_width = ?, sql_expr = ?, sql_expr_src = ?,
       widget = ?, field_source = ?, required = ?, phys_len = ?,
       display_format = ?, select_config = ?
     WHERE menu_code = ? AND col_key = ?`
  ).run(
    label != null && String(label).trim() ? String(label).trim() : col.label,
    width !== undefined ? width : col.width,
    min_width !== undefined ? min_width : col.min_width,
    execExpr,
    srcExpr,
    widget,
    source,
    required !== undefined ? (required ? 1 : 0) : col.required,
    phys_len !== undefined ? phys_len : col.phys_len,
    fmt,
    normalizedSelectConfig ? JSON.stringify(normalizedSelectConfig) : null,
    menuCode,
    colKey
  );
}

function removeCustomColumn(menuCode, colKey) {
  const col = db
    .prepare(`SELECT is_system FROM erp_detail_grid_col WHERE menu_code = ? AND col_key = ?`)
    .get(menuCode, colKey);
  if (!col) return false;
  if (col.is_system) throw new Error('系统字段不可删除');
  db.prepare(`DELETE FROM erp_detail_grid_col WHERE menu_code = ? AND col_key = ?`).run(menuCode, colKey);
  db.prepare(`DELETE FROM erp_detail_grid_user_col WHERE menu_code = ? AND col_key = ?`).run(menuCode, colKey);
  return true;
}

function reorderColumns(menuCode, colKeys) {
  const keys = Array.isArray(colKeys) ? colKeys.map(String) : [];
  if (!keys.length) throw new Error('col_keys 不能为空');
  const dbKeys = db
    .prepare(`SELECT col_key FROM erp_detail_grid_col WHERE menu_code = ? ORDER BY sort_order, col_key`)
    .all(menuCode)
    .map((r) => r.col_key);
  const ordered = [...keys];
  for (const k of dbKeys) {
    if (!ordered.includes(k)) ordered.push(k);
  }
  const stmt = db.prepare(
    `UPDATE erp_detail_grid_col SET sort_order = ? WHERE menu_code = ? AND col_key = ?`
  );
  const txn = db.transaction((all) => {
    all.forEach((key, i) => stmt.run(i + 1, menuCode, key));
  });
  txn(ordered);
}

function getCustomSqlExprs(menuCode) {
  return db
    .prepare(
      `SELECT col_key, sql_expr FROM erp_detail_grid_col
       WHERE menu_code = ? AND is_system = 0 AND persist = 0
         AND sql_expr IS NOT NULL AND sql_expr != ''`
    )
    .all(menuCode);
}

function getPersistedGridColumns(menuCode, area) {
  return db
    .prepare(
      `SELECT col_key, db_field, label, z_table, field_source, required, sql_expr, sql_expr_src
       FROM erp_detail_grid_col
       WHERE menu_code = ? AND persist = 1 AND grid_area = ?
       ORDER BY sort_order, col_key`
    )
    .all(menuCode, area)
    .map((c) => ({
      ...c,
      required: !!c.required,
    }));
}

function getMenuGridMeta(menuCode) {
  const meta = getMenuMeta(menuCode);
  return {
    menuCode,
    listOnly: meta.listOnly,
    hasLine: meta.hasLine,
    headTable: meta.head?.table || null,
    lineTable: meta.line?.table || null,
  };
}

initGridSchema();
const { initPermissionsSchema } = require('./permissions');
initPermissionsSchema();

module.exports = {
  initGridSchema,
  getUser,
  getUserForLogin,
  listUsers,
  getColumns,
  setGlobalVisibility,
  setUserVisibility,
  addCustomColumn,
  updateCustomColumn,
  removeCustomColumn,
  reorderColumns,
  getCustomSqlExprs,
  getPersistedGridColumns,
  getMenuGridMeta,
  validateSqlExpr,
  listSunlikeSqlFields,
};
