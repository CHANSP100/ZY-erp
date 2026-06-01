const { rowToMfPss, rowToTfPss, calcLineAmounts, sumOrder } = require('../db');
const { queryAll, queryOne, withTransaction, nstr, ndate, nfloat, nint, sql } = require('../repositories/mssqlHelpers');
const { nextPsNo } = require('../repositories/mssqlNextNo');
const { saveBillExtFields, mergeBillExtFields, isExtFieldError } = require('../billExtFieldHook');
const { BILL_AUDIT_SELECT, billUserId, isBillAudited, registerBillAuditRoutes } = require('../billAuditMeta');

const MF_PSS_HEAD_SEL = `
  SELECT m.PS_ID AS ps_id, m.PS_NO AS ps_no, CONVERT(varchar(10), m.PS_DD, 23) AS ps_dd,
    m.CUS_NO AS cus_no, m.DEP AS dep, m.SAL_NO AS sal_no, m.CUS_OS_NO AS cus_os_no,
    m.BIL_TYPE AS bil_type, m.CUR_ID AS cur_id, m.TAX_ID AS tax_id, m.OS_ID AS os_id, m.OS_NO AS os_no,
    m.ZHANG_ID AS zhang_id, m.SEND_MTH AS send_mth, m.SEND_WH AS send_wh,
    CAST(m.ADR AS nvarchar(500)) AS adr, m.PAY_MTH AS pay_mth, m.PAY_DAYS AS pay_days,
    CONVERT(varchar(10), m.PAY_DD, 23) AS pay_dd, CONVERT(varchar(10), m.CHK_DD, 23) AS chk_dd,
    m.INV_NO AS inv_no, m.RP_NO AS rp_no, m.VOH_NO AS voh_no, m.CONTRACT AS contract,
    CAST(m.REM AS nvarchar(500)) AS rem, m.DIS_CNT AS dis_cnt, m.AMTN_NET AS amtn_net, m.TAX AS tax,
    CAST(c.NAME AS nvarchar(200)) AS cus_name,
    ${BILL_AUDIT_SELECT}
  FROM MF_PSS m
  LEFT JOIN CUST c ON c.CUS_NO = m.CUS_NO`;

const TF_PSS_LINE_SEL = `
  SELECT t.PS_ID AS ps_id, t.PS_NO AS ps_no, t.ITM AS itm, t.PRD_NO AS prd_no,
    CAST(t.PRD_NAME AS nvarchar(200)) AS prd_name, t.PRD_MARK AS prd_mark, t.WH AS wh,
    CAST(w.NAME AS nvarchar(100)) AS wh_name, t.QTY AS qty, t.UT AS ut, t.UP AS up,
    t.AMTN_NET AS amtn_net, t.TAX_RTO AS tax_rto, t.TAX AS tax,
    CONVERT(varchar(10), t.EST_DD, 23) AS est_dd, t.SUP_PRD_NO AS sup_prd_no,
    CAST(t.REM AS nvarchar(200)) AS rem, t.DIS_CNT AS dis_cnt, t.QTY1 AS qty1, t.BAT_NO AS bat_no,
    t.OS_ID AS os_id, t.OS_NO AS os_no, t.SRC_ITM AS src_itm, CAST(p.SPC AS nvarchar(200)) AS spc,
    t.QTY_RTN AS qty_rtn
  FROM TF_PSS t
  LEFT JOIN MY_WH w ON w.WH = t.WH
  LEFT JOIN PRDT p ON p.PRD_NO = t.PRD_NO`;

function pssCreatorInsert(req) {
  const usr = billUserId(req);
  return usr
    ? { cols: ', USR, SYS_DATE', vals: ', @usr, GETDATE()', params: { usr } }
    : { cols: '', vals: '', params: {} };
}

function registerPssAuditRoutes(app, cfg) {
  const { path, psId, label } = cfg;
  registerBillAuditRoutes(app, {
    apiPath: path,
    billNoParam: 'psNo',
    label,
    table: 'MF_PSS',
    whereSql: 'PS_ID=@ps_id AND PS_NO=@ps_no',
    buildParams: (req) => ({ ps_id: nstr(psId, 4), ps_no: nstr(req.params.psNo, 20) }),
    loadHeadRow: async (req) => loadMfPssHead(psId, req.params.psNo),
  });
}

function mfPssHeadBind(head, existing, taxId, totals, defaultOsId = 'SO') {
  const h = head || {};
  const e = existing || {};
  return [
    h.ps_dd ?? e.ps_dd ?? new Date().toISOString().slice(0, 10),
    h.cus_no ?? e.cus_no,
    h.dep ?? e.dep ?? null,
    h.sal_no ?? e.sal_no ?? null,
    h.cus_os_no ?? e.cus_os_no ?? null,
    h.bil_type ?? e.bil_type ?? null,
    h.cur_id ?? e.cur_id ?? null,
    taxId,
    h.os_id ?? e.os_id ?? defaultOsId,
    h.os_no ?? e.os_no ?? null,
    h.zhang_id ?? e.zhang_id ?? '1',
    h.send_mth ?? e.send_mth ?? null,
    h.send_wh ?? e.send_wh ?? null,
    h.adr ?? e.adr ?? null,
    h.pay_mth ?? e.pay_mth ?? null,
    h.pay_days ?? e.pay_days ?? null,
    h.pay_dd ?? e.pay_dd ?? null,
    h.chk_dd ?? e.chk_dd ?? null,
    h.inv_no ?? e.inv_no ?? null,
    h.rp_no ?? e.rp_no ?? null,
    h.voh_no ?? e.voh_no ?? null,
    h.contract ?? e.contract ?? null,
    h.rem ?? e.rem ?? null,
    h.dis_cnt ?? e.dis_cnt ?? 0,
    totals.amtn_net,
    totals.tax,
  ];
}

function headBindToParams(bind) {
  return {
    ps_dd: ndate(bind[0]),
    cus_no: nstr(bind[1], 20),
    dep: nstr(bind[2], 10),
    sal_no: nstr(bind[3], 10),
    cus_os_no: nstr(bind[4], 50),
    bil_type: nstr(bind[5], 4),
    cur_id: nstr(bind[6], 4),
    tax_id: nstr(bind[7], 4),
    os_id: nstr(bind[8], 4),
    os_no: nstr(bind[9], 20),
    zhang_id: nstr(bind[10], 4),
    send_mth: nstr(bind[11], 10),
    send_wh: nstr(bind[12], 10),
    adr: nstr(bind[13], 500),
    pay_mth: nstr(bind[14], 10),
    pay_days: nstr(bind[15] == null ? null : String(bind[15]), 10),
    pay_dd: ndate(bind[16]),
    chk_dd: ndate(bind[17]),
    inv_no: nstr(bind[18], 30),
    rp_no: nstr(bind[19], 30),
    voh_no: nstr(bind[20], 30),
    contract: nstr(bind[21], 50),
    rem: nstr(bind[22], 500),
    dis_cnt: nfloat(bind[23]),
    amtn_net: nfloat(bind[24]),
    tax: nfloat(bind[25]),
  };
}

function lineInputs(psId, psNo, ln, headOsNo, defaultOsId = 'SO') {
  return {
    ps_id: nstr(psId, 4),
    ps_no: nstr(psNo, 20),
    itm: nint(ln.itm),
    prd_no: nstr(ln.prd_no, 30),
    prd_name: nstr(ln.prd_name, 200),
    prd_mark: nstr(ln.prd_mark, 100),
    wh: nstr(ln.wh, 10),
    qty: nfloat(ln.qty ?? 0),
    ut: nstr(ln.ut, 10),
    up: nfloat(ln.up ?? 0),
    amtn_net: nfloat(ln.amtn_net ?? 0),
    tax_rto: nfloat(ln.tax_rto ?? 13),
    tax: nfloat(ln.tax ?? 0),
    est_dd: ndate(ln.est_dd),
    sup_prd_no: nstr(ln.sup_prd_no, 30),
    rem: nstr(ln.rem, 200),
    dis_cnt: nfloat(ln.dis_cnt ?? 0),
    qty1: nfloat(ln.qty1 ?? 0),
    bat_no: nstr(ln.bat_no, 30),
    os_id: nstr(ln.os_id || defaultOsId, 4),
    os_no: nstr(ln.os_no || headOsNo || null, 20),
    src_itm: ln.src_itm == null ? { type: sql.Int, value: null } : nint(ln.src_itm),
  };
}

async function insertTfPssLines(tx, psId, psNo, lines, headOsNo, updPosOsId, defaultOsId = 'SO') {
  for (const ln of lines) {
    const inp = lineInputs(psId, psNo, ln, headOsNo, defaultOsId);
    await tx.exec(
      `INSERT INTO TF_PSS (PS_ID, PS_NO, ITM, PRD_NO, PRD_NAME, PRD_MARK, WH, QTY, UT, UP, AMTN_NET, TAX_RTO, TAX,
       EST_DD, SUP_PRD_NO, REM, DIS_CNT, QTY1, BAT_NO, OS_ID, OS_NO, SRC_ITM)
       VALUES (@ps_id, @ps_no, @itm, @prd_no, @prd_name, @prd_mark, @wh, @qty, @ut, @up, @amtn_net, @tax_rto, @tax,
       @est_dd, @sup_prd_no, @rem, @dis_cnt, @qty1, @bat_no, @os_id, @os_no, @src_itm)`,
      inp
    );
    if (updPosOsId && ln.os_no && ln.src_itm) {
      await tx.exec(
        `UPDATE TF_POS SET QTY_PS = COALESCE(QTY_PS,0) + @qty WHERE OS_ID=@pos_os_id AND OS_NO=@os_no AND ITM=@itm`,
        {
          qty: nfloat(ln.qty ?? 0),
          pos_os_id: nstr(updPosOsId, 4),
          os_no: nstr(ln.os_no, 20),
          itm: nint(ln.src_itm),
        }
      );
    }
  }
}

async function insertSimpleReturnLines(tx, psId, psNo, lines, head, defaultOsId, sourcePsId) {
  for (const ln of lines) {
    await tx.exec(
      `INSERT INTO TF_PSS (PS_ID, PS_NO, ITM, PRD_NO, PRD_NAME, WH, QTY, UT, UP, AMTN_NET, TAX_RTO, TAX,
       EST_DD, SUP_PRD_NO, REM, OS_ID, OS_NO, SRC_ITM)
       VALUES (@ps_id, @ps_no, @itm, @prd_no, @prd_name, @wh, @qty, @ut, @up, @amtn_net, @tax_rto, @tax,
       @est_dd, @sup_prd_no, @rem, @os_id, @os_no, @src_itm)`,
      {
        ps_id: nstr(psId, 4),
        ps_no: nstr(psNo, 20),
        itm: nint(ln.itm),
        prd_no: nstr(ln.prd_no, 30),
        prd_name: nstr(ln.prd_name, 200),
        wh: nstr(ln.wh, 10),
        qty: nfloat(ln.qty ?? 0),
        ut: nstr(ln.ut, 10),
        up: nfloat(ln.up ?? 0),
        amtn_net: nfloat(ln.amtn_net ?? 0),
        tax_rto: nfloat(ln.tax_rto ?? 13),
        tax: nfloat(ln.tax ?? 0),
        est_dd: ndate(ln.est_dd),
        sup_prd_no: nstr(ln.sup_prd_no, 30),
        rem: nstr(ln.rem, 200),
        os_id: nstr(ln.os_id || defaultOsId, 4),
        os_no: nstr(ln.os_no || head.os_no || null, 20),
        src_itm: ln.src_itm == null ? { type: sql.Int, value: null } : nint(ln.src_itm),
      }
    );
    if (sourcePsId && ln.os_no && ln.src_itm) {
      await tx.exec(
        `UPDATE TF_PSS SET QTY_RTN = COALESCE(QTY_RTN,0) + @qty WHERE PS_ID=@src_ps_id AND PS_NO=@os_no AND ITM=@itm`,
        {
          qty: nfloat(ln.qty ?? 0),
          src_ps_id: nstr(sourcePsId, 4),
          os_no: nstr(ln.os_no, 20),
          itm: nint(ln.src_itm),
        }
      );
    }
  }
}

async function reverseSaQtyPsOnDelete(tx, psNo) {
  const lines = await tx.queryAll(
    `SELECT OS_NO AS os_no, SRC_ITM AS src_itm, QTY AS qty FROM TF_PSS WHERE PS_ID='SA' AND PS_NO=@ps_no`,
    { ps_no: nstr(psNo, 20) }
  );
  for (const ln of lines) {
    if (ln.os_no && ln.src_itm) {
      const qty = ln.qty ?? 0;
      await tx.exec(
        `UPDATE TF_POS SET QTY_PS = CASE WHEN COALESCE(QTY_PS,0) - @qty < 0 THEN 0 ELSE COALESCE(QTY_PS,0) - @qty END
         WHERE OS_ID='SO' AND OS_NO=@os_no AND ITM=@itm`,
        { qty: nfloat(qty), os_no: nstr(ln.os_no, 20), itm: nint(ln.src_itm) }
      );
    }
  }
}

async function reverseSbQtyRtnOnDelete(tx, psNo) {
  const lines = await tx.queryAll(
    `SELECT OS_NO AS os_no, SRC_ITM AS src_itm, QTY AS qty FROM TF_PSS WHERE PS_ID='SB' AND PS_NO=@ps_no`,
    { ps_no: nstr(psNo, 20) }
  );
  for (const ln of lines) {
    if (ln.os_no && ln.src_itm) {
      const qty = ln.qty ?? 0;
      await tx.exec(
        `UPDATE TF_PSS SET QTY_RTN = CASE WHEN COALESCE(QTY_RTN,0) - @qty < 0 THEN 0 ELSE COALESCE(QTY_RTN,0) - @qty END
         WHERE PS_ID='SA' AND PS_NO=@os_no AND ITM=@itm`,
        { qty: nfloat(qty), os_no: nstr(ln.os_no, 20), itm: nint(ln.src_itm) }
      );
    }
  }
}

async function reversePcQtyPsOnDelete(tx, psNo) {
  const lines = await tx.queryAll(
    `SELECT OS_NO AS os_no, SRC_ITM AS src_itm, QTY AS qty FROM TF_PSS WHERE PS_ID='PC' AND PS_NO=@ps_no`,
    { ps_no: nstr(psNo, 20) }
  );
  for (const ln of lines) {
    if (ln.os_no && ln.src_itm) {
      const qty = ln.qty ?? 0;
      await tx.exec(
        `UPDATE TF_POS SET QTY_PS = CASE WHEN COALESCE(QTY_PS,0) - @qty < 0 THEN 0 ELSE COALESCE(QTY_PS,0) - @qty END
         WHERE OS_ID='PO' AND OS_NO=@os_no AND ITM=@itm`,
        { qty: nfloat(qty), os_no: nstr(ln.os_no, 20), itm: nint(ln.src_itm) }
      );
    }
  }
}

async function reversePbQtyRtnOnDelete(tx, psNo) {
  const lines = await tx.queryAll(
    `SELECT OS_NO AS os_no, SRC_ITM AS src_itm, QTY AS qty FROM TF_PSS WHERE PS_ID='PB' AND PS_NO=@ps_no`,
    { ps_no: nstr(psNo, 20) }
  );
  for (const ln of lines) {
    if (ln.os_no && ln.src_itm) {
      const qty = ln.qty ?? 0;
      await tx.exec(
        `UPDATE TF_PSS SET QTY_RTN = CASE WHEN COALESCE(QTY_RTN,0) - @qty < 0 THEN 0 ELSE COALESCE(QTY_RTN,0) - @qty END
         WHERE PS_ID='PC' AND PS_NO=@os_no AND ITM=@itm`,
        { qty: nfloat(qty), os_no: nstr(ln.os_no, 20), itm: nint(ln.src_itm) }
      );
    }
  }
}

async function deleteMfPssBill(tx, psId, psNo) {
  await tx.exec(`DELETE FROM TF_PSS WHERE PS_ID=@ps_id AND PS_NO=@ps_no`, {
    ps_id: nstr(psId, 4),
    ps_no: nstr(psNo, 20),
  });
  await tx.exec(`DELETE FROM MF_PSS WHERE PS_ID=@ps_id AND PS_NO=@ps_no`, {
    ps_id: nstr(psId, 4),
    ps_no: nstr(psNo, 20),
  });
}

async function loadMfPssHead(psId, psNo) {
  return queryOne(`${MF_PSS_HEAD_SEL} WHERE m.PS_ID=@ps_id AND m.PS_NO=@ps_no`, {
    ps_id: nstr(psId, 4),
    ps_no: nstr(psNo, 20),
  });
}

async function loadTfPssLines(psId, psNo) {
  return (
    await queryAll(`${TF_PSS_LINE_SEL} WHERE t.PS_ID=@ps_id AND t.PS_NO=@ps_no ORDER BY t.ITM`, {
      ps_id: nstr(psId, 4),
      ps_no: nstr(psNo, 20),
    })
  ).map(rowToTfPss);
}

async function loadMfPssByPsNo(psNo) {
  return queryOne(`${MF_PSS_HEAD_SEL} WHERE m.PS_NO=@ps_no`, { ps_no: nstr(psNo, 20) });
}

function normalizeLines(lines, taxId, defaultOsId) {
  return lines.map((ln, i) => {
    const c = calcLineAmounts(ln.qty, ln.up, taxId, ln.tax_rto ?? 13);
    const out = { ...ln, itm: i + 1, amtn_net: c.amtn, tax: c.tax };
    if (defaultOsId) out.os_id = ln.os_id || defaultOsId;
    return out;
  });
}

function registerSalesShipmentsRoutes(app) {
  app.get('/api/sales-shipments/next-no', async (_req, res) => {
    try {
      res.json({ ps_no: await nextPsNo('SA') });
    } catch (e) {
      console.error('[sales-shipments/next-no]', e);
      res.status(500).json({ error: '获取单号失败' });
    }
  });

  app.get('/api/sales-shipments/open', async (req, res) => {
    const { cus_no } = req.query;
    if (!cus_no) return res.status(400).json({ error: '请先选择客户' });
    try {
      const rows = await queryAll(
        `SELECT DISTINCT m.PS_NO AS ps_no, CONVERT(varchar(10), m.PS_DD, 23) AS ps_dd,
         m.CUS_OS_NO AS cus_os_no, CAST(m.REM AS nvarchar(500)) AS rem
         FROM MF_PSS m
         JOIN TF_PSS t ON t.PS_ID='SA' AND t.PS_NO=m.PS_NO
         WHERE m.PS_ID='SA' AND m.CUS_NO=@cus_no
           AND (COALESCE(t.QTY,0) - COALESCE(t.QTY_RTN,0)) > 0.0001
         ORDER BY m.PS_DD DESC, m.PS_NO DESC`,
        { cus_no: nstr(String(cus_no), 20) }
      );
      res.json(rows);
    } catch (e) {
      console.error('[sales-shipments/open]', e);
      res.status(500).json({ error: '读取未退完销货单失败' });
    }
  });

  app.get('/api/sales-shipments', async (req, res) => {
    const { q, limit = '50' } = req.query;
    try {
      const top = Math.min(parseInt(limit, 10) || 50, 200);
      let sqlText = `${MF_PSS_HEAD_SEL.replace('SELECT', `SELECT TOP (${top})`)} WHERE m.PS_ID = 'SA'`;
      const inputs = {};
      if (q) {
        sqlText += ' AND (m.PS_NO LIKE @q OR c.NAME LIKE @q OR m.OS_NO LIKE @q)';
        inputs.q = nstr(`%${q}%`, 200);
      }
      sqlText += ' ORDER BY m.PS_DD DESC, m.PS_NO DESC';
      res.json((await queryAll(sqlText, inputs)).map(rowToMfPss));
    } catch (e) {
      console.error('[sales-shipments/list]', e);
      res.status(500).json({ error: '读取销货单列表失败' });
    }
  });

  app.get('/api/sales-shipments/:psNo/return-lines', async (req, res) => {
    try {
      const head = await loadMfPssHead('SA', req.params.psNo);
      if (!head) return res.status(404).json({ error: '销货单不存在' });
      const lines = (
        await queryAll(
          `SELECT t.PS_ID AS ps_id, t.PS_NO AS ps_no, t.ITM AS itm, t.PRD_NO AS prd_no,
            CAST(t.PRD_NAME AS nvarchar(200)) AS prd_name, t.PRD_MARK AS prd_mark, t.WH AS wh,
            CAST(w.NAME AS nvarchar(100)) AS wh_name, t.QTY AS qty, t.UT AS ut, t.UP AS up,
            t.AMTN_NET AS amtn_net, t.TAX_RTO AS tax_rto, t.TAX AS tax,
            CONVERT(varchar(10), t.EST_DD, 23) AS est_dd, t.SUP_PRD_NO AS sup_prd_no,
            CAST(t.REM AS nvarchar(200)) AS rem, t.DIS_CNT AS dis_cnt, t.QTY1 AS qty1, t.BAT_NO AS bat_no,
            t.OS_ID AS os_id, t.OS_NO AS os_no, t.SRC_ITM AS src_itm, CAST(p.SPC AS nvarchar(200)) AS spc,
            t.QTY_RTN AS qty_rtn,
            (COALESCE(t.QTY,0) - COALESCE(t.QTY_RTN,0)) AS qty_open
           FROM TF_PSS t
           LEFT JOIN MY_WH w ON w.WH = t.WH
           LEFT JOIN PRDT p ON p.PRD_NO = t.PRD_NO
           WHERE t.PS_ID='SA' AND t.PS_NO=@ps_no
             AND (COALESCE(t.QTY,0) - COALESCE(t.QTY_RTN,0)) > 0.0001
           ORDER BY t.ITM`,
          { ps_no: nstr(req.params.psNo, 20) }
        )
      ).map((row) => ({ ...rowToTfPss(row), qty_open: row.qty_open, qty: row.qty_open }));
      res.json({ head: rowToMfPss(head), lines });
    } catch (e) {
      console.error('[sales-shipments/return-lines]', e);
      res.status(500).json({ error: '读取销货退回明细失败' });
    }
  });

  app.get('/api/sales-shipments/:psNo/allowance-lines', async (req, res) => {
    try {
      const head = await loadMfPssHead('SA', req.params.psNo);
      if (!head) return res.status(404).json({ error: '销货单不存在' });
      const lines = (await loadTfPssLines('SA', req.params.psNo)).map((row) => ({
        ...row,
        qty: row.qty,
      }));
      res.json({ head: rowToMfPss(head), lines });
    } catch (e) {
      console.error('[sales-shipments/allowance-lines]', e);
      res.status(500).json({ error: '读取销货折让明细失败' });
    }
  });

  app.get('/api/sales-shipments/:psNo', async (req, res) => {
    try {
      const head = await loadMfPssHead('SA', req.params.psNo);
      if (!head) return res.status(404).json({ error: '销货单不存在' });
      const lines = await loadTfPssLines('SA', req.params.psNo);
      res.json(await mergeBillExtFields('InvCA', rowToMfPss(head), lines));
    } catch (e) {
      console.error('[sales-shipments/get]', e);
      res.status(500).json({ error: '读取销货单失败' });
    }
  });

  app.post('/api/sales-shipments', async (req, res) => {
    const { head, lines } = req.body;
    if (!head?.cus_no) return res.status(400).json({ error: '请选择客户' });
    if (!lines?.length) return res.status(400).json({ error: '表身至少一行' });
    try {
      const ps_id = 'SA';
      const ps_no = head.ps_no || (await nextPsNo(ps_id));
      if (await queryOne('SELECT 1 AS ok FROM MF_PSS WHERE PS_NO=@ps_no', { ps_no: nstr(ps_no, 20) })) {
        return res.status(409).json({ error: '单号已存在' });
      }
      const tax_id = head.tax_id || '2';
      const normalized = normalizeLines(lines, tax_id);
      const totals = sumOrder(normalized.map((ln) => ({ ...ln, amtn: ln.amtn_net })), tax_id);
      await withTransaction(async (tx) => {
        const creator = pssCreatorInsert(req);
        const bind = headBindToParams(mfPssHeadBind(head, null, tax_id, totals));
        await tx.exec(
          `INSERT INTO MF_PSS (PS_ID, PS_NO, PS_DD, CUS_NO, DEP, SAL_NO, CUS_OS_NO, BIL_TYPE, CUR_ID,
           TAX_ID, OS_ID, OS_NO, ZHANG_ID, SEND_MTH, SEND_WH, ADR, PAY_MTH, PAY_DAYS, PAY_DD, CHK_DD,
           INV_NO, RP_NO, VOH_NO, CONTRACT, REM, DIS_CNT, AMTN_NET, TAX${creator.cols})
           VALUES (@ps_id, @ps_no, @ps_dd, @cus_no, @dep, @sal_no, @cus_os_no, @bil_type, @cur_id,
           @tax_id, @os_id, @os_no, @zhang_id, @send_mth, @send_wh, @adr, @pay_mth, @pay_days, @pay_dd, @chk_dd,
           @inv_no, @rp_no, @voh_no, @contract, @rem, @dis_cnt, @amtn_net, @tax${creator.vals})`,
          { ps_id: nstr(ps_id, 4), ps_no: nstr(ps_no, 20), ...bind, ...creator.params }
        );
        await insertTfPssLines(tx, ps_id, ps_no, normalized, head.os_no, 'SO');
      });
      await saveBillExtFields('InvCA', { head, lines: normalized });
      const saved = await loadMfPssByPsNo(ps_no);
      const rawLines = await loadTfPssLines('SA', ps_no);
      res.status(201).json(await mergeBillExtFields('InvCA', rowToMfPss(saved), rawLines));
    } catch (e) {
      console.error('[sales-shipments/create]', e);
      if (isExtFieldError(e)) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: '新增销货单失败' });
    }
  });

  app.put('/api/sales-shipments/:psNo', async (req, res) => {
    try {
      const existing = await queryOne('SELECT * FROM MF_PSS WHERE PS_ID=@ps_id AND PS_NO=@ps_no', {
        ps_id: nstr('SA', 4),
        ps_no: nstr(req.params.psNo, 20),
      });
      if (!existing) return res.status(404).json({ error: '销货单不存在' });
      if (isBillAudited(existing)) return res.status(409).json({ error: '已审核单据不可修改' });
      const { head, lines } = req.body;
      if (!lines?.length) return res.status(400).json({ error: '表身至少一行' });
      const tax_id = head?.tax_id ?? existing.tax_id ?? '2';
      const normalized = normalizeLines(lines, tax_id);
      const totals = sumOrder(normalized.map((ln) => ({ ...ln, amtn: ln.amtn_net })), tax_id);
      await withTransaction(async (tx) => {
        const bind = headBindToParams(mfPssHeadBind(head, existing, tax_id, totals));
        await tx.exec(
          `UPDATE MF_PSS SET PS_DD=@ps_dd, CUS_NO=@cus_no, DEP=@dep, SAL_NO=@sal_no, CUS_OS_NO=@cus_os_no,
           BIL_TYPE=@bil_type, CUR_ID=@cur_id, TAX_ID=@tax_id, OS_ID=@os_id, OS_NO=@os_no, ZHANG_ID=@zhang_id,
           SEND_MTH=@send_mth, SEND_WH=@send_wh, ADR=@adr, PAY_MTH=@pay_mth, PAY_DAYS=@pay_days, PAY_DD=@pay_dd,
           CHK_DD=@chk_dd, INV_NO=@inv_no, RP_NO=@rp_no, VOH_NO=@voh_no, CONTRACT=@contract, REM=@rem,
           DIS_CNT=@dis_cnt, AMTN_NET=@amtn_net, TAX=@tax WHERE PS_NO=@ps_no`,
          { ...bind, ps_no: nstr(req.params.psNo, 20) }
        );
        await tx.exec(`DELETE FROM TF_PSS WHERE PS_ID='SA' AND PS_NO=@ps_no`, {
          ps_no: nstr(req.params.psNo, 20),
        });
        await insertTfPssLines(tx, 'SA', req.params.psNo, normalized, head?.os_no ?? existing.os_no, null);
      });
      await saveBillExtFields('InvCA', { head, lines: normalized });
      res.json({ ok: true });
    } catch (e) {
      console.error('[sales-shipments/update]', e);
      if (isExtFieldError(e)) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: '修改销货单失败' });
    }
  });

  app.delete('/api/sales-shipments/:psNo', async (req, res) => {
    try {
      const existing = await queryOne('SELECT 1 AS ok FROM MF_PSS WHERE PS_ID=@ps_id AND PS_NO=@ps_no', {
        ps_id: nstr('SA', 4),
        ps_no: nstr(req.params.psNo, 20),
      });
      if (!existing) return res.status(404).json({ error: '销货单不存在' });
      await withTransaction(async (tx) => {
        await reverseSaQtyPsOnDelete(tx, req.params.psNo);
        await deleteMfPssBill(tx, 'SA', req.params.psNo);
      });
      res.json({ ok: true });
    } catch (e) {
      console.error('[sales-shipments/delete]', e);
      res.status(500).json({ error: '删除销货单失败' });
    }
  });

  registerPssAuditRoutes(app, { path: 'sales-shipments', psId: 'SA', label: '销货单' });
}

function registerSalesReturnsRoutes(app) {
  app.get('/api/sales-returns/next-no', async (_req, res) => {
    try {
      res.json({ ps_no: await nextPsNo('SB') });
    } catch (e) {
      console.error('[sales-returns/next-no]', e);
      res.status(500).json({ error: '获取单号失败' });
    }
  });

  app.get('/api/sales-returns', async (req, res) => {
    const { q, limit = '50' } = req.query;
    try {
      const top = Math.min(parseInt(limit, 10) || 50, 200);
      let sqlText = `${MF_PSS_HEAD_SEL.replace('SELECT', `SELECT TOP (${top})`)} WHERE m.PS_ID = 'SB'`;
      const inputs = {};
      if (q) {
        sqlText += ' AND (m.PS_NO LIKE @q OR c.NAME LIKE @q OR m.OS_NO LIKE @q)';
        inputs.q = nstr(`%${q}%`, 200);
      }
      sqlText += ' ORDER BY m.PS_DD DESC, m.PS_NO DESC';
      res.json((await queryAll(sqlText, inputs)).map(rowToMfPss));
    } catch (e) {
      console.error('[sales-returns/list]', e);
      res.status(500).json({ error: '读取销货退回列表失败' });
    }
  });

  app.get('/api/sales-returns/:psNo', async (req, res) => {
    try {
      const head = await loadMfPssHead('SB', req.params.psNo);
      if (!head) return res.status(404).json({ error: '销货退回单不存在' });
      const lines = await loadTfPssLines('SB', req.params.psNo);
      res.json(await mergeBillExtFields('InvCB', rowToMfPss(head), lines));
    } catch (e) {
      console.error('[sales-returns/get]', e);
      res.status(500).json({ error: '读取销货退回单失败' });
    }
  });

  app.post('/api/sales-returns', async (req, res) => {
    const { head, lines } = req.body;
    if (!head?.cus_no) return res.status(400).json({ error: '请选择客户' });
    if (!lines?.length) return res.status(400).json({ error: '表身至少一行' });
    try {
      const ps_id = 'SB';
      const ps_no = head.ps_no || (await nextPsNo(ps_id));
      if (await queryOne('SELECT 1 AS ok FROM MF_PSS WHERE PS_NO=@ps_no', { ps_no: nstr(ps_no, 20) })) {
        return res.status(409).json({ error: '单号已存在' });
      }
      const tax_id = head.tax_id || '2';
      const normalized = normalizeLines(lines, tax_id);
      const totals = sumOrder(normalized.map((ln) => ({ ...ln, amtn: ln.amtn_net })), tax_id);
      await withTransaction(async (tx) => {
        const creator = pssCreatorInsert(req);
        await tx.exec(
          `INSERT INTO MF_PSS (PS_ID, PS_NO, PS_DD, CUS_NO, DEP, SAL_NO, CUS_OS_NO, BIL_TYPE, CUR_ID,
           TAX_ID, OS_ID, OS_NO, REM, DIS_CNT, AMTN_NET, TAX${creator.cols})
           VALUES (@ps_id, @ps_no, @ps_dd, @cus_no, @dep, @sal_no, @cus_os_no, @bil_type, @cur_id,
           @tax_id, @os_id, @os_no, @rem, @dis_cnt, @amtn_net, @tax${creator.vals})`,
          {
            ps_id: nstr(ps_id, 4),
            ps_no: nstr(ps_no, 20),
            ps_dd: ndate(head.ps_dd || new Date().toISOString().slice(0, 10)),
            cus_no: nstr(head.cus_no, 20),
            dep: nstr(head.dep, 10),
            sal_no: nstr(head.sal_no, 10),
            cus_os_no: nstr(head.cus_os_no, 50),
            bil_type: nstr(head.bil_type, 4),
            cur_id: nstr(head.cur_id, 4),
            tax_id: nstr(tax_id, 4),
            os_id: nstr(head.os_id || 'SA', 4),
            os_no: nstr(head.os_no, 20),
            rem: nstr(head.rem, 500),
            dis_cnt: nfloat(head.dis_cnt ?? 0),
            amtn_net: nfloat(totals.amtn_net),
            tax: nfloat(totals.tax),
            ...creator.params,
          }
        );
        for (const ln of normalized) {
          await tx.exec(
            `INSERT INTO TF_PSS (PS_ID, PS_NO, ITM, PRD_NO, PRD_NAME, WH, QTY, UT, UP, AMTN_NET, TAX_RTO, TAX,
             EST_DD, SUP_PRD_NO, REM, OS_ID, OS_NO, SRC_ITM)
             VALUES (@ps_id, @ps_no, @itm, @prd_no, @prd_name, @wh, @qty, @ut, @up, @amtn_net, @tax_rto, @tax,
             @est_dd, @sup_prd_no, @rem, @os_id, @os_no, @src_itm)`,
            {
              ps_id: nstr(ps_id, 4),
              ps_no: nstr(ps_no, 20),
              itm: nint(ln.itm),
              prd_no: nstr(ln.prd_no, 30),
              prd_name: nstr(ln.prd_name, 200),
              wh: nstr(ln.wh, 10),
              qty: nfloat(ln.qty ?? 0),
              ut: nstr(ln.ut, 10),
              up: nfloat(ln.up ?? 0),
              amtn_net: nfloat(ln.amtn_net ?? 0),
              tax_rto: nfloat(ln.tax_rto ?? 13),
              tax: nfloat(ln.tax ?? 0),
              est_dd: ndate(ln.est_dd),
              sup_prd_no: nstr(ln.sup_prd_no, 30),
              rem: nstr(ln.rem, 200),
              os_id: nstr(ln.os_id || 'SA', 4),
              os_no: nstr(ln.os_no || head.os_no || null, 20),
              src_itm: ln.src_itm == null ? { type: sql.Int, value: null } : nint(ln.src_itm),
            }
          );
          if (ln.os_no && ln.src_itm) {
            await tx.exec(
              `UPDATE TF_PSS SET QTY_RTN = COALESCE(QTY_RTN,0) + @qty WHERE PS_ID='SA' AND PS_NO=@os_no AND ITM=@itm`,
              { qty: nfloat(ln.qty ?? 0), os_no: nstr(ln.os_no, 20), itm: nint(ln.src_itm) }
            );
          }
        }
      });
      await saveBillExtFields('InvCB', { head, lines: normalized });
      const saved = await loadMfPssByPsNo(ps_no);
      const rawLines = await loadTfPssLines('SB', ps_no);
      res.status(201).json(await mergeBillExtFields('InvCB', rowToMfPss(saved), rawLines));
    } catch (e) {
      console.error('[sales-returns/create]', e);
      if (isExtFieldError(e)) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: '新增销货退回单失败' });
    }
  });

  app.put('/api/sales-returns/:psNo', async (req, res) => {
    try {
      const existing = await queryOne('SELECT * FROM MF_PSS WHERE PS_ID=@ps_id AND PS_NO=@ps_no', {
        ps_id: nstr('SB', 4),
        ps_no: nstr(req.params.psNo, 20),
      });
      if (!existing) return res.status(404).json({ error: '销货退回单不存在' });
      if (isBillAudited(existing)) return res.status(409).json({ error: '已审核单据不可修改' });
      const { head, lines } = req.body;
      if (!lines?.length) return res.status(400).json({ error: '表身至少一行' });
      const tax_id = head?.tax_id ?? existing.tax_id ?? '2';
      const normalized = normalizeLines(lines, tax_id);
      const totals = sumOrder(normalized.map((ln) => ({ ...ln, amtn: ln.amtn_net })), tax_id);
      await withTransaction(async (tx) => {
        await tx.exec(
          `UPDATE MF_PSS SET PS_DD=@ps_dd, CUS_NO=@cus_no, DEP=@dep, SAL_NO=@sal_no, CUS_OS_NO=@cus_os_no,
           BIL_TYPE=@bil_type, CUR_ID=@cur_id, TAX_ID=@tax_id, OS_ID=@os_id, OS_NO=@os_no, REM=@rem,
           DIS_CNT=@dis_cnt, AMTN_NET=@amtn_net, TAX=@tax WHERE PS_NO=@ps_no`,
          {
            ps_dd: ndate(head?.ps_dd ?? existing.ps_dd),
            cus_no: nstr(head?.cus_no ?? existing.cus_no, 20),
            dep: nstr(head?.dep ?? existing.dep, 10),
            sal_no: nstr(head?.sal_no ?? existing.sal_no, 10),
            cus_os_no: nstr(head?.cus_os_no ?? existing.cus_os_no, 50),
            bil_type: nstr(head?.bil_type ?? existing.bil_type, 4),
            cur_id: nstr(head?.cur_id ?? existing.cur_id, 4),
            tax_id: nstr(tax_id, 4),
            os_id: nstr(head?.os_id ?? existing.os_id, 4),
            os_no: nstr(head?.os_no ?? existing.os_no, 20),
            rem: nstr(head?.rem ?? existing.rem, 500),
            dis_cnt: nfloat(head?.dis_cnt ?? existing.dis_cnt),
            amtn_net: nfloat(totals.amtn_net),
            tax: nfloat(totals.tax),
            ps_no: nstr(req.params.psNo, 20),
          }
        );
        await tx.exec(`DELETE FROM TF_PSS WHERE PS_ID='SB' AND PS_NO=@ps_no`, {
          ps_no: nstr(req.params.psNo, 20),
        });
        for (const ln of normalized) {
          await tx.exec(
            `INSERT INTO TF_PSS (PS_ID, PS_NO, ITM, PRD_NO, PRD_NAME, WH, QTY, UT, UP, AMTN_NET, TAX_RTO, TAX,
             EST_DD, SUP_PRD_NO, REM, OS_ID, OS_NO, SRC_ITM)
             VALUES (@ps_id, @ps_no, @itm, @prd_no, @prd_name, @wh, @qty, @ut, @up, @amtn_net, @tax_rto, @tax,
             @est_dd, @sup_prd_no, @rem, @os_id, @os_no, @src_itm)`,
            {
              ps_id: nstr('SB', 4),
              ps_no: nstr(req.params.psNo, 20),
              itm: nint(ln.itm),
              prd_no: nstr(ln.prd_no, 30),
              prd_name: nstr(ln.prd_name, 200),
              wh: nstr(ln.wh, 10),
              qty: nfloat(ln.qty ?? 0),
              ut: nstr(ln.ut, 10),
              up: nfloat(ln.up ?? 0),
              amtn_net: nfloat(ln.amtn_net ?? 0),
              tax_rto: nfloat(ln.tax_rto ?? 13),
              tax: nfloat(ln.tax ?? 0),
              est_dd: ndate(ln.est_dd),
              sup_prd_no: nstr(ln.sup_prd_no, 30),
              rem: nstr(ln.rem, 200),
              os_id: nstr(ln.os_id || 'SA', 4),
              os_no: nstr(ln.os_no || head?.os_no || null, 20),
              src_itm: ln.src_itm == null ? { type: sql.Int, value: null } : nint(ln.src_itm),
            }
          );
        }
      });
      await saveBillExtFields('InvCB', { head, lines: normalized });
      res.json({ ok: true });
    } catch (e) {
      console.error('[sales-returns/update]', e);
      if (isExtFieldError(e)) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: '修改销货退回单失败' });
    }
  });

  app.delete('/api/sales-returns/:psNo', async (req, res) => {
    try {
      const existing = await queryOne('SELECT 1 AS ok FROM MF_PSS WHERE PS_ID=@ps_id AND PS_NO=@ps_no', {
        ps_id: nstr('SB', 4),
        ps_no: nstr(req.params.psNo, 20),
      });
      if (!existing) return res.status(404).json({ error: '销货退回单不存在' });
      await withTransaction(async (tx) => {
        await reverseSbQtyRtnOnDelete(tx, req.params.psNo);
        await deleteMfPssBill(tx, 'SB', req.params.psNo);
      });
      res.json({ ok: true });
    } catch (e) {
      console.error('[sales-returns/delete]', e);
      res.status(500).json({ error: '删除销货退回单失败' });
    }
  });

  registerPssAuditRoutes(app, { path: 'sales-returns', psId: 'SB', label: '销货退回单' });
}

function registerSalesAllowancesRoutes(app) {
  app.get('/api/sales-allowances/next-no', async (_req, res) => {
    try {
      res.json({ ps_no: await nextPsNo('SD') });
    } catch (e) {
      console.error('[sales-allowances/next-no]', e);
      res.status(500).json({ error: '获取单号失败' });
    }
  });

  app.get('/api/sales-allowances', async (req, res) => {
    const { q, limit = '50' } = req.query;
    try {
      const top = Math.min(parseInt(limit, 10) || 50, 200);
      let sqlText = `${MF_PSS_HEAD_SEL.replace('SELECT', `SELECT TOP (${top})`)} WHERE m.PS_ID = 'SD'`;
      const inputs = {};
      if (q) {
        sqlText += ' AND (m.PS_NO LIKE @q OR c.NAME LIKE @q OR m.OS_NO LIKE @q)';
        inputs.q = nstr(`%${q}%`, 200);
      }
      sqlText += ' ORDER BY m.PS_DD DESC, m.PS_NO DESC';
      res.json((await queryAll(sqlText, inputs)).map(rowToMfPss));
    } catch (e) {
      console.error('[sales-allowances/list]', e);
      res.status(500).json({ error: '读取销货折让列表失败' });
    }
  });

  app.get('/api/sales-allowances/:psNo', async (req, res) => {
    try {
      const head = await loadMfPssHead('SD', req.params.psNo);
      if (!head) return res.status(404).json({ error: '销货折让单不存在' });
      const lines = await loadTfPssLines('SD', req.params.psNo);
      res.json(await mergeBillExtFields('InvCC', rowToMfPss(head), lines));
    } catch (e) {
      console.error('[sales-allowances/get]', e);
      res.status(500).json({ error: '读取销货折让单失败' });
    }
  });

  app.post('/api/sales-allowances', async (req, res) => {
    const { head, lines } = req.body;
    if (!head?.cus_no) return res.status(400).json({ error: '请选择客户' });
    if (!lines?.length) return res.status(400).json({ error: '表身至少一行' });
    try {
      const ps_id = 'SD';
      const ps_no = head.ps_no || (await nextPsNo(ps_id));
      if (await queryOne('SELECT 1 AS ok FROM MF_PSS WHERE PS_NO=@ps_no', { ps_no: nstr(ps_no, 20) })) {
        return res.status(409).json({ error: '单号已存在' });
      }
      const tax_id = head.tax_id || '2';
      const normalized = normalizeLines(lines, tax_id, 'SA');
      const totals = sumOrder(normalized.map((ln) => ({ ...ln, amtn: ln.amtn_net })), tax_id);
      await withTransaction(async (tx) => {
        const creator = pssCreatorInsert(req);
        const bind = headBindToParams(
          mfPssHeadBind({ ...head, os_id: head.os_id || 'SA' }, null, tax_id, totals)
        );
        await tx.exec(
          `INSERT INTO MF_PSS (PS_ID, PS_NO, PS_DD, CUS_NO, DEP, SAL_NO, CUS_OS_NO, BIL_TYPE, CUR_ID,
           TAX_ID, OS_ID, OS_NO, ZHANG_ID, SEND_MTH, SEND_WH, ADR, PAY_MTH, PAY_DAYS, PAY_DD, CHK_DD,
           INV_NO, RP_NO, VOH_NO, CONTRACT, REM, DIS_CNT, AMTN_NET, TAX${creator.cols})
           VALUES (@ps_id, @ps_no, @ps_dd, @cus_no, @dep, @sal_no, @cus_os_no, @bil_type, @cur_id,
           @tax_id, @os_id, @os_no, @zhang_id, @send_mth, @send_wh, @adr, @pay_mth, @pay_days, @pay_dd, @chk_dd,
           @inv_no, @rp_no, @voh_no, @contract, @rem, @dis_cnt, @amtn_net, @tax${creator.vals})`,
          { ps_id: nstr(ps_id, 4), ps_no: nstr(ps_no, 20), ...bind, ...creator.params }
        );
        await insertTfPssLines(tx, ps_id, ps_no, normalized, head.os_no, null, 'SA');
      });
      await saveBillExtFields('InvCC', { head, lines: normalized });
      const saved = await loadMfPssByPsNo(ps_no);
      const rawLines = await loadTfPssLines('SD', ps_no);
      res.status(201).json(await mergeBillExtFields('InvCC', rowToMfPss(saved), rawLines));
    } catch (e) {
      console.error('[sales-allowances/create]', e);
      if (isExtFieldError(e)) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: '新增销货折让单失败' });
    }
  });

  app.put('/api/sales-allowances/:psNo', async (req, res) => {
    try {
      const existing = await queryOne('SELECT * FROM MF_PSS WHERE PS_ID=@ps_id AND PS_NO=@ps_no', {
        ps_id: nstr('SD', 4),
        ps_no: nstr(req.params.psNo, 20),
      });
      if (!existing) return res.status(404).json({ error: '销货折让单不存在' });
      if (isBillAudited(existing)) return res.status(409).json({ error: '已审核单据不可修改' });
      const { head, lines } = req.body;
      if (!lines?.length) return res.status(400).json({ error: '表身至少一行' });
      const tax_id = head?.tax_id ?? existing.tax_id ?? '2';
      const normalized = normalizeLines(lines, tax_id, 'SA');
      const totals = sumOrder(normalized.map((ln) => ({ ...ln, amtn: ln.amtn_net })), tax_id);
      await withTransaction(async (tx) => {
        const bind = headBindToParams(mfPssHeadBind(head, existing, tax_id, totals));
        await tx.exec(
          `UPDATE MF_PSS SET PS_DD=@ps_dd, CUS_NO=@cus_no, DEP=@dep, SAL_NO=@sal_no, CUS_OS_NO=@cus_os_no,
           BIL_TYPE=@bil_type, CUR_ID=@cur_id, TAX_ID=@tax_id, OS_ID=@os_id, OS_NO=@os_no, ZHANG_ID=@zhang_id,
           SEND_MTH=@send_mth, SEND_WH=@send_wh, ADR=@adr, PAY_MTH=@pay_mth, PAY_DAYS=@pay_days, PAY_DD=@pay_dd,
           CHK_DD=@chk_dd, INV_NO=@inv_no, RP_NO=@rp_no, VOH_NO=@voh_no, CONTRACT=@contract, REM=@rem,
           DIS_CNT=@dis_cnt, AMTN_NET=@amtn_net, TAX=@tax WHERE PS_NO=@ps_no`,
          { ...bind, ps_no: nstr(req.params.psNo, 20) }
        );
        await tx.exec(`DELETE FROM TF_PSS WHERE PS_ID='SD' AND PS_NO=@ps_no`, {
          ps_no: nstr(req.params.psNo, 20),
        });
        await insertTfPssLines(tx, 'SD', req.params.psNo, normalized, head?.os_no ?? existing.os_no, null, 'SA');
      });
      await saveBillExtFields('InvCC', { head, lines: normalized });
      res.json({ ok: true });
    } catch (e) {
      console.error('[sales-allowances/update]', e);
      if (isExtFieldError(e)) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: '修改销货折让单失败' });
    }
  });

  app.delete('/api/sales-allowances/:psNo', async (req, res) => {
    try {
      const existing = await queryOne('SELECT 1 AS ok FROM MF_PSS WHERE PS_ID=@ps_id AND PS_NO=@ps_no', {
        ps_id: nstr('SD', 4),
        ps_no: nstr(req.params.psNo, 20),
      });
      if (!existing) return res.status(404).json({ error: '销货折让单不存在' });
      await withTransaction(async (tx) => {
        await deleteMfPssBill(tx, 'SD', req.params.psNo);
      });
      res.json({ ok: true });
    } catch (e) {
      console.error('[sales-allowances/delete]', e);
      res.status(500).json({ error: '删除销货折让单失败' });
    }
  });

  registerPssAuditRoutes(app, { path: 'sales-allowances', psId: 'SD', label: '销货折让单' });
}

function registerMfPssCrud(app, cfg) {
  const { psId, path, label, defaultOsId, sourcePsId, updPosOsId, withFullHead, billMenuCode } = cfg;

  app.get(`/api/${path}/next-no`, async (_req, res) => {
    try {
      res.json({ ps_no: await nextPsNo(psId) });
    } catch (e) {
      console.error(`[${path}/next-no]`, e);
      res.status(500).json({ error: '获取单号失败' });
    }
  });

  app.get(`/api/${path}`, async (req, res) => {
    const { q, limit = '50' } = req.query;
    try {
      const top = Math.min(parseInt(limit, 10) || 50, 200);
      let sqlText = `${MF_PSS_HEAD_SEL.replace('SELECT', `SELECT TOP (${top})`)} WHERE m.PS_ID = @ps_id`;
      const inputs = { ps_id: nstr(psId, 4) };
      if (q) {
        sqlText += ' AND (m.PS_NO LIKE @q OR c.NAME LIKE @q OR m.OS_NO LIKE @q)';
        inputs.q = nstr(`%${q}%`, 200);
      }
      sqlText += ' ORDER BY m.PS_DD DESC, m.PS_NO DESC';
      res.json((await queryAll(sqlText, inputs)).map(rowToMfPss));
    } catch (e) {
      console.error(`[${path}/list]`, e);
      res.status(500).json({ error: `读取${label}列表失败` });
    }
  });

  if (sourcePsId) {
    app.get(`/api/${path}/open`, async (req, res) => {
      const { cus_no } = req.query;
      if (!cus_no) return res.status(400).json({ error: '请先选择厂商' });
      try {
        const rows = await queryAll(
          `SELECT DISTINCT m.PS_NO AS ps_no, CONVERT(varchar(10), m.PS_DD, 23) AS ps_dd,
           m.CUS_OS_NO AS cus_os_no, CAST(m.REM AS nvarchar(500)) AS rem
           FROM MF_PSS m
           JOIN TF_PSS t ON t.PS_ID=@src_ps_id AND t.PS_NO=m.PS_NO
           WHERE m.PS_ID=@src_ps_id AND m.CUS_NO=@cus_no
             AND (COALESCE(t.QTY,0) - COALESCE(t.QTY_RTN,0)) > 0.0001
           ORDER BY m.PS_DD DESC, m.PS_NO DESC`,
          { src_ps_id: nstr(sourcePsId, 4), cus_no: nstr(String(cus_no), 20) }
        );
        res.json(rows);
      } catch (e) {
        console.error(`[${path}/open]`, e);
        res.status(500).json({ error: `读取未退完${label}来源单失败` });
      }
    });

    app.get(`/api/${path}/:psNo/source-lines`, async (req, res) => {
      try {
        const head = await loadMfPssHead(sourcePsId, req.params.psNo);
        if (!head) return res.status(404).json({ error: `${label}来源单不存在` });
        let lines;
        if (cfg.forReturn) {
          lines = (
            await queryAll(
              `SELECT t.PS_ID AS ps_id, t.PS_NO AS ps_no, t.ITM AS itm, t.PRD_NO AS prd_no,
                CAST(t.PRD_NAME AS nvarchar(200)) AS prd_name, t.PRD_MARK AS prd_mark, t.WH AS wh,
                CAST(w.NAME AS nvarchar(100)) AS wh_name, t.QTY AS qty, t.UT AS ut, t.UP AS up,
                t.AMTN_NET AS amtn_net, t.TAX_RTO AS tax_rto, t.TAX AS tax,
                CONVERT(varchar(10), t.EST_DD, 23) AS est_dd, t.SUP_PRD_NO AS sup_prd_no,
                CAST(t.REM AS nvarchar(200)) AS rem, t.DIS_CNT AS dis_cnt, t.QTY1 AS qty1, t.BAT_NO AS bat_no,
                t.OS_ID AS os_id, t.OS_NO AS os_no, t.SRC_ITM AS src_itm, CAST(p.SPC AS nvarchar(200)) AS spc,
                t.QTY_RTN AS qty_rtn,
                (COALESCE(t.QTY,0) - COALESCE(t.QTY_RTN,0)) AS qty_open
               FROM TF_PSS t
               LEFT JOIN MY_WH w ON w.WH = t.WH
               LEFT JOIN PRDT p ON p.PRD_NO = t.PRD_NO
               WHERE t.PS_ID=@src_ps_id AND t.PS_NO=@ps_no
                 AND (COALESCE(t.QTY,0) - COALESCE(t.QTY_RTN,0)) > 0.0001
               ORDER BY t.ITM`,
              { src_ps_id: nstr(sourcePsId, 4), ps_no: nstr(req.params.psNo, 20) }
            )
          ).map((row) => ({ ...rowToTfPss(row), qty_open: row.qty_open, qty: row.qty_open }));
        } else {
          lines = (await loadTfPssLines(sourcePsId, req.params.psNo)).map((row) => ({
            ...row,
            qty: row.qty,
          }));
        }
        res.json({ head: rowToMfPss(head), lines });
      } catch (e) {
        console.error(`[${path}/source-lines]`, e);
        res.status(500).json({ error: `读取${label}来源明细失败` });
      }
    });
  }

  app.get(`/api/${path}/:psNo`, async (req, res) => {
    try {
      const head = await loadMfPssHead(psId, req.params.psNo);
      if (!head) return res.status(404).json({ error: `${label}不存在` });
      const lines = await loadTfPssLines(psId, req.params.psNo);
      res.json(await mergeBillExtFields(billMenuCode, rowToMfPss(head), lines));
    } catch (e) {
      console.error(`[${path}/get]`, e);
      res.status(500).json({ error: `读取${label}失败` });
    }
  });

  app.post(`/api/${path}`, async (req, res) => {
    const { head, lines } = req.body;
    if (!head?.cus_no) return res.status(400).json({ error: '请选择厂商' });
    if (!lines?.length) return res.status(400).json({ error: '表身至少一行' });
    try {
      const ps_no = head.ps_no || (await nextPsNo(psId));
      if (await queryOne('SELECT 1 AS ok FROM MF_PSS WHERE PS_NO=@ps_no', { ps_no: nstr(ps_no, 20) })) {
        return res.status(409).json({ error: '单号已存在' });
      }
      const tax_id = head.tax_id || '2';
      const normalized = normalizeLines(lines, tax_id, defaultOsId);
      const totals = sumOrder(normalized.map((ln) => ({ ...ln, amtn: ln.amtn_net })), tax_id);
      await withTransaction(async (tx) => {
        const creator = pssCreatorInsert(req);
        if (withFullHead) {
          const bind = headBindToParams(
            mfPssHeadBind({ ...head, os_id: head.os_id || defaultOsId }, null, tax_id, totals, defaultOsId)
          );
          await tx.exec(
            `INSERT INTO MF_PSS (PS_ID, PS_NO, PS_DD, CUS_NO, DEP, SAL_NO, CUS_OS_NO, BIL_TYPE, CUR_ID,
             TAX_ID, OS_ID, OS_NO, ZHANG_ID, SEND_MTH, SEND_WH, ADR, PAY_MTH, PAY_DAYS, PAY_DD, CHK_DD,
             INV_NO, RP_NO, VOH_NO, CONTRACT, REM, DIS_CNT, AMTN_NET, TAX${creator.cols})
             VALUES (@ps_id, @ps_no, @ps_dd, @cus_no, @dep, @sal_no, @cus_os_no, @bil_type, @cur_id,
             @tax_id, @os_id, @os_no, @zhang_id, @send_mth, @send_wh, @adr, @pay_mth, @pay_days, @pay_dd, @chk_dd,
             @inv_no, @rp_no, @voh_no, @contract, @rem, @dis_cnt, @amtn_net, @tax${creator.vals})`,
            { ps_id: nstr(psId, 4), ps_no: nstr(ps_no, 20), ...bind, ...creator.params }
          );
          await insertTfPssLines(tx, psId, ps_no, normalized, head.os_no, updPosOsId, defaultOsId);
        } else if (cfg.simpleReturn) {
          await tx.exec(
            `INSERT INTO MF_PSS (PS_ID, PS_NO, PS_DD, CUS_NO, DEP, SAL_NO, CUS_OS_NO, BIL_TYPE, CUR_ID,
             TAX_ID, OS_ID, OS_NO, REM, DIS_CNT, AMTN_NET, TAX${creator.cols})
             VALUES (@ps_id, @ps_no, @ps_dd, @cus_no, @dep, @sal_no, @cus_os_no, @bil_type, @cur_id,
             @tax_id, @os_id, @os_no, @rem, @dis_cnt, @amtn_net, @tax${creator.vals})`,
            {
              ps_id: nstr(psId, 4),
              ps_no: nstr(ps_no, 20),
              ps_dd: ndate(head.ps_dd || new Date().toISOString().slice(0, 10)),
              cus_no: nstr(head.cus_no, 20),
              dep: nstr(head.dep, 10),
              sal_no: nstr(head.sal_no, 10),
              cus_os_no: nstr(head.cus_os_no, 50),
              bil_type: nstr(head.bil_type, 4),
              cur_id: nstr(head.cur_id, 4),
              tax_id: nstr(tax_id, 4),
              os_id: nstr(head.os_id || defaultOsId, 4),
              os_no: nstr(head.os_no, 20),
              rem: nstr(head.rem, 500),
              dis_cnt: nfloat(head.dis_cnt ?? 0),
              amtn_net: nfloat(totals.amtn_net),
              tax: nfloat(totals.tax),
              ...creator.params,
            }
          );
          await insertSimpleReturnLines(tx, psId, ps_no, normalized, head, defaultOsId, sourcePsId);
        }
      });
      await saveBillExtFields(billMenuCode, { head, lines: normalized });
      const saved = await loadMfPssByPsNo(ps_no);
      const rawLines = await loadTfPssLines(psId, ps_no);
      res.status(201).json(await mergeBillExtFields(billMenuCode, rowToMfPss(saved), rawLines));
    } catch (e) {
      console.error(`[${path}/create]`, e);
      if (isExtFieldError(e)) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: `新增${label}失败` });
    }
  });

  app.put(`/api/${path}/:psNo`, async (req, res) => {
    try {
      const existing = await queryOne('SELECT * FROM MF_PSS WHERE PS_ID=@ps_id AND PS_NO=@ps_no', {
        ps_id: nstr(psId, 4),
        ps_no: nstr(req.params.psNo, 20),
      });
      if (!existing) return res.status(404).json({ error: `${label}不存在` });
      if (isBillAudited(existing)) return res.status(409).json({ error: '已审核单据不可修改' });
      const { head, lines } = req.body;
      if (!lines?.length) return res.status(400).json({ error: '表身至少一行' });
      const tax_id = head?.tax_id ?? existing.tax_id ?? '2';
      const normalized = normalizeLines(lines, tax_id, defaultOsId);
      const totals = sumOrder(normalized.map((ln) => ({ ...ln, amtn: ln.amtn_net })), tax_id);
      await withTransaction(async (tx) => {
        if (withFullHead) {
          const bind = headBindToParams(mfPssHeadBind(head, existing, tax_id, totals, defaultOsId));
          await tx.exec(
            `UPDATE MF_PSS SET PS_DD=@ps_dd, CUS_NO=@cus_no, DEP=@dep, SAL_NO=@sal_no, CUS_OS_NO=@cus_os_no,
             BIL_TYPE=@bil_type, CUR_ID=@cur_id, TAX_ID=@tax_id, OS_ID=@os_id, OS_NO=@os_no, ZHANG_ID=@zhang_id,
             SEND_MTH=@send_mth, SEND_WH=@send_wh, ADR=@adr, PAY_MTH=@pay_mth, PAY_DAYS=@pay_days, PAY_DD=@pay_dd,
             CHK_DD=@chk_dd, INV_NO=@inv_no, RP_NO=@rp_no, VOH_NO=@voh_no, CONTRACT=@contract, REM=@rem,
             DIS_CNT=@dis_cnt, AMTN_NET=@amtn_net, TAX=@tax WHERE PS_NO=@ps_no`,
            { ...bind, ps_no: nstr(req.params.psNo, 20) }
          );
          await tx.exec(`DELETE FROM TF_PSS WHERE PS_ID=@ps_id AND PS_NO=@ps_no`, {
            ps_id: nstr(psId, 4),
            ps_no: nstr(req.params.psNo, 20),
          });
          await insertTfPssLines(tx, psId, req.params.psNo, normalized, head?.os_no ?? existing.os_no, null, defaultOsId);
        } else if (cfg.simpleReturn) {
          await tx.exec(
            `UPDATE MF_PSS SET PS_DD=@ps_dd, CUS_NO=@cus_no, DEP=@dep, SAL_NO=@sal_no, CUS_OS_NO=@cus_os_no,
             BIL_TYPE=@bil_type, CUR_ID=@cur_id, TAX_ID=@tax_id, OS_ID=@os_id, OS_NO=@os_no, REM=@rem,
             DIS_CNT=@dis_cnt, AMTN_NET=@amtn_net, TAX=@tax WHERE PS_NO=@ps_no`,
            {
              ps_dd: ndate(head?.ps_dd ?? existing.ps_dd),
              cus_no: nstr(head?.cus_no ?? existing.cus_no, 20),
              dep: nstr(head?.dep ?? existing.dep, 10),
              sal_no: nstr(head?.sal_no ?? existing.sal_no, 10),
              cus_os_no: nstr(head?.cus_os_no ?? existing.cus_os_no, 50),
              bil_type: nstr(head?.bil_type ?? existing.bil_type, 4),
              cur_id: nstr(head?.cur_id ?? existing.cur_id, 4),
              tax_id: nstr(tax_id, 4),
              os_id: nstr(head?.os_id ?? existing.os_id, 4),
              os_no: nstr(head?.os_no ?? existing.os_no, 20),
              rem: nstr(head?.rem ?? existing.rem, 500),
              dis_cnt: nfloat(head?.dis_cnt ?? existing.dis_cnt),
              amtn_net: nfloat(totals.amtn_net),
              tax: nfloat(totals.tax),
              ps_no: nstr(req.params.psNo, 20),
            }
          );
          await tx.exec(`DELETE FROM TF_PSS WHERE PS_ID=@ps_id AND PS_NO=@ps_no`, {
            ps_id: nstr(psId, 4),
            ps_no: nstr(req.params.psNo, 20),
          });
          for (const ln of normalized) {
            await tx.exec(
              `INSERT INTO TF_PSS (PS_ID, PS_NO, ITM, PRD_NO, PRD_NAME, WH, QTY, UT, UP, AMTN_NET, TAX_RTO, TAX,
               EST_DD, SUP_PRD_NO, REM, OS_ID, OS_NO, SRC_ITM)
               VALUES (@ps_id, @ps_no, @itm, @prd_no, @prd_name, @wh, @qty, @ut, @up, @amtn_net, @tax_rto, @tax,
               @est_dd, @sup_prd_no, @rem, @os_id, @os_no, @src_itm)`,
              {
                ps_id: nstr(psId, 4),
                ps_no: nstr(req.params.psNo, 20),
                itm: nint(ln.itm),
                prd_no: nstr(ln.prd_no, 30),
                prd_name: nstr(ln.prd_name, 200),
                wh: nstr(ln.wh, 10),
                qty: nfloat(ln.qty ?? 0),
                ut: nstr(ln.ut, 10),
                up: nfloat(ln.up ?? 0),
                amtn_net: nfloat(ln.amtn_net ?? 0),
                tax_rto: nfloat(ln.tax_rto ?? 13),
                tax: nfloat(ln.tax ?? 0),
                est_dd: ndate(ln.est_dd),
                sup_prd_no: nstr(ln.sup_prd_no, 30),
                rem: nstr(ln.rem, 200),
                os_id: nstr(ln.os_id || defaultOsId, 4),
                os_no: nstr(ln.os_no || head?.os_no || null, 20),
                src_itm: ln.src_itm == null ? { type: sql.Int, value: null } : nint(ln.src_itm),
              }
            );
          }
        }
      });
      await saveBillExtFields(billMenuCode, { head, lines: normalized });
      res.json({ ok: true });
    } catch (e) {
      console.error(`[${path}/update]`, e);
      if (isExtFieldError(e)) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: `修改${label}失败` });
    }
  });

  app.delete(`/api/${path}/:psNo`, async (req, res) => {
    try {
      const existing = await queryOne('SELECT 1 AS ok FROM MF_PSS WHERE PS_ID=@ps_id AND PS_NO=@ps_no', {
        ps_id: nstr(psId, 4),
        ps_no: nstr(req.params.psNo, 20),
      });
      if (!existing) return res.status(404).json({ error: `${label}不存在` });
      await withTransaction(async (tx) => {
        if (cfg.onDelete) await cfg.onDelete(tx, req.params.psNo);
        await deleteMfPssBill(tx, psId, req.params.psNo);
      });
      res.json({ ok: true });
    } catch (e) {
      console.error(`[${path}/delete]`, e);
      res.status(500).json({ error: `删除${label}失败` });
    }
  });

  registerPssAuditRoutes(app, { path, psId, label });
}

function registerPurchaseReceiptExtraRoutes(app) {
  app.get('/api/purchase-receipts/open', async (req, res) => {
    const { cus_no } = req.query;
    if (!cus_no) return res.status(400).json({ error: '请先选择厂商' });
    try {
      const rows = await queryAll(
        `SELECT DISTINCT m.PS_NO AS ps_no, CONVERT(varchar(10), m.PS_DD, 23) AS ps_dd,
         m.CUS_OS_NO AS cus_os_no, CAST(m.REM AS nvarchar(500)) AS rem
         FROM MF_PSS m
         JOIN TF_PSS t ON t.PS_ID='PC' AND t.PS_NO=m.PS_NO
         WHERE m.PS_ID='PC' AND m.CUS_NO=@cus_no
           AND (COALESCE(t.QTY,0) - COALESCE(t.QTY_RTN,0)) > 0.0001
         ORDER BY m.PS_DD DESC, m.PS_NO DESC`,
        { cus_no: nstr(String(cus_no), 20) }
      );
      res.json(rows);
    } catch (e) {
      console.error('[purchase-receipts/open]', e);
      res.status(500).json({ error: '读取未退完进货单失败' });
    }
  });

  app.get('/api/purchase-receipts/:psNo/return-lines', async (req, res) => {
    try {
      const head = await loadMfPssHead('PC', req.params.psNo);
      if (!head) return res.status(404).json({ error: '进货单不存在' });
      const lines = (
        await queryAll(
          `SELECT t.PS_ID AS ps_id, t.PS_NO AS ps_no, t.ITM AS itm, t.PRD_NO AS prd_no,
            CAST(t.PRD_NAME AS nvarchar(200)) AS prd_name, t.PRD_MARK AS prd_mark, t.WH AS wh,
            CAST(w.NAME AS nvarchar(100)) AS wh_name, t.QTY AS qty, t.UT AS ut, t.UP AS up,
            t.AMTN_NET AS amtn_net, t.TAX_RTO AS tax_rto, t.TAX AS tax,
            CONVERT(varchar(10), t.EST_DD, 23) AS est_dd, t.SUP_PRD_NO AS sup_prd_no,
            CAST(t.REM AS nvarchar(200)) AS rem, t.DIS_CNT AS dis_cnt, t.QTY1 AS qty1, t.BAT_NO AS bat_no,
            t.OS_ID AS os_id, t.OS_NO AS os_no, t.SRC_ITM AS src_itm, CAST(p.SPC AS nvarchar(200)) AS spc,
            t.QTY_RTN AS qty_rtn,
            (COALESCE(t.QTY,0) - COALESCE(t.QTY_RTN,0)) AS qty_open
           FROM TF_PSS t
           LEFT JOIN MY_WH w ON w.WH = t.WH
           LEFT JOIN PRDT p ON p.PRD_NO = t.PRD_NO
           WHERE t.PS_ID='PC' AND t.PS_NO=@ps_no
             AND (COALESCE(t.QTY,0) - COALESCE(t.QTY_RTN,0)) > 0.0001
           ORDER BY t.ITM`,
          { ps_no: nstr(req.params.psNo, 20) }
        )
      ).map((row) => ({ ...rowToTfPss(row), qty_open: row.qty_open, qty: row.qty_open }));
      res.json({ head: rowToMfPss(head), lines });
    } catch (e) {
      console.error('[purchase-receipts/return-lines]', e);
      res.status(500).json({ error: '读取进货退回明细失败' });
    }
  });

  app.get('/api/purchase-receipts/:psNo/allowance-lines', async (req, res) => {
    try {
      const head = await loadMfPssHead('PC', req.params.psNo);
      if (!head) return res.status(404).json({ error: '进货单不存在' });
      const lines = (await loadTfPssLines('PC', req.params.psNo)).map((row) => ({
        ...row,
        qty: row.qty,
      }));
      res.json({ head: rowToMfPss(head), lines });
    } catch (e) {
      console.error('[purchase-receipts/allowance-lines]', e);
      res.status(500).json({ error: '读取进货折让明细失败' });
    }
  });
}

function registerMfPssRoutes(app) {
  registerSalesShipmentsRoutes(app);
  registerSalesReturnsRoutes(app);
  registerSalesAllowancesRoutes(app);
  registerMfPssCrud(app, {
    psId: 'PC',
    path: 'purchase-receipts',
    label: '进货单',
    billMenuCode: 'InvBA',
    defaultOsId: 'PO',
    updPosOsId: 'PO',
    withFullHead: true,
    onDelete: reversePcQtyPsOnDelete,
  });
  registerPurchaseReceiptExtraRoutes(app);
  registerMfPssCrud(app, {
    psId: 'PB',
    path: 'purchase-returns',
    label: '进货退回单',
    billMenuCode: 'InvBB',
    defaultOsId: 'PC',
    sourcePsId: 'PC',
    forReturn: true,
    simpleReturn: true,
    onDelete: reversePbQtyRtnOnDelete,
  });
  registerMfPssCrud(app, {
    psId: 'PD',
    path: 'purchase-allowances',
    label: '进货折让单',
    billMenuCode: 'InvBC',
    defaultOsId: 'PC',
    sourcePsId: 'PC',
    withFullHead: true,
  });
}

module.exports = { registerMfPssRoutes };
