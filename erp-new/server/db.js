const Database = require('better-sqlite3');
const { billAuditFields } = require('./billAuditMeta');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'erp.sqlite');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS indx (
  idx_no TEXT PRIMARY KEY,
  name TEXT,
  idx_up TEXT,
  stop_dd TEXT,
  rem TEXT
);

CREATE TABLE IF NOT EXISTS my_wh (
  wh TEXT PRIMARY KEY,
  name TEXT,
  dep TEXT,
  up_wh TEXT,
  adr TEXT,
  tel_no TEXT,
  stop_dd TEXT,
  rem TEXT
);

CREATE TABLE IF NOT EXISTS dept (
  dep TEXT PRIMARY KEY,
  name TEXT,
  eng_name TEXT,
  up TEXT,
  stop_dd TEXT,
  rem TEXT
);

CREATE TABLE IF NOT EXISTS prdt (
  prd_no TEXT PRIMARY KEY,
  snm TEXT,
  idx1 TEXT,
  idx2 TEXT,
  ut TEXT,
  name TEXT,
  spc TEXT,
  wh TEXT,
  valid_days INTEGER,
  qty_min1 REAL,
  qty_max REAL,
  pic_path TEXT,
  doc_path TEXT,
  rem TEXT,
  stop_id TEXT,
  sys_date TEXT DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_prdt_idx1 ON prdt(idx1);

CREATE TABLE IF NOT EXISTS prdt_pic (
  prd_no TEXT PRIMARY KEY,
  pic TEXT,
  cadimg TEXT,
  FOREIGN KEY (prd_no) REFERENCES prdt(prd_no) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cust (
  cus_no TEXT PRIMARY KEY,
  obj_id TEXT,
  name TEXT,
  snm TEXT,
  cus_are TEXT,
  cnt_man1 TEXT,
  cnt_man2 TEXT,
  tel1 TEXT,
  tel2 TEXT,
  uni_no TEXT,
  biz_dsc TEXT,
  adr2 TEXT,
  end_dd TEXT,
  cur_id TEXT,
  id1_tax TEXT,
  sal_no TEXT,
  bnk_name TEXT,
  id_code TEXT,
  rem TEXT
);

CREATE TABLE IF NOT EXISTS salm (
  sal_no TEXT PRIMARY KEY,
  name TEXT,
  eng_name TEXT,
  name_py TEXT,
  sex TEXT,
  dep TEXT,
  pos TEXT,
  up_sal_no TEXT,
  tel1 TEXT,
  tel2 TEXT,
  e_mail TEXT,
  con_adr TEXT,
  id_num TEXT,
  bth TEXT,
  dut_in_d TEXT,
  dut_ot_d TEXT,
  rem TEXT
);

CREATE TABLE IF NOT EXISTS mf_pos (
  os_id TEXT NOT NULL,
  os_no TEXT PRIMARY KEY,
  os_dd TEXT,
  cus_no TEXT,
  use_dep TEXT,
  sal_no TEXT,
  cus_os_no TEXT,
  bil_type TEXT,
  cur_id TEXT,
  tax_id TEXT,
  est_dd TEXT,
  rem TEXT,
  cls_mp_id TEXT,
  cls_id TEXT,
  dis_cnt REAL,
  amtn_net REAL,
  tax REAL,
  bil_id TEXT,
  bil_no TEXT
);

CREATE TABLE IF NOT EXISTS tf_pos (
  os_id TEXT NOT NULL,
  os_no TEXT NOT NULL,
  itm INTEGER NOT NULL,
  prd_no TEXT,
  prd_name TEXT,
  wh TEXT,
  qty REAL,
  ut TEXT,
  up REAL,
  amtn REAL,
  tax_rto REAL,
  tax REAL,
  est_dd TEXT,
  sup_prd_no TEXT,
  rem TEXT,
  qty_ps REAL,
  bil_id TEXT,
  bil_no TEXT,
  bil_itm INTEGER,
  PRIMARY KEY (os_id, os_no, itm),
  FOREIGN KEY (os_no) REFERENCES mf_pos(os_no) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mf_pos_dd ON mf_pos(os_dd);
CREATE INDEX IF NOT EXISTS idx_cust_name ON cust(name);

CREATE TABLE IF NOT EXISTS mf_pss (
  ps_id TEXT NOT NULL,
  ps_no TEXT PRIMARY KEY,
  ps_dd TEXT,
  cus_no TEXT,
  dep TEXT,
  sal_no TEXT,
  cus_os_no TEXT,
  bil_type TEXT,
  cur_id TEXT,
  tax_id TEXT,
  os_id TEXT,
  os_no TEXT,
  rem TEXT,
  dis_cnt REAL,
  amtn_net REAL,
  tax REAL
);

CREATE TABLE IF NOT EXISTS tf_pss (
  ps_id TEXT NOT NULL,
  ps_no TEXT NOT NULL,
  itm INTEGER NOT NULL,
  prd_no TEXT,
  prd_name TEXT,
  wh TEXT,
  qty REAL,
  ut TEXT,
  up REAL,
  amtn_net REAL,
  tax_rto REAL,
  tax REAL,
  est_dd TEXT,
  sup_prd_no TEXT,
  rem TEXT,
  os_id TEXT,
  os_no TEXT,
  src_itm INTEGER,
  PRIMARY KEY (ps_id, ps_no, itm),
  FOREIGN KEY (ps_no) REFERENCES mf_pss(ps_no) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mf_pss_dd ON mf_pss(ps_dd);

CREATE TABLE IF NOT EXISTS mf_sq (
  sq_no TEXT PRIMARY KEY,
  sq_dd TEXT,
  dep TEXT,
  cus_no TEXT,
  sal_no TEXT,
  est_dd TEXT,
  rem TEXT,
  po_no TEXT,
  po_dep TEXT,
  cur_id TEXT,
  exc_rto REAL DEFAULT 0,
  cls_id TEXT,
  bil_id TEXT,
  bil_no TEXT,
  amtn REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tf_sq (
  sq_no TEXT NOT NULL,
  itm INTEGER NOT NULL,
  prd_no TEXT,
  prd_name TEXT,
  prd_mark TEXT,
  unit TEXT,
  qty REAL DEFAULT 0,
  up REAL DEFAULT 0,
  amtn REAL DEFAULT 0,
  est_dd TEXT,
  rem TEXT,
  cus_no TEXT,
  cur_id TEXT,
  exc_rto REAL DEFAULT 0,
  qty1 REAL DEFAULT 0,
  qty_po REAL DEFAULT 0,
  bat_no TEXT,
  PRIMARY KEY (sq_no, itm),
  FOREIGN KEY (sq_no) REFERENCES mf_sq(sq_no) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mf_sq_dd ON mf_sq(sq_dd);
`);

/** 兼容旧库：补列 */
for (const [col, typ] of [
  ['dep', 'TEXT'],
  ['up_wh', 'TEXT'],
  ['adr', 'TEXT'],
  ['tel_no', 'TEXT'],
  ['stop_dd', 'TEXT'],
  ['rem', 'TEXT'],
]) {
  const cols = db.prepare('PRAGMA table_info(my_wh)').all().map((c) => c.name);
  if (!cols.includes(col)) db.exec(`ALTER TABLE my_wh ADD COLUMN ${col} ${typ}`);
}

{
  const custCols = db.prepare('PRAGMA table_info(cust)').all().map((c) => c.name);
  if (!custCols.includes('sal')) db.exec('ALTER TABLE cust ADD COLUMN sal TEXT');
}

for (const [col, typ] of [
  ['eng_name', 'TEXT'],
  ['name_py', 'TEXT'],
  ['sex', 'TEXT'],
  ['pos', 'TEXT'],
  ['up_sal_no', 'TEXT'],
  ['tel1', 'TEXT'],
  ['tel2', 'TEXT'],
  ['e_mail', 'TEXT'],
  ['con_adr', 'TEXT'],
  ['id_num', 'TEXT'],
  ['bth', 'TEXT'],
  ['dut_in_d', 'TEXT'],
  ['dut_ot_d', 'TEXT'],
  ['rem', 'TEXT'],
]) {
  const cols = db.prepare('PRAGMA table_info(salm)').all().map((c) => c.name);
  if (!cols.includes(col)) db.exec(`ALTER TABLE salm ADD COLUMN ${col} ${typ}`);
}

for (const [col, typ] of [
  ['zhang_id', 'TEXT'],
  ['send_mth', 'TEXT'],
  ['send_wh', 'TEXT'],
  ['adr', 'TEXT'],
  ['pay_mth', 'TEXT'],
  ['pay_days', 'INTEGER'],
  ['pay_dd', 'TEXT'],
  ['chk_dd', 'TEXT'],
  ['inv_no', 'TEXT'],
  ['rp_no', 'TEXT'],
  ['voh_no', 'TEXT'],
  ['contract', 'TEXT'],
]) {
  const cols = db.prepare('PRAGMA table_info(mf_pss)').all().map((c) => c.name);
  if (!cols.includes(col)) db.exec(`ALTER TABLE mf_pss ADD COLUMN ${col} ${typ}`);
}

{
  const cols = db.prepare('PRAGMA table_info(tf_pss)').all().map((c) => c.name);
  if (!cols.includes('qty_rtn')) db.exec('ALTER TABLE tf_pss ADD COLUMN qty_rtn REAL DEFAULT 0');
  if (!cols.includes('prd_mark')) db.exec('ALTER TABLE tf_pss ADD COLUMN prd_mark TEXT');
  if (!cols.includes('dis_cnt')) db.exec('ALTER TABLE tf_pss ADD COLUMN dis_cnt REAL DEFAULT 0');
  if (!cols.includes('qty1')) db.exec('ALTER TABLE tf_pss ADD COLUMN qty1 REAL DEFAULT 0');
  if (!cols.includes('bat_no')) db.exec('ALTER TABLE tf_pss ADD COLUMN bat_no TEXT');
}

{
  const cols = db.prepare('PRAGMA table_info(tf_pos)').all().map((c) => c.name);
  if (!cols.includes('bil_id')) db.exec('ALTER TABLE tf_pos ADD COLUMN bil_id TEXT');
  if (!cols.includes('bil_no')) db.exec('ALTER TABLE tf_pos ADD COLUMN bil_no TEXT');
  if (!cols.includes('bil_itm')) db.exec('ALTER TABLE tf_pos ADD COLUMN bil_itm INTEGER');
}

for (const [col, typ] of [
  ['knd', 'TEXT'],
  ['ut1', 'TEXT'],
  ['upr', 'REAL'],
  ['up_sal', 'REAL'],
  ['use_prdmark', 'TEXT'],
  ['tw_id', 'TEXT'],
  ['wh_lc', 'TEXT'],
  ['qty_min', 'REAL'],
  ['qty_low', 'REAL'],
  ['dep', 'TEXT'],
  ['sal_no', 'TEXT'],
]) {
  const cols = db.prepare('PRAGMA table_info(prdt)').all().map((c) => c.name);
  if (!cols.includes(col)) db.exec(`ALTER TABLE prdt ADD COLUMN ${col} ${typ}`);
}

function rowToDept(row) {
  return {
    dep: row.dep,
    name: row.name,
    eng_name: row.eng_name,
    up: row.up,
    make_id: row.make_id,
    stop_dd: row.stop_dd,
    rem: row.rem,
  };
}

function rowToWh(row) {
  return {
    wh: row.wh,
    name: row.name,
    dep: row.dep,
    up_wh: row.up_wh,
    adr: row.adr,
    tel_no: row.tel_no,
    stop_dd: row.stop_dd,
    rem: row.rem,
    dep_name: row.dep_name,
    up_wh_name: row.up_wh_name,
  };
}

function buildDeptTree(rows) {
  const map = new Map();
  for (const r of rows) {
    const d = rowToDept(r);
    map.set(d.dep, {
      ...d,
      key: d.dep,
      title: `${d.dep} ${d.name || ''}`.trim(),
      children: [],
    });
  }
  const roots = [];
  for (const node of map.values()) {
    const up = node.up && node.up !== node.dep ? node.up : null;
    if (up && map.has(up)) map.get(up).children.push(node);
    else roots.push(node);
  }
  const sortTree = (nodes) => {
    nodes.sort((a, b) => String(a.dep).localeCompare(String(b.dep)));
    nodes.forEach((n) => sortTree(n.children));
  };
  sortTree(roots);
  return roots;
}

function rowToIndx(row) {
  return {
    idx_no: row.idx_no,
    name: row.name,
    idx_up: row.idx_up,
    stop_dd: row.stop_dd,
    rem: row.rem,
  };
}

function rowToPrdt(row) {
  return {
    prd_no: row.prd_no,
    snm: row.snm,
    idx1: row.idx1,
    idx2: row.idx2,
    knd: row.knd,
    ut: row.ut,
    ut1: row.ut1,
    name: row.name,
    spc: row.spc,
    wh: row.wh,
    wh_lc: row.wh_lc,
    upr: row.upr,
    up_sal: row.up_sal,
    use_prdmark: row.use_prdmark,
    tw_id: row.tw_id,
    qty_min: row.qty_min,
    qty_low: row.qty_low,
    valid_days: row.valid_days,
    qty_min1: row.qty_min1,
    qty_max: row.qty_max,
    dep: row.dep,
    sal_no: row.sal_no,
    pic_path: row.pic_path,
    doc_path: row.doc_path,
    rem: row.rem,
    stop_id: row.stop_id,
    nouse_dd: row.nouse_dd,
    usr: row.usr,
    chk_man: row.chk_man,
    cls_date: row.cls_date,
    sys_date: row.sys_date,
    pic: row.pic,
    cadimg: row.cadimg,
  };
}

function rowToPrdtPic(row) {
  return {
    prd_no: row.prd_no,
    pic: row.pic,
    cadimg: row.cadimg,
  };
}

/** 根据中类与已有品号推算下一流水号（与旧系统 2303-0187、3500-0144 格式一致） */
function nextPrdNo(idx1, idx2) {
  const rows = db
    .prepare(
      `SELECT prd_no FROM prdt WHERE idx1 = ? AND prd_no LIKE '%-%' ORDER BY prd_no`
    )
    .all(idx1);

  let prefix;
  if (rows.length > 0) {
    const last = rows[rows.length - 1].prd_no;
    prefix = last.split('-')[0];
  } else {
    const suffix = (idx2 && String(idx2).trim()) || '03';
    prefix = `${idx1}${suffix}`;
  }

  let maxSeq = 0;
  for (const r of rows) {
    const part = r.prd_no.split('-')[1];
    const n = parseInt(part, 10);
    if (!Number.isNaN(n) && n > maxSeq) maxSeq = n;
  }
  const next = maxSeq + 1;
  return { prd_no: `${prefix}-${String(next).padStart(4, '0')}`, prefix };
}

function rowToArea(row) {
  return {
    area_no: row.area_no,
    name: row.name,
    area_up: row.area_up,
    stop_dd: row.stop_dd,
    rem: row.rem,
  };
}

function buildAreaTree(rows) {
  const ROOT = '00000000';
  const map = new Map();
  for (const r of rows) {
    map.set(r.area_no, {
      ...r,
      key: r.area_no,
      title: `${r.area_no} ${r.name || ''}`.trim(),
      children: [],
    });
  }
  const orphanRoots = [];
  for (const node of map.values()) {
    if (node.area_no === ROOT) continue;
    const up = node.area_up && node.area_up !== node.area_no ? String(node.area_up).trim() : '';
    if (up && map.has(up)) {
      map.get(up).children.push(node);
    } else if (map.has(ROOT)) {
      map.get(ROOT).children.push(node);
    } else {
      orphanRoots.push(node);
    }
  }
  const sortFn = (a, b) => String(a.area_no).localeCompare(String(b.area_no));
  const sortTree = (nodes) => {
    nodes.sort(sortFn);
    nodes.forEach((n) => sortTree(n.children));
  };
  if (map.has(ROOT)) {
    sortTree(map.get(ROOT).children);
    return [map.get(ROOT)];
  }
  sortTree(orphanRoots);
  return orphanRoots;
}

function buildIndxTree(rows) {
  const ROOT = '0000000000';
  const map = new Map();
  for (const r of rows) {
    map.set(r.idx_no, { ...r, key: r.idx_no, title: `${r.idx_no} ${r.name || ''}`.trim(), children: [] });
  }
  const orphanRoots = [];
  for (const node of map.values()) {
    if (node.idx_no === ROOT) continue;
    const up = node.idx_up && node.idx_up !== node.idx_no ? String(node.idx_up).trim() : '';
    if (up && map.has(up)) {
      map.get(up).children.push(node);
    } else if (map.has(ROOT)) {
      map.get(ROOT).children.push(node);
    } else {
      orphanRoots.push(node);
    }
  }
  const sortFn = (a, b) => String(a.idx_no).localeCompare(String(b.idx_no));
  const sortTree = (nodes) => {
    nodes.sort(sortFn);
    nodes.forEach((n) => sortTree(n.children));
  };
  if (map.has(ROOT)) {
    sortTree(map.get(ROOT).children);
    return [map.get(ROOT)];
  }
  sortTree(orphanRoots);
  return orphanRoots;
}

function rowToCust(row) {
  return {
    cus_no: row.cus_no,
    obj_id: row.obj_id,
    name: row.name,
    snm: row.snm,
    cus_are: row.cus_are,
    cnt_man1: row.cnt_man1,
    cnt_man2: row.cnt_man2,
    tel1: row.tel1,
    tel2: row.tel2,
    uni_no: row.uni_no,
    biz_dsc: row.biz_dsc,
    adr2: row.adr2,
    end_dd: row.end_dd,
    cur_id: row.cur_id,
    id1_tax: row.id1_tax,
    sal: row.sal,
    sal_no: row.sal_no,
    bnk_name: row.bnk_name,
    id_code: row.id_code,
    rem: row.rem,
  };
}

function rowToSalm(row) {
  return {
    sal_no: row.sal_no,
    name: row.name,
    eng_name: row.eng_name,
    name_py: row.name_py,
    sex: row.sex,
    dep: row.dep,
    pos: row.pos,
    up_sal_no: row.up_sal_no,
    tel1: row.tel1,
    tel2: row.tel2,
    e_mail: row.e_mail,
    con_adr: row.con_adr,
    id_num: row.id_num,
    bth: row.bth,
    dut_in_d: row.dut_in_d,
    dut_ot_d: row.dut_ot_d,
    rem: row.rem,
    dep_name: row.dep_name,
    up_sal_name: row.up_sal_name,
  };
}

function rowToMfPos(row) {
  return {
    os_id: row.os_id,
    os_no: row.os_no,
    os_dd: row.os_dd,
    cus_no: row.cus_no,
    use_dep: row.use_dep,
    sal_no: row.sal_no,
    cus_os_no: row.cus_os_no,
    bil_type: row.bil_type,
    cur_id: row.cur_id,
    tax_id: row.tax_id,
    est_dd: row.est_dd,
    rem: row.rem,
    cls_mp_id: row.cls_mp_id,
    cls_id: row.cls_id,
    dis_cnt: row.dis_cnt,
    amtn_net: row.amtn_net,
    tax: row.tax,
    bil_id: row.bil_id,
    bil_no: row.bil_no,
    cus_name: row.cus_name,
    ...billAuditFields(row),
  };
}

function rowToTfPos(row) {
  return {
    os_id: row.os_id,
    os_no: row.os_no,
    itm: row.itm,
    prd_no: row.prd_no,
    prd_name: row.prd_name,
    wh: row.wh,
    wh_name: row.wh_name,
    qty: row.qty,
    ut: row.ut,
    up: row.up,
    amtn: row.amtn,
    tax_rto: row.tax_rto,
    tax: row.tax,
    est_dd: row.est_dd,
    sup_prd_no: row.sup_prd_no,
    rem: row.rem,
    qty_ps: row.qty_ps,
    bil_id: row.bil_id,
    bil_no: row.bil_no,
    bil_itm: row.bil_itm,
    spc: row.spc,
  };
}

/** 受订单/采购单号：SO26050001 */
function nextOsNo(osId = 'SO') {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const prefix = `${osId}${yy}${mm}`;
  const rows = db
    .prepare('SELECT os_no FROM mf_pos WHERE os_id = ? AND os_no LIKE ?')
    .all(osId, `${prefix}%`);
  let maxSeq = 0;
  for (const r of rows) {
    const n = parseInt(String(r.os_no).slice(prefix.length), 10);
    if (!Number.isNaN(n) && n > maxSeq) maxSeq = n;
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}

/** 销货/进货单号：SA26050004 */
function nextPsNo(psId = 'SA') {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const prefix = `${psId}${yy}${mm}`;
  const rows = db
    .prepare('SELECT ps_no FROM mf_pss WHERE ps_id = ? AND ps_no LIKE ?')
    .all(psId, `${prefix}%`);
  let maxSeq = 0;
  for (const r of rows) {
    const n = parseInt(String(r.ps_no).slice(prefix.length), 10);
    if (!Number.isNaN(n) && n > maxSeq) maxSeq = n;
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}

function rowToMfPss(row) {
  return {
    ps_id: row.ps_id,
    ps_no: row.ps_no,
    ps_dd: row.ps_dd,
    cus_no: row.cus_no,
    dep: row.dep,
    sal_no: row.sal_no,
    cus_os_no: row.cus_os_no,
    bil_type: row.bil_type,
    cur_id: row.cur_id,
    tax_id: row.tax_id,
    os_id: row.os_id,
    os_no: row.os_no,
    zhang_id: row.zhang_id,
    send_mth: row.send_mth,
    send_wh: row.send_wh,
    adr: row.adr,
    pay_mth: row.pay_mth,
    pay_days: row.pay_days,
    pay_dd: row.pay_dd,
    chk_dd: row.chk_dd,
    inv_no: row.inv_no,
    rp_no: row.rp_no,
    voh_no: row.voh_no,
    contract: row.contract,
    rem: row.rem,
    dis_cnt: row.dis_cnt,
    amtn_net: row.amtn_net,
    tax: row.tax,
    cus_name: row.cus_name,
    ...billAuditFields(row),
  };
}

function rowToTfPss(row) {
  return {
    ps_id: row.ps_id,
    ps_no: row.ps_no,
    itm: row.itm,
    prd_no: row.prd_no,
    prd_name: row.prd_name,
    prd_mark: row.prd_mark,
    wh: row.wh,
    wh_name: row.wh_name,
    qty: row.qty,
    ut: row.ut,
    up: row.up,
    amtn_net: row.amtn_net,
    tax_rto: row.tax_rto,
    tax: row.tax,
    est_dd: row.est_dd,
    sup_prd_no: row.sup_prd_no,
    rem: row.rem,
    dis_cnt: row.dis_cnt,
    qty1: row.qty1,
    bat_no: row.bat_no,
    os_id: row.os_id,
    os_no: row.os_no,
    src_itm: row.src_itm,
    spc: row.spc,
    qty_rtn: row.qty_rtn,
    qty_open: row.qty_open,
  };
}

function calcLineAmounts(qty, up, taxId, taxRto = 13) {
  const q = Number(qty) || 0;
  const p = Number(up) || 0;
  const gross = Math.round(q * p * 100) / 100;
  const rto = Number(taxRto) || 0;
  let amtn = gross;
  let tax = 0;
  if (taxId === '2') {
    tax = Math.round((gross * rto) / (100 + rto) * 100) / 100;
    amtn = Math.round((gross - tax) * 100) / 100;
  } else if (taxId === '3') {
    amtn = gross;
    tax = Math.round((amtn * rto) / 100 * 100) / 100;
  }
  return { amtn, tax, gross: amtn + tax };
}

function sumOrder(lines, taxId) {
  let amtn_net = 0;
  let tax = 0;
  for (const ln of lines) {
    const c = calcLineAmounts(ln.qty, ln.up, taxId, ln.tax_rto);
    amtn_net += c.amtn;
    tax += c.tax;
  }
  return {
    amtn_net: Math.round(amtn_net * 100) / 100,
    tax: Math.round(tax * 100) / 100,
  };
}

/** 请购单号：SQ26050001 */
function nextSqNo() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const prefix = `SQ${yy}${mm}`;
  const rows = db.prepare('SELECT sq_no FROM mf_sq WHERE sq_no LIKE ?').all(`${prefix}%`);
  let maxSeq = 0;
  for (const r of rows) {
    const n = parseInt(String(r.sq_no).slice(prefix.length), 10);
    if (!Number.isNaN(n) && n > maxSeq) maxSeq = n;
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}

function rowToMfSq(row) {
  return {
    sq_no: row.sq_no,
    sq_dd: row.sq_dd,
    dep: row.dep,
    cus_no: row.cus_no,
    sal_no: row.sal_no,
    est_dd: row.est_dd,
    rem: row.rem,
    po_no: row.po_no,
    po_dep: row.po_dep,
    cur_id: row.cur_id,
    exc_rto: row.exc_rto,
    cls_id: row.cls_id,
    bil_id: row.bil_id,
    bil_no: row.bil_no,
    amtn: row.amtn,
    cus_name: row.cus_name,
    sal_name: row.sal_name,
    dep_name: row.dep_name,
    ...billAuditFields(row),
  };
}

function rowToTfSq(row) {
  return {
    sq_no: row.sq_no,
    itm: row.itm,
    prd_no: row.prd_no,
    prd_name: row.prd_name,
    prd_mark: row.prd_mark,
    unit: row.unit,
    qty: row.qty,
    up: row.up,
    amtn: row.amtn,
    est_dd: row.est_dd,
    rem: row.rem,
    cus_no: row.cus_no,
    cur_id: row.cur_id,
    exc_rto: row.exc_rto,
    qty1: row.qty1,
    qty_po: row.qty_po,
    bat_no: row.bat_no,
    spc: row.spc,
    qty_open: row.qty_open,
  };
}

function calcSqLineAmt(qty, up) {
  const q = Number(qty) || 0;
  const p = Number(up) || 0;
  return Math.round(q * p * 100) / 100;
}

function sumSq(lines) {
  let amtn = 0;
  for (const ln of lines) {
    amtn += calcSqLineAmt(ln.qty, ln.up);
  }
  return Math.round(amtn * 100) / 100;
}

function rowToMfMo(row) {
  return {
    mo_no: row.mo_no,
    mo_dd: row.mo_dd,
    sta_dd: row.sta_dd,
    end_dd: row.end_dd,
    opn_dd: row.opn_dd,
    fin_dd: row.fin_dd,
    mrp_no: row.mrp_no,
    prd_mark: row.prd_mark,
    wh: row.wh,
    so_no: row.so_no,
    unit: row.unit,
    qty: row.qty,
    dep: row.dep,
    bil_type: row.bil_type,
    build_bil: row.build_bil,
    close_id: row.close_id,
    rem: row.rem,
    qty_fin: row.qty_fin,
    bil_id: row.bil_id,
    bil_no: row.bil_no,
    mrp_name: row.mrp_name,
    mrp_spc: row.mrp_spc,
    dep_name: row.dep_name,
    wh_name: row.wh_name,
    ...billAuditFields(row),
  };
}

function rowToTfMo(row) {
  return {
    mo_no: row.mo_no,
    itm: row.itm,
    prd_no: row.prd_no,
    prd_name: row.prd_name,
    prd_mark: row.prd_mark,
    wh: row.wh,
    unit: row.unit,
    qty_std: row.qty_std,
    los_rto: row.los_rto,
    qty_rsv: row.qty_rsv,
    qty_lost: row.qty_lost,
    qty: row.qty,
    bat_no: row.bat_no,
    rem: row.rem,
  };
}

function rowToMfBom(row) {
  return {
    bom_no: row.bom_no,
    prd_no: row.prd_no,
    pf_no: row.pf_no,
    name: row.name,
    prd_mark: row.prd_mark,
    wh_no: row.wh_no,
    unit: row.unit,
    qty: row.qty,
    prd_knd: row.prd_knd,
    spc: row.spc,
    valid_dd: row.valid_dd,
    end_dd: row.end_dd,
    dep: row.dep,
    rem: row.rem,
    prd_name: row.prd_name,
    dep_name: row.dep_name,
    wh_name: row.wh_name,
    ...billAuditFields(row),
  };
}

function rowToTfBom(row) {
  return {
    bom_no: row.bom_no,
    itm: row.itm,
    prd_no: row.prd_no,
    name: row.name,
    prd_mark: row.prd_mark,
    wh_no: row.wh_no,
    unit: row.unit,
    qty: row.qty,
    los_rto: row.los_rto,
    qty_bas: row.qty_bas,
    bom_id: row.bom_id,
    rem: row.rem,
    spc: row.spc,
  };
}

/** 标准用量 × 制令数量 × (1 + 损耗率%) */
function calcMoLine(ln, headQty) {
  const std = Number(ln.qty_std) || 0;
  const rto = Number(ln.los_rto) || 0;
  const hq = Number(headQty) || 0;
  const base = Math.round(std * hq * 100) / 100;
  const lost = Math.round(base * (rto / 100) * 100) / 100;
  const rsv = Math.round((base + lost) * 100) / 100;
  return { ...ln, qty_lost: lost, qty_rsv: rsv };
}

function rowToMfMl(row) {
  return {
    ml_no: row.ml_no,
    ml_dd: row.ml_dd,
    mo_no: row.mo_no,
    mrp_no: row.mrp_no,
    prd_name: row.prd_name,
    prd_mark: row.prd_mark,
    unit: row.unit,
    qty: row.qty,
    wh_mtl: row.wh_mtl,
    dep: row.dep,
    bil_type: row.bil_type,
    id_no: row.id_no,
    bat_no: row.bat_no,
    usr_no: row.usr_no,
    rem: row.rem,
    mlid: row.mlid,
    ml_id: row.ml_id,
    bil_id: row.bil_id,
    bil_no: row.bil_no,
    mrp_spc: row.mrp_spc,
    dep_name: row.dep_name,
    wh_mtl_name: row.wh_mtl_name,
    usr_name: row.usr_name,
    ...billAuditFields(row),
  };
}

function rowToTfMl(row) {
  return {
    ml_no: row.ml_no,
    itm: row.itm,
    prd_no: row.prd_no,
    prd_name: row.prd_name,
    prd_mark: row.prd_mark,
    wh: row.wh,
    unit: row.unit,
    qty_std: row.qty_std,
    los_rto: row.los_rto,
    qty_rsv: row.qty_rsv,
    qty: row.qty,
    qty_wh: row.qty_wh,
    bat_no: row.bat_no,
    rem: row.rem,
    mo_no: row.mo_no,
    bil_itm: row.bil_itm,
  };
}

/** 领料明细应发量（同制令 BOM 行算法） */
function calcMlLine(ln, headQty) {
  return calcMoLine(ln, headQty);
}

function rowToMfMm(row) {
  return {
    mm_no: row.mm_no,
    mm_dd: row.mm_dd,
    mo_no: row.mo_no,
    dep: row.dep,
    bil_type: row.bil_type,
    bil_id: row.bil_id,
    bil_no: row.bil_no,
    fin_id: row.fin_id,
    usr_no: row.usr_no,
    rem: row.rem,
    mm_id: row.mm_id,
    dep_name: row.dep_name,
    usr_name: row.usr_name,
    cancel_id: row.cancel_id,
    ...billAuditFields(row),
  };
}

function rowToTfMm(row) {
  return {
    mm_no: row.mm_no,
    mm_dd: row.mm_dd,
    itm: row.itm,
    mo_no: row.mo_no,
    prd_no: row.prd_no,
    prd_name: row.prd_name,
    prd_mark: row.prd_mark,
    unit: row.unit,
    wh: row.wh,
    bat_no: row.bat_no,
    qty: row.qty,
    qty1: row.qty1,
    valid_dd: row.valid_dd,
    free_id: row.free_id,
    so_no: row.so_no,
    rem: row.rem,
    mo_qty: row.mo_qty,
    qty_fin: row.qty_fin,
  };
}

function calcMmLine(ln) {
  const qty = Math.round((Number(ln.qty) || 0) * 100) / 100;
  const qty1 = Math.round((Number(ln.qty1) || 0) * 100) / 100;
  return { ...ln, qty, qty1 };
}

function rowToMfJh(row) {
  return {
    jh_no: row.jh_no,
    jh_dd: row.jh_dd,
    est_dd: row.est_dd,
    dep: row.dep,
    sal_no: row.sal_no,
    so_no: row.so_no,
    cus_no: row.cus_no,
    cus_os_no: row.cus_os_no,
    bil_type: row.bil_type,
    bat_no: row.bat_no,
    close_id: row.close_id,
    rem: row.rem,
    cancel_id: row.cancel_id,
    dep_name: row.dep_name,
    sal_name: row.sal_name,
    cus_name: row.cus_name,
    ...billAuditFields(row),
  };
}

function rowToTfJh(row) {
  return {
    jh_no: row.jh_no,
    itm: row.itm,
    prd_no: row.prd_no,
    prd_name: row.prd_name,
    prd_mark: row.prd_mark,
    wh: row.wh,
    unit: row.unit,
    qty: row.qty,
    est_dd: row.est_dd,
    bat_no: row.bat_no,
    id_no: row.id_no,
    os_id: row.os_id,
    os_no: row.os_no,
    est_itm: row.est_itm,
    cus_os_no: row.cus_os_no,
    sup_prd_no: row.sup_prd_no,
    mp_cls_id: row.mp_cls_id,
    rem: row.rem,
    pre_itm: row.pre_itm,
  };
}

function normalizeJhLine(ln) {
  const qty = Math.round((Number(ln.qty) || 0) * 100) / 100;
  return { ...ln, qty };
}

function rowToMfMp(row) {
  return {
    mp_no: row.mp_no,
    mp_dd: row.mp_dd,
    est_dd: row.est_dd,
    dep: row.dep,
    so_no: row.so_no,
    wh: row.wh,
    bil_type: row.bil_type,
    rem: row.rem,
    cancel_id: row.cancel_id,
    dep_name: row.dep_name,
    ...billAuditFields(row),
  };
}

function rowToTfMp1(row) {
  return {
    mp_no: row.mp_no,
    itm: row.itm,
    mrp_no: row.mrp_no,
    prd_no: row.prd_no,
    prd_name: row.prd_name,
    prd_mark: row.prd_mark,
    wh: row.wh,
    unit: row.unit,
    so_no: row.so_no,
    est_dd: row.est_dd,
    qty_so: row.qty_so,
    qty_non: row.qty_non,
    qty_min: row.qty_min,
    qty_on_way: row.qty_on_way,
    qty_on_prc: row.qty_on_prc,
    qty_on_rsv: row.qty_on_rsv,
    qty: row.qty,
    qty_po: row.qty_po,
    qty_sq: row.qty_sq,
    id_no: row.id_no,
    bom_no: row.bom_no,
    po_yes: row.po_yes,
    rem: row.rem,
    est_itm: row.est_itm,
  };
}

function rowToTfMp2(row) {
  return {
    mp_no: row.mp_no,
    itm: row.itm,
    prd_no: row.prd_no,
    prd_name: row.prd_name,
    prd_mark: row.prd_mark,
    wh: row.wh,
    cus_no: row.cus_no,
    unit: row.unit,
    qty: row.qty,
    qty_po: row.qty_po,
    up_po: row.up_po,
    amtn_po: row.amtn_po,
    est_dd: row.est_dd,
    so_no: row.so_no,
    po_no: row.po_no,
    bat_no: row.bat_no,
    cur_id: row.cur_id,
    sup_prd_no: row.sup_prd_no,
    rem: row.rem,
  };
}

function rowToTfMp3(row) {
  return {
    mp_no: row.mp_no,
    itm: row.itm,
    prd_no: row.prd_no,
    prd_name: row.prd_name,
    prd_mark: row.prd_mark,
    wh: row.wh,
    unit: row.unit,
    qty: row.qty,
    qty_mo: row.qty_mo,
    sta_dd: row.sta_dd,
    end_dd: row.end_dd,
    dep: row.dep,
    mo_no: row.mo_no,
    id_no: row.id_no,
    bom_no: row.bom_no,
    so_no: row.so_no,
    est_dd: row.est_dd,
    tw_id: row.tw_id,
    rem: row.rem,
  };
}

function normalizeMpLine(ln) {
  const r = (v) => Math.round((Number(v) || 0) * 100) / 100;
  return {
    ...ln,
    qty: r(ln.qty),
    qty_so: r(ln.qty_so),
    qty_non: r(ln.qty_non),
    qty_min: r(ln.qty_min),
    qty_on_way: r(ln.qty_on_way),
    qty_on_prc: r(ln.qty_on_prc),
    qty_on_rsv: r(ln.qty_on_rsv),
    qty_po: r(ln.qty_po),
    qty_sq: r(ln.qty_sq),
  };
}

function normalizeMp2Line(ln) {
  const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
  const r4 = (v) => Math.round((Number(v) || 0) * 10000) / 10000;
  return { ...ln, qty: r2(ln.qty), qty_po: r2(ln.qty_po), up_po: r4(ln.up_po), amtn_po: r2(ln.amtn_po) };
}

function normalizeMp3Line(ln) {
  const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
  return { ...ln, qty: r2(ln.qty), qty_mo: r2(ln.qty_mo) };
}

module.exports = {
  db,
  dbPath,
  rowToIndx,
  rowToArea,
  rowToPrdt,
  rowToPrdtPic,
  rowToCust,
  rowToSalm,
  rowToDept,
  rowToWh,
  buildDeptTree,
  rowToMfPos,
  rowToTfPos,
  nextPrdNo,
  nextOsNo,
  nextPsNo,
  nextSqNo,
  buildIndxTree,
  buildAreaTree,
  calcLineAmounts,
  sumOrder,
  rowToMfPss,
  rowToTfPss,
  rowToMfSq,
  rowToTfSq,
  calcSqLineAmt,
  sumSq,
  rowToMfMo,
  rowToTfMo,
  rowToMfBom,
  rowToTfBom,
  calcMoLine,
  rowToMfMl,
  rowToTfMl,
  calcMlLine,
  rowToMfMm,
  rowToTfMm,
  calcMmLine,
  rowToMfJh,
  rowToTfJh,
  normalizeJhLine,
  rowToMfMp,
  rowToTfMp1,
  rowToTfMp2,
  rowToTfMp3,
  normalizeMpLine,
  normalizeMp2Line,
  normalizeMp3Line,
};
