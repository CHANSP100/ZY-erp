/** 请购单(SQ) → 采购单(PO) 回写 — DB_11 事务版 */
const { ndate, nfloat, nint, nstr, sql } = require('./repositories/mssqlHelpers');

const SQ_BIL_ID = 'SQ';

async function reverseSqQtyPo(tx, osId, osNo) {
  const rows = await tx.queryAll(
    `SELECT QT_NO AS bil_no, OTH_ITM AS bil_itm, QTY AS qty FROM TF_POS
     WHERE OS_ID=@os_id AND OS_NO=@os_no AND BIL_ID=@bil_id AND QT_NO IS NOT NULL AND OTH_ITM IS NOT NULL`,
    { os_id: nstr(osId, 4), os_no: nstr(osNo, 20), bil_id: nstr(SQ_BIL_ID, 4) }
  );
  for (const r of rows) {
    const q = Number(r.qty) || 0;
    await tx.exec(
      `UPDATE TF_SQ SET QTY_PO = CASE WHEN COALESCE(QTY_PO,0) - @q < 0 THEN 0 ELSE COALESCE(QTY_PO,0) - @q END
       WHERE SQ_NO=@sq_no AND ITM=@itm`,
      { q: nfloat(q), sq_no: nstr(r.bil_no, 20), itm: nint(r.bil_itm) }
    );
  }
}

async function applySqQtyPo(tx, lines) {
  for (const ln of lines) {
    if (ln.bil_id !== SQ_BIL_ID || !ln.bil_no || ln.bil_itm == null) continue;
    await tx.exec(
      `UPDATE TF_SQ SET QTY_PO = COALESCE(QTY_PO,0) + @q WHERE SQ_NO=@sq_no AND ITM=@itm`,
      { q: nfloat(Number(ln.qty) || 0), sq_no: nstr(ln.bil_no, 20), itm: nint(ln.bil_itm) }
    );
  }
}

async function assertSqLinesAvailable(tx, lines) {
  for (const ln of lines) {
    if (ln.bil_id !== SQ_BIL_ID || !ln.bil_no || ln.bil_itm == null) continue;
    const row = await tx.queryOne(
      `SELECT QTY AS qty, COALESCE(QTY_PO,0) AS qty_po FROM TF_SQ WHERE SQ_NO=@sq_no AND ITM=@itm`,
      { sq_no: nstr(ln.bil_no, 20), itm: nint(ln.bil_itm) }
    );
    if (!row) throw new Error(`请购单行不存在：${ln.bil_no}-${ln.bil_itm}`);
    const open = (Number(row.qty) || 0) - (Number(row.qty_po) || 0);
    const need = Number(ln.qty) || 0;
    if (need > open + 0.0001) {
      throw new Error(`请购单 ${ln.bil_no} 项次 ${ln.bil_itm} 超过未转采购量（可转 ${open}）`);
    }
  }
}

async function linkSqPoNo(tx, sqNo, poNo) {
  if (!sqNo || !poNo) return;
  await tx.exec(`UPDATE MF_SQ SET PO_NO=@po_no WHERE SQ_NO=@sq_no`, {
    po_no: nstr(poNo, 20),
    sq_no: nstr(sqNo, 20),
  });
}

async function insertTfPosLine(tx, osId, osNo, ln, headEstDd) {
  await tx.exec(
    `INSERT INTO TF_POS (OS_ID, OS_NO, ITM, PRD_NO, PRD_NAME, WH, QTY, UT, UP, AMTN, TAX_RTO, TAX,
     EST_DD, SUP_PRD_NO, REM, QTY_PS, BIL_ID, QT_NO, OTH_ITM)
     VALUES (@os_id, @os_no, @itm, @prd_no, @prd_name, @wh, @qty, @ut, @up, @amtn, @tax_rto, @tax,
     @est_dd, @sup_prd_no, @rem, @qty_ps, @bil_id, @bil_no, @bil_itm)`,
    {
      os_id: nstr(osId, 4),
      os_no: nstr(osNo, 20),
      itm: nint(ln.itm),
      prd_no: nstr(ln.prd_no, 30),
      prd_name: nstr(ln.prd_name, 200),
      wh: nstr(ln.wh, 10),
      qty: nfloat(ln.qty ?? 0),
      ut: nstr(ln.ut, 10),
      up: nfloat(ln.up ?? 0),
      amtn: nfloat(ln.amtn ?? 0),
      tax_rto: nfloat(ln.tax_rto ?? 13),
      tax: nfloat(ln.tax ?? 0),
      est_dd: ndate(ln.est_dd || headEstDd || null),
      sup_prd_no: nstr(ln.sup_prd_no, 30),
      rem: nstr(ln.rem, 200),
      qty_ps: nfloat(ln.qty_ps ?? 0),
      bil_id: nstr(ln.bil_id, 4),
      bil_no: nstr(ln.bil_no, 20),
      bil_itm: ln.bil_itm != null ? nint(ln.bil_itm) : { type: sql.Int, value: null },
    }
  );
}

module.exports = {
  SQ_BIL_ID,
  reverseSqQtyPo,
  applySqQtyPo,
  assertSqLinesAvailable,
  linkSqPoNo,
  insertTfPosLine,
};
