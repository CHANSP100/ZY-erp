const sql = require('mssql');
const { loadConfig, buildMssqlConfig } = require('../dbConnectionConfig');

async function cols(dbName, table) {
  const pool = await sql.connect(buildMssqlConfig(loadConfig(), dbName));
  const r = await pool.request().query(`
    SELECT c.ORDINAL_POSITION AS ord, c.COLUMN_NAME AS name, c.DATA_TYPE AS dtype,
           c.CHARACTER_MAXIMUM_LENGTH AS clen
    FROM INFORMATION_SCHEMA.COLUMNS c
    WHERE c.TABLE_NAME = '${table}'
    ORDER BY c.ORDINAL_POSITION
  `);
  await pool.close();
  return r.recordset;
}

async function dict(dbName, table) {
  const pool = await sql.connect(buildMssqlConfig(loadConfig(), dbName));
  const r = await pool.request().query(`
    SELECT FLD_NO, FLD_NAME, FLD_TYPE, FLD_LEN, CAST(NOTE AS nvarchar(200)) AS note
    FROM DICT_FLD WHERE TAB_NAME='${table}' ORDER BY FLD_NO
  `);
  await pool.close();
  return r.recordset;
}

(async () => {
  const cfg = loadConfig();
  console.log('business', cfg.businessDatabase, 'system', cfg.systemDatabase);
  for (const db of [cfg.systemDatabase, cfg.businessDatabase]) {
    for (const t of ['TF_MP2', 'TF_MP3']) {
      try {
        const d = await dict(db, t);
        console.log('\nDICT', db, t, d.length);
        d.forEach((row) => console.log([row.FLD_NO, row.FLD_NAME, row.FLD_TYPE, row.FLD_LEN ?? '', row.note].join('\t')));
      } catch (e) {
        console.log('DICT ERR', db, t, e.message);
      }
      try {
        const c = await cols(db, t);
        console.log('\nCOLS', db, t, c.length);
        c.forEach((row) => console.log([row.ord, row.name, row.dtype, row.clen ?? ''].join('\t')));
      } catch (e) {
        console.log('COLS ERR', db, t, e.message);
      }
    }
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
