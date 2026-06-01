/**
 * 客户供应商区域 AREA — 读写账套业务库
 * 字段范围：对照表「客户供应商区域.md」本期 5 项
 */
const { fixRows } = require('../encoding');
const { getPool, sql } = require('../mssqlPool');
const { normalizeAreaRow, normalizeAreaPayload, AREA_ROOT_NO } = require('./mssqlRow');

const AREA_SELECT = `
  SELECT
    AREA_NO,
    CAST(NAME AS nvarchar(100)) AS NAME,
    AREA_UP,
    CONVERT(varchar(10), STOP_DD, 23) AS STOP_DD,
    CAST(REM AS nvarchar(200)) AS REM
  FROM AREA
`;

function mapRows(recordset) {
  return fixRows(recordset || []).map(normalizeAreaRow);
}

async function listAll() {
  const pool = await getPool();
  const result = await pool.request().query(`${AREA_SELECT} ORDER BY AREA_NO`);
  return mapRows(result.recordset);
}

async function getByNo(areaNo) {
  const pool = await getPool();
  const req = pool.request();
  req.input('area_no', sql.NVarChar(20), areaNo);
  const result = await req.query(`${AREA_SELECT} WHERE AREA_NO = @area_no`);
  return mapRows(result.recordset)[0] || null;
}

async function exists(areaNo) {
  const pool = await getPool();
  const req = pool.request();
  req.input('area_no', sql.NVarChar(20), areaNo);
  const result = await req.query('SELECT 1 AS ok FROM AREA WHERE AREA_NO = @area_no');
  return (result.recordset || []).length > 0;
}

async function isUsedByCust(areaNo) {
  const pool = await getPool();
  const req = pool.request();
  req.input('area_no', sql.NVarChar(20), areaNo);
  const result = await req.query('SELECT TOP 1 1 AS ok FROM CUST WHERE CUS_ARE = @area_no');
  return (result.recordset || []).length > 0;
}

async function hasChild(areaNo) {
  const pool = await getPool();
  const req = pool.request();
  req.input('area_no', sql.NVarChar(20), areaNo);
  const result = await req.query('SELECT TOP 1 1 AS ok FROM AREA WHERE AREA_UP = @area_no');
  return (result.recordset || []).length > 0;
}

async function create(payload) {
  const p = normalizeAreaPayload(payload);
  const pool = await getPool();
  const req = pool.request();
  req.input('area_no', sql.NVarChar(20), p.area_no);
  req.input('name', sql.NVarChar(100), p.name || '');
  req.input('area_up', sql.NVarChar(20), p.area_up || AREA_ROOT_NO);
  req.input('stop_dd', sql.DateTime, p.stop_dd ? new Date(p.stop_dd) : null);
  req.input('rem', sql.NVarChar(60), p.rem || '');
  await req.query(`
    INSERT INTO AREA (AREA_NO, NAME, AREA_UP, STOP_DD, REM)
    VALUES (@area_no, @name, @area_up, @stop_dd, @rem)
  `);
  return getByNo(p.area_no);
}

async function update(areaNo, payload) {
  const existing = await getByNo(areaNo);
  if (!existing) return null;
  const p = normalizeAreaPayload({ ...existing, ...payload, area_no: areaNo });
  const pool = await getPool();
  const req = pool.request();
  req.input('area_no', sql.NVarChar(20), areaNo);
  req.input('name', sql.NVarChar(100), p.name || '');
  req.input('area_up', sql.NVarChar(20), p.area_up || AREA_ROOT_NO);
  req.input('stop_dd', sql.DateTime, p.stop_dd ? new Date(p.stop_dd) : null);
  req.input('rem', sql.NVarChar(60), p.rem || '');
  await req.query(`
    UPDATE AREA SET
      NAME = @name,
      AREA_UP = @area_up,
      STOP_DD = @stop_dd,
      REM = @rem
    WHERE AREA_NO = @area_no
  `);
  return getByNo(areaNo);
}

async function remove(areaNo) {
  const pool = await getPool();
  const req = pool.request();
  req.input('area_no', sql.NVarChar(20), areaNo);
  const result = await req.query('DELETE FROM AREA WHERE AREA_NO = @area_no');
  return (result.rowsAffected?.[0] ?? 0) > 0;
}

module.exports = {
  listAll,
  getByNo,
  exists,
  isUsedByCust,
  hasChild,
  create,
  update,
  remove,
};
