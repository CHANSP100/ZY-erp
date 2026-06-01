const { getSystemPool } = require('../mssqlPool');

async function dictFld(table) {
  const pool = await getSystemPool();
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
  for (const t of ['TF_MP2', 'TF_MP3', 'MF_MP', 'TF_MP1']) {
    const rows = await dictFld(t);
    console.log('\n#', t, 'count', rows.length);
    for (const row of rows) {
      console.log([row.FLD_NO, row.FLD_NAME, row.FLD_TYPE, row.FLD_LEN ?? '', row.note].join('\t'));
    }
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
