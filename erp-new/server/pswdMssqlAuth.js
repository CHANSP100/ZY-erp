/**
 * SUNLIKE PSWD 表登录（MSSQL + Sunlike 密文校验）
 */
const { fixRows } = require('./encoding');
const { getSystemPool, sql } = require('./mssqlPool');
const { syncUserFromMssql, syncMenuFromPswd1, seedUserMenus } = require('./permissions');
const { loadConfig } = require('./dbConnectionConfig');

const MSSQL_PWD_MARKER = '__MSSQL__';
let mssqlPswdUnavailable = false;

function getAuthMode() {
  const saved = loadConfig();
  if (saved.saved && saved.authMode) return saved.authMode;
  const m = String(process.env.AUTH_MODE || 'sqlite').toLowerCase();
  if (m === 'sqlite' || m === 'mssql' || m === 'hybrid') return m;
  return 'sqlite';
}

function isPswdUnavailableError(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  return msg.includes("invalid object name 'pswd'") || msg.includes('invalid object name "pswd"');
}

function markPswdUnavailable(err) {
  if (isPswdUnavailableError(err)) {
    mssqlPswdUnavailable = true;
    console.warn('[pswdMssqlAuth] PSWD 表不可用，后续跳过 MSSQL 登录');
  }
}

function resetMssqlPswdCache() {
  mssqlPswdUnavailable = false;
}

function getDefaultCompno() {
  const saved = loadConfig();
  if (saved.compno) return String(saved.compno).trim();
  return String(process.env.MSSQL_COMPNO || '').trim();
}

function isCompBoss(val) {
  const s = String(val || '').trim().toUpperCase();
  return s === 'T' || s === 'Y' || s === '1';
}

function isUserExpired(eDat) {
  if (!eDat) return false;
  const s = String(eDat).trim();
  if (!s) return false;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

function normalizePswdRow(row) {
  if (!row) return null;
  return {
    compno: String(row.COMPNO || '').trim(),
    usr_id: String(row.USR || '').trim(),
    name: String(row.NAME || '').trim(),
    pwd_cipher: String(row.PWD || '').trim(),
    dep: String(row.DEP || '').trim(),
    depro_no: String(row.DEPRO_NO || '').trim(),
    b_dat: row.B_DAT ? String(row.B_DAT).trim() : '',
    e_dat: row.E_DAT ? String(row.E_DAT).trim() : '',
    rem: String(row.REM || '').trim(),
    mng: String(row.MNG || '').trim(),
    tel1: String(row.TEL1 || '').trim(),
    e_mail: String(row.E_MAIL || '').trim(),
    is_admin: isCompBoss(row.COMP_BOSS),
  };
}

async function queryPswdUser(usrId, compno) {
  const pool = await getSystemPool();
  const req = pool.request();
  req.input('usr', sql.NVarChar(12), usrId);
  const usrMatch = 'UPPER(LTRIM(RTRIM(USR))) = UPPER(LTRIM(RTRIM(@usr)))';
  const sqlText = compno
    ? `
    SELECT TOP 1
      COMPNO, USR,
      CAST(NAME AS nvarchar(100)) AS NAME,
      CAST(PWD AS varchar(100)) AS PWD,
      CAST(MNG AS varchar(12)) AS MNG,
      DEP, DEPRO_NO,
      CAST(COMP_BOSS AS varchar(1)) AS COMP_BOSS,
      CONVERT(varchar(10), B_DAT, 23) AS B_DAT,
      CONVERT(varchar(10), E_DAT, 23) AS E_DAT,
      CAST(REM AS nvarchar(200)) AS REM,
      CAST(TEL1 AS varchar(20)) AS TEL1,
      CAST(E_MAIL AS varchar(60)) AS E_MAIL
    FROM PSWD
    WHERE ${usrMatch} AND COMPNO = @compno
  `
    : `
    SELECT TOP 1
      COMPNO, USR,
      CAST(NAME AS nvarchar(100)) AS NAME,
      CAST(PWD AS varchar(100)) AS PWD,
      CAST(MNG AS varchar(12)) AS MNG,
      DEP, DEPRO_NO,
      CAST(COMP_BOSS AS varchar(1)) AS COMP_BOSS,
      CONVERT(varchar(10), B_DAT, 23) AS B_DAT,
      CONVERT(varchar(10), E_DAT, 23) AS E_DAT,
      CAST(REM AS nvarchar(200)) AS REM,
      CAST(TEL1 AS varchar(20)) AS TEL1,
      CAST(E_MAIL AS varchar(60)) AS E_MAIL
    FROM PSWD
    WHERE ${usrMatch}
    ORDER BY COMPNO
  `;
  if (compno) req.input('compno', sql.NVarChar(4), compno);
  const result = await req.query(sqlText);
  const rows = fixRows(result.recordset || []);
  return normalizePswdRow(rows[0]);
}

async function fetchPswdUser(usrId, compno) {
  if (mssqlPswdUnavailable) return null;
  try {
    const preferred = String(compno || '').trim();
    if (preferred) {
      const byComp = await queryPswdUser(usrId, preferred);
      if (byComp?.usr_id) return byComp;
    }
    return queryPswdUser(usrId, null);
  } catch (err) {
    markPswdUnavailable(err);
    throw err;
  }
}

async function fetchPswd1Menus(usrId, compno) {
  const pool = await getSystemPool();
  const req = pool.request();
  req.input('usr', sql.NVarChar(12), usrId);
  req.input('compno', sql.NVarChar(4), compno);
  const result = await req.query(`
    SELECT
      CAST(PGM AS varchar(20)) AS PGM,
      CAST(DSP AS varchar(1)) AS DSP,
      CAST(APD AS varchar(1)) AS APD,
      CAST(UPD AS varchar(1)) AS UPD,
      CAST(DEL AS varchar(1)) AS DEL,
      CAST(PRT AS varchar(1)) AS PRT
    FROM PSWD1
    WHERE UPPER(LTRIM(RTRIM(USR))) = UPPER(LTRIM(RTRIM(@usr))) AND COMPNO = @compno
  `);
  return (result.recordset || []).map((r) => ({
    pgm: String(r.PGM || '').trim(),
    dsp: String(r.DSP || 'F').trim().toUpperCase(),
    apd: String(r.APD || 'F').trim().toUpperCase(),
    upd: String(r.UPD || 'F').trim().toUpperCase(),
    del: String(r.DEL || 'F').trim().toUpperCase(),
    prt: String(r.PRT || 'F').trim().toUpperCase(),
  }));
}

/**
 * @returns {{ profile: object } | { error: string }}
 */
async function authenticateViaMssql(usrId, options = {}) {
  const compno = String(options.compno || getDefaultCompno()).trim();
  const row = await fetchPswdUser(usrId, compno);
  if (!row || !row.usr_id) {
    return { error: '账号不存在' };
  }
  if (isUserExpired(row.e_dat)) {
    return { error: '该用户已停用' };
  }

  const canonicalUsr = row.usr_id;
  syncUserFromMssql({ ...row, pwd: MSSQL_PWD_MARKER });

  const syncCompno = row.compno || compno;
  if (String(process.env.SYNC_PSWD1_ON_LOGIN || 'true').toLowerCase() !== 'false') {
    try {
      const menus = await fetchPswd1Menus(canonicalUsr, syncCompno);
      if (menus.length > 0) {
        syncMenuFromPswd1(canonicalUsr, menus);
      } else {
        seedUserMenus(canonicalUsr, row.is_admin);
      }
    } catch (e) {
      console.warn('[pswdMssqlAuth] PSWD1 sync skipped:', e.message);
      seedUserMenus(canonicalUsr, row.is_admin);
    }
  } else {
    seedUserMenus(canonicalUsr, row.is_admin);
  }

  return { profile: row };
}

module.exports = {
  getAuthMode,
  getDefaultCompno,
  MSSQL_PWD_MARKER,
  authenticateViaMssql,
  fetchPswdUser,
  resetMssqlPswdCache,
};
