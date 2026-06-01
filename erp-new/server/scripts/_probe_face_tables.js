const { getPool, getSystemPool } = require('../mssqlPool');

async function cols(pool, table) {
  const r = await pool.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME='${table}'
    ORDER BY ORDINAL_POSITION
  `);
  return r.recordset;
}

async function sample(pool, sql) {
  const r = await pool.request().query(sql);
  return r.recordset;
}

(async () => {
  const biz = await getPool();
  let sys;
  try {
    sys = await getSystemPool();
  } catch (e) {
    console.log('system pool skip:', e.message);
  }

  for (const table of ['FACE_EXP', 'FACE_FLD', 'FACE_TBL', 'MF_MO_Z']) {
    console.log('\n===', table, 'columns ===');
    try {
      console.log((await cols(biz, table)).map((c) => `${c.COLUMN_NAME}(${c.DATA_TYPE}${c.CHARACTER_MAXIMUM_LENGTH ? ':' + c.CHARACTER_MAXIMUM_LENGTH : ''})`).join(', '));
    } catch (e) {
      console.log('FAIL biz:', e.message);
      if (sys) {
        try {
          console.log((await cols(sys, table)).map((c) => c.COLUMN_NAME).join(', '));
        } catch (e2) {
          console.log('FAIL sys:', e2.message);
        }
      }
    }
  }

  console.log('\n=== FACE_FLD MRPAC all ===');
  try {
    const rows = await sample(biz, `
      SELECT MENU_NAME, TABLE_SIGN, FLD_NAME, FLD_TYPE, FLD_LEN, TABLE_NAME,
             REM_GB, FLD_NOTNULL, FLD_DEFAULT, IS_SAVECALC
      FROM FACE_FLD WHERE MENU_NAME='MRPAC' ORDER BY TABLE_SIGN, FLD_NAME
    `);
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) {
    console.log('query fail:', e.message);
  }

  console.log('\n=== FACE_EXP samples ===');
  for (const q of [
    `SELECT TOP 10 * FROM FACE_EXP WHERE MENU_ID LIKE '%MrpAC%' OR MENU_ID LIKE '%MRPAC%'`,
    `SELECT TOP 5 * FROM FACE_EXP ORDER BY 1 DESC`,
  ]) {
    try {
      const rows = await sample(biz, q);
      console.log('rows:', rows.length);
      if (rows.length) console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
      console.log('query fail:', e.message.slice(0, 120));
    }
  }

  console.log('\n=== FACE_TBL samples ===');
  try {
    const rows = await sample(biz, `SELECT TOP 20 * FROM FACE_TBL ORDER BY 1`);
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) {
    console.log('query fail:', e.message.slice(0, 120));
  }

  console.log('\n=== MF_MO_Z sample row ===');
  try {
    const rows = await sample(biz, `SELECT TOP 3 * FROM MF_MO_Z`);
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) {
    console.log('query fail:', e.message.slice(0, 120));
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
