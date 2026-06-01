/**
 * DB_11 公共查询/事务工具
 */
const { fixRows } = require('../encoding');
const { getPool, sql } = require('../mssqlPool');

function lowerKeys(row) {
  if (!row) return null;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[String(k).toLowerCase()] = v;
  }
  return out;
}

function lowerRows(rows) {
  return (rows || []).map(lowerKeys);
}

async function queryAll(sqlText, inputs = {}) {
  const pool = await getPool();
  const req = pool.request();
  bindInputs(req, inputs);
  const result = await req.query(sqlText);
  return lowerRows(fixRows(result.recordset || []));
}

async function queryOne(sqlText, inputs = {}) {
  const rows = await queryAll(sqlText, inputs);
  return rows[0] || null;
}

async function execSql(sqlText, inputs = {}) {
  const pool = await getPool();
  const req = pool.request();
  bindInputs(req, inputs);
  const result = await req.query(sqlText);
  return result.rowsAffected?.[0] ?? 0;
}

function bindInputs(req, inputs) {
  for (const [name, spec] of Object.entries(inputs)) {
    if (spec && typeof spec === 'object' && spec.type) {
      req.input(name, spec.type, spec.value);
    } else if (Buffer.isBuffer(spec)) {
      req.input(name, sql.VarBinary(sql.MAX), spec);
    } else {
      req.input(name, spec);
    }
  }
}

function nstr(value, len = 200) {
  const v = value == null || value === '' ? null : String(value);
  return { type: sql.NVarChar(len), value: v };
}

function nchar(value, len = 10) {
  const v = value == null || value === '' ? null : String(value);
  return { type: sql.NVarChar(len), value: v };
}

function ndate(value) {
  if (!value) return { type: sql.DateTime, value: null };
  return { type: sql.DateTime, value: new Date(String(value).slice(0, 10)) };
}

function nfloat(value) {
  const n = Number(value);
  return { type: sql.Float, value: Number.isFinite(n) ? n : 0 };
}

function nint(value) {
  const n = parseInt(String(value), 10);
  return { type: sql.Int, value: Number.isFinite(n) ? n : 0 };
}

async function withTransaction(fn) {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  const api = {
    queryAll: async (sqlText, inputs = {}) => {
      const r = new sql.Request(tx);
      bindInputs(r, inputs);
      const result = await r.query(sqlText);
      return lowerRows(fixRows(result.recordset || []));
    },
    queryOne: async (sqlText, inputs = {}) => {
      const rows = await api.queryAll(sqlText, inputs);
      return rows[0] || null;
    },
    exec: async (sqlText, inputs = {}) => {
      const r = new sql.Request(tx);
      bindInputs(r, inputs);
      const result = await r.query(sqlText);
      return result.rowsAffected?.[0] ?? 0;
    },
    request: () => new sql.Request(tx),
  };
  try {
    const out = await fn(api);
    await tx.commit();
    return out;
  } catch (e) {
    try {
      await tx.rollback();
    } catch {
      /* ignore */
    }
    throw e;
  }
}

module.exports = {
  sql,
  lowerKeys,
  lowerRows,
  queryAll,
  queryOne,
  execSql,
  bindInputs,
  nstr,
  nchar,
  ndate,
  nfloat,
  nint,
  withTransaction,
};
