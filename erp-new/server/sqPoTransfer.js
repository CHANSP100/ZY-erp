/** 请购单(SQ) → 采购单(PO) 回写 TF_SQ.QTY_PO */
const SQ_BIL_ID = 'SQ';

function reverseSqQtyPo(db, osId, osNo) {
  const rows = db
    .prepare(
      `SELECT bil_no, bil_itm, qty FROM tf_pos
       WHERE os_id=? AND os_no=? AND bil_id=? AND bil_no IS NOT NULL AND bil_itm IS NOT NULL`
    )
    .all(osId, osNo, SQ_BIL_ID);
  const upd = db.prepare(
    `UPDATE tf_sq SET qty_po = CASE WHEN COALESCE(qty_po,0) - ? < 0 THEN 0 ELSE COALESCE(qty_po,0) - ? END
     WHERE sq_no=? AND itm=?`
  );
  for (const r of rows) {
    const q = Number(r.qty) || 0;
    upd.run(q, q, r.bil_no, r.bil_itm);
  }
}

function applySqQtyPo(db, lines) {
  const upd = db.prepare(`UPDATE tf_sq SET qty_po = COALESCE(qty_po,0) + ? WHERE sq_no=? AND itm=?`);
  for (const ln of lines) {
    if (ln.bil_id !== SQ_BIL_ID || !ln.bil_no || ln.bil_itm == null) continue;
    upd.run(Number(ln.qty) || 0, ln.bil_no, ln.bil_itm);
  }
}

function assertSqLinesAvailable(db, lines) {
  const get = db.prepare(
    `SELECT qty, COALESCE(qty_po,0) AS qty_po FROM tf_sq WHERE sq_no=? AND itm=?`
  );
  for (const ln of lines) {
    if (ln.bil_id !== SQ_BIL_ID || !ln.bil_no || ln.bil_itm == null) continue;
    const row = get.get(ln.bil_no, ln.bil_itm);
    if (!row) {
      throw new Error(`请购单行不存在：${ln.bil_no}-${ln.bil_itm}`);
    }
    const open = (Number(row.qty) || 0) - (Number(row.qty_po) || 0);
    const need = Number(ln.qty) || 0;
    if (need > open + 0.0001) {
      throw new Error(`请购单 ${ln.bil_no} 项次 ${ln.bil_itm} 超过未转采购量（可转 ${open}）`);
    }
  }
}

function linkSqPoNo(db, sqNo, poNo) {
  if (!sqNo || !poNo) return;
  db.prepare(`UPDATE mf_sq SET po_no=? WHERE sq_no=?`).run(poNo, sqNo);
}

function insertTfPosLine(ins, osId, osNo, ln, headEstDd) {
  ins.run(
    osId,
    osNo,
    ln.itm,
    ln.prd_no,
    ln.prd_name || null,
    ln.wh || null,
    ln.qty ?? 0,
    ln.ut || null,
    ln.up ?? 0,
    ln.amtn ?? 0,
    ln.tax_rto ?? 13,
    ln.tax ?? 0,
    ln.est_dd || headEstDd || null,
    ln.sup_prd_no || null,
    ln.rem || null,
    ln.qty_ps ?? 0,
    ln.bil_id || null,
    ln.bil_no || null,
    ln.bil_itm ?? null
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
