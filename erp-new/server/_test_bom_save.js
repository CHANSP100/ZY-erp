const { queryOne, withTransaction, nstr, ndate, nfloat, nint } = require('./repositories/mssqlHelpers');

(async () => {
  try {
    const prd = await queryOne(
      "SELECT TOP 1 PRD_NO AS prd_no, NAME AS name, KND AS knd, UT AS unit, WH AS wh_no, SPC AS spc FROM PRDT WHERE KND IN ('2','3') AND ISNULL(STOP_ID,'') <> 'Y'"
    );
    const child = await queryOne(
      "SELECT TOP 1 PRD_NO AS prd_no, NAME AS name, UT AS unit, WH AS wh_no FROM PRDT WHERE KND IN ('4','5') AND ISNULL(STOP_ID,'') <> 'Y' AND PRD_NO <> @prd_no",
      { prd_no: nstr(prd.prd_no, 30) }
    );
    if (!prd || !child) {
      console.log('no products');
      process.exit(1);
    }
    const pf = String(Date.now()).slice(-5);
    const bomNo = `${prd.prd_no}->${pf}`;
    const head = {
      bom_no: bomNo,
      prd_no: prd.prd_no,
      pf_no: pf,
      name: prd.name,
      prd_mark: '',
      wh_no: prd.wh_no || '',
      unit: (prd.unit || '').slice(0, 1),
      qty: 1,
      prd_knd: prd.knd,
      spc: prd.spc || '',
      valid_dd: '',
      end_dd: '',
      dep: '',
      rem: '',
    };
    const ln = {
      itm: 1,
      bom_no: bomNo,
      prd_no: child.prd_no,
      name: child.name,
      prd_mark: '',
      wh_no: child.wh_no || '',
      unit: (child.unit || '').slice(0, 1),
      qty: 1,
      los_rto: 0,
      qty_bas: 1,
      bom_id: '',
      rem: '',
    };
    await withTransaction(async (tx) => {
      await tx.exec(
        `INSERT INTO MF_BOM (BOM_NO, PRD_NO, PF_NO, NAME, PRD_MARK, WH_NO, UNIT, QTY, PRD_KND, SPC,
           VALID_DD, END_DD, DEP, REM, USR, SYS_DATE)
           VALUES (@bom_no, @prd_no, @pf_no, @name, @prd_mark, @wh_no, @unit, @qty, @prd_knd, @spc,
           @valid_dd, @end_dd, @dep, @rem, @usr, GETDATE())`,
        {
          bom_no: nstr(bomNo, 38),
          prd_no: nstr(head.prd_no, 30),
          pf_no: nstr(head.pf_no, 6),
          name: nstr(head.name, 100),
          prd_mark: nstr(head.prd_mark, 40),
          wh_no: nstr(head.wh_no, 12),
          unit: nstr((head.unit || '').slice(0, 1), 1),
          qty: nfloat(head.qty),
          prd_knd: nstr(head.prd_knd, 1),
          spc: nstr(head.spc, 200),
          valid_dd: ndate(head.valid_dd),
          end_dd: ndate(head.end_dd),
          dep: nstr(head.dep, 8),
          rem: nstr(head.rem, 100),
          usr: nstr('TEST', 12),
        }
      );
      await tx.exec(
        `INSERT INTO TF_BOM (BOM_NO, ITM, PRD_NO, NAME, PRD_MARK, WH_NO, UNIT, QTY, LOS_RTO, QTY_BAS, BOM_ID, REM)
         VALUES (@bom_no, @itm, @prd_no, @name, @prd_mark, @wh_no, @unit, @qty, @los_rto, @qty_bas, @bom_id, @rem)`,
        {
          bom_no: nstr(bomNo, 38),
          itm: nint(1),
          prd_no: nstr(ln.prd_no, 30),
          name: nstr(ln.name, 100),
          prd_mark: nstr(ln.prd_mark, 40),
          wh_no: nstr(ln.wh_no, 12),
          unit: nstr((ln.unit || '').slice(0, 1), 1),
          qty: nfloat(ln.qty),
          los_rto: nfloat(ln.los_rto),
          qty_bas: nfloat(ln.qty_bas),
          bom_id: nstr(ln.bom_id, 1),
          rem: nstr(ln.rem, 200),
        }
      );
      await tx.exec('DELETE FROM TF_BOM WHERE BOM_NO=@bom_no', { bom_no: nstr(bomNo, 38) });
      await tx.exec('DELETE FROM MF_BOM WHERE BOM_NO=@bom_no', { bom_no: nstr(bomNo, 38) });
    });
    console.log('INSERT OK', bomNo);
  } catch (e) {
    console.error('ERROR:', e.message);
    if (e.originalError) console.error('ORIG:', e.originalError.message);
    process.exit(1);
  }
  process.exit(0);
})();
