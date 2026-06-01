const {
  SQ_BIL_ID,
  reverseSqQtyPo,
  applySqQtyPo,
  assertSqLinesAvailable,
  linkSqPoNo,
  insertTfPosLine,
} = require('./sqPoTransfer');

/** MF_POS / TF_POS 采购单 (OS_ID=PO) — 与 sales-orders 同构 */
function registerPoOrdersRoutes(app, deps) {
  const {
    db,
    nextOsNo,
    rowToMfPos,
    rowToTfPos,
    calcLineAmounts,
    sumOrder,
    getCustomSqlExprs,
  } = deps;
  const osId = 'PO';
  const label = '采购单';

  app.get('/api/purchase-orders/next-no', (_req, res) => {
    res.json({ os_no: nextOsNo(osId) });
  });

  app.get('/api/purchase-orders/open', (req, res) => {
    const { cus_no } = req.query;
    if (!cus_no) return res.status(400).json({ error: '请先选择厂商' });
    const rows = db
      .prepare(
        `SELECT DISTINCT m.os_no, m.os_dd, m.cus_os_no, m.rem
         FROM mf_pos m
         JOIN tf_pos t ON t.os_id=? AND t.os_no=m.os_no
         WHERE m.os_id=? AND m.cus_no=?
           AND (COALESCE(t.qty,0) - COALESCE(t.qty_ps,0)) > 0.0001
         ORDER BY m.os_dd DESC, m.os_no DESC`
      )
      .all(osId, osId, String(cus_no));
    res.json(rows);
  });

  app.get('/api/purchase-orders', (req, res) => {
    const { q, limit = '50', date_from, date_to } = req.query;
    let sql = `SELECT m.*, c.name AS cus_name FROM mf_pos m
      LEFT JOIN cust c ON c.cus_no = m.cus_no WHERE m.os_id = ?`;
    const params = [osId];
    if (q) {
      sql += ' AND (m.os_no LIKE ? OR c.name LIKE ? OR m.cus_os_no LIKE ?)';
      const like = `%${q}%`;
      params.push(like, like, like);
    }
    if (date_from) {
      sql += ' AND m.os_dd >= ?';
      params.push(String(date_from));
    }
    if (date_to) {
      sql += ' AND m.os_dd <= ?';
      params.push(String(date_to));
    }
    sql += ' ORDER BY m.os_dd DESC, m.os_no DESC LIMIT ?';
    params.push(Math.min(parseInt(limit, 10) || 50, 200));
    res.json(db.prepare(sql).all(...params).map(rowToMfPos));
  });

  app.get('/api/purchase-orders/lines', (req, res) => {
    const { q, os_no, cus_no, prd_no, date_from, date_to, limit = '500' } = req.query;
    const customExprs = getCustomSqlExprs('InvAF');
    const extraSelect = customExprs.length
      ? `, ${customExprs.map((e) => `${e.sql_expr} AS ${e.col_key}`).join(', ')}`
      : '';
    let sql = `
      SELECT m.os_no, m.os_dd, m.est_dd, m.cus_no, c.name AS cus_name, m.cus_os_no,
             m.sal_no, s.name AS sal_name, m.use_dep, d.name AS dep_name, m.cls_id,
             t.itm, t.prd_no, t.prd_name, p.spc, t.sup_prd_no, t.wh, w.name AS wh_name,
             t.qty, t.qty_ps,
             (COALESCE(t.qty, 0) - COALESCE(t.qty_ps, 0)) AS qty_open,
             t.ut, t.up, t.amtn, t.tax, t.tax_rto, t.est_dd AS line_est_dd, t.rem AS line_rem
             ${extraSelect}
      FROM mf_pos m
      JOIN tf_pos t ON t.os_id = ? AND t.os_no = m.os_no
      LEFT JOIN cust c ON c.cus_no = m.cus_no
      LEFT JOIN salm s ON s.sal_no = m.sal_no
      LEFT JOIN dept d ON d.dep = m.use_dep
      LEFT JOIN prdt p ON p.prd_no = t.prd_no
      LEFT JOIN my_wh w ON w.wh = t.wh
      WHERE m.os_id = ?`;
    const params = [osId, osId];
    if (os_no) {
      sql += ' AND m.os_no LIKE ?';
      params.push(`%${String(os_no)}%`);
    }
    if (cus_no) {
      sql += ' AND (m.cus_no LIKE ? OR c.name LIKE ?)';
      const like = `%${String(cus_no)}%`;
      params.push(like, like);
    }
    if (prd_no) {
      sql += ' AND (t.prd_no LIKE ? OR t.prd_name LIKE ? OR p.spc LIKE ?)';
      const like = `%${String(prd_no)}%`;
      params.push(like, like, like);
    }
    if (date_from) {
      sql += ' AND m.os_dd >= ?';
      params.push(String(date_from));
    }
    if (date_to) {
      sql += ' AND m.os_dd <= ?';
      params.push(String(date_to));
    }
    if (q) {
      sql += ' AND (m.os_no LIKE ? OR c.name LIKE ? OR m.cus_os_no LIKE ? OR t.prd_no LIKE ? OR t.prd_name LIKE ?)';
      const like = `%${String(q)}%`;
      params.push(like, like, like, like, like);
    }
    sql += ' ORDER BY m.os_dd DESC, m.os_no DESC, t.itm LIMIT ?';
    params.push(Math.min(parseInt(String(limit), 10) || 500, 2000));
    res.json(db.prepare(sql).all(...params));
  });

  app.get('/api/purchase-orders/:osNo/receipt-lines', (req, res) => {
    const head = db
      .prepare(`SELECT * FROM mf_pos WHERE os_id=? AND os_no=?`)
      .get(osId, req.params.osNo);
    if (!head) return res.status(404).json({ error: `${label}不存在` });
    const lines = db
      .prepare(
        `SELECT t.*, w.name AS wh_name, p.spc,
          (COALESCE(t.qty,0) - COALESCE(t.qty_ps,0)) AS qty_open
         FROM tf_pos t
         LEFT JOIN my_wh w ON w.wh = t.wh
         LEFT JOIN prdt p ON p.prd_no = t.prd_no
         WHERE t.os_id=? AND t.os_no=?
           AND (COALESCE(t.qty,0) - COALESCE(t.qty_ps,0)) > 0.0001
         ORDER BY t.itm`
      )
      .all(osId, req.params.osNo)
      .map((row) => ({
        ...rowToTfPos(row),
        qty_open: row.qty_open,
        qty: row.qty_open,
      }));
    res.json({ head: rowToMfPos(head), lines });
  });

  app.get('/api/purchase-orders/:osNo', (req, res) => {
    const head = db
      .prepare(
        `SELECT m.*, c.name AS cus_name FROM mf_pos m
         LEFT JOIN cust c ON c.cus_no = m.cus_no WHERE m.os_id=? AND m.os_no=?`
      )
      .get(osId, req.params.osNo);
    if (!head) return res.status(404).json({ error: `${label}不存在` });
    const lines = db
      .prepare(
        `SELECT t.*, w.name AS wh_name, p.spc FROM tf_pos t
         LEFT JOIN my_wh w ON w.wh = t.wh
         LEFT JOIN prdt p ON p.prd_no = t.prd_no
         WHERE t.os_id=? AND t.os_no=? ORDER BY t.itm`
      )
      .all(osId, req.params.osNo)
      .map(rowToTfPos);
    res.json({ head: rowToMfPos(head), lines });
  });

  app.post('/api/purchase-orders', (req, res) => {
    const { head, lines } = req.body;
    if (!head?.cus_no) return res.status(400).json({ error: '请选择厂商' });
    if (!lines?.length) return res.status(400).json({ error: '表身至少一行' });

    const os_no = head.os_no || nextOsNo(osId);
    if (db.prepare('SELECT 1 FROM mf_pos WHERE os_no = ?').get(os_no)) {
      return res.status(409).json({ error: '单号已存在' });
    }

    const tax_id = head.tax_id || '2';
    const normalized = lines.map((ln, i) => {
      const c = calcLineAmounts(ln.qty, ln.up, tax_id, ln.tax_rto ?? 13);
      return { ...ln, itm: i + 1, amtn: c.amtn, tax: c.tax };
    });
    const totals = sumOrder(normalized, tax_id);

    try {
      assertSqLinesAvailable(db, normalized);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }

    const tx = db.transaction(() => {
      const bilId = head.bil_id || (normalized.some((ln) => ln.bil_id === SQ_BIL_ID) ? SQ_BIL_ID : null);
      const bilNo = head.bil_no || normalized.find((ln) => ln.bil_id === SQ_BIL_ID)?.bil_no || null;
      db.prepare(
        `INSERT INTO mf_pos (os_id, os_no, os_dd, cus_no, use_dep, sal_no, cus_os_no, bil_type, cur_id,
         tax_id, est_dd, rem, cls_mp_id, cls_id, dis_cnt, amtn_net, tax, bil_id, bil_no)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).run(
        osId,
        os_no,
        head.os_dd || new Date().toISOString().slice(0, 10),
        head.cus_no,
        head.use_dep || null,
        head.sal_no || null,
        head.cus_os_no || null,
        head.bil_type || null,
        head.cur_id || null,
        tax_id,
        head.est_dd || null,
        head.rem || null,
        head.cls_mp_id || null,
        head.cls_id || null,
        head.dis_cnt ?? 0,
        totals.amtn_net,
        totals.tax,
        bilId,
        bilNo
      );
      const ins = db.prepare(
        `INSERT INTO tf_pos (os_id, os_no, itm, prd_no, prd_name, wh, qty, ut, up, amtn, tax_rto, tax,
         est_dd, sup_prd_no, rem, qty_ps, bil_id, bil_no, bil_itm) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      );
      for (const ln of normalized) {
        insertTfPosLine(ins, osId, os_no, ln, head.est_dd);
      }
      applySqQtyPo(db, normalized);
      if (bilId === SQ_BIL_ID && bilNo) linkSqPoNo(db, bilNo, os_no);
    });
    tx();

    const saved = db
      .prepare(`SELECT m.*, c.name AS cus_name FROM mf_pos m LEFT JOIN cust c ON c.cus_no=m.cus_no WHERE m.os_no=?`)
      .get(os_no);
    res.status(201).json({
      head: rowToMfPos(saved),
      lines: db
        .prepare(`SELECT t.*, w.name AS wh_name, p.spc FROM tf_pos t
          LEFT JOIN my_wh w ON w.wh=t.wh LEFT JOIN prdt p ON p.prd_no=t.prd_no
          WHERE t.os_id=? AND t.os_no=? ORDER BY t.itm`)
        .all(osId, os_no)
        .map(rowToTfPos),
    });
  });

  app.put('/api/purchase-orders/:osNo', (req, res) => {
    const existing = db.prepare(`SELECT * FROM mf_pos WHERE os_id=? AND os_no=?`).get(osId, req.params.osNo);
    if (!existing) return res.status(404).json({ error: `${label}不存在` });
    const { head, lines } = req.body;
    if (!lines?.length) return res.status(400).json({ error: '表身至少一行' });

    const tax_id = head?.tax_id ?? existing.tax_id ?? '2';
    const normalized = lines.map((ln, i) => {
      const c = calcLineAmounts(ln.qty, ln.up, tax_id, ln.tax_rto ?? 13);
      return { ...ln, itm: i + 1, amtn: c.amtn, tax: c.tax };
    });
    const totals = sumOrder(normalized, tax_id);

    try {
      const tx = db.transaction(() => {
        reverseSqQtyPo(db, osId, req.params.osNo);
        assertSqLinesAvailable(db, normalized);
        const bilId =
          head?.bil_id ?? existing.bil_id ?? (normalized.some((ln) => ln.bil_id === SQ_BIL_ID) ? SQ_BIL_ID : null);
        const bilNo =
          head?.bil_no ??
          existing.bil_no ??
          normalized.find((ln) => ln.bil_id === SQ_BIL_ID)?.bil_no ??
          null;
        db.prepare(
          `UPDATE mf_pos SET os_dd=?, cus_no=?, use_dep=?, sal_no=?, cus_os_no=?, bil_type=?, cur_id=?,
         tax_id=?, est_dd=?, rem=?, cls_mp_id=?, cls_id=?, dis_cnt=?, amtn_net=?, tax=?, bil_id=?, bil_no=?
         WHERE os_no=?`
        ).run(
          head?.os_dd ?? existing.os_dd,
          head?.cus_no ?? existing.cus_no,
          head?.use_dep ?? existing.use_dep,
          head?.sal_no ?? existing.sal_no,
          head?.cus_os_no ?? existing.cus_os_no,
          head?.bil_type ?? existing.bil_type,
          head?.cur_id ?? existing.cur_id,
          tax_id,
          head?.est_dd ?? existing.est_dd,
          head?.rem ?? existing.rem,
          head?.cls_mp_id ?? existing.cls_mp_id,
          head?.cls_id ?? existing.cls_id,
          head?.dis_cnt ?? existing.dis_cnt,
          totals.amtn_net,
          totals.tax,
          bilId,
          bilNo,
          req.params.osNo
        );
        db.prepare(`DELETE FROM tf_pos WHERE os_id=? AND os_no=?`).run(osId, req.params.osNo);
        const ins = db.prepare(
          `INSERT INTO tf_pos (os_id, os_no, itm, prd_no, prd_name, wh, qty, ut, up, amtn, tax_rto, tax,
         est_dd, sup_prd_no, rem, qty_ps, bil_id, bil_no, bil_itm) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
        );
        for (const ln of normalized) {
          insertTfPosLine(ins, osId, req.params.osNo, ln, head?.est_dd ?? existing.est_dd);
        }
        applySqQtyPo(db, normalized);
        if (bilId === SQ_BIL_ID && bilNo) linkSqPoNo(db, bilNo, req.params.osNo);
      });
      tx();
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
    res.json({ ok: true });
  });

  app.delete('/api/purchase-orders/:osNo', (req, res) => {
    const existing = db.prepare(`SELECT 1 FROM mf_pos WHERE os_id=? AND os_no=?`).get(osId, req.params.osNo);
    if (!existing) return res.status(404).json({ error: `${label}不存在` });
    const received = db
      .prepare(
        `SELECT 1 FROM tf_pos WHERE os_id=? AND os_no=? AND COALESCE(qty_ps,0) > 0.0001 LIMIT 1`
      )
      .get(osId, req.params.osNo);
    if (received) return res.status(409).json({ error: '采购单已有进货记录，不能删除' });
    const tx = db.transaction(() => {
      reverseSqQtyPo(db, osId, req.params.osNo);
      db.prepare(`DELETE FROM tf_pos WHERE os_id=? AND os_no=?`).run(osId, req.params.osNo);
      db.prepare(`DELETE FROM mf_pos WHERE os_id=? AND os_no=?`).run(osId, req.params.osNo);
    });
    tx();
    res.json({ ok: true });
  });
}

module.exports = { registerPoOrdersRoutes };
