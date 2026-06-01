const { queryAll, queryOne, withTransaction, nstr, ndate, nfloat, nint } = require('./repositories/mssqlHelpers');
const { nextMlNo } = require('./repositories/mssqlNextNo');
const { saveBillExtFields, mergeBillExtFields, isExtFieldError } = require('./billExtFieldHook');
const {
  BILL_AUDIT_SELECT,
  billUserId,
  billAuditFields,
  isBillAudited,
  auditBillHead,
  unauditBillHead,
} = require('./billAuditMeta');

const ML_SCOPE = "h.MLID = 'ML' AND h.ML_ID = '1'";

const MF_ML_HEAD_SEL = `
  SELECT h.ML_NO AS ml_no, CONVERT(varchar(10), h.ML_DD, 23) AS ml_dd,
    h.MO_NO AS mo_no, h.MRP_NO AS mrp_no,
    CAST(h.PRD_NAME AS nvarchar(200)) AS prd_name, h.PRD_MARK AS prd_mark,
    h.UNIT AS unit, h.QTY AS qty, h.WH_MTL AS wh_mtl, h.DEP AS dep,
    h.BIL_TYPE AS bil_type, h.ID_NO AS id_no, h.BAT_NO AS bat_no,
    h.USR_NO AS usr_no, CAST(h.REM AS nvarchar(500)) AS rem,
    h.MLID AS mlid, h.ML_ID AS ml_id, h.BIL_ID AS bil_id, h.BIL_NO AS bil_no,
    CAST(p.SPC AS nvarchar(200)) AS mrp_spc,
    CAST(d.NAME AS nvarchar(100)) AS dep_name,
    CAST(w.NAME AS nvarchar(100)) AS wh_mtl_name,
    CAST(s.NAME AS nvarchar(100)) AS usr_name,
    ${BILL_AUDIT_SELECT.replace(/m\./g, 'h.')}
  FROM MF_ML h
  LEFT JOIN PRDT p ON p.PRD_NO = h.MRP_NO
  LEFT JOIN DEPT d ON d.DEP = h.DEP
  LEFT JOIN MY_WH w ON w.WH = h.WH_MTL
  LEFT JOIN SALM s ON s.SAL_NO = h.USR_NO`;

const TF_ML_LINE_SEL = `
  SELECT t.ML_NO AS ml_no, t.ITM AS itm, t.PRD_NO AS prd_no,
    CAST(t.PRD_NAME AS nvarchar(200)) AS prd_name, t.PRD_MARK AS prd_mark,
    t.WH AS wh, t.UNIT AS unit, t.QTY_STD AS qty_std, t.LOS_RTO AS los_rto,
    t.QTY_RSV AS qty_rsv, t.QTY AS qty, t.QTY_WH AS qty_wh,
    t.BAT_NO AS bat_no, CAST(t.REM AS nvarchar(200)) AS rem,
    t.MO_NO AS mo_no, t.BIL_ITM AS bil_itm
  FROM TF_ML t`;

async function loadMfMlHead(mlNo) {
  return queryOne(`${MF_ML_HEAD_SEL} WHERE h.ML_NO = @ml_no AND ${ML_SCOPE.replace(/h\./g, 'h.')}`, {
    ml_no: nstr(mlNo, 20),
  });
}

async function loadTfMlLines(mlNo, rowToTfMl) {
  return (
    await queryAll(`${TF_ML_LINE_SEL} WHERE t.ML_NO = @ml_no ORDER BY t.ITM`, {
      ml_no: nstr(mlNo, 20),
    })
  ).map(rowToTfMl);
}

async function loadStockQty(prdNo, wh) {
  if (!prdNo || !wh) return 0;
  const row = await queryOne(
    `SELECT COALESCE(QTY, 0) AS qty FROM PRDT1 WHERE PRD_NO = @prd_no AND WH = @wh`,
    { prd_no: nstr(prdNo, 30), wh: nstr(wh, 12) }
  );
  return row ? Number(row.qty) || 0 : 0;
}

function mfMlHeadParams(mlNo, head) {
  return {
    ml_no: nstr(mlNo, 20),
    ml_dd: ndate(head.ml_dd || new Date().toISOString().slice(0, 10)),
    mo_no: nstr(head.mo_no, 20),
    mrp_no: nstr(head.mrp_no, 30),
    prd_name: nstr(head.prd_name, 200),
    prd_mark: nstr(head.prd_mark, 40),
    unit: nstr(head.unit, 10),
    qty: nfloat(head.qty ?? 0),
    wh_mtl: nstr(head.wh_mtl, 12),
    dep: nstr(head.dep, 8),
    bil_type: nstr(head.bil_type, 2),
    id_no: nstr(head.id_no, 38),
    bat_no: nstr(head.bat_no, 40),
    usr_no: nstr(head.usr_no, 12),
    rem: nstr(head.rem, 500),
    mlid: nstr(head.mlid || 'ML', 2),
    ml_id: nstr(head.ml_id || '1', 1),
    bil_id: nstr(head.bil_id, 2),
    bil_no: nstr(head.bil_no, 20),
  };
}

async function insertTfMlLine(tx, mlNo, mlDd, ln) {
  await tx.exec(
    `INSERT INTO TF_ML (MLID, ML_NO, ITM, ML_DD, ML_ID, PRD_NO, PRD_NAME, PRD_MARK, WH, UNIT,
     QTY_STD, LOS_RTO, QTY_RSV, QTY, QTY_WH, BAT_NO, REM, MO_NO, BIL_ITM)
     VALUES ('ML', @ml_no, @itm, @ml_dd, '1', @prd_no, @prd_name, @prd_mark, @wh, @unit,
     @qty_std, @los_rto, @qty_rsv, @qty, @qty_wh, @bat_no, @rem, @mo_no, @bil_itm)`,
    {
      ml_no: nstr(mlNo, 20),
      ml_dd: ndate(mlDd || new Date().toISOString().slice(0, 10)),
      itm: nint(ln.itm),
      prd_no: nstr(ln.prd_no, 30),
      prd_name: nstr(ln.prd_name, 200),
      prd_mark: nstr(ln.prd_mark, 100),
      wh: nstr(ln.wh, 12),
      unit: nstr(ln.unit, 10),
      qty_std: nfloat(ln.qty_std ?? 0),
      los_rto: nfloat(ln.los_rto ?? 0),
      qty_rsv: nfloat(ln.qty_rsv ?? 0),
      qty: nfloat(ln.qty ?? 0),
      qty_wh: nfloat(ln.qty_wh ?? 0),
      bat_no: nstr(ln.bat_no, 40),
      rem: nstr(ln.rem, 200),
      mo_no: nstr(ln.mo_no, 20),
      bil_itm: nint(ln.bil_itm ?? 0),
    }
  );
}

async function applyMlWriteback(tx, mlNo, sign) {
  const lines = await tx.queryAll(
    `SELECT MO_NO AS mo_no, PRD_NO AS prd_no, QTY AS qty, WH AS wh, BIL_ITM AS bil_itm
     FROM TF_ML WHERE ML_NO = @ml_no`,
    { ml_no: nstr(mlNo, 20) }
  );
  for (const ln of lines) {
    const delta = (Number(ln.qty) || 0) * sign;
    if (Math.abs(delta) < 0.0001) continue;
    const moNo = ln.mo_no;
    const prdNo = ln.prd_no;
    if (moNo) {
      if (ln.bil_itm) {
        await tx.exec(
          `UPDATE TF_MO SET QTY = COALESCE(QTY, 0) + @delta WHERE MO_NO = @mo_no AND ITM = @itm`,
          { delta: nfloat(delta), mo_no: nstr(moNo, 20), itm: nint(ln.bil_itm) }
        );
      } else {
        await tx.exec(
          `UPDATE TF_MO SET QTY = COALESCE(QTY, 0) + @delta WHERE MO_NO = @mo_no AND PRD_NO = @prd_no`,
          { delta: nfloat(delta), mo_no: nstr(moNo, 20), prd_no: nstr(prdNo, 30) }
        );
      }
    }
    if (prdNo && ln.wh) {
      const exists = await tx.queryOne(
        `SELECT 1 AS ok FROM PRDT1 WHERE PRD_NO = @prd_no AND WH = @wh`,
        { prd_no: nstr(prdNo, 30), wh: nstr(ln.wh, 12) }
      );
      if (exists) {
        await tx.exec(
          `UPDATE PRDT1 SET QTY = COALESCE(QTY, 0) - @delta WHERE PRD_NO = @prd_no AND WH = @wh`,
          { delta: nfloat(delta), prd_no: nstr(prdNo, 30), wh: nstr(ln.wh, 12) }
        );
      }
    }
  }
}

/** MF_ML / TF_ML 生产领料 (MrpAG) */
function registerMlOrdersRoutes(app, deps) {
  const { rowToMfMl, rowToTfMl, calcMlLine } = deps;
  const label = '生产领料';

  app.get('/api/material-issues/next-no', async (_req, res) => {
    try {
      res.json({ ml_no: await nextMlNo() });
    } catch (e) {
      console.error('[material-issues/next-no]', e);
      res.status(500).json({ error: '获取单号失败' });
    }
  });

  app.get('/api/stock/qty', async (req, res) => {
    try {
      const qty = await loadStockQty(req.query.prd_no, req.query.wh);
      res.json({ qty });
    } catch (e) {
      console.error('[stock/qty]', e);
      res.status(500).json({ error: '读取库存失败' });
    }
  });

  app.get('/api/material-issues', async (req, res) => {
    const { q, limit = '50', date_from, date_to } = req.query;
    try {
      const top = Math.min(parseInt(limit, 10) || 50, 200);
      let sqlText = `${MF_ML_HEAD_SEL.replace('SELECT', `SELECT TOP (${top})`)} WHERE ${ML_SCOPE}`;
      const inputs = {};
      if (q) {
        sqlText += ' AND (h.ML_NO LIKE @q OR h.MO_NO LIKE @q OR h.MRP_NO LIKE @q OR h.PRD_NAME LIKE @q)';
        inputs.q = nstr(`%${q}%`, 200);
      }
      if (date_from) {
        sqlText += ' AND h.ML_DD >= @date_from';
        inputs.date_from = ndate(String(date_from));
      }
      if (date_to) {
        sqlText += ' AND h.ML_DD <= @date_to';
        inputs.date_to = ndate(String(date_to));
      }
      sqlText += ' ORDER BY h.ML_DD DESC, h.ML_NO DESC';
      res.json((await queryAll(sqlText, inputs)).map(rowToMfMl));
    } catch (e) {
      console.error('[material-issues/list]', e);
      res.status(500).json({ error: '读取生产领料列表失败' });
    }
  });

  app.get('/api/material-issues/:mlNo', async (req, res) => {
    try {
      const head = await loadMfMlHead(req.params.mlNo);
      if (!head) return res.status(404).json({ error: `${label}不存在` });
      const lines = await loadTfMlLines(req.params.mlNo, rowToTfMl);
      res.json(await mergeBillExtFields('MrpAG', rowToMfMl(head), lines));
    } catch (e) {
      console.error('[material-issues/get]', e);
      res.status(500).json({ error: '读取生产领料失败' });
    }
  });

  app.post('/api/material-issues', async (req, res) => {
    const { head, lines } = req.body;
    if (!head?.mo_no) return res.status(400).json({ error: '请选择制令单号' });
    if (!lines?.length) return res.status(400).json({ error: '表身至少一行' });
    try {
      const ml_no = head.ml_no || (await nextMlNo());
      if (
        await queryOne(
          `SELECT 1 AS ok FROM MF_ML WHERE ML_NO = @ml_no AND MLID='ML' AND ML_ID='1'`,
          { ml_no: nstr(ml_no, 20) }
        )
      ) {
        return res.status(409).json({ error: '单号已存在' });
      }
      const headQty = Number(head.qty) || 0;
      const mlDd = head.ml_dd || new Date().toISOString().slice(0, 10);
      const normalized = [];
      for (let i = 0; i < lines.length; i++) {
        const ln = calcMlLine({ ...lines[i], itm: i + 1, ml_no, mo_no: head.mo_no }, headQty);
        ln.qty_wh = await loadStockQty(ln.prd_no, ln.wh || head.wh_mtl);
        normalized.push(ln);
      }

      await withTransaction(async (tx) => {
        const creator = billUserId(req);
        await tx.exec(
          `INSERT INTO MF_ML (MLID, ML_NO, ML_DD, MO_NO, MRP_NO, PRD_NAME, PRD_MARK, UNIT, QTY,
           WH_MTL, DEP, BIL_TYPE, ID_NO, BAT_NO, USR_NO, REM, ML_ID, BIL_ID, BIL_NO${creator ? ', USR, SYS_DATE' : ''})
           VALUES ('ML', @ml_no, @ml_dd, @mo_no, @mrp_no, @prd_name, @prd_mark, @unit, @qty,
           @wh_mtl, @dep, @bil_type, @id_no, @bat_no, @usr_no, @rem, '1', @bil_id, @bil_no${creator ? ', @usr, GETDATE()' : ''})`,
          { ...mfMlHeadParams(ml_no, { ...head, mlid: 'ML', ml_id: '1' }), ...(creator ? { usr: creator } : {}) }
        );
        for (const ln of normalized) {
          await insertTfMlLine(tx, ml_no, mlDd, ln);
        }
      });

      await saveBillExtFields('MrpAG', { head: { ...head, ml_no, mlid: 'ML', ml_id: '1' }, lines: normalized });

      const saved = await loadMfMlHead(ml_no);
      const rawLines = await loadTfMlLines(ml_no, rowToTfMl);
      res.status(201).json(await mergeBillExtFields('MrpAG', rowToMfMl(saved), rawLines));
    } catch (e) {
      console.error('[material-issues/create]', e);
      if (isExtFieldError(e)) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: '新增生产领料失败' });
    }
  });

  app.put('/api/material-issues/:mlNo', async (req, res) => {
    try {
      const existing = await queryOne(
        `SELECT * FROM MF_ML WHERE ML_NO = @ml_no AND MLID='ML' AND ML_ID='1'`,
        { ml_no: nstr(req.params.mlNo, 20) }
      );
      if (!existing) return res.status(404).json({ error: `${label}不存在` });
      if (isBillAudited(existing)) return res.status(409).json({ error: '已审核单据不可修改' });
      const { head, lines } = req.body;
      if (!lines?.length) return res.status(400).json({ error: '表身至少一行' });

      const headQty = Number(head?.qty ?? existing.QTY) || 0;
      const mlDd = head?.ml_dd || existing.ML_DD;
      const normalized = [];
      for (let i = 0; i < lines.length; i++) {
        const ln = calcMlLine(
          { ...lines[i], itm: i + 1, ml_no: req.params.mlNo, mo_no: head?.mo_no ?? existing.MO_NO },
          headQty
        );
        ln.qty_wh = await loadStockQty(ln.prd_no, ln.wh || head?.wh_mtl);
        normalized.push(ln);
      }
      const mergedHead = { ...existing, ...head, ml_no: req.params.mlNo };

      await withTransaction(async (tx) => {
        await tx.exec(
          `UPDATE MF_ML SET ML_DD=@ml_dd, MO_NO=@mo_no, MRP_NO=@mrp_no, PRD_NAME=@prd_name,
           PRD_MARK=@prd_mark, UNIT=@unit, QTY=@qty, WH_MTL=@wh_mtl, DEP=@dep, BIL_TYPE=@bil_type,
           ID_NO=@id_no, BAT_NO=@bat_no, USR_NO=@usr_no, REM=@rem, BIL_ID=@bil_id, BIL_NO=@bil_no
           WHERE ML_NO=@ml_no AND MLID='ML' AND ML_ID='1'`,
          mfMlHeadParams(req.params.mlNo, mergedHead)
        );
        await tx.exec('DELETE FROM TF_ML WHERE ML_NO = @ml_no', { ml_no: nstr(req.params.mlNo, 20) });
        for (const ln of normalized) {
          await insertTfMlLine(tx, req.params.mlNo, mlDd, ln);
        }
      });
      await saveBillExtFields('MrpAG', { head: mergedHead, lines: normalized });
      res.json({ ok: true });
    } catch (e) {
      console.error('[material-issues/update]', e);
      if (isExtFieldError(e)) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: '修改生产领料失败' });
    }
  });

  app.delete('/api/material-issues/:mlNo', async (req, res) => {
    try {
      const existing = await queryOne(
        `SELECT CHK_MAN FROM MF_ML WHERE ML_NO = @ml_no AND MLID='ML' AND ML_ID='1'`,
        { ml_no: nstr(req.params.mlNo, 20) }
      );
      if (!existing) return res.status(404).json({ error: `${label}不存在` });
      if (isBillAudited(existing)) return res.status(409).json({ error: '已审核单据不能删除' });
      await withTransaction(async (tx) => {
        await tx.exec('DELETE FROM TF_ML WHERE ML_NO = @ml_no', { ml_no: nstr(req.params.mlNo, 20) });
        await tx.exec(
          `DELETE FROM MF_ML WHERE ML_NO = @ml_no AND MLID='ML' AND ML_ID='1'`,
          { ml_no: nstr(req.params.mlNo, 20) }
        );
      });
      res.json({ ok: true });
    } catch (e) {
      console.error('[material-issues/delete]', e);
      res.status(500).json({ error: '删除生产领料失败' });
    }
  });

  app.post('/api/material-issues/:mlNo/audit', async (req, res) => {
    const usrId = billUserId(req);
    if (!usrId) return res.status(401).json({ error: '请先登录' });
    try {
      const mlNo = req.params.mlNo;
      const existing = await queryOne(
        `SELECT CHK_MAN FROM MF_ML WHERE ML_NO = @ml_no AND MLID='ML' AND ML_ID='1'`,
        { ml_no: nstr(mlNo, 20) }
      );
      if (!existing) return res.status(404).json({ error: `${label}不存在` });
      if (isBillAudited(existing)) return res.status(409).json({ error: '已审核' });
      await withTransaction(async (tx) => {
        await auditBillHead(tx, 'MF_ML', "ML_NO = @ml_no AND MLID='ML' AND ML_ID='1'", {
          ml_no: nstr(mlNo, 20),
        }, usrId);
        await applyMlWriteback(tx, mlNo, 1);
      });
      const head = await loadMfMlHead(mlNo);
      res.json({ ok: true, ...billAuditFields(head) });
    } catch (e) {
      console.error('[material-issues/audit]', e);
      res.status(500).json({ error: '审核失败' });
    }
  });

  app.post('/api/material-issues/:mlNo/unaudit', async (req, res) => {
    try {
      const mlNo = req.params.mlNo;
      const existing = await queryOne(
        `SELECT CHK_MAN FROM MF_ML WHERE ML_NO = @ml_no AND MLID='ML' AND ML_ID='1'`,
        { ml_no: nstr(mlNo, 20) }
      );
      if (!existing) return res.status(404).json({ error: `${label}不存在` });
      if (!isBillAudited(existing)) return res.status(409).json({ error: '未审核' });
      await withTransaction(async (tx) => {
        await applyMlWriteback(tx, mlNo, -1);
        await unauditBillHead(tx, 'MF_ML', "ML_NO = @ml_no AND MLID='ML' AND ML_ID='1'", {
          ml_no: nstr(mlNo, 20),
        });
      });
      res.json({ ok: true, usr: '', sys_date: '', chk_man: '', cls_date: '' });
    } catch (e) {
      console.error('[material-issues/unaudit]', e);
      res.status(500).json({ error: '反审核失败' });
    }
  });
}

module.exports = { registerMlOrdersRoutes };
