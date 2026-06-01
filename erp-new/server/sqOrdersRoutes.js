const { queryAll, queryOne, withTransaction, nstr, ndate, nfloat, nint } = require('./repositories/mssqlHelpers');
const { nextSqNo } = require('./repositories/mssqlNextNo');
const { saveBillExtFields, mergeBillExtFields, isExtFieldError } = require('./billExtFieldHook');
const { BILL_AUDIT_SELECT, billUserId, isBillAudited, registerBillAuditRoutes } = require('./billAuditMeta');
const MF_SQ_HEAD_SEL = `
  SELECT m.SQ_NO AS sq_no, CONVERT(varchar(10), m.SQ_DD, 23) AS sq_dd,
    m.DEP AS dep, m.CUS_NO AS cus_no, m.SAL_NO AS sal_no,
    CONVERT(varchar(10), m.EST_DD, 23) AS est_dd, CAST(m.REM AS nvarchar(500)) AS rem,
    m.PO_NO AS po_no, m.PO_DEP AS po_dep, m.CUR_ID AS cur_id, m.EXC_RTO AS exc_rto,
    m.CLS_ID AS cls_id, m.BIL_ID AS bil_id, m.BIL_NO AS bil_no, m.AMTN AS amtn,
    CAST(c.NAME AS nvarchar(200)) AS cus_name,
    CAST(s.NAME AS nvarchar(100)) AS sal_name,
    CAST(d.NAME AS nvarchar(100)) AS dep_name,
    ${BILL_AUDIT_SELECT}
  FROM MF_SQ m
  LEFT JOIN CUST c ON c.CUS_NO = m.CUS_NO
  LEFT JOIN SALM s ON s.SAL_NO = m.SAL_NO
  LEFT JOIN DEPT d ON d.DEP = m.DEP`;

const TF_SQ_LINE_SEL = `
  SELECT t.SQ_NO AS sq_no, t.ITM AS itm, t.PRD_NO AS prd_no,
    CAST(t.PRD_NAME AS nvarchar(200)) AS prd_name, t.PRD_MARK AS prd_mark, t.UNIT AS unit,
    t.QTY AS qty, t.UP AS up, t.AMTN AS amtn,
    CONVERT(varchar(10), t.EST_DD, 23) AS est_dd, CAST(t.REM AS nvarchar(200)) AS rem,
    t.CUS_NO AS cus_no, t.CUR_ID AS cur_id, t.EXC_RTO AS exc_rto,
    t.QTY1 AS qty1, t.QTY_PO AS qty_po, t.BAT_NO AS bat_no,
    CAST(p.SPC AS nvarchar(200)) AS spc
  FROM TF_SQ t
  LEFT JOIN PRDT p ON p.PRD_NO = t.PRD_NO`;

async function loadMfSqHead(sqNo) {
  return queryOne(`${MF_SQ_HEAD_SEL} WHERE m.SQ_NO = @sq_no`, { sq_no: nstr(sqNo, 20) });
}

async function loadTfSqLines(sqNo, rowToTfSq) {
  return (
    await queryAll(`${TF_SQ_LINE_SEL} WHERE t.SQ_NO = @sq_no ORDER BY t.ITM`, {
      sq_no: nstr(sqNo, 20),
    })
  ).map(rowToTfSq);
}

async function insertTfSqLine(tx, sqNo, ln, head) {
  await tx.exec(
    `INSERT INTO TF_SQ (SQ_NO, ITM, PRD_NO, PRD_NAME, PRD_MARK, UNIT, QTY, UP, AMTN,
     EST_DD, REM, CUS_NO, CUR_ID, EXC_RTO, QTY1, QTY_PO, BAT_NO)
     VALUES (@sq_no, @itm, @prd_no, @prd_name, @prd_mark, @unit, @qty, @up, @amtn,
     @est_dd, @rem, @cus_no, @cur_id, @exc_rto, @qty1, @qty_po, @bat_no)`,
    {
      sq_no: nstr(sqNo, 20),
      itm: nint(ln.itm),
      prd_no: nstr(ln.prd_no, 30),
      prd_name: nstr(ln.prd_name, 200),
      prd_mark: nstr(ln.prd_mark, 100),
      unit: nstr(ln.unit, 10),
      qty: nfloat(ln.qty ?? 0),
      up: nfloat(ln.up ?? 0),
      amtn: nfloat(ln.amtn ?? 0),
      est_dd: ndate(ln.est_dd || head.est_dd || null),
      rem: nstr(ln.rem, 200),
      cus_no: nstr(ln.cus_no || head.cus_no || null, 20),
      cur_id: nstr(ln.cur_id || head.cur_id || null, 4),
      exc_rto: nfloat(ln.exc_rto ?? head.exc_rto ?? 0),
      qty1: nfloat(ln.qty1 ?? 0),
      qty_po: nfloat(ln.qty_po ?? 0),
      bat_no: nstr(ln.bat_no, 30),
    }
  );
}

/** MF_SQ / TF_SQ 请购单 (InvAQ) */
function registerSqOrdersRoutes(app, deps) {
  const { rowToMfSq, rowToTfSq, calcSqLineAmt, sumSq } = deps;
  const label = '请购单';

  app.get('/api/purchase-requisitions/next-no', async (_req, res) => {
    try {
      res.json({ sq_no: await nextSqNo() });
    } catch (e) {
      console.error('[purchase-requisitions/next-no]', e);
      res.status(500).json({ error: '获取单号失败' });
    }
  });

  app.get('/api/purchase-requisitions/open', async (req, res) => {
    const { cus_no } = req.query;
    if (!cus_no) return res.status(400).json({ error: '请先选择采购对象' });
    try {
      const rows = await queryAll(
        `SELECT DISTINCT m.SQ_NO AS sq_no, CONVERT(varchar(10), m.SQ_DD, 23) AS sq_dd,
         CAST(m.REM AS nvarchar(500)) AS rem
         FROM MF_SQ m
         JOIN TF_SQ t ON t.SQ_NO = m.SQ_NO
         WHERE m.CUS_NO = @cus_no
           AND (COALESCE(t.QTY, 0) - COALESCE(t.QTY_PO, 0)) > 0.0001
         ORDER BY m.SQ_DD DESC, m.SQ_NO DESC`,
        { cus_no: nstr(String(cus_no), 20) }
      );
      res.json(rows);
    } catch (e) {
      console.error('[purchase-requisitions/open]', e);
      res.status(500).json({ error: '读取未转完请购单失败' });
    }
  });

  app.get('/api/purchase-requisitions', async (req, res) => {
    const { q, limit = '50', date_from, date_to } = req.query;
    try {
      const top = Math.min(parseInt(limit, 10) || 50, 200);
      let sqlText = `${MF_SQ_HEAD_SEL.replace('SELECT', `SELECT TOP (${top})`)} WHERE 1=1`;
      const inputs = {};
      if (q) {
        sqlText += ' AND (m.SQ_NO LIKE @q OR c.NAME LIKE @q OR m.REM LIKE @q)';
        inputs.q = nstr(`%${q}%`, 200);
      }
      if (date_from) {
        sqlText += ' AND m.SQ_DD >= @date_from';
        inputs.date_from = ndate(String(date_from));
      }
      if (date_to) {
        sqlText += ' AND m.SQ_DD <= @date_to';
        inputs.date_to = ndate(String(date_to));
      }
      sqlText += ' ORDER BY m.SQ_DD DESC, m.SQ_NO DESC';
      res.json((await queryAll(sqlText, inputs)).map(rowToMfSq));
    } catch (e) {
      console.error('[purchase-requisitions/list]', e);
      res.status(500).json({ error: '读取请购单列表失败' });
    }
  });

  app.get('/api/purchase-requisitions/:sqNo/po-lines', async (req, res) => {
    try {
      const head = await loadMfSqHead(req.params.sqNo);
      if (!head) return res.status(404).json({ error: `${label}不存在` });
      const lines = (
        await queryAll(
          `${TF_SQ_LINE_SEL.replace(
            'CAST(p.SPC AS nvarchar(200)) AS spc',
            'CAST(p.SPC AS nvarchar(200)) AS spc, (COALESCE(t.QTY, 0) - COALESCE(t.QTY_PO, 0)) AS qty_open'
          )} WHERE t.SQ_NO = @sq_no
             AND (COALESCE(t.QTY, 0) - COALESCE(t.QTY_PO, 0)) > 0.0001
           ORDER BY t.ITM`,
          { sq_no: nstr(req.params.sqNo, 20) }
        )
      ).map((row) => ({
        ...rowToTfSq(row),
        qty_open: row.qty_open,
        qty: row.qty_open,
      }));
      res.json({ head: rowToMfSq(head), lines });
    } catch (e) {
      console.error('[purchase-requisitions/po-lines]', e);
      res.status(500).json({ error: '读取请购未转采购明细失败' });
    }
  });

  app.get('/api/purchase-requisitions/:sqNo', async (req, res) => {
    try {
      const head = await loadMfSqHead(req.params.sqNo);
      if (!head) return res.status(404).json({ error: `${label}不存在` });
      const lines = await loadTfSqLines(req.params.sqNo, rowToTfSq);
      res.json(await mergeBillExtFields('InvAQ', rowToMfSq(head), lines));
    } catch (e) {
      console.error('[purchase-requisitions/get]', e);
      res.status(500).json({ error: '读取请购单失败' });
    }
  });

  app.post('/api/purchase-requisitions', async (req, res) => {
    const { head, lines } = req.body;
    if (!head?.cus_no) return res.status(400).json({ error: '请选择采购对象' });
    if (!lines?.length) return res.status(400).json({ error: '表身至少一行' });
    try {
      const sq_no = head.sq_no || (await nextSqNo());
      if (await queryOne('SELECT 1 AS ok FROM MF_SQ WHERE SQ_NO = @sq_no', { sq_no: nstr(sq_no, 20) })) {
        return res.status(409).json({ error: '单号已存在' });
      }
      const normalized = lines.map((ln, i) => {
        const amtn = calcSqLineAmt(ln.qty, ln.up);
        return { ...ln, itm: i + 1, amtn };
      });
      const totalAmtn = sumSq(normalized);

      await withTransaction(async (tx) => {
        const creator = billUserId(req);
        await tx.exec(
          `INSERT INTO MF_SQ (SQ_NO, SQ_DD, DEP, CUS_NO, SAL_NO, EST_DD, REM, PO_NO, PO_DEP,
           CUR_ID, EXC_RTO, CLS_ID, BIL_ID, BIL_NO, AMTN${creator ? ', USR, SYS_DATE' : ''})
           VALUES (@sq_no, @sq_dd, @dep, @cus_no, @sal_no, @est_dd, @rem, @po_no, @po_dep,
           @cur_id, @exc_rto, @cls_id, @bil_id, @bil_no, @amtn${creator ? ', @usr, GETDATE()' : ''})`,
          {
            sq_no: nstr(sq_no, 20),
            sq_dd: ndate(head.sq_dd || new Date().toISOString().slice(0, 10)),
            dep: nstr(head.dep, 10),
            cus_no: nstr(head.cus_no, 20),
            sal_no: nstr(head.sal_no, 10),
            est_dd: ndate(head.est_dd),
            rem: nstr(head.rem, 500),
            po_no: nstr(head.po_no, 20),
            po_dep: nstr(head.po_dep, 10),
            cur_id: nstr(head.cur_id, 4),
            exc_rto: nfloat(head.exc_rto ?? 0),
            cls_id: nstr(head.cls_id, 4),
            bil_id: nstr(head.bil_id, 4),
            bil_no: nstr(head.bil_no, 20),
            amtn: nfloat(totalAmtn),
            ...(creator ? { usr: creator } : {}),
          }
        );
        for (const ln of normalized) {
          await insertTfSqLine(tx, sq_no, ln, head);
        }
      });

      await saveBillExtFields('InvAQ', { head, lines: normalized });

      const saved = await loadMfSqHead(sq_no);
      const rawLines = await loadTfSqLines(sq_no, rowToTfSq);
      res.status(201).json(await mergeBillExtFields('InvAQ', rowToMfSq(saved), rawLines));
    } catch (e) {
      console.error('[purchase-requisitions/create]', e);
      if (isExtFieldError(e)) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: '新增请购单失败' });
    }
  });

  app.put('/api/purchase-requisitions/:sqNo', async (req, res) => {
    try {
      const existing = await queryOne('SELECT * FROM MF_SQ WHERE SQ_NO = @sq_no', {
        sq_no: nstr(req.params.sqNo, 20),
      });
      if (!existing) return res.status(404).json({ error: `${label}不存在` });
      if (isBillAudited(existing)) return res.status(409).json({ error: '已审核单据不可修改' });
      const { head, lines } = req.body;
      if (!lines?.length) return res.status(400).json({ error: '表身至少一行' });

      const normalized = lines.map((ln, i) => {
        const amtn = calcSqLineAmt(ln.qty, ln.up);
        return { ...ln, itm: i + 1, amtn };
      });
      const totalAmtn = sumSq(normalized);

      await withTransaction(async (tx) => {
        await tx.exec(
          `UPDATE MF_SQ SET SQ_DD=@sq_dd, DEP=@dep, CUS_NO=@cus_no, SAL_NO=@sal_no, EST_DD=@est_dd, REM=@rem,
           PO_NO=@po_no, PO_DEP=@po_dep, CUR_ID=@cur_id, EXC_RTO=@exc_rto, CLS_ID=@cls_id,
           BIL_ID=@bil_id, BIL_NO=@bil_no, AMTN=@amtn WHERE SQ_NO=@sq_no`,
          {
            sq_dd: ndate(head?.sq_dd ?? existing.sq_dd),
            dep: nstr(head?.dep ?? existing.dep, 10),
            cus_no: nstr(head?.cus_no ?? existing.cus_no, 20),
            sal_no: nstr(head?.sal_no ?? existing.sal_no, 10),
            est_dd: ndate(head?.est_dd ?? existing.est_dd),
            rem: nstr(head?.rem ?? existing.rem, 500),
            po_no: nstr(head?.po_no ?? existing.po_no, 20),
            po_dep: nstr(head?.po_dep ?? existing.po_dep, 10),
            cur_id: nstr(head?.cur_id ?? existing.cur_id, 4),
            exc_rto: nfloat(head?.exc_rto ?? existing.exc_rto),
            cls_id: nstr(head?.cls_id ?? existing.cls_id, 4),
            bil_id: nstr(head?.bil_id ?? existing.bil_id, 4),
            bil_no: nstr(head?.bil_no ?? existing.bil_no, 20),
            amtn: nfloat(totalAmtn),
            sq_no: nstr(req.params.sqNo, 20),
          }
        );
        await tx.exec('DELETE FROM TF_SQ WHERE SQ_NO = @sq_no', { sq_no: nstr(req.params.sqNo, 20) });
        for (const ln of normalized) {
          await insertTfSqLine(tx, req.params.sqNo, ln, head || existing);
        }
      });
      await saveBillExtFields('InvAQ', { head, lines: normalized });
      res.json({ ok: true });
    } catch (e) {
      console.error('[purchase-requisitions/update]', e);
      if (isExtFieldError(e)) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: '修改请购单失败' });
    }
  });

  app.delete('/api/purchase-requisitions/:sqNo', async (req, res) => {
    try {
      const existing = await queryOne('SELECT 1 AS ok FROM MF_SQ WHERE SQ_NO = @sq_no', {
        sq_no: nstr(req.params.sqNo, 20),
      });
      if (!existing) return res.status(404).json({ error: `${label}不存在` });
      const transferred = await queryOne(
        'SELECT TOP 1 1 AS ok FROM TF_SQ WHERE SQ_NO = @sq_no AND COALESCE(QTY_PO, 0) > 0.0001',
        { sq_no: nstr(req.params.sqNo, 20) }
      );
      if (transferred) return res.status(409).json({ error: '请购单已有采购记录，不能删除' });
      await withTransaction(async (tx) => {
        await tx.exec('DELETE FROM TF_SQ WHERE SQ_NO = @sq_no', { sq_no: nstr(req.params.sqNo, 20) });
        await tx.exec('DELETE FROM MF_SQ WHERE SQ_NO = @sq_no', { sq_no: nstr(req.params.sqNo, 20) });
      });
      res.json({ ok: true });
    } catch (e) {
      console.error('[purchase-requisitions/delete]', e);
      res.status(500).json({ error: '删除请购单失败' });
    }
  });

  registerBillAuditRoutes(app, {
    apiPath: 'purchase-requisitions',
    billNoParam: 'sqNo',
    label,
    table: 'MF_SQ',
    whereSql: 'SQ_NO = @sq_no',
    buildParams: (req) => ({ sq_no: nstr(req.params.sqNo, 20) }),
    loadHeadRow: async (req) => loadMfSqHead(req.params.sqNo),
  });
}

module.exports = { registerSqOrdersRoutes };
