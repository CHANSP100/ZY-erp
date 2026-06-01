/**
 * SUNLIKE DB_11 中文编码修复
 * 旧库 varchar 字段多为 Big5(CP950)，经 mssql/Node 误读为 Latin1 后需转 UTF-8
 */
const iconv = require('iconv-lite');

function hasCjk(text) {
  return /[\u3400-\u9fff]/.test(text);
}

/** 将误读的 Latin1 字符串还原为 UTF-8 中文 */
function fixZhEncoding(value) {
  if (value == null) return value;
  if (Buffer.isBuffer(value)) {
    return iconv.decode(value, 'cp950').trim() || null;
  }
  if (typeof value !== 'string') return value;
  const s = value.trim();
  if (!s) return value;
  if (hasCjk(s)) return value;

  try {
    const decoded = iconv.decode(Buffer.from(s, 'latin1'), 'cp950');
    if (decoded && hasCjk(decoded)) return decoded;
    if (decoded && !/[\u0080-\u009f]/.test(decoded)) return decoded;
  } catch {
    /* keep original */
  }
  return value;
}

/** 递归修复查询结果行中的字符串字段 */
function fixRow(row) {
  if (!row || typeof row !== 'object') return row;
  const out = { ...row };
  for (const k of Object.keys(out)) {
    const v = out[k];
    if (typeof v === 'string' || Buffer.isBuffer(v)) {
      out[k] = fixZhEncoding(v);
    }
  }
  return out;
}

function fixRows(rows) {
  return rows.map(fixRow);
}

module.exports = { fixZhEncoding, fixRow, fixRows };
