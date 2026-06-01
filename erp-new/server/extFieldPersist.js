/**
 * _Z 扩展字段 — 保存、加载、必填校验、SQL 重算（未审核）
 */
const { resolveArea } = require('./menuTableRegistry');
const { getPersistedGridColumns } = require('./gridConfig');
const { colKeyToDbField, ensureZTable } = require('./extField');
const { translateSunlikeSqlExpr } = require('./sunlikeSqlExpr');
const { execSql, queryOne, nstr, nint } = require('./repositories/mssqlHelpers');

function isEmptyVal(v) {
  return v == null || v === '';
}

function bindKeyInputs(keys, keyValues) {
  const inputs = {};
  for (const k of keys) {
    const raw = keyValues[k.col];
    inputs[k.col] = k.type === 'int' ? nint(raw) : nstr(raw, k.len || 50);
  }
  return inputs;
}

function pickExtValues(menuCode, area, src) {
  const cols = getPersistedGridColumns(menuCode, area);
  if (!cols.length) return {};
  const bag =
    src && typeof src === 'object' && src.ext_fields && typeof src.ext_fields === 'object'
      ? src.ext_fields
      : src || {};
  const out = {};
  for (const col of cols) {
    if (Object.prototype.hasOwnProperty.call(bag, col.col_key)) {
      out[col.col_key] = bag[col.col_key];
    }
  }
  return out;
}

function mapZRowToExtFields(menuCode, area, zRow) {
  if (!zRow) return {};
  const cols = getPersistedGridColumns(menuCode, area);
  const out = {};
  for (const col of cols) {
    const dbf = colKeyToDbField(col.col_key);
    const val = zRow[dbf.toLowerCase()] ?? zRow[dbf] ?? zRow[col.db_field?.toLowerCase()];
    if (val != null && val !== '') out[col.col_key] = val;
  }
  return out;
}

function validateRequiredFields(menuCode, area, values) {
  const cols = getPersistedGridColumns(menuCode, area).filter((c) => c.required);
  for (const col of cols) {
    const v = values[col.col_key];
    if (isEmptyVal(v)) {
      throw new Error(`扩展字段「${col.label || col.col_key}」为必填`);
    }
  }
}

async function evalSqlFieldValue(menuCode, area, sqlExprSrc, keyValues) {
  const src = String(sqlExprSrc || '').trim();
  if (!src) return null;
  let expr = src.includes(':') ? translateSunlikeSqlExpr(src, menuCode) : src;
  if (!/^\s*\(/i.test(expr)) expr = `(${expr})`;

  const resolved = resolveArea(menuCode, area);
  const where =
    area === 'line'
      ? resolved.keys
          .map((k) => {
            if (k.col === 'os_no') return 't.OS_NO = @os_no';
            if (k.col === 'sq_no') return 't.SQ_NO = @sq_no';
            if (k.col === 'ps_no') return 't.PS_NO = @ps_no';
            if (k.col === 'itm') return 't.ITM = @itm';
            return `t.[${k.db}] = @${k.col}`;
          })
          .join(' AND ')
      : resolved.keys.map((k) => `m.[${k.db}] = @${k.col}`).join(' AND ');
  const inputs = bindKeyInputs(resolved.keys, keyValues);

  let from;
  if (area === 'line') {
    if (resolved.table === 'TF_POS') {
      from = 'MF_POS m INNER JOIN TF_POS t ON m.OS_ID = t.OS_ID AND m.OS_NO = t.OS_NO';
    } else if (resolved.table === 'TF_SQ') {
      from = 'MF_SQ m INNER JOIN TF_SQ t ON m.SQ_NO = t.SQ_NO';
    } else if (resolved.table === 'TF_PSS') {
      from = 'MF_PSS m INNER JOIN TF_PSS t ON m.PS_NO = t.PS_NO';
    } else {
      from = `${resolved.table} t`;
    }
  } else {
    from = `${resolved.table} m`;
  }

  const row = await queryOne(`SELECT ${expr} AS val FROM ${from} WHERE ${where}`, inputs);
  return row?.val ?? null;
}

async function upsertZRow(zTable, keys, keyValues, data) {
  if (!Object.keys(data).length) return;

  await ensureZTableByKeys(zTable, keys);

  const inputs = bindKeyInputs(keys, keyValues);
  for (const [colKey, val] of Object.entries(data)) {
    inputs[`d_${colKey}`] = nstr(val, 500);
  }

  const where = keys.map((k) => `[${k.db}] = @${k.col}`).join(' AND ');
  const affected = await execSql(
    `UPDATE [${zTable}] SET ${Object.keys(data)
      .map((c) => `[${c}] = @d_${c}`)
      .join(', ')} WHERE ${where}`,
    inputs
  );

  if (affected > 0) return;

  const cols = [...keys.map((k) => `[${k.db}]`), ...Object.keys(data).map((c) => `[${c}]`)];
  const vals = [...keys.map((k) => `@${k.col}`), ...Object.keys(data).map((c) => `@d_${c}`)];
  await execSql(`INSERT INTO [${zTable}] (${cols.join(', ')}) VALUES (${vals.join(', ')})`, inputs);
}

async function ensureZTableByKeys(zTable, keys) {
  const exists = await queryOne(
    `SELECT 1 AS ok FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = @t`,
    { t: nstr(zTable, 128) }
  ).catch(() => null);
  if (exists) return;

  const keyDefs = keys
    .map((k) => {
      const sqlType = k.type === 'int' ? 'INT' : `NVARCHAR(${k.len || 20})`;
      return `[${k.db}] ${sqlType} NOT NULL`;
    })
    .join(', ');
  const pk = keys.map((k) => `[${k.db}]`).join(', ');
  await execSql(`CREATE TABLE [${zTable}] (${keyDefs}, PRIMARY KEY (${pk}))`);
}

async function loadHeadExtFields(menuCode, keyValues) {
  try {
    const cols = getPersistedGridColumns(menuCode, 'head');
    if (!cols.length) return {};
    const resolved = resolveArea(menuCode, 'head');
    const inputs = bindKeyInputs(resolved.keys, keyValues);
    const where = resolved.keys.map((k) => `[${k.db}] = @${k.col}`).join(' AND ');
    const row = await queryOne(`SELECT * FROM [${resolved.zTable}] WHERE ${where}`, inputs);
    return mapZRowToExtFields(menuCode, 'head', row);
  } catch {
    return {};
  }
}

async function loadLineExtFields(menuCode, keyValues) {
  try {
    const cols = getPersistedGridColumns(menuCode, 'line');
    if (!cols.length) return {};
    const resolved = resolveArea(menuCode, 'line');
    const inputs = bindKeyInputs(resolved.keys, keyValues);
    const where = resolved.keys.map((k) => `[${k.db}] = @${k.col}`).join(' AND ');
    const row = await queryOne(`SELECT * FROM [${resolved.zTable}] WHERE ${where}`, inputs);
    return mapZRowToExtFields(menuCode, 'line', row);
  } catch {
    return {};
  }
}

async function persistHeadExtFields(menuCode, keyValues, fieldValues, { audited = false } = {}) {
  const cols = getPersistedGridColumns(menuCode, 'head');
  if (!cols.length) return;

  const values = pickExtValues(menuCode, 'head', { ext_fields: fieldValues });
  validateRequiredFields(menuCode, 'head', values);

  await ensureZTable(menuCode, 'head');
  const resolved = resolveArea(menuCode, 'head');
  const data = {};

  for (const col of cols) {
    let val = values[col.col_key];
    if (col.field_source === 'sql' && !audited) {
      val = await evalSqlFieldValue(menuCode, 'head', col.sql_expr_src || col.sql_expr, keyValues);
    }
    if (col.required && isEmptyVal(val)) {
      throw new Error(`扩展字段「${col.label || col.col_key}」为必填`);
    }
    if (!isEmptyVal(val)) {
      data[colKeyToDbField(col.col_key)] = val;
    }
  }

  if (Object.keys(data).length) {
    await upsertZRow(resolved.zTable, resolved.keys, keyValues, data);
  }
}

async function persistLineExtFields(menuCode, keyValues, fieldValues, { audited = false } = {}) {
  const cols = getPersistedGridColumns(menuCode, 'line');
  if (!cols.length) return;

  const values = pickExtValues(menuCode, 'line', { ext_fields: fieldValues });
  validateRequiredFields(menuCode, 'line', values);

  await ensureZTable(menuCode, 'line');
  const resolved = resolveArea(menuCode, 'line');
  const data = {};

  for (const col of cols) {
    let val = values[col.col_key];
    if (col.field_source === 'sql' && !audited) {
      val = await evalSqlFieldValue(menuCode, 'line', col.sql_expr_src || col.sql_expr, keyValues);
    }
    if (col.required && isEmptyVal(val)) {
      throw new Error(`扩展字段「${col.label || col.col_key}」为必填`);
    }
    if (!isEmptyVal(val)) {
      data[colKeyToDbField(col.col_key)] = val;
    }
  }

  if (Object.keys(data).length) {
    await upsertZRow(resolved.zTable, resolved.keys, keyValues, data);
  }
}

/** 单据存盘后：表头 + 表身扩展字段写入 _Z */
async function persistBillExtFields(menuCode, body, options = {}) {
  const head = body?.head || {};
  const lines = Array.isArray(body?.lines) ? body.lines : [];
  const headKeys = pickHeadKeys(menuCode, head);
  const headVals = pickExtValues(menuCode, 'head', head);

  await persistHeadExtFields(menuCode, headKeys, headVals, options);

  for (const ln of lines) {
    const lineKeys = pickLineKeys(menuCode, headKeys, ln);
    if (lineKeys.itm == null) continue;
    const lineVals = pickExtValues(menuCode, 'line', ln);
    await persistLineExtFields(menuCode, lineKeys, lineVals, options);
  }
}

function pickHeadKeys(menuCode, head) {
  const resolved = resolveArea(menuCode, 'head');
  const out = {};
  for (const k of resolved.keys) {
    if (k.col === 'os_no') out.os_no = head.os_no;
    else if (k.col === 'sq_no') out.sq_no = head.sq_no;
    else if (k.col === 'ps_no') out.ps_no = head.ps_no;
    else if (k.col === 'ml_no') out.ml_no = head.ml_no;
    else if (k.col === 'mo_no') out.mo_no = head.mo_no;
    else if (k.col === 'idx_no') out.idx_no = head.idx_no;
    else if (k.col === 'prd_no') out.prd_no = head.prd_no;
    else out[k.col] = head[k.col];
  }
  return out;
}

function pickLineKeys(menuCode, headKeys, ln) {
  const resolved = resolveArea(menuCode, 'line');
  const out = {};
  for (const k of resolved.keys) {
    if (k.col === 'itm') out.itm = ln.itm;
    else if (k.col === 'os_no') out.os_no = ln.os_no ?? headKeys.os_no;
    else if (k.col === 'sq_no') out.sq_no = ln.sq_no ?? headKeys.sq_no;
    else if (k.col === 'ps_no') out.ps_no = ln.ps_no ?? headKeys.ps_no;
    else if (k.col === 'ml_no') out.ml_no = ln.ml_no ?? headKeys.ml_no;
    else out[k.col] = ln[k.col] ?? headKeys[k.col];
  }
  return out;
}

/** 读取单据时合并 _Z 扩展字段 */
async function attachBillExtFields(menuCode, head, lines) {
  const headKeys = pickHeadKeys(menuCode, head);
  const headExt = await loadHeadExtFields(menuCode, headKeys);
  const mergedHead = { ...head, ext_fields: headExt, ...headExt };

  const mergedLines = [];
  for (const ln of lines) {
    const lineKeys = pickLineKeys(menuCode, headKeys, ln);
    const lineExt = await loadLineExtFields(menuCode, lineKeys);
    mergedLines.push({ ...ln, ext_fields: lineExt, ...lineExt });
  }
  return { head: mergedHead, lines: mergedLines };
}

module.exports = {
  validateRequiredFields,
  pickExtValues,
  loadHeadExtFields,
  loadLineExtFields,
  persistHeadExtFields,
  persistLineExtFields,
  persistBillExtFields,
  attachBillExtFields,
};
