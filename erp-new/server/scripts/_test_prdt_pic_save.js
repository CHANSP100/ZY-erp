const { getPool, sql } = require('../mssqlPool');
const fs = require('fs');
const path = require('path');
const { parsePicSaveValue, nimage } = require('../repositories/prdtPic');

(async () => {
  try {
    const pool = await getPool();
    const cols = await pool.request().query(`
      SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'PRDT_PIC'
      ORDER BY ORDINAL_POSITION
    `);
    console.log('PRDT_PIC cols:', JSON.stringify(cols.recordset, null, 2));

    const uploadsDir = path.join(__dirname, '../uploads');
    const files = fs.readdirSync(uploadsDir).filter((f) => /\.(jpg|jpeg|png|gif)$/i.test(f));
    console.log('upload files:', files.slice(0, 3));
    if (!files.length) {
      console.log('no upload files to test');
      return;
    }
    const buf = fs.readFileSync(path.join(uploadsDir, files[0]));
    const testNo = '__PIC_TEST__';

    await pool.request().input('prd_no', sql.NVarChar(30), testNo).query('DELETE FROM PRDT_PIC WHERE PRD_NO=@prd_no');

    // Test VarBinary binding
    try {
      await pool
        .request()
        .input('prd_no', sql.NVarChar(30), testNo)
        .input('pic', sql.VarBinary(sql.MAX), buf)
        .query('INSERT INTO PRDT_PIC (PRD_NO, PIC) VALUES (@prd_no, @pic)');
      console.log('VarBinary insert: OK');
    } catch (e) {
      console.log('VarBinary insert FAIL:', e.message);
    }

    await pool.request().input('prd_no', sql.NVarChar(30), testNo).query('DELETE FROM PRDT_PIC WHERE PRD_NO=@prd_no');

    // Test Image binding if available
    if (sql.Image) {
      try {
        await pool
          .request()
          .input('prd_no', sql.NVarChar(30), testNo)
          .input('pic', sql.Image, buf)
          .query('INSERT INTO PRDT_PIC (PRD_NO, PIC) VALUES (@prd_no, @pic)');
        console.log('Image insert: OK');
      } catch (e) {
        console.log('Image insert FAIL:', e.message);
      }
      await pool.request().input('prd_no', sql.NVarChar(30), testNo).query('DELETE FROM PRDT_PIC WHERE PRD_NO=@prd_no');
    }

    // Test nstr (should fail)
    try {
      await pool
        .request()
        .input('prd_no', sql.NVarChar(30), testNo)
        .input('pic', sql.NVarChar(500), '/uploads/x.jpg')
        .query('INSERT INTO PRDT_PIC (PRD_NO, PIC) VALUES (@prd_no, @pic)');
      console.log('NVarChar insert: OK (unexpected)');
    } catch (e) {
      console.log('NVarChar insert FAIL (expected):', e.message);
    }

    const spec = parsePicSaveValue('/uploads/' + files[0]);
    console.log('parsePicSaveValue:', spec.action, spec.buffer?.length);

    await pool.request().input('prd_no', sql.NVarChar(30), testNo).query('DELETE FROM PRDT_PIC WHERE PRD_NO=@prd_no');
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
