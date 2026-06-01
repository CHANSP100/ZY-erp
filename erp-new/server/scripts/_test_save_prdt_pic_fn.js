const { withTransaction, nstr } = require('../repositories/mssqlHelpers');
const { nimage, parsePicSaveValue } = require('../repositories/prdtPic');
const fs = require('fs');
const path = require('path');

async function savePrdtPic(tx, prdNo, pic, cadimg) {
  const picSpec = pic !== undefined ? parsePicSaveValue(pic) : null;
  const cadSpec = cadimg !== undefined ? parsePicSaveValue(cadimg) : null;
  if (!picSpec && !cadSpec) return;

  const existing = await tx.queryOne('SELECT 1 AS ok FROM PRDT_PIC WHERE PRD_NO=@prd_no', {
    prd_no: nstr(prdNo, 30),
  });

  const sets = [];
  const inputs = { prd_no: nstr(prdNo, 30) };

  if (picSpec) {
    if (picSpec.action === 'set') {
      sets.push('PIC=@pic');
      inputs.pic = nimage(picSpec.buffer);
    } else if (picSpec.action === 'clear') {
      sets.push('PIC=NULL');
    }
  }
  if (cadSpec) {
    if (cadSpec.action === 'set') {
      sets.push('CADIMG=@cadimg');
      inputs.cadimg = nimage(cadSpec.buffer);
    } else if (cadSpec.action === 'clear') {
      sets.push('CADIMG=NULL');
    }
  }
  if (!sets.length) return;

  if (existing) {
    await tx.exec(`UPDATE PRDT_PIC SET ${sets.join(', ')} WHERE PRD_NO=@prd_no`, inputs);
  } else {
    const cols = ['PRD_NO'];
    const vals = ['@prd_no'];
    if (picSpec?.action === 'set') {
      cols.push('PIC');
      vals.push('@pic');
      inputs.pic = nimage(picSpec.buffer);
    }
    if (cadSpec?.action === 'set') {
      cols.push('CADIMG');
      vals.push('@cadimg');
      inputs.cadimg = nimage(cadSpec.buffer);
    }
    if (cols.length === 1) return;
    await tx.exec(`INSERT INTO PRDT_PIC (${cols.join(', ')}) VALUES (${vals.join(', ')})`, inputs);
  }
}

(async () => {
  const files = fs.readdirSync(path.join(__dirname, '../uploads')).filter((f) => f.endsWith('.png'));
  const picPath = '/uploads/' + files[0];
  const testNo = '__SAVE_FN_TEST__';

  await withTransaction(async (tx) => {
    await tx.exec('DELETE FROM PRDT_PIC WHERE PRD_NO=@prd_no', { prd_no: nstr(testNo, 30) });
    await savePrdtPic(tx, testNo, picPath, '');
    console.log('savePrdtPic with empty cadimg: OK');
    await tx.exec('DELETE FROM PRDT_PIC WHERE PRD_NO=@prd_no', { prd_no: nstr(testNo, 30) });
  });
})().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
