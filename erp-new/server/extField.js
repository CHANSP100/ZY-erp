/**
 * _Z 扩展表 — 自动建表、加列、读写
 */
const { db } = require('./db');
const { resolveArea, zTableName } = require('./menuTableRegistry');
const { execSql, queryOne, queryAll } = require('./repositories/mssqlHelpers');

const PHYS_TO_MSSQL = {
  varchar: (len) => `NVARCHAR(${Math.min(Math.max(len || 50, 1), 4000)})`,
  text_select: (len) => `NVARCHAR(${Math.min(Math.max(len || 50, 1), 4000)})`,
  numeric: () => 'FLOAT',
  date: () => 'DATETIME',
  datetime: () => 'DATETIME',
};

const PHYS_TO_SQLITE = {
  varchar: () => 'TEXT',
  text_select: () => 'TEXT',
  numeric: () => 'REAL',
  date: () => 'TEXT',
  datetime: () => 'TEXT',
};

function colKeyToDbField(colKey) {
  return String(colKey)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_');
}

function initExtFieldSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS erp_ext_z_table (
      menu_code TEXT NOT NULL,
      grid_area TEXT NOT NULL,
      base_table TEXT NOT NULL,
      z_table TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      PRIMARY KEY (menu_code, grid_area)
    );
  `);
}

initExtFieldSchema();

async function mssqlTableExists(tableName) {
  const row = await queryOne(
    `SELECT 1 AS ok FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = @t`,
    { t: { type: require('mssql').NVarChar(128), value: String(tableName).toUpperCase() } }
  );
  return !!row;
}

async function ensureZTableMssql(zTable, keys) {
  const exists = await mssqlTableExists(zTable);
  if (exists) return;

  const keyDefs = keys
    .map((k) => {
      const sqlType =
        k.type === 'int'
          ? 'INT'
          : PHYS_TO_MSSQL.varchar(k.len || 20);
      return `[${k.db}] ${sqlType} NOT NULL`;
    })
    .join(', ');
  const pk = keys.map((k) => `[${k.db}]`).join(', ');
  await execSql(`CREATE TABLE [${zTable}] (${keyDefs}, PRIMARY KEY (${pk}))`);
}

function ensureZTableSqlite(zTable, keys) {
  const cols = db.prepare(`PRAGMA table_info(${zTable})`).all();
  if (cols.length) return;

  const keyDefs = keys
    .map((k) => {
      const sqlType = k.type === 'int' ? 'INTEGER' : 'TEXT';
      return `${k.db.toLowerCase()} ${sqlType} NOT NULL`;
    })
    .join(', ');
  const pk = keys.map((k) => k.db.toLowerCase()).join(', ');
  db.exec(`CREATE TABLE IF NOT EXISTS ${zTable.toLowerCase()} (${keyDefs}, PRIMARY KEY (${pk}))`);
}

async function ensureZTable(menuCode, area) {
  const resolved = resolveArea(menuCode, area);
  const { zTable, keys, table: baseTable } = resolved;

  db.prepare(
    `INSERT OR IGNORE INTO erp_ext_z_table (menu_code, grid_area, base_table, z_table)
     VALUES (?, ?, ?, ?)`
  ).run(menuCode, resolved.area, baseTable, zTable);

  try {
    await ensureZTableMssql(zTable, keys);
  } catch (e) {
    console.warn('[extField] MSSQL ensureZTable fallback sqlite:', e.message);
    ensureZTableSqlite(zTable, keys);
  }

  return resolved;
}

async function addZColumnMssql(zTable, dbField, physType, physLen) {
  const col = colKeyToDbField(dbField);
  const row = await queryOne(
    `SELECT 1 AS ok FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_NAME = @t AND COLUMN_NAME = @c`,
    {
      t: { type: require('mssql').NVarChar(128), value: zTable },
      c: { type: require('mssql').NVarChar(128), value: col },
    }
  );
  if (row) return;

  const typeFn = PHYS_TO_MSSQL[physType] || PHYS_TO_MSSQL.varchar;
  const sqlType = typeFn(physLen);
  await execSql(`ALTER TABLE [${zTable}] ADD [${col}] ${sqlType} NULL`);
}

function addZColumnSqlite(zTable, dbField, physType) {
  const table = zTable.toLowerCase();
  const col = dbField.toLowerCase();
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (cols.includes(col)) return;
  const typeFn = PHYS_TO_SQLITE[physType] || PHYS_TO_SQLITE.varchar;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${typeFn()}`);
}

async function addZColumn(menuCode, area, colKey, physType, physLen) {
  const resolved = await ensureZTable(menuCode, area);
  const dbField = colKeyToDbField(colKey);
  try {
    await addZColumnMssql(resolved.zTable, dbField, physType, physLen);
  } catch (e) {
    console.warn('[extField] MSSQL addZColumn fallback sqlite:', e.message);
    addZColumnSqlite(resolved.zTable, dbField, physType);
  }
  return { zTable: resolved.zTable, dbField };
}

function getPersistedColumns(menuCode, area) {
  return db
    .prepare(
      `SELECT * FROM erp_detail_grid_col
       WHERE menu_code = ? AND persist = 1 AND grid_area = ?
       ORDER BY sort_order, col_key`
    )
    .all(menuCode, area);
}

function buildZJoinClause(menuCode, area, mainAlias, zAlias = 'z') {
  const resolved = resolveArea(menuCode, area);
  const keys = resolved.keys;
  const zTable = resolved.zTable;
  const cond = keys
    .map((k) => {
      const mainCol = area === 'line' ? (k.col === 'os_no' ? 'm.os_no' : k.col === 'itm' ? 't.itm' : `t.${k.col}`) : `m.${k.col}`;
      return `${mainCol} = ${zAlias}.[${k.db}]`;
    })
    .join(' AND ');
  return { join: `LEFT JOIN [${zTable}] ${zAlias} ON ${cond}`, zTable };
}

function buildZSelectCols(cols, zAlias = 'z') {
  return cols
    .map((c) => `${zAlias}.[${colKeyToDbField(c.col_key)}] AS ${c.col_key}`)
    .join(', ');
}

async function listDbTables() {
  try {
    const rows = await queryAll(
      `SELECT TABLE_NAME AS name, TABLE_TYPE AS type
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_TYPE IN ('BASE TABLE', 'VIEW')
       ORDER BY TABLE_TYPE, TABLE_NAME`
    );
    return rows.map((r) => ({ name: r.name, type: r.type === 'VIEW' ? 'view' : 'table' }));
  } catch {
    const tables = db
      .prepare(`SELECT name FROM sqlite_master WHERE type IN ('table','view') ORDER BY name`)
      .all();
    return tables.map((r) => ({ name: r.name, type: 'table' }));
  }
}

async function listDbTableColumns(tableName) {
  const t = String(tableName).replace(/[^\w]/g, '');
  try {
    return await queryAll(
      `SELECT COLUMN_NAME AS name, DATA_TYPE AS data_type
       FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @t ORDER BY ORDINAL_POSITION`,
      { t: { type: require('mssql').NVarChar(128), value: t.toUpperCase() } }
    );
  } catch {
    const cols = db.prepare(`PRAGMA table_info(${t.toLowerCase()})`).all();
    return cols.map((c) => ({ name: c.name, data_type: c.type }));
  }
}

async function listTableSelectOptions(tableName, limit = 500) {
  const t = String(tableName || '')
    .trim()
    .replace(/[^\w]/g, '');
  if (!t) throw new Error('表名无效');

  const cols = await listDbTableColumns(t);
  if (!cols.length) throw new Error('表或视图不存在或无字段');

  const col1 = String(cols[0].name).replace(/[^\w]/g, '');
  const col2 = cols[1] ? String(cols[1].name).replace(/[^\w]/g, '') : null;
  if (!col1) throw new Error('无法读取表字段');

  const top = Math.min(Math.max(parseInt(String(limit), 10) || 500, 1), 500);

  try {
    const sel = col2
      ? `SELECT TOP (${top}) CAST([${col1}] AS nvarchar(200)) AS val, CAST([${col2}] AS nvarchar(200)) AS lbl FROM [${t}] ORDER BY [${col1}]`
      : `SELECT TOP (${top}) CAST([${col1}] AS nvarchar(200)) AS val, CAST([${col1}] AS nvarchar(200)) AS lbl FROM [${t}] ORDER BY [${col1}]`;
    const rows = await queryAll(sel);
    return rows.map((r) => ({
      value: r.val == null ? '' : String(r.val),
      label: r.lbl == null ? '' : String(r.lbl),
    }));
  } catch {
    const sel = col2
      ? `SELECT ${col1} AS val, ${col2} AS lbl FROM ${t.toLowerCase()} ORDER BY ${col1} LIMIT ${top}`
      : `SELECT ${col1} AS val, ${col1} AS lbl FROM ${t.toLowerCase()} ORDER BY ${col1} LIMIT ${top}`;
    const rows = db.prepare(sel).all();
    return rows.map((r) => ({
      value: r.val == null ? '' : String(r.val),
      label: r.lbl == null ? '' : String(r.lbl),
    }));
  }
}

function buildPersistedQueryParts(menuCode, area) {
  const { getPersistedGridColumns } = require('./gridConfig');
  const cols = getPersistedGridColumns(menuCode, area);
  if (!cols.length) return { join: '', select: '' };
  const { join } = buildZJoinClause(menuCode, area, 'main', 'z');
  const selectPart = buildZSelectCols(cols, 'z');
  return {
    join,
    select: selectPart ? `, ${selectPart}` : '',
  };
}

module.exports = {
  initExtFieldSchema,
  ensureZTable,
  addZColumn,
  colKeyToDbField,
  getPersistedColumns,
  buildZJoinClause,
  buildZSelectCols,
  buildPersistedQueryParts,
  listDbTables,
  listDbTableColumns,
  listTableSelectOptions,
  zTableName,
  resolveArea,
};
