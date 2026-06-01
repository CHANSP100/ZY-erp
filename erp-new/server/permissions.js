/**
 * SUNLIKE 权限 — PSWD / PSWD1 / DEPRO_SET / sys_user_wh
 */
const { db } = require('./db');

/** 已上线菜单（与 DEV-06 一致） */
const MENU_CATALOG = [
  { pgm: 'OthHZYQD', name: '中类', group: '基础资料' },
  { pgm: 'FasECA', name: '货品', group: '基础资料' },
  { pgm: 'FasECG', name: '客户供应商区域', group: '基础资料' },
  { pgm: 'FasEA', name: '客户厂商', group: '基础资料' },
  { pgm: 'FasED', name: '部门', group: '基础资料' },
  { pgm: 'FasECB', name: '仓库', group: '基础资料' },
  { pgm: 'FasEB', name: '员工', group: '基础资料' },
  { pgm: 'InvAD', name: '销售订单', group: '销售' },
  { pgm: 'InvCA', name: '销货单', group: '销售' },
  { pgm: 'InvCC', name: '销货折让', group: '销售' },
  { pgm: 'InvCB', name: '销货退回', group: '销售' },
  { pgm: 'InvAQ', name: '请购单', group: '进货' },
  { pgm: 'InvAF', name: '采购单', group: '进货' },
  { pgm: 'InvBA', name: '进货单', group: '进货' },
  { pgm: 'InvBC', name: '进货折让', group: '进货' },
  { pgm: 'InvBB', name: '进货退回', group: '进货' },
  { pgm: 'MrpAC', name: '制令单', group: '生产' },
  { pgm: 'MrpAG', name: '生产领料', group: '生产' },
  { pgm: 'MrpAFC', name: '缴库单', group: '生产' },
  { pgm: 'MrpAA', name: '生产计划', group: '生产' },
  { pgm: 'MrpABA', name: '生产需求分析单', group: '生产' },
  { pgm: 'FasECF', name: 'BOM', group: 'BOM' },
  { pgm: 'SysAuth', name: '权限设置', group: '系统管理' },
];

const ALL_PGMS = MENU_CATALOG.map((m) => m.pgm);

const API_PREFIX_PGM = [
  ['/sys-auth', 'SysAuth'],
  ['/indx', 'OthHZYQD'],
  ['/dept', 'FasED'],
  ['/wh', 'FasECB'],
  ['/warehouses', 'FasECB'],
  ['/prdt', 'FasECA'],
  ['/area', 'FasECG'],
  ['/cust', 'FasEA'],
  ['/salm', 'FasEB'],
  ['/sales-orders', 'InvAD'],
  ['/sales-shipments', 'InvCA'],
  ['/sales-returns', 'InvCB'],
  ['/sales-allowances', 'InvCC'],
  ['/purchase-requisitions', 'InvAQ'],
  ['/purchase-orders', 'InvAF'],
  ['/purchase-receipts', 'InvBA'],
  ['/purchase-returns', 'InvBB'],
  ['/purchase-allowances', 'InvBC'],
  ['/manufacturing-orders', 'MrpAC'],
  ['/material-issues', 'MrpAG'],
  ['/warehouse-deposits', 'MrpAFC'],
  ['/production-plans', 'MrpAA'],
  ['/production-requirements', 'MrpABA'],
  ['/bom-recipes', 'FasECF'],
];

const SKIP_API_PREFIXES = [
  '/health',
  '/auth/login',
  '/auth/logout',
  '/db-config',
  '/auth/me',
  '/upload',
];

function yn(v) {
  return v === 'T' || v === 't' || v === '1' || v === 1 || v === true ? 'T' : 'F';
}

function flagOn(v) {
  return v === 'T' || v === 't' || v === '1' || v === 1 || v === true;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function initPermissionsSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sys_user_menu (
      usr_id TEXT NOT NULL,
      pgm TEXT NOT NULL,
      dsp TEXT NOT NULL DEFAULT 'F',
      apd TEXT NOT NULL DEFAULT 'F',
      upd TEXT NOT NULL DEFAULT 'F',
      del TEXT NOT NULL DEFAULT 'F',
      prt TEXT NOT NULL DEFAULT 'F',
      PRIMARY KEY (usr_id, pgm)
    );
    CREATE TABLE IF NOT EXISTS sys_depro_set (
      depro_no TEXT NOT NULL,
      itm INTEGER NOT NULL,
      dep TEXT NOT NULL,
      rem TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (depro_no, itm)
    );
    CREATE TABLE IF NOT EXISTS sys_user_wh (
      usr_id TEXT NOT NULL,
      wh TEXT NOT NULL,
      PRIMARY KEY (usr_id, wh)
    );
  `);

  const cols = db.prepare('PRAGMA table_info(sys_user)').all().map((c) => c.name);
  const addCol = (sql) => {
    try {
      db.exec(sql);
    } catch {
      /* exists */
    }
  };
  if (!cols.includes('dep')) addCol(`ALTER TABLE sys_user ADD COLUMN dep TEXT NOT NULL DEFAULT ''`);
  if (!cols.includes('b_dat')) addCol(`ALTER TABLE sys_user ADD COLUMN b_dat TEXT NOT NULL DEFAULT ''`);
  if (!cols.includes('e_dat')) addCol(`ALTER TABLE sys_user ADD COLUMN e_dat TEXT NOT NULL DEFAULT ''`);
  if (!cols.includes('depro_no')) addCol(`ALTER TABLE sys_user ADD COLUMN depro_no TEXT NOT NULL DEFAULT ''`);
  if (!cols.includes('rem')) addCol(`ALTER TABLE sys_user ADD COLUMN rem TEXT NOT NULL DEFAULT ''`);
  if (!cols.includes('mng')) addCol(`ALTER TABLE sys_user ADD COLUMN mng TEXT NOT NULL DEFAULT ''`);
  if (!cols.includes('tel1')) addCol(`ALTER TABLE sys_user ADD COLUMN tel1 TEXT NOT NULL DEFAULT ''`);
  if (!cols.includes('e_mail')) addCol(`ALTER TABLE sys_user ADD COLUMN e_mail TEXT NOT NULL DEFAULT ''`);

  seedDefaultPermissions();
}

function seedDefaultPermissions() {
  const users = db.prepare('SELECT usr_id, is_admin FROM sys_user').all();
  const ins = db.prepare(`
    INSERT OR IGNORE INTO sys_user_menu (usr_id, pgm, dsp, apd, upd, del, prt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const allT = ['T', 'T', 'T', 'T', 'T'];
  const salesOnly = {
    InvAD: allT,
    InvCA: allT,
    InvCC: allT,
    InvCB: allT,
    FasEA: ['T', 'F', 'F', 'F', 'F'],
    FasEB: ['T', 'F', 'F', 'F', 'F'],
  };

  for (const u of users) {
    if (u.is_admin) {
      for (const pgm of ALL_PGMS) {
        ins.run(u.usr_id, pgm, ...allT);
      }
      continue;
    }
    for (const pgm of ALL_PGMS) {
      const flags = salesOnly[pgm] || ['F', 'F', 'F', 'F', 'F'];
      ins.run(u.usr_id, pgm, ...flags);
    }
  }
}

function rowToUser(row) {
  if (!row) return null;
  return {
    usr_id: row.usr_id,
    name: row.name,
    is_admin: !!row.is_admin,
    dep: row.dep || '',
    b_dat: row.b_dat || '',
    e_dat: row.e_dat || '',
    depro_no: row.depro_no || '',
    rem: row.rem || '',
    mng: row.mng || '',
    tel1: row.tel1 || '',
    e_mail: row.e_mail || '',
  };
}

function getUserRow(usrId) {
  return db
    .prepare(
      `SELECT usr_id, name, is_admin, pwd, dep, b_dat, e_dat, depro_no, rem, mng, tel1, e_mail
       FROM sys_user WHERE usr_id = ?`
    )
    .get(usrId);
}

function isUserDisabled(row) {
  if (!row) return true;
  const e = String(row.e_dat || '').slice(0, 10);
  if (!e) return false;
  return e < todayStr();
}

function listMenuPermissions(usrId) {
  const rows = db
    .prepare(
      `SELECT pgm, dsp, apd, upd, del, prt FROM sys_user_menu WHERE usr_id = ? ORDER BY pgm`
    )
    .all(usrId);
  const map = Object.fromEntries(rows.map((r) => [r.pgm, r]));
  return ALL_PGMS.map((pgm) => {
    const r = map[pgm];
    return {
      pgm,
      dsp: flagOn(r?.dsp),
      apd: flagOn(r?.apd),
      upd: flagOn(r?.upd),
      del: flagOn(r?.del),
      prt: flagOn(r?.prt),
    };
  });
}

function getPermissionSummary(usrId, isAdmin) {
  if (isAdmin) {
    return {
      is_admin: true,
      menus: ALL_PGMS.map((pgm) => ({
        pgm,
        dsp: true,
        apd: true,
        upd: true,
        del: true,
        prt: true,
      })),
      deps: [],
      whs: [],
      all_wh: true,
      all_dep: true,
    };
  }
  const deps = listDeproDeps(
    db.prepare('SELECT depro_no FROM sys_user WHERE usr_id = ?').get(usrId)?.depro_no || ''
  );
  const userDep = db.prepare('SELECT dep FROM sys_user WHERE usr_id = ?').get(usrId)?.dep || '';
  const whRows = db.prepare('SELECT wh FROM sys_user_wh WHERE usr_id = ?').all(usrId);
  const whs = whRows.map((r) => r.wh);
  return {
    is_admin: false,
    menus: listMenuPermissions(usrId),
    deps: [...new Set([userDep, ...deps].filter(Boolean))],
    whs,
    all_wh: whs.length === 0,
    all_dep: !userDep && deps.length === 0,
  };
}

function hasMenuFlag(usrId, isAdmin, pgm, flag) {
  if (isAdmin) return true;
  const col = flag === 'dsp' ? 'dsp' : flag === 'apd' ? 'apd' : flag === 'upd' ? 'upd' : flag === 'del' ? 'del' : 'prt';
  const row = db
    .prepare(`SELECT ${col} AS v FROM sys_user_menu WHERE usr_id = ? AND pgm = ?`)
    .get(usrId, pgm);
  return flagOn(row?.v);
}

function resolveApiPgm(path) {
  for (const [prefix, pgm] of API_PREFIX_PGM) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return pgm;
  }
  if (path.startsWith('/detail-grid/')) {
    const code = path.split('/')[2];
    return code || null;
  }
  if (path.startsWith('/print-template/')) {
    return path.split('/')[2] || null;
  }
  return null;
}

function methodToFlag(method) {
  const m = String(method || 'GET').toUpperCase();
  if (m === 'GET' || m === 'HEAD') return 'dsp';
  if (m === 'POST') return 'apd';
  if (m === 'PUT' || m === 'PATCH') return 'upd';
  if (m === 'DELETE') return 'del';
  return 'dsp';
}

function apiPermissionGuard(req, res, next) {
  const path = req.path || '';
  if (SKIP_API_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    return next();
  }
  if (path.startsWith('/auth/users')) {
    return next();
  }
  const user = req.erpUser;
  if (!user) return res.status(401).json({ error: '请先登录' });
  if (user.is_admin) return next();

  const pgm = resolveApiPgm(path);
  if (!pgm) return next();

  if (path.startsWith('/detail-grid/') && path.includes('/columns/global')) {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  if (path.startsWith('/print-template/') && ['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return res.status(403).json({ error: '需要管理员权限' });
  }

  const flag = methodToFlag(req.method);
  if (!hasMenuFlag(user.usr_id, false, pgm, flag)) {
    return res.status(403).json({ error: '无操作权限' });
  }
  return next();
}

function listUsersFull() {
  return db
    .prepare(
      `SELECT usr_id, name, is_admin, dep, b_dat, e_dat, depro_no, rem, mng, tel1, e_mail
       FROM sys_user ORDER BY is_admin DESC, usr_id`
    )
    .all()
    .map(rowToUser);
}

function createUser(payload) {
  const usrId = String(payload.usr_id || '').trim();
  if (!usrId) throw new Error('用户代号必填');
  const exists = db.prepare('SELECT 1 FROM sys_user WHERE usr_id = ?').get(usrId);
  if (exists) throw new Error('用户代号已存在');
  const pwd = String(payload.pwd || '123456');
  db.prepare(
    `INSERT INTO sys_user (usr_id, name, pwd, is_admin, dep, b_dat, e_dat, depro_no, rem, mng, tel1, e_mail)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    usrId,
    String(payload.name || '').trim() || usrId,
    pwd,
    payload.is_admin ? 1 : 0,
    String(payload.dep || '').trim(),
    String(payload.b_dat || '').trim(),
    String(payload.e_dat || '').trim(),
    String(payload.depro_no || '').trim(),
    String(payload.rem || '').trim(),
    String(payload.mng || '').trim(),
    String(payload.tel1 || '').trim(),
    String(payload.e_mail || '').trim()
  );
  seedUserMenus(usrId, !!payload.is_admin);
  return rowToUser(getUserRow(usrId));
}

function seedUserMenus(usrId, isAdmin) {
  const ins = db.prepare(`
    INSERT OR REPLACE INTO sys_user_menu (usr_id, pgm, dsp, apd, upd, del, prt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const pgm of ALL_PGMS) {
    if (isAdmin) ins.run(usrId, pgm, 'T', 'T', 'T', 'T', 'T');
    else ins.run(usrId, pgm, 'F', 'F', 'F', 'F', 'F');
  }
}

function updateUser(usrId, payload) {
  const row = getUserRow(usrId);
  if (!row) throw new Error('用户不存在');
  const pwd = payload.pwd != null && String(payload.pwd).length > 0 ? String(payload.pwd) : row.pwd;
  db.prepare(
    `UPDATE sys_user SET name=?, pwd=?, is_admin=?, dep=?, b_dat=?, e_dat=?, depro_no=?, rem=?, mng=?, tel1=?, e_mail=?
     WHERE usr_id=?`
  ).run(
    String(payload.name ?? row.name).trim(),
    pwd,
    payload.is_admin != null ? (payload.is_admin ? 1 : 0) : row.is_admin,
    String(payload.dep ?? row.dep ?? '').trim(),
    String(payload.b_dat ?? row.b_dat ?? '').trim(),
    String(payload.e_dat ?? row.e_dat ?? '').trim(),
    String(payload.depro_no ?? row.depro_no ?? '').trim(),
    String(payload.rem ?? row.rem ?? '').trim(),
    String(payload.mng ?? row.mng ?? '').trim(),
    String(payload.tel1 ?? row.tel1 ?? '').trim(),
    String(payload.e_mail ?? row.e_mail ?? '').trim(),
    usrId
  );
  if (payload.is_admin != null) {
    db.prepare('DELETE FROM sys_user_menu WHERE usr_id = ?').run(usrId);
    seedUserMenus(usrId, !!payload.is_admin);
  }
  return rowToUser(getUserRow(usrId));
}

function deleteUser(usrId) {
  db.prepare('DELETE FROM sys_user_menu WHERE usr_id = ?').run(usrId);
  db.prepare('DELETE FROM sys_user_wh WHERE usr_id = ?').run(usrId);
  db.prepare('DELETE FROM sys_user WHERE usr_id = ?').run(usrId);
}

function saveMenuPermissions(usrId, rows) {
  const del = db.prepare('DELETE FROM sys_user_menu WHERE usr_id = ?');
  const ins = db.prepare(`
    INSERT INTO sys_user_menu (usr_id, pgm, dsp, apd, upd, del, prt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const tx = db.transaction(() => {
    del.run(usrId);
    for (const r of rows || []) {
      if (!ALL_PGMS.includes(r.pgm)) continue;
      ins.run(
        usrId,
        r.pgm,
        yn(r.dsp),
        yn(r.apd),
        yn(r.upd),
        yn(r.del),
        yn(r.prt)
      );
    }
  });
  tx();
  return listMenuPermissions(usrId);
}

function copyMenuPermissions(fromUsr, toUsr) {
  const rows = db
    .prepare('SELECT pgm, dsp, apd, upd, del, prt FROM sys_user_menu WHERE usr_id = ?')
    .all(fromUsr);
  return saveMenuPermissions(
    toUsr,
    rows.map((r) => ({
      pgm: r.pgm,
      dsp: flagOn(r.dsp),
      apd: flagOn(r.apd),
      upd: flagOn(r.upd),
      del: flagOn(r.del),
      prt: flagOn(r.prt),
    }))
  );
}

function listDeproDeps(deproNo) {
  if (!deproNo) return [];
  return db
    .prepare('SELECT dep FROM sys_depro_set WHERE depro_no = ? ORDER BY itm')
    .all(deproNo)
    .map((r) => r.dep);
}

function getDeproSet(deproNo) {
  return db
    .prepare('SELECT depro_no, itm, dep, rem FROM sys_depro_set WHERE depro_no = ? ORDER BY itm')
    .all(deproNo);
}

function saveDeproSet(deproNo, lines) {
  const no = String(deproNo || '').trim();
  if (!no) throw new Error('部门群组代号必填');
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM sys_depro_set WHERE depro_no = ?').run(no);
    const ins = db.prepare(
      'INSERT INTO sys_depro_set (depro_no, itm, dep, rem) VALUES (?, ?, ?, ?)'
    );
    (lines || []).forEach((ln, i) => {
      const dep = String(ln.dep || '').trim();
      if (!dep) return;
      ins.run(no, i + 1, dep, String(ln.rem || '').trim());
    });
  });
  tx();
  return getDeproSet(no);
}

function listUserWh(usrId) {
  return db.prepare('SELECT wh FROM sys_user_wh WHERE usr_id = ? ORDER BY wh').all(usrId).map((r) => r.wh);
}

function saveUserWh(usrId, whList) {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM sys_user_wh WHERE usr_id = ?').run(usrId);
    const ins = db.prepare('INSERT INTO sys_user_wh (usr_id, wh) VALUES (?, ?)');
    for (const wh of whList || []) {
      const w = String(wh || '').trim();
      if (w) ins.run(usrId, w);
    }
  });
  tx();
  return listUserWh(usrId);
}

/** 部门 SQL 片段：返回 { sql, params } 或 null */
function deptFilterClause(usrId, isAdmin, depColumn = 'dep') {
  if (isAdmin) return null;
  const row = db.prepare('SELECT dep, depro_no FROM sys_user WHERE usr_id = ?').get(usrId);
  const deps = [...new Set([row?.dep, ...listDeproDeps(row?.depro_no || '')].filter(Boolean))];
  if (!deps.length) return null;
  const placeholders = deps.map(() => '?').join(',');
  return { sql: `${depColumn} IN (${placeholders})`, params: deps };
}

/** 仓库过滤：无配置=全部可见 */
function whAllowedSet(usrId, isAdmin) {
  if (isAdmin) return null;
  const whs = listUserWh(usrId);
  if (!whs.length) return null;
  return new Set(whs);
}

/** MSSQL PSWD 登录后写入/更新本地 sys_user（pwd 为 __MSSQL__ 标记，不走明文校验） */
function syncUserFromMssql(profile) {
  const usrId = String(profile.usr_id || '').trim();
  if (!usrId) return null;
  const row = getUserRow(usrId);
  const pwd = String(profile.pwd ?? '__MSSQL__');
  const isAdmin = profile.is_admin ? 1 : 0;
  const fields = [
    String(profile.name || usrId).trim(),
    pwd,
    isAdmin,
    String(profile.dep || '').trim(),
    String(profile.b_dat || '').trim(),
    String(profile.e_dat || '').trim(),
    String(profile.depro_no || '').trim(),
    String(profile.rem || '').trim(),
    String(profile.mng || '').trim(),
    String(profile.tel1 || '').trim(),
    String(profile.e_mail || '').trim(),
  ];
  if (!row) {
    db.prepare(
      `INSERT INTO sys_user (usr_id, name, pwd, is_admin, dep, b_dat, e_dat, depro_no, rem, mng, tel1, e_mail)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(usrId, ...fields);
  } else {
    db.prepare(
      `UPDATE sys_user SET name=?, pwd=?, is_admin=?, dep=?, b_dat=?, e_dat=?, depro_no=?, rem=?, mng=?, tel1=?, e_mail=?
       WHERE usr_id=?`
    ).run(...fields, usrId);
  }
  return rowToUser(getUserRow(usrId));
}

/** 将 MSSQL PSWD1 行同步到 sys_user_menu（未出现的 PGM 置 F） */
function syncMenuFromPswd1(usrId, menuRows) {
  const pgmMap = new Map(ALL_PGMS.map((p) => [p.toUpperCase(), p]));
  const tf = (v) => (String(v || 'F').trim().toUpperCase() === 'T' ? 'T' : 'F');
  const ins = db.prepare(`
    INSERT OR REPLACE INTO sys_user_menu (usr_id, pgm, dsp, apd, upd, del, prt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  db.prepare('DELETE FROM sys_user_menu WHERE usr_id = ?').run(usrId);
  const touched = new Set();
  for (const r of menuRows || []) {
    const pgm = pgmMap.get(String(r.pgm || '').trim().toUpperCase());
    if (!pgm) continue;
    touched.add(pgm);
    ins.run(usrId, pgm, tf(r.dsp), tf(r.apd), tf(r.upd), tf(r.del), tf(r.prt));
  }
  for (const pgm of ALL_PGMS) {
    if (!touched.has(pgm)) {
      ins.run(usrId, pgm, 'F', 'F', 'F', 'F', 'F');
    }
  }
}

module.exports = {
  MENU_CATALOG,
  ALL_PGMS,
  initPermissionsSchema,
  getUserRow,
  rowToUser,
  isUserDisabled,
  getPermissionSummary,
  hasMenuFlag,
  apiPermissionGuard,
  listUsersFull,
  createUser,
  updateUser,
  deleteUser,
  saveMenuPermissions,
  copyMenuPermissions,
  listMenuPermissions,
  getDeproSet,
  saveDeproSet,
  listDeproDeps,
  listUserWh,
  saveUserWh,
  deptFilterClause,
  whAllowedSet,
  seedDefaultPermissions,
  syncUserFromMssql,
  syncMenuFromPswd1,
  seedUserMenus,
};
