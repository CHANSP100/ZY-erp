/** Simulate POST /api/prdt with pic — full create path */
const { rowToPrdt } = require('../db');
const indxRepo = require('../repositories/indxRepository');
const { nextPrdNo } = require('../repositories/mssqlNextNo');
const { queryOne, withTransaction, nstr, nfloat } = require('../repositories/mssqlHelpers');
const { saveArchiveExtFields } = require('../billExtFieldHook');
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
    } else if (picSpec.action === 'clear') sets.push('PIC=NULL');
  }
  if (cadSpec) {
    if (cadSpec.action === 'set') {
      sets.push('CADIMG=@cadimg');
      inputs.cadimg = nimage(cadSpec.buffer);
    } else if (cadSpec.action === 'clear') sets.push('CADIMG=NULL');
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

function bindPrdtInputs(b, e, prdNo) {
  return {
    prd_no: nstr(prdNo, 30),
    snm: nstr(b.snm ?? e?.snm, 100),
    idx1: nstr(b.idx1 ?? e?.idx1, 10),
    idx2: nstr(b.idx2 ?? e?.idx2, 10),
    knd: nstr(b.knd ?? e?.knd ?? '1', 4),
    ut: nstr(b.ut ?? e?.ut, 10),
    ut1: nstr(b.ut1 ?? e?.ut1, 10),
    name: nstr(b.name ?? e?.name, 200),
    spc: nstr(b.spc ?? e?.spc, 200),
    wh: nstr(b.wh ?? e?.wh, 10),
    wh_lc: nstr(b.wh_lc ?? e?.wh_lc, 20),
    upr: nfloat(b.upr ?? e?.upr ?? 0),
    up_sal: nfloat(b.up_sal ?? e?.up_sal ?? 0),
    use_prdmark: nstr(b.use_prdmark ?? e?.use_prdmark, 4),
    tw_id: nstr(b.tw_id ?? e?.tw_id, 1),
    qty_min: nfloat(b.qty_min ?? e?.qty_min ?? 0),
    qty_low: nfloat(b.qty_low ?? e?.qty_low ?? 0),
    valid_days: nfloat(b.valid_days ?? e?.valid_days ?? 0),
    qty_min1: nfloat(b.qty_min1 ?? e?.qty_min1 ?? 0),
    qty_max: nfloat(b.qty_max ?? e?.qty_max ?? 0),
    dep: nstr(b.dep ?? e?.dep, 10),
    sal_no: nstr(b.sal_no ?? e?.sal_no, 10),
    rem: nstr(b.rem ?? e?.rem, 200),
    stop_id: nstr(b.stop_id ?? e?.stop_id, 4),
  };
}

(async () => {
  const files = fs.readdirSync(path.join(__dirname, '../uploads')).filter((f) => f.endsWith('.png'));
  const idxRows = await indxRepo.listAll();
  const idx1 = idxRows.find((r) => r.idx_no && r.idx_no !== '0000000000')?.idx_no;
  if (!idx1) throw new Error('no idx1');
  const { prd_no } = await nextPrdNo(idx1);
  const body = {
    idx1,
    name: 'pic integration test',
    pic: '/uploads/' + files[0],
    cadimg: '',
    ext_fields: { ffif: 'x' },
  };
  const inp = bindPrdtInputs(body, null, prd_no);
  await withTransaction(async (tx) => {
    await tx.exec(
      `INSERT INTO PRDT (PRD_NO, SNM, IDX1, IDX2, KND, UT, UT1, NAME, SPC, WH, WH_LC, UPR, UP_SAL,
       USE_PRDMARK, TW_ID, QTY_MIN, QTY_LOW, VALID_DAYS, QTY_MIN1, QTY_MAX, DEP, SAL_NO, REM, STOP_ID)
       VALUES (@prd_no, @snm, @idx1, @idx2, @knd, @ut, @ut1, @name, @spc, @wh, @wh_lc, @upr, @up_sal,
       @use_prdmark, @tw_id, @qty_min, @qty_low, @valid_days, @qty_min1, @qty_max, @dep, @sal_no, @rem, @stop_id)`,
      inp
    );
    await savePrdtPic(tx, prd_no, body.pic, body.cadimg);
  });
  console.log('create+pic OK', prd_no);
  // cleanup
  const { execSql } = require('../repositories/mssqlHelpers');
  await execSql('DELETE FROM PRDT_PIC WHERE PRD_NO=@p', { p: nstr(prd_no, 30) });
  await execSql('DELETE FROM PRDT WHERE PRD_NO=@p', { p: nstr(prd_no, 30) });
})().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
