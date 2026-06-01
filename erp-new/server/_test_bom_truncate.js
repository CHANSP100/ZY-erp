const { queryOne, withTransaction, nstr, ndate, nfloat } = require('./repositories/mssqlHelpers');

(async () => {
  const prd = await queryOne(
    "SELECT TOP 1 PRD_NO AS prd_no FROM PRDT WHERE KND IN ('2','3') AND LEN(PRD_NO) >= 28"
  );
  if (!prd) {
    console.log('no long prd');
    process.exit(0);
  }
  const pf = '123456';
  const bomNo = `${prd.prd_no}->${pf}`;
  console.log('prd len', prd.prd_no.length, 'bom len', bomNo.length, bomNo);
  try {
    await withTransaction(async (tx) => {
      await tx.exec(
        `INSERT INTO MF_BOM (BOM_NO, PRD_NO, PF_NO, NAME, PRD_MARK, WH_NO, UNIT, QTY, PRD_KND, SPC, VALID_DD, END_DD, DEP, REM)
         VALUES (@bom_no, @prd_no, @pf_no, @name, @prd_mark, @wh_no, @unit, @qty, @prd_knd, @spc, @valid_dd, @end_dd, @dep, @rem)`,
        {
          bom_no: nstr(bomNo, 38),
          prd_no: nstr(prd.prd_no, 30),
          pf_no: nstr(pf, 6),
          name: nstr('x', 100),
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
      const saved = await tx.queryOne('SELECT BOM_NO AS bom_no FROM MF_BOM WHERE PRD_NO=@prd_no AND PF_NO=@pf_no', {
        prd_no: nstr(prd.prd_no, 30),
        pf_no: nstr(pf, 6),
      });
      console.log('saved bom_no', saved?.bom_no, 'len', saved?.bom_no?.length);
      await tx.exec('DELETE FROM MF_BOM WHERE PRD_NO=@prd_no AND PF_NO=@pf_no', {
        prd_no: nstr(prd.prd_no, 30),
        pf_no: nstr(pf, 6),
      });
    });
  } catch (e) {
    console.error('FAIL', e.message);
    if (e.originalError) console.error('ORIG', e.originalError.message);
  }
})();
