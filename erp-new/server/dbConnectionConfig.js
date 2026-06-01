/**
 * MSSQL 连接配置（登录页保存，持久化到 data/db-connection.json）
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sql = require('mssql');

const CONFIG_PATH = path.join(__dirname, 'data', 'db-connection.json');

const DEFAULTS = {
  server: '127.0.0.1',
  port: '',
  loginType: 'sql',
  businessDatabase: 'DB_11',
  systemDatabase: 'SUNSYSTEM',
  user: 'SA',
  password: '2285',
  authMode: 'hybrid',
  saved: false,
  testedAt: '',
  configHash: '',
};

function normalizeLoginType(val) {
  const s = String(val || '').trim().toLowerCase();
  if (s === 'windows' || s === 'win' || s === 'sspi') return 'windows';
  return 'sql';
}

function normalizeInput(raw = {}) {
  return {
    server: String(raw.server ?? DEFAULTS.server).trim() || DEFAULTS.server,
    port: String(raw.port ?? DEFAULTS.port).trim(),
    loginType: normalizeLoginType(raw.loginType ?? raw.login_type ?? DEFAULTS.loginType),
    businessDatabase: String(raw.businessDatabase ?? raw.business_database ?? DEFAULTS.businessDatabase).trim(),
    systemDatabase: String(raw.systemDatabase ?? raw.system_database ?? DEFAULTS.systemDatabase).trim() || 'SUNSYSTEM',
    user: String(raw.user ?? DEFAULTS.user).trim(),
    password: String(raw.password ?? DEFAULTS.password),
    authMode: 'hybrid',
  };
}

function buildServerAddress(config) {
  const c = normalizeInput(config);
  let server = c.server;
  const port = c.port;
  if (!port) return server;
  if (server.includes(',') || server.includes('\\')) return server;
  return `${server},${port}`;
}

function configHash(config) {
  const c = normalizeInput(config);
  return crypto
    .createHash('sha256')
    .update(`${c.server}|${c.port}|${c.loginType}|${c.businessDatabase}|${c.systemDatabase}|${c.user}|${c.password}`)
    .digest('hex');
}

function loadConfigFile() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return null;
    const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    return { ...DEFAULTS, ...parsed };
  } catch {
    return null;
  }
}

function loadConfig() {
  const file = loadConfigFile();
  const env = {
    server: process.env.MSSQL_SERVER,
    port: process.env.MSSQL_PORT,
    loginType: process.env.MSSQL_LOGIN_TYPE,
    businessDatabase: process.env.MSSQL_DB,
    systemDatabase: process.env.MSSQL_SYSTEM_DB,
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
  };
  const merged = {
    ...DEFAULTS,
    ...file,
    server: env.server || file?.server || DEFAULTS.server,
    port: env.port || file?.port || DEFAULTS.port,
    loginType: normalizeLoginType(env.loginType || file?.loginType || DEFAULTS.loginType),
    businessDatabase: env.businessDatabase || file?.businessDatabase || DEFAULTS.businessDatabase,
    systemDatabase: env.systemDatabase || file?.systemDatabase || DEFAULTS.systemDatabase,
    user: env.user || file?.user || DEFAULTS.user,
    password: env.password ?? file?.password ?? DEFAULTS.password,
    authMode: file?.authMode || 'hybrid',
    saved: !!file?.saved,
    testedAt: file?.testedAt || '',
    configHash: file?.configHash || '',
  };
  return merged;
}

function getEditorConfig() {
  const c = loadConfig();
  return {
    server: c.server,
    port: c.port,
    loginType: c.loginType,
    businessDatabase: c.businessDatabase,
    systemDatabase: c.systemDatabase,
    user: c.user,
    password: c.password,
    saved: c.saved,
    testedAt: c.testedAt,
    authMode: c.authMode,
  };
}

function toPublicConfig(config) {
  const c = loadConfig();
  const merged = { ...c, ...normalizeInput(config) };
  return {
    server: merged.server,
    port: merged.port,
    loginType: merged.loginType,
    businessDatabase: merged.businessDatabase,
    systemDatabase: merged.systemDatabase,
    user: merged.user,
    password: merged.password ? '******' : '',
    hasPassword: !!merged.password,
    saved: merged.saved,
    testedAt: merged.testedAt,
    authMode: merged.authMode,
  };
}

function buildMssqlConfig(config, database) {
  const c = normalizeInput(config);
  const base = {
    server: buildServerAddress(c),
    database,
    connectionTimeout: Number(process.env.MSSQL_CONNECT_TIMEOUT || 15000),
    requestTimeout: Number(process.env.MSSQL_REQUEST_TIMEOUT || 15000),
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
    },
    pool: { max: 5, min: 0, idleTimeoutMillis: 30000 },
  };

  if (c.loginType === 'windows') {
    return {
      ...base,
      options: {
        ...base.options,
        trustedConnection: true,
      },
    };
  }

  return {
    ...base,
    user: c.user,
    password: c.password,
  };
}

function formatConnectionError(err) {
  const msg = String(err?.originalError?.message || err?.message || err || '');
  const lower = msg.toLowerCase();

  if (lower.includes('econnrefused') || lower.includes('failed to connect')) {
    return '无法连接服务器，请检查 IP/端口、SQL Server 是否启动、TCP/IP 是否启用';
  }
  if (lower.includes('login failed for user') || lower.includes('login failed')) {
    return 'SQL 登录失败：请检查账号密码，并确认 SQL Server 已启用“SQL Server 和 Windows 身份验证”';
  }
  if (lower.includes('cannot open database') || lower.includes('database') && lower.includes('not exist')) {
    return '已连上服务器，但业务数据库不存在或当前账号无权限，请检查数据库名';
  }
  if (lower.includes('timeout') || lower.includes('etimeout')) {
    return '连接超时，请检查 IP、端口（默认 1433）及防火墙';
  }
  if (lower.includes('getaddrinfo') || lower.includes('enotfound')) {
    return '无法解析服务器地址，请检查 IP 或实例名';
  }
  if (lower.includes('self signed certificate')) {
    return 'SSL 证书错误，请联系数据库管理员';
  }

  return msg || '连接失败';
}

async function testDatabaseConnection(config, database) {
  const dbName = String(database || '').trim();
  if (!dbName) throw new Error('数据库名不能为空');

  let pool;
  try {
    pool = await sql.connect(buildMssqlConfig(config, dbName));
    const result = await pool.request().query('SELECT DB_NAME() AS db_name, @@VERSION AS version');
    const row = result.recordset?.[0] || {};
    return {
      ok: true,
      database: String(row.db_name || dbName),
      version: String(row.version || '').split('\n')[0],
      server: buildServerAddress(config),
      loginType: normalizeInput(config).loginType,
    };
  } catch (err) {
    throw new Error(formatConnectionError(err));
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch {
        /* ignore */
      }
    }
  }
}

async function testBusinessConnection(config) {
  const c = normalizeInput(config);
  if (!c.server) throw new Error('请填写服务器地址');
  if (!c.businessDatabase) throw new Error('请填写业务数据库名');
  if (c.loginType === 'sql') {
    if (!c.user) throw new Error('请填写 SQL 登录账号');
    if (!c.password) throw new Error('请填写 SQL 登录密码');
  }
  return testDatabaseConnection(c, c.businessDatabase);
}

function validateConfigInput(config) {
  const c = normalizeInput(config);
  if (!c.server) return '请填写服务器地址';
  if (!c.businessDatabase) return '请填写业务数据库名';
  if (!c.systemDatabase) return '请填写系统配置数据库名';
  if (c.loginType === 'sql' && !c.user) return '请填写 SQL 登录账号';
  return null;
}

function saveConfig(config) {
  const err = validateConfigInput(config);
  if (err) throw new Error(err);

  const c = normalizeInput(config);
  if (c.loginType === 'sql' && !c.password) {
    throw new Error('请填写 SQL 登录密码');
  }

  const hash = configHash(c);
  const payload = {
    ...c,
    authMode: 'hybrid',
    saved: true,
    testedAt: new Date().toISOString(),
    configHash: hash,
  };

  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(payload, null, 2), 'utf8');
  return payload;
}

module.exports = {
  CONFIG_PATH,
  DEFAULTS,
  loadConfig,
  getEditorConfig,
  toPublicConfig,
  buildMssqlConfig,
  buildServerAddress,
  configHash,
  testBusinessConnection,
  testDatabaseConnection,
  saveConfig,
  validateConfigInput,
  normalizeInput,
  formatConnectionError,
};
