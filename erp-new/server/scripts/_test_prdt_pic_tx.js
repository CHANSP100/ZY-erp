const { withTransaction, nstr } = require('../repositories/mssqlHelpers');
const { nimage, parsePicSaveValue } = require('../repositories/prdtPic');
const fs = require('fs');
const path = require('path');

(async () => {
  const files = fs.readdirSync(path.join(__dirname, '../uploads')).filter((f) => f.endsWith('.png'));
  const picPath = '/uploads/' + files[0];
  const spec = parsePicSaveValue(picPath);
  const testNo = '__PIC_TX_TEST__';

  await withTransaction(async (tx) => {
    await tx.exec('DELETE FROM PRDT_PIC WHERE PRD_NO=@prd_no', { prd_no: nstr(testNo, 30) });
    await tx.exec('INSERT INTO PRDT_PIC (PRD_NO, PIC) VALUES (@prd_no, @pic)', {
      prd_no: nstr(testNo, 30),
      pic: nimage(spec.buffer),
    });
    console.log('withTransaction insert OK');
    await tx.exec('DELETE FROM PRDT_PIC WHERE PRD_NO=@prd_no', { prd_no: nstr(testNo, 30) });
  });
})().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
