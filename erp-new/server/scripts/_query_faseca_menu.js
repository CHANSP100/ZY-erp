const { getSystemPool } = require('../mssqlPool');

(async () => {
  try {
    const pool = await getSystemPool();
    const cols = await pool.request().query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='DATAEX' ORDER BY ORDINAL_POSITION
    `);
    console.log('DATAEX cols:', cols.recordset.map((r) => r.COLUMN_NAME).join(', '));
    const byTable = await pool.request().query(`
      SELECT TOP 20 MENUID, MENU_NAME, MF_TABLE, MOD_NAME
      FROM DATAEX WHERE MF_TABLE = 'PRDT' ORDER BY MENUID
    `);
    console.log('PRDT menus:', JSON.stringify(byTable.recordset, null, 2));
    const eca1 = await pool.request().query(`
      SELECT TOP 20 MENUID, MENU_NAME, MF_TABLE, MOD_NAME
      FROM DATAEX WHERE MENU_NAME LIKE '%ECA1%' OR MENUID LIKE '%ECA1%' ORDER BY MENUID
    `);
    console.log('ECA1 menus:', JSON.stringify(eca1.recordset, null, 2));
  } catch (e) {
    console.error('FAIL:', e.message);
    process.exit(1);
  }
})();
