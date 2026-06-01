/**
 * MSSQL 连接池（业务库 + 系统配置库 SUNSYSTEM）
 */
const sql = require('mssql');
const { loadConfig, buildMssqlConfig } = require('./dbConnectionConfig');

const pools = {
  business: { promise: null, fingerprint: '' },
  system: { promise: null, fingerprint: '' },
};

function poolFingerprint(kind) {
  const c = loadConfig();
  const db = kind === 'system' ? c.systemDatabase : c.businessDatabase;
  return `${c.server}|${c.port}|${c.loginType}|${db}|${c.user}|${c.password}`;
}

function getMssqlConfig() {
  const c = loadConfig();
  return buildMssqlConfig(c, c.businessDatabase);
}

function getSystemMssqlConfig() {
  const c = loadConfig();
  return buildMssqlConfig(c, c.systemDatabase);
}

async function closePoolEntry(entry) {
  if (!entry.promise) return;
  try {
    const pool = await entry.promise;
    await pool.close();
  } catch {
    /* ignore */
  }
  entry.promise = null;
  entry.fingerprint = '';
}

async function closePool() {
  await Promise.all([closePoolEntry(pools.business), closePoolEntry(pools.system)]);
}

function connectPool(kind) {
  const entry = pools[kind];
  const fp = poolFingerprint(kind);
  if (entry.promise && entry.fingerprint !== fp) {
    closePoolEntry(entry).catch(() => {});
    entry.promise = null;
  }
  if (!entry.promise) {
    const cfg = kind === 'system' ? getSystemMssqlConfig() : getMssqlConfig();
    entry.fingerprint = fp;
    entry.promise = sql.connect(cfg).catch((err) => {
      entry.promise = null;
      entry.fingerprint = '';
      throw err;
    });
  }
  return entry.promise;
}

function getPool() {
  return connectPool('business');
}

function getSystemPool() {
  return connectPool('system');
}

module.exports = {
  sql,
  getMssqlConfig,
  getSystemMssqlConfig,
  getPool,
  getSystemPool,
  closePool,
};
