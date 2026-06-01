const { queryAll, queryOne, withTransaction, nstr, ndate, nfloat, nint } = require('./repositories/mssqlHelpers');
const { nextMmNo } = require('./repositories/mssqlNextNo');
const { saveBillExtFields, mergeBillExtFields, isExtFieldError } = require('./billExtFieldHook');
const {
  BILL_AUDIT_SELECT,
  billUserId,
  billAuditFields,
  isBillAudited,
  auditBillHead,
  unauditBillHead,
} = require('./billAuditMeta');

const MM_SCOPE = "h.MM_ID = 'MM'";

const MF_MM0_HEAD_SEL = `
  SELECT h.MM_NO AS mm_no, CONVERT(varchar(10), h.MM_DD, 23) AS mm_dd,
    h.MO_NO AS mo_no, h.DEP AS dep, h.BIL_TYPE AS bil_type,
    h.BIL_ID AS bil_id, h.BIL_NO AS bil_no, h.FIN_ID AS fin_id,
    h.USR_NO AS usr_no, CAST(h.REM AS nvarchar(500)) AS rem, h.MM_ID AS mm_id,
    h.CANCEL_ID AS cancel_id,
    CAST(d.NAME AS nvarchar(100)) AS dep_name,
    CAST(s.NAME AS nvarchar(100)) AS usr_name,
    ${BILL_AUDIT_SELECT.replace(/m\./g, 'h.')}
  FROM MF_MM0 h
  LEFT JOIN DEPT d ON d.DEP = h.DEP
  LEFT JOIN SALM s ON s.SAL_NO = h.USR_NO`;

const TF_MM0_LINE_SEL = `
  SELECT t.MM_NO AS mm_no, CONVERT(varchar(10), t.MM_DD, 23) AS mm_dd,
    t.ITM AS itm, t.MO_NO AS mo_no, t.PRD_NO AS prd_no,
    CAST(t.PRD_NAME AS nvarchar(200)) AS prd_name, t.PRD_MARK AS prd_mark,
    t.UNIT AS unit, t.WH AS wh, t.BAT_NO AS bat_no, t.QTY AS qty, t.QTY1 AS qty1,
    CONVERT(varchar(10), t.VALID_DD, 23) AS valid_dd, t.FREE_ID AS free_id,
    t.SO_NO AS so_no, CAST(t.REM AS nvarchar(200)) AS rem
  FROM TF_MM0 t`;

async function loadMfMmHead(mmNo) {
  return queryOne(`${MF_MM0_HEAD_SEL} WHERE h.MM_NO = @mm_no AND ${MM_SCOPE}`, {
    mm_no: nstr(mmNo, 20),
  });
}

async function loadTfMmLines(mmNo, rowToTfMm) {
  return (
    await queryAll(`${TF_MM0_LINE_SEL} WHERE t.MM_NO = @mm_no ORDER BY t.ITM`, {
      mm_no: nstr(mmNo, 20),
    })
  ).map(rowToTfMm);
}

function mfMmHeadParams(mmNo, head) {
  return {
    mm_no: nstr(mmNo, 20),
    mm_dd: ndate(head.mm_dd || new Date().toISOString().slice(0, 10)),
    mo_no: nstr(head.mo_no, 25),
    dep: nstr(head.dep, 8),
    bil_type: nstr(head.bil_type, 2),
    bil_id: nstr(head.bil_id, 2),
    bil_no: nstr(head.bil_no, 25),
    fin_id: nstr(head.fin_id || 'Y', 1),
    usr_no: nstr(head.usr_no, 12),
    rem: nstr(head.rem, 500),
    mm_id: nstr(head.mm_id || 'MM', 2),
  };
}

async function insertTfMmLine(tx, mmNo, mmDd, ln) {
  await tx.exec(
    `INSERT INTO TF_MM0 (MM_ID, MM_NO, ITM, MM_DD, MO_NO, PRD_NO, PRD_NAME, PRD_MARK, UNIT,
     WH, BAT_NO, QTY, QTY1, VALID_DD, FREE_ID, SO_NO, REM)
     VALUES ('MM', @mm_no, @itm, @mm_dd, @mo_no, @prd_no, @prd_name, @prd_mark, @unit,
     @wh, @bat_no, @qty, @qty1, @valid_dd, @free_id, @so_no, @rem)`,
    {
      mm_no: nstr(mmNo, 20),
      mm_dd: ndate(mmDd || new Date().toISOString().slice(0, 10)),
      itm: nint(ln.itm),
      mo_no: nstr(ln.mo_no, 20),
      prd_no: nstr(ln.prd_no, 30),
      prd_name: nstr(ln.prd_name, 200),
      prd_mark: nstr(ln.prd_mark, 100),
      unit: nstr(ln.unit, 10),
      wh: nstr(ln.wh, 12),
      bat_no: nstr(ln.bat_no, 40),
      qty: nfloat(ln.qty ?? 0),
      qty1: nfloat(ln.qty1 ?? 0),
      valid_dd: ndate(ln.valid_dd),
      free_id: nstr(ln.free_id, 1),
      so_no: nstr(ln.so_no, 20),
      rem: nstr(ln.rem, 200),
    }
  );
}

async function loadMmLinesRaw(mmNo, runner = queryAll) {
  return runner(
    `SELECT MO_NO AS mo_no, PRD_NO AS prd_no, WH AS wh, BAT_NO AS bat_no, QTY AS qty
     FROM TF_MM0 WHERE MM_NO = @mm_no`,
    { mm_no: nstr(mmNo, 20) }
  );
}

function aggregateByMo(lines, sign = 1) {
  const byMo = {};
  for (const ln of lines) {
    const delta = (Number(ln.qty) || 0) * sign;
    if (Math.abs(delta) < 0.0001) continue;
    if (ln.mo_no) {
      byMo[ln.mo_no] = (byMo[ln.mo_no] || 0) + delta;
    }
  }
  return byMo;
}

async function buildOverDepositWarnings(byMo) {
  const warnings = [];
  for (const [moNo, addQty] of Object.entries(byMo)) {
    if (Math.abs(addQty) < 0.0001) continue;
    const mo = await queryOne(
      `SELECT MO_NO AS mo_no, QTY AS qty, QTY_FIN AS qty_fin FROM MF_MO WHERE MO_NO = @mo_no`,
      { mo_no: nstr(moNo, 20) }
    );
    if (!mo) continue;
    const moQty = Number(mo.qty) || 0;
    const qtyFin = Number(mo.qty_fin) || 0;
    const afterFin = Math.round((qtyFin + addQty) * 100) / 100;
    if (afterFin > moQty + 0.0001) {
      warnings.push({
        mo_no: moNo,
        mo_qty: moQty,
        qty_fin_before: qtyFin,
        qty_add: addQty,
        qty_fin_after: afterFin,
        over_qty: Math.round((afterFin - moQty) * 100) / 100,
      });
    }
  }
  return warnings;
}

async function applyMmWriteback(tx, mmNo, sign) {
  const head = await tx.queryOne(
    `SELECT FIN_ID AS fin_id FROM MF_MM0 WHERE MM_NO = @mm_no AND MM_ID='MM'`,
    { mm_no: nstr(mmNo, 20) }
  );
  const affectFin = String(head?.fin_id || 'Y').toUpperCase() === 'Y';
  const lines = await loadMmLinesRaw(mmNo, (sql, inputs) => tx.queryAll(sql, inputs));
  const byMo = aggregateByMo(lines, sign);

  if (affectFin) {
    for (const [moNo, delta] of Object.entries(byMo)) {
      await tx.exec(
        `UPDATE MF_MO SET QTY_FIN = COALESCE(QTY_FIN, 0) + @delta WHERE MO_NO = @mo_no`,
        { delta: nfloat(delta), mo_no: nstr(moNo, 20) }
      );
    }
  }

  for (const ln of lines) {
    const delta = (Number(ln.qty) || 0) * sign;
    if (Math.abs(delta) < 0.0001 || !ln.prd_no || !ln.wh) continue;
    const exists = await tx.queryOne(
      `SELECT 1 AS ok FROM PRDT1 WHERE PRD_NO = @prd_no AND WH = @wh`,
      { prd_no: nstr(ln.prd_no, 30), wh: nstr(ln.wh, 12) }
    );
    if (exists) {
      await tx.exec(
        `UPDATE PRDT1 SET QTY = COALESCE(QTY, 0) + @delta WHERE PRD_NO = @prd_no AND WH = @wh`,
        { delta: nfloat(delta), prd_no: nstr(ln.prd_no, 30), wh: nstr(ln.wh, 12) }
      );
    }
  }
}

/** MF_MM0 / TF_MM0 缴库单 (MrpAFC) */
function registerMmOrdersRoutes(app, deps) {
  const { rowToMfMm, rowToTfMm, calcMmLine } = deps;
  const label = '缴库单';

  app.get('/api/warehouse-deposits/next-no', async (_req, res) => {
    try {
      res.json({ mm_no: await nextMmNo() });
    } catch (e) {
      console.error('[warehouse-deposits/next-no]', e);
      res.status(500).json({ error: '获取单号失败' });
    }
  });

  app.post('/api/warehouse-deposits/check-over', async (req, res) => {
    try {
      const { lines, mm_no: mmNo } = req.body || {};
      const byMo = {};
      for (const ln of lines || []) {
        const moNo = ln.mo_no;
        if (!moNo) continue;
        byMo[moNo] = (byMo[moNo] || 0) + (Number(ln.qty) || 0);
      }
      const warnings = await buildOverDepositWarnings(byMo);
      res.json({ warnings });
    } catch (e) {
      console.error('[warehouse-deposits/check-over]', e);
      res.status(500).json({ error: '超缴检查失败' });
    }
  });

  app.get('/api/warehouse-deposits', async (req, res) => {
    const { q, limit = '50', date_from, date_to } = req.query;
    try {
      const top = Math.min(parseInt(limit, 10) || 50, 200);
      let sqlText = `${MF_MM0_HEAD_SEL.replace('SELECT', `SELECT TOP (${top})`)} WHERE ${MM_SCOPE}`;
      const inputs = {};
      if (q) {
        sqlText += ' AND (h.MM_NO LIKE @q OR h.MO_NO LIKE @q OR h.REM LIKE @q)';
        inputs.q = nstr(`%${q}%`, 200);
      }
      if (date_from) {
        sqlText += ' AND h.MM_DD >= @date_from';
        inputs.date_from = ndate(String(date_from));
      }
      if (date_to) {
        sqlText += ' AND h.MM_DD <= @date_to';
        inputs.date_to = ndate(String(date_to));
      }
      sqlText += ' ORDER BY h.MM_DD DESC, h.MM_NO DESC';
      res.json((await queryAll(sqlText, inputs)).map(rowToMfMm));
    } catch (e) {
      console.error('[warehouse-deposits/list]', e);
      res.status(500).json({ error: '读取缴库单列表失败' });
    }
  });

  app.get('/api/warehouse-deposits/:mmNo', async (req, res) => {
    try {
      const head = await loadMfMmHead(req.params.mmNo);
      if (!head) return res.status(404).json({ error: `${label}不存在` });
      const lines = await loadTfMmLines(req.params.mmNo, rowToTfMm);
      res.json(await mergeBillExtFields('MrpAFC', rowToMfMm(head), lines));
    } catch (e) {
      console.error('[warehouse-deposits/get]', e);
      res.status(500).json({ error: '读取缴库单失败' });
    }
  });

  app.post('/api/warehouse-deposits', async (req, res) => {
    const { head, lines } = req.body;
    if (!lines?.length) return res.status(400).json({ error: '表身至少一行' });
    const missingMo = lines.some((ln) => !ln.mo_no?.trim());
    if (missingMo) return res.status(400).json({ error: '表身每行须有制令单号' });
    try {
      const mm_no = head.mm_no || (await nextMmNo());
      if (await queryOne(`SELECT 1 AS ok FROM MF_MM0 WHERE MM_NO = @mm_no AND MM_ID='MM'`, { mm_no: nstr(mm_no, 20) })) {
        return res.status(409).json({ error: '单号已存在' });
      }
      const mmDd = head.mm_dd || new Date().toISOString().slice(0, 10);
      const headMo = head.mo_no || lines[0]?.mo_no || '';
      const normalized = lines.map((ln, i) =>
        calcMmLine({ ...ln, itm: i + 1, mm_no, mm_dd: mmDd, mo_no: ln.mo_no || headMo })
      );

      await withTransaction(async (tx) => {
        const creator = billUserId(req);
        await tx.exec(
          `INSERT INTO MF_MM0 (MM_ID, MM_NO, MM_DD, MO_NO, DEP, BIL_TYPE, BIL_ID, BIL_NO, FIN_ID,
           USR_NO, REM${creator ? ', USR, SYS_DATE' : ''})
           VALUES ('MM', @mm_no, @mm_dd, @mo_no, @dep, @bil_type, @bil_id, @bil_no, @fin_id,
           @usr_no, @rem${creator ? ', @usr, GETDATE()' : ''})`,
          {
            ...mfMmHeadParams(mm_no, { ...head, mo_no: headMo, mm_id: 'MM', fin_id: 'Y' }),
            ...(creator ? { usr: creator } : {}),
          }
        );
        for (const ln of normalized) {
          await insertTfMmLine(tx, mm_no, mmDd, ln);
        }
      });

      await saveBillExtFields('MrpAFC', { head: { ...head, mm_no, mo_no: headMo, mm_id: 'MM', fin_id: 'Y' }, lines: normalized });

      const saved = await loadMfMmHead(mm_no);
      const rawLines = await loadTfMmLines(mm_no, rowToTfMm);
      res.status(201).json(await mergeBillExtFields('MrpAFC', rowToMfMm(saved), rawLines));
    } catch (e) {
      console.error('[warehouse-deposits/create]', e);
      if (isExtFieldError(e)) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: '新增缴库单失败' });
    }
  });

  app.put('/api/warehouse-deposits/:mmNo', async (req, res) => {
    try {
      const existing = await queryOne(`SELECT * FROM MF_MM0 WHERE MM_NO = @mm_no AND MM_ID='MM'`, {
        mm_no: nstr(req.params.mmNo, 20),
      });
      if (!existing) return res.status(404).json({ error: `${label}不存在` });
      if (isBillAudited(existing)) return res.status(409).json({ error: '已审核单据不可修改' });
      const { head, lines } = req.body;
      if (!lines?.length) return res.status(400).json({ error: '表身至少一行' });

      const mmDd = head?.mm_dd || existing.MM_DD;
      const headMo = head?.mo_no || existing.MO_NO || lines[0]?.mo_no || '';
      const normalized = lines.map((ln, i) =>
        calcMmLine({ ...ln, itm: i + 1, mm_no: req.params.mmNo, mm_dd: mmDd, mo_no: ln.mo_no || headMo })
      );
      const mergedHead = { ...existing, ...head, mm_no: req.params.mmNo, mo_no: headMo };

      await withTransaction(async (tx) => {
        await tx.exec(
          `UPDATE MF_MM0 SET MM_DD=@mm_dd, MO_NO=@mo_no, DEP=@dep, BIL_TYPE=@bil_type,
           BIL_ID=@bil_id, BIL_NO=@bil_no, FIN_ID=@fin_id, USR_NO=@usr_no, REM=@rem
           WHERE MM_NO=@mm_no AND MM_ID='MM'`,
          mfMmHeadParams(req.params.mmNo, mergedHead)
        );
        await tx.exec('DELETE FROM TF_MM0 WHERE MM_NO = @mm_no', { mm_no: nstr(req.params.mmNo, 20) });
        for (const ln of normalized) {
          await insertTfMmLine(tx, req.params.mmNo, mmDd, ln);
        }
      });
      await saveBillExtFields('MrpAFC', { head: mergedHead, lines: normalized });
      res.json({ ok: true });
    } catch (e) {
      console.error('[warehouse-deposits/update]', e);
      if (isExtFieldError(e)) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: '修改缴库单失败' });
    }
  });

  app.delete('/api/warehouse-deposits/:mmNo', async (req, res) => {
    try {
      const existing = await queryOne(`SELECT CHK_MAN FROM MF_MM0 WHERE MM_NO = @mm_no AND MM_ID='MM'`, {
        mm_no: nstr(req.params.mmNo, 20),
      });
      if (!existing) return res.status(404).json({ error: `${label}不存在` });
      if (isBillAudited(existing)) return res.status(409).json({ error: '已审核单据不能删除' });
      await withTransaction(async (tx) => {
        await tx.exec('DELETE FROM TF_MM0 WHERE MM_NO = @mm_no', { mm_no: nstr(req.params.mmNo, 20) });
        await tx.exec(`DELETE FROM MF_MM0 WHERE MM_NO = @mm_no AND MM_ID='MM'`, {
          mm_no: nstr(req.params.mmNo, 20),
        });
      });
      res.json({ ok: true });
    } catch (e) {
      console.error('[warehouse-deposits/delete]', e);
      res.status(500).json({ error: '删除缴库单失败' });
    }
  });

  app.post('/api/warehouse-deposits/:mmNo/audit', async (req, res) => {
    const usrId = billUserId(req);
    if (!usrId) return res.status(401).json({ error: '请先登录' });
    try {
      const mmNo = req.params.mmNo;
      const existing = await queryOne(`SELECT CHK_MAN FROM MF_MM0 WHERE MM_NO = @mm_no AND MM_ID='MM'`, {
        mm_no: nstr(mmNo, 20),
      });
      if (!existing) return res.status(404).json({ error: `${label}不存在` });
      if (isBillAudited(existing)) return res.status(409).json({ error: '已审核' });

      const lines = await loadMmLinesRaw(mmNo);
      const byMo = aggregateByMo(lines, 1);
      const warnings = await buildOverDepositWarnings(byMo);

      await withTransaction(async (tx) => {
        await auditBillHead(tx, 'MF_MM0', "MM_NO = @mm_no AND MM_ID='MM'", { mm_no: nstr(mmNo, 20) }, usrId);
        await applyMmWriteback(tx, mmNo, 1);
      });
      const head = await loadMfMmHead(mmNo);
      res.json({ ok: true, warnings, ...billAuditFields(head) });
    } catch (e) {
      console.error('[warehouse-deposits/audit]', e);
      res.status(500).json({ error: '审核失败' });
    }
  });

  app.post('/api/warehouse-deposits/:mmNo/unaudit', async (req, res) => {
    try {
      const mmNo = req.params.mmNo;
      const existing = await queryOne(`SELECT CHK_MAN FROM MF_MM0 WHERE MM_NO = @mm_no AND MM_ID='MM'`, {
        mm_no: nstr(mmNo, 20),
      });
      if (!existing) return res.status(404).json({ error: `${label}不存在` });
      if (!isBillAudited(existing)) return res.status(409).json({ error: '未审核' });
      await withTransaction(async (tx) => {
        await applyMmWriteback(tx, mmNo, -1);
        await unauditBillHead(tx, 'MF_MM0', "MM_NO = @mm_no AND MM_ID='MM'", { mm_no: nstr(mmNo, 20) });
      });
      res.json({ ok: true, usr: '', sys_date: '', chk_man: '', cls_date: '' });
    } catch (e) {
      console.error('[warehouse-deposits/unaudit]', e);
      res.status(500).json({ error: '反审核失败' });
    }
  });
}

module.exports = { registerMmOrdersRoutes };
