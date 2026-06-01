/**
 * 修复已导入 SQLite 中的中文乱码（无需重连 DB_11）
 * 用法: node fix_sqlite_encoding.js
 */
const { db } = require('./db');
const { fixZhEncoding } = require('./encoding');

const TABLES = [
  { table: 'indx', cols: ['name', 'rem'] },
  { table: 'prdt', cols: ['snm', 'name', 'spc', 'rem'] },
  { table: 'dept', cols: ['name', 'eng_name'] },
  { table: 'my_wh', cols: ['name', 'adr', 'rem'] },
  { table: 'cust', cols: ['name', 'snm', 'biz_dsc', 'adr2', 'rem'] },
  { table: 'salm', cols: ['name', 'eng_name', 'con_adr', 'rem'] },
  { table: 'tf_pos', cols: ['prd_name', 'rem'] },
  { table: 'tf_pss', cols: ['prd_name', 'rem'] },
  { table: 'mf_pos', cols: ['rem'] },
  { table: 'mf_pss', cols: ['rem'] },
];

function fixTable(table, cols) {
  const pk = db.prepare(`PRAGMA table_info(${table})`).all().find((c) => c.pk === 1)?.name;
  if (!pk) {
    console.warn(`skip ${table}: no pk`);
    return 0;
  }
  const rows = db.prepare(`SELECT ${pk}, ${cols.join(', ')} FROM ${table}`).all();
  let n = 0;
  const sets = cols.map((c) => `${c} = ?`).join(', ');
  const upd = db.prepare(`UPDATE ${table} SET ${sets} WHERE ${pk} = ?`);
  for (const row of rows) {
    const next = cols.map((c) => fixZhEncoding(row[c]));
    if (cols.some((c, i) => next[i] !== row[c])) {
      upd.run(...next, row[pk]);
      n += 1;
    }
  }
  return n;
}

const tx = db.transaction(() => {
  let total = 0;
  for (const { table, cols } of TABLES) {
    const n = fixTable(table, cols);
    if (n) console.log(`${table}: 修复 ${n} 行`);
    total += n;
  }
  return total;
});

const total = tx();
const sample = db.prepare('SELECT idx_no, name FROM indx WHERE idx_no = ?').get('11');
console.log(`完成，共修复 ${total} 行。样例 indx/11 name=`, sample?.name ?? '(null)');
