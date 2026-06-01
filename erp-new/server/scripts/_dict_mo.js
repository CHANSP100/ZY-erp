const { queryAll } = require('../repositories/mssqlHelpers');
const { getSystemPool } = require('../mssqlPool');

async function dictFld(table) {
  const pool = await getSystemPool();
  const cols = await pool.request().query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME='DICT_FLD' ORDER BY ORDINAL_POSITION
  `);
  console.log('DICT_FLD cols:', cols.recordset.map((c) => c.COLUMN_NAME).join(', '));
  const r = await pool.request().query(`
    SELECT FLD_NO, FLD_NAME, FLD_TYPE, FLD_LEN,
           CAST(NOTE AS nvarchar(200)) AS note
    FROM DICT_FLD
    WHERE TAB_NAME='${table}'
    ORDER BY FLD_NO
  `);
  return r.recordset;
}

(async () => {
  for (const t of ['MF_MO', 'TF_MO']) {
    const rows = await dictFld(t);
    console.log('\n#', t, 'count', rows.length);
    for (const row of rows) {
      console.log([row.FLD_NO, row.FLD_NAME, row.FLD_TYPE, row.FLD_LEN ?? '', row.note].join('\t'));
    }
  }

  const face = await queryAll(`
    SELECT MENU_NAME, TABLE_SIGN, FLD_NAME, FLD_TYPE, FLD_LEN, TABLE_NAME,
           CAST(REM_GB AS nvarchar(50)) AS label
    FROM FACE_FLD WHERE MENU_NAME='MRPAC' ORDER BY TABLE_SIGN, FLD_NAME
  `);
  console.log('\n# FACE_FLD MRPAC');
  for (const r of face) console.log([r.table_sign, r.fld_name, r.fld_type, r.fld_len ?? '', r.table_name, r.label].join('\t'));

  const exp = await queryAll(`
    SELECT TABLE_SIGN, FLD_NAME, CAST(EXP_SQL AS nvarchar(500)) AS exp_sql
    FROM FACE_EXP WHERE MENU_NAME='MRPAC' ORDER BY TABLE_SIGN, FLD_NAME
  `);
  console.log('\n# FACE_EXP MRPAC');
  console.log(JSON.stringify(exp, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
