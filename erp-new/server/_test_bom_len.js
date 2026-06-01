const { withTransaction, nstr, ndate, nfloat, nint } = require('./repositories/mssqlHelpers');

(async () => {
  const prdNo = 'A'.repeat(30);
  const pf = '123456';
  const bomNo = `${prdNo}->${pf}`;
  console.log('bomNo length', bomNo.length, bomNo);
  try {
    await withTransaction(async (tx) => {
      await tx.exec(
        `INSERT INTO MF_BOM (BOM_NO, PRD_NO, PF_NO, NAME, PRD_MARK, WH_NO, UNIT, QTY, PRD_KND, SPC, VALID_DD, END_DD, DEP, REM)
         VALUES (@bom_no, @prd_no, @pf_no, @name, @prd_mark, @wh_no, @unit, @qty, @prd_knd, @spc, @valid_dd, @end_dd, @dep, @rem)`,
        {
          bom_no: nstr(bomNo, 38),
          prd_no: nstr(prdNo, 30),
          pf_no: nstr(pf, 6),
          name: nstr('test', 100),
          prd_mark: nstr('', 40),
          wh_no: nstr('', 12),
          unit: nstr('1', 1),
          qty: nfloat(1),
          prd_knd: nstr('2', 1),
          spc: nstr('', 200),
          valid_dd: ndate(''),
          end_dd: ndate(''),
          dep: nstr('', 8),
          rem: nstr('', 100),
        }
      );
      await tx.exec('DELETE FROM MF_BOM WHERE BOM_NO=@bom_no', { bom_no: nstr(bomNo, 38) });
    });
    console.log('OK');
  } catch (e) {
    console.error('FAIL', e.message);
    if (e.originalError) console.error('ORIG', e.originalError.message);
  }
})();
