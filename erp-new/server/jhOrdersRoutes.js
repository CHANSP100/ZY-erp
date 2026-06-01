const { queryAll, queryOne, withTransaction, nstr, ndate, nfloat, nint } = require('./repositories/mssqlHelpers');
const { nextJhNo } = require('./repositories/mssqlNextNo');
const { saveBillExtFields, mergeBillExtFields, isExtFieldError } = require('./billExtFieldHook');
const {
  BILL_AUDIT_SELECT,
  billUserId,
  billAuditFields,
  isBillAudited,
  auditBillHead,
  unauditBillHead,
} = require('./billAuditMeta');

const MF_JH_HEAD_SEL = `
  SELECT h.JH_NO AS jh_no, CONVERT(varchar(10), h.JH_DD, 23) AS jh_dd,
    CONVERT(varchar(10), h.EST_DD, 23) AS est_dd,
    h.DEP AS dep, h.SAL_NO AS sal_no, h.SO_NO AS so_no,
    h.CUS_NO AS cus_no, h.CUS_OS_NO AS cus_os_no, h.BIL_TYPE AS bil_type,
    h.BAT_NO AS bat_no, h.CLOSE_ID AS close_id, h.CANCEL_ID AS cancel_id,
    CAST(h.REM AS nvarchar(500)) AS rem,
    CAST(d.NAME AS nvarchar(100)) AS dep_name,
    CAST(s.NAME AS nvarchar(100)) AS sal_name,
    CAST(c.NAME AS nvarchar(200)) AS cus_name,
    ${BILL_AUDIT_SELECT.replace(/m\./g, 'h.')}
  FROM MF_JH h
  LEFT JOIN DEPT d ON d.DEP = h.DEP
  LEFT JOIN SALM s ON s.SAL_NO = h.SAL_NO
  LEFT JOIN CUST c ON c.CUS_NO = h.CUS_NO`;

const TF_JH_LINE_SEL = `
  SELECT t.JH_NO AS jh_no, t.ITM AS itm, t.PRD_NO AS prd_no,
    CAST(t.PRD_NAME AS nvarchar(200)) AS prd_name, t.PRD_MARK AS prd_mark,
    t.WH AS wh, t.UNIT AS unit, t.QTY AS qty,
    CONVERT(varchar(10), t.EST_DD, 23) AS est_dd, t.BAT_NO AS bat_no,
    t.ID_NO AS id_no, t.OS_ID AS os_id, t.OS_NO AS os_no, t.EST_ITM AS est_itm,
    t.CUS_OS_NO AS cus_os_no, t.SUP_PRD_NO AS sup_prd_no,
    t.MP_CLS_ID AS mp_cls_id, CAST(t.REM AS nvarchar(200)) AS rem,
    t.PRE_ITM AS pre_itm
  FROM TF_JH t`;

const MF_POS_HEAD_FOR_JH = `
  SELECT m.OS_NO AS os_no, CONVERT(varchar(10), m.OS_DD, 23) AS os_dd,
    m.CUS_NO AS cus_no, m.SAL_NO AS sal_no, m.USE_DEP AS use_dep,
    m.CUS_OS_NO AS cus_os_no, m.BIL_TYPE AS bil_type,
    CONVERT(varchar(10), m.EST_DD, 23) AS est_dd,
    CAST(c.NAME AS nvarchar(200)) AS cus_name
  FROM MF_POS m
  LEFT JOIN CUST c ON c.CUS_NO = m.CUS_NO`;

const TF_POS_FOR_JH = `
  SELECT t.ITM AS itm, t.PRD_NO AS prd_no, CAST(t.PRD_NAME AS nvarchar(200)) AS prd_name,
    t.PRD_MARK AS prd_mark, t.WH AS wh, t.UT AS ut, t.QTY AS qty, t.QTY_PS AS qty_ps,
    CONVERT(varchar(10), t.EST_DD, 23) AS est_dd, t.SUP_PRD_NO AS sup_prd_no,
    CAST(t.REM AS nvarchar(200)) AS rem, t.JH_ID AS jh_id
  FROM TF_POS t`;

async function loadMfJhHead(jhNo) {
  return queryOne(`${MF_JH_HEAD_SEL} WHERE h.JH_NO = @jh_no`, { jh_no: nstr(jhNo, 20) });
}

async function loadTfJhLines(jhNo, rowToTfJh) {
  return (
    await queryAll(`${TF_JH_LINE_SEL} WHERE t.JH_NO = @jh_no ORDER BY t.ITM`, {
      jh_no: nstr(jhNo, 20),
    })
  ).map(rowToTfJh);
}

function mfJhHeadParams(jhNo, head) {
  return {
    jh_no: nstr(jhNo, 20),
    jh_dd: ndate(head.jh_dd || new Date().toISOString().slice(0, 10)),
    est_dd: ndate(head.est_dd),
    dep: nstr(head.dep, 8),
    sal_no: nstr(head.sal_no, 12),
    so_no: nstr(head.so_no, 25),
    cus_no: nstr(head.cus_no, 12),
    cus_os_no: nstr(head.cus_os_no, 30),
    bil_type: nstr(head.bil_type, 2),
    bat_no: nstr(head.bat_no, 40),
    close_id: nstr(head.close_id, 1),
    rem: nstr(head.rem, 500),
    cancel_id: nstr(head.cancel_id, 1),
  };
}

async function insertTfJhLine(tx, jhNo, jhDd, ln, preItm) {
  await tx.exec(
    `INSERT INTO TF_JH (JH_NO, ITM, JH_DD, PRD_NO, PRD_MARK, PRD_NAME, WH, UNIT, QTY, EST_DD,
     BAT_NO, ID_NO, OS_ID, OS_NO, EST_ITM, CUS_OS_NO, SUP_PRD_NO, MP_CLS_ID, REM, PRE_ITM)
     VALUES (@jh_no, @itm, @jh_dd, @prd_no, @prd_mark, @prd_name, @wh, @unit, @qty, @est_dd,
     @bat_no, @id_no, @os_id, @os_no, @est_itm, @cus_os_no, @sup_prd_no, @mp_cls_id, @rem, @pre_itm)`,
    {
      jh_no: nstr(jhNo, 20),
      itm: nint(ln.itm),
      jh_dd: ndate(jhDd || new Date().toISOString().slice(0, 10)),
      prd_no: nstr(ln.prd_no, 30),
      prd_mark: nstr(ln.prd_mark, 40),
      prd_name: nstr(ln.prd_name, 200),
      wh: nstr(ln.wh, 12),
      unit: nstr(ln.unit, 10),
      qty: nfloat(ln.qty ?? 0),
      est_dd: ndate(ln.est_dd),
      bat_no: nstr(ln.bat_no, 40),
      id_no: nstr(ln.id_no, 38),
      os_id: nstr(ln.os_id, 2),
      os_no: nstr(ln.os_no, 20),
      est_itm: nint(ln.est_itm ?? 0),
      cus_os_no: nstr(ln.cus_os_no, 30),
      sup_prd_no: nstr(ln.sup_prd_no, 40),
      mp_cls_id: nstr(ln.mp_cls_id, 1),
      rem: nstr(ln.rem, 200),
      pre_itm: nint(preItm ?? ln.pre_itm ?? ln.itm),
    }
  );
}

async function applyJhSoMark(tx, jhNo, mark) {
  const lines = await tx.queryAll(
    `SELECT OS_NO AS os_no, EST_ITM AS est_itm FROM TF_JH
     WHERE JH_NO = @jh_no AND OS_NO IS NOT NULL AND OS_NO <> '' AND EST_ITM IS NOT NULL`,
    { jh_no: nstr(jhNo, 20) }
  );
  for (const ln of lines) {
    await tx.exec(
      `UPDATE TF_POS SET JH_ID = @mark WHERE OS_ID = 'SO' AND OS_NO = @os_no AND ITM = @itm`,
      {
        mark: mark === 'clear' ? null : nstr('T', 1),
        os_no: nstr(ln.os_no, 20),
        itm: nint(ln.est_itm),
      }
    );
  }
}

/** MF_JH / TF_JH 生产计划 (MrpAA) */
function registerJhOrdersRoutes(app, deps) {
  const { rowToMfJh, rowToTfJh, normalizeJhLine } = deps;
  const label = '生产计划';

  app.get('/api/production-plans/next-no', async (_req, res) => {
    try {
      res.json({ jh_no: await nextJhNo() });
    } catch (e) {
      console.error('[production-plans/next-no]', e);
      res.status(500).json({ error: '获取单号失败' });
    }
  });

  app.get('/api/production-plans', async (req, res) => {
    const { q, limit = '50', date_from, date_to } = req.query;
    try {
      const top = Math.min(parseInt(limit, 10) || 50, 200);
      let sqlText = `${MF_JH_HEAD_SEL.replace('SELECT', `SELECT TOP (${top})`)} WHERE 1=1`;
      const inputs = {};
      if (q) {
        sqlText +=
          ' AND (h.JH_NO LIKE @q OR h.SO_NO LIKE @q OR h.CUS_NO LIKE @q OR CAST(c.NAME AS nvarchar(200)) LIKE @q)';
        inputs.q = nstr(`%${q}%`, 200);
      }
      if (date_from) {
        sqlText += ' AND h.JH_DD >= @date_from';
        inputs.date_from = ndate(String(date_from));
      }
      if (date_to) {
        sqlText += ' AND h.JH_DD <= @date_to';
        inputs.date_to = ndate(String(date_to));
      }
      sqlText += ' ORDER BY h.JH_DD DESC, h.JH_NO DESC';
      res.json((await queryAll(sqlText, inputs)).map(rowToMfJh));
    } catch (e) {
      console.error('[production-plans/list]', e);
      res.status(500).json({ error: '读取生产计划列表失败' });
    }
  });

  app.get('/api/production-plans/open-sales-orders', async (req, res) => {
    const { limit = '100' } = req.query;
    try {
      const top = Math.min(parseInt(limit, 10) || 100, 200);
      const sqlText = `${MF_POS_HEAD_FOR_JH.replace('SELECT', `SELECT TOP (${top})`)}
        WHERE m.OS_ID = 'SO' AND m.CHK_MAN IS NOT NULL AND m.CHK_MAN <> ''
          AND (m.CANCEL_ID IS NULL OR m.CANCEL_ID <> 'T')
        ORDER BY m.OS_DD DESC, m.OS_NO DESC`;
      res.json(await queryAll(sqlText));
    } catch (e) {
      console.error('[production-plans/open-sales-orders]', e);
      res.status(500).json({ error: '读取可转入受订单失败' });
    }
  });

  app.get('/api/production-plans/transfer-from-so/:osNo', async (req, res) => {
    try {
      const osNo = req.params.osNo;
      const head = await queryOne(
        `${MF_POS_HEAD_FOR_JH} WHERE m.OS_ID = 'SO' AND m.OS_NO = @os_no`,
        { os_no: nstr(osNo, 20) }
      );
      if (!head) return res.status(404).json({ error: '受订单不存在' });
      if (!isBillAudited(head)) return res.status(409).json({ error: '受订单须已审核方可转入' });

      const rawLines = await queryAll(
        `${TF_POS_FOR_JH} WHERE t.OS_ID = 'SO' AND t.OS_NO = @os_no
         AND (t.JH_ID IS NULL OR t.JH_ID = '' OR t.JH_ID <> 'T')
         ORDER BY t.ITM`,
        { os_no: nstr(osNo, 20) }
      );

      const lines = rawLines
        .map((row) => {
          const qty = Number(row.qty) || 0;
          const qtyPs = Number(row.qty_ps) || 0;
          const openQty = Math.max(0, Math.round((qty - qtyPs) * 100) / 100);
          return {
            prd_no: row.prd_no,
            prd_name: row.prd_name,
            prd_mark: row.prd_mark || '',
            wh: row.wh || '',
            unit: row.ut || '',
            qty: openQty > 0.0001 ? openQty : qty,
            est_dd: row.est_dd || head.est_dd,
            sup_prd_no: row.sup_prd_no || '',
            rem: row.rem || '',
            os_id: 'SO',
            os_no: osNo,
            est_itm: row.itm,
            cus_os_no: head.cus_os_no || '',
            mp_cls_id: '',
            bat_no: '',
            id_no: '',
          };
        })
        .filter((ln) => ln.prd_no && Number(ln.qty) > 0.0001);

      res.json({
        head: {
          so_no: osNo,
          cus_no: head.cus_no,
          cus_name: head.cus_name,
          sal_no: head.sal_no,
          dep: head.use_dep,
          cus_os_no: head.cus_os_no,
          bil_type: head.bil_type,
          est_dd: head.est_dd,
        },
        lines,
      });
    } catch (e) {
      console.error('[production-plans/transfer-from-so]', e);
      res.status(500).json({ error: '从受订单转入失败' });
    }
  });

  app.get('/api/production-plans/:jhNo', async (req, res) => {
    try {
      const head = await loadMfJhHead(req.params.jhNo);
      if (!head) return res.status(404).json({ error: `${label}不存在` });
      const lines = await loadTfJhLines(req.params.jhNo, rowToTfJh);
      res.json(await mergeBillExtFields('MrpAA', rowToMfJh(head), lines));
    } catch (e) {
      console.error('[production-plans/get]', e);
      res.status(500).json({ error: '读取生产计划失败' });
    }
  });

  app.post('/api/production-plans', async (req, res) => {
    const { head, lines } = req.body;
    if (!lines?.length) return res.status(400).json({ error: '表身至少一行' });
    try {
      const jh_no = head.jh_no || (await nextJhNo());
      if (await queryOne('SELECT 1 AS ok FROM MF_JH WHERE JH_NO = @jh_no', { jh_no: nstr(jh_no, 20) })) {
        return res.status(409).json({ error: '单号已存在' });
      }
      const jhDd = head.jh_dd || new Date().toISOString().slice(0, 10);
      const normalized = lines.map((ln, i) => normalizeJhLine({ ...ln, itm: i + 1, jh_no }));

      await withTransaction(async (tx) => {
        const creator = billUserId(req);
        await tx.exec(
          `INSERT INTO MF_JH (JH_NO, JH_DD, EST_DD, DEP, SAL_NO, SO_NO, CUS_NO, CUS_OS_NO,
           BIL_TYPE, BAT_NO, CLOSE_ID, REM, CANCEL_ID${creator ? ', USR, SYS_DATE' : ''})
           VALUES (@jh_no, @jh_dd, @est_dd, @dep, @sal_no, @so_no, @cus_no, @cus_os_no,
           @bil_type, @bat_no, @close_id, @rem, @cancel_id${creator ? ', @usr, GETDATE()' : ''})`,
          {
            ...mfJhHeadParams(jh_no, { ...head, cancel_id: head.cancel_id || '' }),
            ...(creator ? { usr: creator } : {}),
          }
        );
        let preSeq = 0;
        for (const ln of normalized) {
          preSeq += 1;
          await insertTfJhLine(tx, jh_no, jhDd, ln, preSeq);
        }
      });

      await saveBillExtFields('MrpAA', { head: { ...head, jh_no }, lines: normalized });

      const saved = await loadMfJhHead(jh_no);
      const rawLines = await loadTfJhLines(jh_no, rowToTfJh);
      res.status(201).json(await mergeBillExtFields('MrpAA', rowToMfJh(saved), rawLines));
    } catch (e) {
      console.error('[production-plans/create]', e);
      if (isExtFieldError(e)) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: '新增生产计划失败' });
    }
  });

  app.put('/api/production-plans/:jhNo', async (req, res) => {
    try {
      const existing = await queryOne('SELECT * FROM MF_JH WHERE JH_NO = @jh_no', {
        jh_no: nstr(req.params.jhNo, 20),
      });
      if (!existing) return res.status(404).json({ error: `${label}不存在` });
      if (isBillAudited(existing)) return res.status(409).json({ error: '已审核单据不可修改' });
      const { head, lines } = req.body;
      if (!lines?.length) return res.status(400).json({ error: '表身至少一行' });

      const jhDd = head?.jh_dd || existing.JH_DD;
      const normalized = lines.map((ln, i) =>
        normalizeJhLine({ ...ln, itm: i + 1, jh_no: req.params.jhNo })
      );
      const mergedHead = { ...existing, ...head, jh_no: req.params.jhNo };

      await withTransaction(async (tx) => {
        await applyJhSoMark(tx, req.params.jhNo, 'clear');
        await tx.exec(
          `UPDATE MF_JH SET JH_DD=@jh_dd, EST_DD=@est_dd, DEP=@dep, SAL_NO=@sal_no, SO_NO=@so_no,
           CUS_NO=@cus_no, CUS_OS_NO=@cus_os_no, BIL_TYPE=@bil_type, BAT_NO=@bat_no,
           CLOSE_ID=@close_id, REM=@rem, CANCEL_ID=@cancel_id
           WHERE JH_NO=@jh_no`,
          mfJhHeadParams(req.params.jhNo, mergedHead)
        );
        await tx.exec('DELETE FROM TF_JH WHERE JH_NO = @jh_no', { jh_no: nstr(req.params.jhNo, 20) });
        let preSeq = 0;
        for (const ln of normalized) {
          preSeq += 1;
          await insertTfJhLine(tx, req.params.jhNo, jhDd, ln, preSeq);
        }
      });
      await saveBillExtFields('MrpAA', { head: mergedHead, lines: normalized });
      res.json({ ok: true });
    } catch (e) {
      console.error('[production-plans/update]', e);
      if (isExtFieldError(e)) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: '修改生产计划失败' });
    }
  });

  app.delete('/api/production-plans/:jhNo', async (req, res) => {
    try {
      const existing = await queryOne('SELECT CHK_MAN FROM MF_JH WHERE JH_NO = @jh_no', {
        jh_no: nstr(req.params.jhNo, 20),
      });
      if (!existing) return res.status(404).json({ error: `${label}不存在` });
      if (isBillAudited(existing)) return res.status(409).json({ error: '已审核单据不能删除' });
      await withTransaction(async (tx) => {
        await applyJhSoMark(tx, req.params.jhNo, 'clear');
        await tx.exec('DELETE FROM TF_JH WHERE JH_NO = @jh_no', { jh_no: nstr(req.params.jhNo, 20) });
        await tx.exec('DELETE FROM MF_JH WHERE JH_NO = @jh_no', { jh_no: nstr(req.params.jhNo, 20) });
      });
      res.json({ ok: true });
    } catch (e) {
      console.error('[production-plans/delete]', e);
      res.status(500).json({ error: '删除生产计划失败' });
    }
  });

  app.post('/api/production-plans/:jhNo/audit', async (req, res) => {
    const usrId = billUserId(req);
    if (!usrId) return res.status(401).json({ error: '请先登录' });
    const jhNo = req.params.jhNo;
    try {
      const existing = await queryOne('SELECT CHK_MAN FROM MF_JH WHERE JH_NO = @jh_no', {
        jh_no: nstr(jhNo, 20),
      });
      if (!existing) return res.status(404).json({ error: `${label}不存在` });
      if (isBillAudited(existing)) return res.status(409).json({ error: '已审核' });
      await withTransaction(async (tx) => {
        await auditBillHead(tx, 'MF_JH', 'JH_NO = @jh_no', { jh_no: nstr(jhNo, 20) }, usrId);
        await applyJhSoMark(tx, jhNo, 'mark');
      });
      const head = await loadMfJhHead(jhNo);
      res.json({ ok: true, ...billAuditFields(head) });
    } catch (e) {
      console.error('[production-plans/audit]', e);
      res.status(500).json({ error: '审核失败' });
    }
  });

  app.post('/api/production-plans/:jhNo/unaudit', async (req, res) => {
    const jhNo = req.params.jhNo;
    try {
      const existing = await queryOne('SELECT CHK_MAN FROM MF_JH WHERE JH_NO = @jh_no', {
        jh_no: nstr(jhNo, 20),
      });
      if (!existing) return res.status(404).json({ error: `${label}不存在` });
      if (!isBillAudited(existing)) return res.status(409).json({ error: '未审核' });
      await withTransaction(async (tx) => {
        await applyJhSoMark(tx, jhNo, 'clear');
        await unauditBillHead(tx, 'MF_JH', 'JH_NO = @jh_no', { jh_no: nstr(jhNo, 20) });
      });
      res.json({ ok: true, usr: '', sys_date: '', chk_man: '', cls_date: '' });
    } catch (e) {
      console.error('[production-plans/unaudit]', e);
      res.status(500).json({ error: '反审核失败' });
    }
  });
}

module.exports = { registerJhOrdersRoutes };
