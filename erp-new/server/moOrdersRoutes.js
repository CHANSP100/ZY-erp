const { queryAll, queryOne, withTransaction, nstr, ndate, nfloat, nint } = require('./repositories/mssqlHelpers');
const { nextMoNo } = require('./repositories/mssqlNextNo');
const { saveBillExtFields, mergeBillExtFields, isExtFieldError } = require('./billExtFieldHook');
const { BILL_AUDIT_SELECT, billUserId, isBillAudited, registerBillAuditRoutes } = require('./billAuditMeta');

const MF_MO_HEAD_SEL = `
  SELECT m.MO_NO AS mo_no, CONVERT(varchar(10), m.MO_DD, 23) AS mo_dd,
    CONVERT(varchar(10), m.STA_DD, 23) AS sta_dd,
    CONVERT(varchar(10), m.END_DD, 23) AS end_dd,
    CONVERT(varchar(10), m.OPN_DD, 23) AS opn_dd,
    CONVERT(varchar(10), m.FIN_DD, 23) AS fin_dd,
    m.MRP_NO AS mrp_no, m.PRD_MARK AS prd_mark, m.WH AS wh, m.SO_NO AS so_no,
    m.UNIT AS unit, m.QTY AS qty, m.DEP AS dep, m.BIL_TYPE AS bil_type,
    CAST(m.BUILD_BIL AS nvarchar(500)) AS build_bil, m.CLOSE_ID AS close_id,
    CAST(m.REM AS nvarchar(500)) AS rem, m.QTY_FIN AS qty_fin,
    m.BIL_ID AS bil_id, m.BIL_NO AS bil_no,
    CAST(p.NAME AS nvarchar(200)) AS mrp_name,
    CAST(p.SPC AS nvarchar(200)) AS mrp_spc,
    CAST(d.NAME AS nvarchar(100)) AS dep_name,
    CAST(w.NAME AS nvarchar(100)) AS wh_name,
    ${BILL_AUDIT_SELECT}
  FROM MF_MO m
  LEFT JOIN PRDT p ON p.PRD_NO = m.MRP_NO
  LEFT JOIN DEPT d ON d.DEP = m.DEP
  LEFT JOIN MY_WH w ON w.WH = m.WH`;

const TF_MO_LINE_SEL = `
  SELECT t.MO_NO AS mo_no, t.ITM AS itm, t.PRD_NO AS prd_no,
    CAST(t.PRD_NAME AS nvarchar(200)) AS prd_name, t.PRD_MARK AS prd_mark,
    t.WH AS wh, t.UNIT AS unit, t.QTY_STD AS qty_std, t.LOS_RTO AS los_rto,
    t.QTY_RSV AS qty_rsv, t.QTY_LOST AS qty_lost, t.QTY AS qty,
    t.BAT_NO AS bat_no, CAST(t.REM AS nvarchar(200)) AS rem
  FROM TF_MO t`;

async function loadMfMoHead(moNo) {
  return queryOne(`${MF_MO_HEAD_SEL} WHERE m.MO_NO = @mo_no`, { mo_no: nstr(moNo, 20) });
}

async function loadTfMoLines(moNo, rowToTfMo) {
  return (
    await queryAll(`${TF_MO_LINE_SEL} WHERE t.MO_NO = @mo_no ORDER BY t.ITM`, {
      mo_no: nstr(moNo, 20),
    })
  ).map(rowToTfMo);
}

async function insertTfMoLine(tx, moNo, ln) {
  await tx.exec(
    `INSERT INTO TF_MO (MO_NO, ITM, PRD_NO, PRD_NAME, PRD_MARK, WH, UNIT,
     QTY_STD, LOS_RTO, QTY_RSV, QTY_LOST, QTY, BAT_NO, REM)
     VALUES (@mo_no, @itm, @prd_no, @prd_name, @prd_mark, @wh, @unit,
     @qty_std, @los_rto, @qty_rsv, @qty_lost, @qty, @bat_no, @rem)`,
    {
      mo_no: nstr(moNo, 20),
      itm: nint(ln.itm),
      prd_no: nstr(ln.prd_no, 30),
      prd_name: nstr(ln.prd_name, 200),
      prd_mark: nstr(ln.prd_mark, 100),
      wh: nstr(ln.wh, 12),
      unit: nstr(ln.unit, 10),
      qty_std: nfloat(ln.qty_std ?? 0),
      los_rto: nfloat(ln.los_rto ?? 0),
      qty_rsv: nfloat(ln.qty_rsv ?? 0),
      qty_lost: nfloat(ln.qty_lost ?? 0),
      qty: nfloat(ln.qty ?? 0),
      bat_no: nstr(ln.bat_no, 40),
      rem: nstr(ln.rem, 200),
    }
  );
}

function mfMoHeadParams(moNo, head) {
  return {
    mo_no: nstr(moNo, 20),
    mo_dd: ndate(head.mo_dd || new Date().toISOString().slice(0, 10)),
    sta_dd: ndate(head.sta_dd),
    end_dd: ndate(head.end_dd),
    opn_dd: ndate(head.opn_dd),
    fin_dd: ndate(head.fin_dd),
    mrp_no: nstr(head.mrp_no, 30),
    prd_mark: nstr(head.prd_mark, 40),
    wh: nstr(head.wh, 12),
    so_no: nstr(head.so_no, 20),
    unit: nstr(head.unit, 10),
    qty: nfloat(head.qty ?? 0),
    dep: nstr(head.dep, 8),
    bil_type: nstr(head.bil_type, 2),
    build_bil: nstr(head.build_bil, 500),
    close_id: nstr(head.close_id, 1),
    rem: nstr(head.rem, 500),
    qty_fin: nfloat(head.qty_fin ?? 0),
    bil_id: nstr(head.bil_id, 2),
    bil_no: nstr(head.bil_no, 20),
  };
}

/** MF_MO / TF_MO 制令单 (MrpAC) */
function registerMoOrdersRoutes(app, deps) {
  const { rowToMfMo, rowToTfMo, calcMoLine } = deps;
  const label = '制令单';

  app.get('/api/manufacturing-orders/next-no', async (_req, res) => {
    try {
      res.json({ mo_no: await nextMoNo() });
    } catch (e) {
      console.error('[manufacturing-orders/next-no]', e);
      res.status(500).json({ error: '获取单号失败' });
    }
  });

  app.get('/api/manufacturing-orders', async (req, res) => {
    const { q, limit = '50', date_from, date_to } = req.query;
    try {
      const top = Math.min(parseInt(limit, 10) || 50, 200);
      let sqlText = `${MF_MO_HEAD_SEL.replace('SELECT', `SELECT TOP (${top})`)} WHERE 1=1`;
      const inputs = {};
      if (q) {
        sqlText += ' AND (m.MO_NO LIKE @q OR m.MRP_NO LIKE @q OR p.NAME LIKE @q OR m.REM LIKE @q)';
        inputs.q = nstr(`%${q}%`, 200);
      }
      if (date_from) {
        sqlText += ' AND m.MO_DD >= @date_from';
        inputs.date_from = ndate(String(date_from));
      }
      if (date_to) {
        sqlText += ' AND m.MO_DD <= @date_to';
        inputs.date_to = ndate(String(date_to));
      }
      sqlText += ' ORDER BY m.MO_DD DESC, m.MO_NO DESC';
      res.json((await queryAll(sqlText, inputs)).map(rowToMfMo));
    } catch (e) {
      console.error('[manufacturing-orders/list]', e);
      res.status(500).json({ error: '读取制令单列表失败' });
    }
  });

  app.get('/api/manufacturing-orders/open-for-ml', async (req, res) => {
    const { limit = '100' } = req.query;
    try {
      const top = Math.min(parseInt(limit, 10) || 100, 200);
      const sqlText = `${MF_MO_HEAD_SEL.replace('SELECT', `SELECT TOP (${top})`)}
        WHERE m.CHK_MAN IS NOT NULL AND m.CHK_MAN <> ''
          AND (m.CLOSE_ID IS NULL OR m.CLOSE_ID <> 'T')
        ORDER BY m.MO_DD DESC, m.MO_NO DESC`;
      res.json((await queryAll(sqlText)).map(rowToMfMo));
    } catch (e) {
      console.error('[manufacturing-orders/open-for-ml]', e);
      res.status(500).json({ error: '读取可领料制令单失败' });
    }
  });

  app.get('/api/manufacturing-orders/open-for-mm', async (req, res) => {
    const { limit = '100' } = req.query;
    try {
      const top = Math.min(parseInt(limit, 10) || 100, 200);
      const sqlText = `${MF_MO_HEAD_SEL.replace('SELECT', `SELECT TOP (${top})`)}
        WHERE m.CHK_MAN IS NOT NULL AND m.CHK_MAN <> ''
          AND (m.CLOSE_ID IS NULL OR m.CLOSE_ID <> 'T')
        ORDER BY m.MO_DD DESC, m.MO_NO DESC`;
      res.json((await queryAll(sqlText)).map(rowToMfMo));
    } catch (e) {
      console.error('[manufacturing-orders/open-for-mm]', e);
      res.status(500).json({ error: '读取可缴库制令单失败' });
    }
  });

  app.get('/api/manufacturing-orders/:moNo/mm-lines', async (req, res) => {
    try {
      const head = await loadMfMoHead(req.params.moNo);
      if (!head) return res.status(404).json({ error: `${label}不存在` });
      if (!isBillAudited(head)) return res.status(409).json({ error: '制令单须已审核方可缴库' });
      if (head.close_id === 'T') return res.status(409).json({ error: '制令单已结案' });
      const moQty = Number(head.qty) || 0;
      const qtyFin = Number(head.qty_fin) || 0;
      const qtyOpen = Math.max(0, Math.round((moQty - qtyFin) * 100) / 100);
      const line = {
        mo_no: head.mo_no,
        prd_no: head.mrp_no,
        prd_name: head.mrp_name || '',
        prd_mark: head.prd_mark || '',
        unit: head.unit || '',
        wh: head.wh || '',
        so_no: head.so_no || '',
        bat_no: '',
        qty: qtyOpen,
        qty1: 0,
        mo_qty: moQty,
        qty_fin: qtyFin,
        bil_id: 'MO',
        bil_no: head.mo_no,
      };
      res.json({ head: rowToMfMo(head), lines: qtyOpen > 0.0001 ? [line] : [] });
    } catch (e) {
      console.error('[manufacturing-orders/mm-lines]', e);
      res.status(500).json({ error: '读取制令缴库明细失败' });
    }
  });

  app.get('/api/manufacturing-orders/:moNo/ml-lines', async (req, res) => {
    try {
      const head = await loadMfMoHead(req.params.moNo);
      if (!head) return res.status(404).json({ error: `${label}不存在` });
      if (!isBillAudited(head)) return res.status(409).json({ error: '制令单须已审核方可领料' });
      if (head.close_id === 'T') return res.status(409).json({ error: '制令单已结案' });
      const headQty = Number(head.qty) || 0;
      const rawLines = await queryAll(
        `${TF_MO_LINE_SEL} WHERE t.MO_NO = @mo_no ORDER BY t.ITM`,
        { mo_no: nstr(req.params.moNo, 20) }
      );
      const lines = [];
      for (const row of rawLines) {
        const base = rowToTfMo(row);
        const calc = calcMoLine(base, headQty);
        const picked = Number(base.qty) || 0;
        const qtyOpen = Math.max(0, Math.round((Number(calc.qty_rsv) - picked) * 100) / 100);
        if (qtyOpen <= 0.0001) continue;
        const wh = base.wh || head.wh;
        let qtyWh = 0;
        try {
          const sq = await queryOne(
            `SELECT COALESCE(QTY, 0) AS qty FROM PRDT1 WHERE PRD_NO = @prd_no AND WH = @wh`,
            { prd_no: nstr(base.prd_no, 30), wh: nstr(wh, 12) }
          );
          qtyWh = sq ? Number(sq.qty) || 0 : 0;
        } catch {
          qtyWh = 0;
        }
        lines.push({
          ...calc,
          qty: qtyOpen,
          qty_wh: qtyWh,
          bil_itm: base.itm,
        });
      }
      res.json({ head: rowToMfMo(head), lines });
    } catch (e) {
      console.error('[manufacturing-orders/ml-lines]', e);
      res.status(500).json({ error: '读取制令领料明细失败' });
    }
  });

  app.get('/api/manufacturing-orders/:moNo', async (req, res) => {
    try {
      const head = await loadMfMoHead(req.params.moNo);
      if (!head) return res.status(404).json({ error: `${label}不存在` });
      const lines = await loadTfMoLines(req.params.moNo, rowToTfMo);
      res.json(await mergeBillExtFields('MrpAC', rowToMfMo(head), lines));
    } catch (e) {
      console.error('[manufacturing-orders/get]', e);
      res.status(500).json({ error: '读取制令单失败' });
    }
  });

  app.post('/api/manufacturing-orders', async (req, res) => {
    const { head, lines } = req.body;
    if (!head?.mrp_no) return res.status(400).json({ error: '请选择制造成品' });
    if (!head?.qty && head?.qty !== 0) return res.status(400).json({ error: '数量必填' });
    if (!lines?.length) return res.status(400).json({ error: '表身至少一行' });
    try {
      const mo_no = head.mo_no || (await nextMoNo());
      if (await queryOne('SELECT 1 AS ok FROM MF_MO WHERE MO_NO = @mo_no', { mo_no: nstr(mo_no, 20) })) {
        return res.status(409).json({ error: '单号已存在' });
      }
      const headQty = Number(head.qty) || 0;
      const normalized = lines.map((ln, i) => calcMoLine({ ...ln, itm: i + 1, mo_no }, headQty));

      await withTransaction(async (tx) => {
        const creator = billUserId(req);
        await tx.exec(
          `INSERT INTO MF_MO (MO_NO, MO_DD, STA_DD, END_DD, OPN_DD, FIN_DD, MRP_NO, PRD_MARK, WH,
           SO_NO, UNIT, QTY, DEP, BIL_TYPE, BUILD_BIL, CLOSE_ID, REM, QTY_FIN, BIL_ID, BIL_NO${creator ? ', USR, SYS_DATE' : ''})
           VALUES (@mo_no, @mo_dd, @sta_dd, @end_dd, @opn_dd, @fin_dd, @mrp_no, @prd_mark, @wh,
           @so_no, @unit, @qty, @dep, @bil_type, @build_bil, @close_id, @rem, @qty_fin, @bil_id, @bil_no${creator ? ', @usr, GETDATE()' : ''})`,
          { ...mfMoHeadParams(mo_no, head), ...(creator ? { usr: creator } : {}) }
        );
        for (const ln of normalized) {
          await insertTfMoLine(tx, mo_no, ln);
        }
      });

      await saveBillExtFields('MrpAC', { head: { ...head, mo_no }, lines: normalized });

      const saved = await loadMfMoHead(mo_no);
      const rawLines = await loadTfMoLines(mo_no, rowToTfMo);
      res.status(201).json(await mergeBillExtFields('MrpAC', rowToMfMo(saved), rawLines));
    } catch (e) {
      console.error('[manufacturing-orders/create]', e);
      if (isExtFieldError(e)) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: '新增制令单失败' });
    }
  });

  app.put('/api/manufacturing-orders/:moNo', async (req, res) => {
    try {
      const existing = await queryOne('SELECT * FROM MF_MO WHERE MO_NO = @mo_no', {
        mo_no: nstr(req.params.moNo, 20),
      });
      if (!existing) return res.status(404).json({ error: `${label}不存在` });
      if (isBillAudited(existing)) return res.status(409).json({ error: '已审核单据不可修改' });
      const { head, lines } = req.body;
      if (!lines?.length) return res.status(400).json({ error: '表身至少一行' });

      const headQty = Number(head?.qty ?? existing.QTY) || 0;
      const normalized = lines.map((ln, i) =>
        calcMoLine({ ...ln, itm: i + 1, mo_no: req.params.moNo }, headQty)
      );
      const mergedHead = { ...existing, ...head, mo_no: req.params.moNo };

      await withTransaction(async (tx) => {
        await tx.exec(
          `UPDATE MF_MO SET MO_DD=@mo_dd, STA_DD=@sta_dd, END_DD=@end_dd, OPN_DD=@opn_dd, FIN_DD=@fin_dd,
           MRP_NO=@mrp_no, PRD_MARK=@prd_mark, WH=@wh, SO_NO=@so_no, UNIT=@unit, QTY=@qty, DEP=@dep,
           BIL_TYPE=@bil_type, BUILD_BIL=@build_bil, CLOSE_ID=@close_id, REM=@rem,
           BIL_ID=@bil_id, BIL_NO=@bil_no
           WHERE MO_NO=@mo_no`,
          {
            ...mfMoHeadParams(req.params.moNo, mergedHead),
            qty_fin: nfloat(existing.QTY_FIN ?? 0),
          }
        );
        await tx.exec('DELETE FROM TF_MO WHERE MO_NO = @mo_no', { mo_no: nstr(req.params.moNo, 20) });
        for (const ln of normalized) {
          await insertTfMoLine(tx, req.params.moNo, ln);
        }
      });
      await saveBillExtFields('MrpAC', { head: mergedHead, lines: normalized });
      res.json({ ok: true });
    } catch (e) {
      console.error('[manufacturing-orders/update]', e);
      if (isExtFieldError(e)) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: '修改制令单失败' });
    }
  });

  app.delete('/api/manufacturing-orders/:moNo', async (req, res) => {
    try {
      const existing = await queryOne('SELECT CHK_MAN, QTY_FIN FROM MF_MO WHERE MO_NO = @mo_no', {
        mo_no: nstr(req.params.moNo, 20),
      });
      if (!existing) return res.status(404).json({ error: `${label}不存在` });
      if (isBillAudited(existing)) return res.status(409).json({ error: '已审核单据不能删除' });
      if (Number(existing.QTY_FIN) > 0.0001) {
        return res.status(409).json({ error: '制令单已有缴库记录，不能删除' });
      }
      const picked = await queryOne(
        'SELECT TOP 1 1 AS ok FROM TF_MO WHERE MO_NO = @mo_no AND COALESCE(QTY, 0) > 0.0001',
        { mo_no: nstr(req.params.moNo, 20) }
      );
      if (picked) return res.status(409).json({ error: '制令单已有领料记录，不能删除' });
      await withTransaction(async (tx) => {
        await tx.exec('DELETE FROM TF_MO WHERE MO_NO = @mo_no', { mo_no: nstr(req.params.moNo, 20) });
        await tx.exec('DELETE FROM MF_MO WHERE MO_NO = @mo_no', { mo_no: nstr(req.params.moNo, 20) });
      });
      res.json({ ok: true });
    } catch (e) {
      console.error('[manufacturing-orders/delete]', e);
      res.status(500).json({ error: '删除制令单失败' });
    }
  });

  registerBillAuditRoutes(app, {
    apiPath: 'manufacturing-orders',
    billNoParam: 'moNo',
    label,
    table: 'MF_MO',
    whereSql: 'MO_NO = @mo_no',
    buildParams: (req) => ({ mo_no: nstr(req.params.moNo, 20) }),
    loadHeadRow: async (req) => loadMfMoHead(req.params.moNo),
  });
}

module.exports = { registerMoOrdersRoutes };
