/**
 * 中类 INDX — 读写 DB_11（账套业务库）
 * 字段范围：对照表「中类.md」本期 5 项
 */
const { fixRows } = require('../encoding');
const { getPool, sql } = require('../mssqlPool');
const { normalizeIndxRow, normalizeIndxPayload, INDX_ROOT_NO } = require('./mssqlRow');

const INDX_SELECT = `
  SELECT
    IDX_NO,
    CAST(NAME AS nvarchar(100)) AS NAME,
    IDX_UP,
    CONVERT(varchar(10), STOP_DD, 23) AS STOP_DD,
    CAST(REM AS nvarchar(200)) AS REM
  FROM INDX
`;

function mapRows(recordset) {
  return fixRows(recordset || []).map(normalizeIndxRow);
}

async function listAll() {
  const pool = await getPool();
  const result = await pool.request().query(`${INDX_SELECT} ORDER BY IDX_NO`);
  return mapRows(result.recordset);
}

async function countAll() {
  const pool = await getPool();
  const result = await pool.request().query('SELECT COUNT(*) AS c FROM INDX');
  return Number(result.recordset?.[0]?.c ?? 0);
}

async function getByNo(idxNo) {
  const pool = await getPool();
  const req = pool.request();
  req.input('idx_no', sql.NVarChar(10), idxNo);
  const result = await req.query(`${INDX_SELECT} WHERE IDX_NO = @idx_no`);
  return mapRows(result.recordset)[0] || null;
}

async function exists(idxNo) {
  const pool = await getPool();
  const req = pool.request();
  req.input('idx_no', sql.NVarChar(10), idxNo);
  const result = await req.query('SELECT 1 AS ok FROM INDX WHERE IDX_NO = @idx_no');
  return (result.recordset || []).length > 0;
}

async function isUsedByPrdt(idxNo) {
  const pool = await getPool();
  const req = pool.request();
  req.input('idx_no', sql.NVarChar(10), idxNo);
  const result = await req.query('SELECT TOP 1 1 AS ok FROM PRDT WHERE IDX1 = @idx_no');
  return (result.recordset || []).length > 0;
}

async function hasChild(idxNo) {
  const pool = await getPool();
  const req = pool.request();
  req.input('idx_no', sql.NVarChar(10), idxNo);
  const result = await req.query('SELECT TOP 1 1 AS ok FROM INDX WHERE IDX_UP = @idx_no');
  return (result.recordset || []).length > 0;
}

async function create(payload) {
  const p = normalizeIndxPayload(payload);
  const pool = await getPool();
  const req = pool.request();
  req.input('idx_no', sql.NVarChar(10), p.idx_no);
  req.input('name', sql.NVarChar(50), p.name || '');
  req.input('idx_up', sql.NVarChar(10), p.idx_up || INDX_ROOT_NO);
  req.input('stop_dd', sql.DateTime, p.stop_dd ? new Date(p.stop_dd) : null);
  req.input('rem', sql.NVarChar(60), p.rem || '');
  req.input('day_supply', sql.NVarChar(1), 'F');
  await req.query(`
    INSERT INTO INDX (IDX_NO, NAME, IDX_UP, STOP_DD, REM, DAY_SUPPLY)
    VALUES (@idx_no, @name, @idx_up, @stop_dd, @rem, @day_supply)
  `);
  return getByNo(p.idx_no);
}

async function update(idxNo, payload) {
  const existing = await getByNo(idxNo);
  if (!existing) return null;
  const p = normalizeIndxPayload({ ...existing, ...payload, idx_no: idxNo });
  const pool = await getPool();
  const req = pool.request();
  req.input('idx_no', sql.NVarChar(10), idxNo);
  req.input('name', sql.NVarChar(50), p.name || '');
  req.input('idx_up', sql.NVarChar(10), p.idx_up || INDX_ROOT_NO);
  req.input('stop_dd', sql.DateTime, p.stop_dd ? new Date(p.stop_dd) : null);
  req.input('rem', sql.NVarChar(60), p.rem || '');
  await req.query(`
    UPDATE INDX SET
      NAME = @name,
      IDX_UP = @idx_up,
      STOP_DD = @stop_dd,
      REM = @rem
    WHERE IDX_NO = @idx_no
  `);
  return getByNo(idxNo);
}

async function remove(idxNo) {
  const pool = await getPool();
  const req = pool.request();
  req.input('idx_no', sql.NVarChar(10), idxNo);
  const result = await req.query('DELETE FROM INDX WHERE IDX_NO = @idx_no');
  return (result.rowsAffected?.[0] ?? 0) > 0;
}

module.exports = {
  listAll,
  countAll,
  getByNo,
  exists,
  isUsedByPrdt,
  hasChild,
  create,
  update,
  remove,
};
