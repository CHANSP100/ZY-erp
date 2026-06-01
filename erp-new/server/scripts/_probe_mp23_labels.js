const sql = require('mssql');
const { loadConfig, buildMssqlConfig } = require('../dbConnectionConfig');

async function query(dbName, sqlText) {
  const pool = await sql.connect(buildMssqlConfig(loadConfig(), dbName));
  const r = await pool.request().query(sqlText);
  await pool.close();
  return r.recordset;
}

(async () => {
  const cfg = loadConfig();
  const db = cfg.businessDatabase;

  const face = await query(db, `
    SELECT TABLE_SIGN, FLD_NAME, FLD_TYPE, FLD_LEN, TABLE_NAME,
           CAST(REM_GB AS nvarchar(80)) AS label
    FROM FACE_FLD WHERE MENU_NAME LIKE '%MRPABA%' OR MENU_NAME LIKE '%MrpABA%'
    ORDER BY TABLE_SIGN, FLD_NAME
  `);
  console.log('# FACE_FLD MRPABA', face.length);
  face.forEach((r) => console.log([r.TABLE_SIGN, r.FLD_NAME, r.TABLE_NAME, r.label].join('\t')));

  for (const t of ['TF_MP2', 'TF_MP3']) {
    const ext = await query(db, `
      SELECT c.name AS col_name,
             CAST(ep.value AS nvarchar(200)) AS note
      FROM sys.columns c
      LEFT JOIN sys.extended_properties ep
        ON ep.major_id = c.object_id AND ep.minor_id = c.column_id AND ep.name = 'MS_Description'
      WHERE c.object_id = OBJECT_ID('${t}')
      ORDER BY c.column_id
    `);
    console.log('\n# EXT', t, ext.length);
    ext.forEach((r, i) => console.log([i + 1, r.col_name, r.note || ''].join('\t')));
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
