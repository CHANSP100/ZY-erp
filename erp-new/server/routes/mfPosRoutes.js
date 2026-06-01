const { queryAll, queryOne, withTransaction, nstr, ndate, nfloat, nint } = require('../repositories/mssqlHelpers');
const { nextOsNo } = require('../repositories/mssqlNextNo');
const { buildPersistedQueryParts } = require('../extField');
const { persistBillExtFields, attachBillExtFields } = require('../extFieldPersist');
const {
  SQ_BIL_ID,
  reverseSqQtyPo,
  applySqQtyPo,
  assertSqLinesAvailable,
  linkSqPoNo,
  insertTfPosLine,
} = require('../sqPoTransferMssql');

const { BILL_AUDIT_SELECT, billUserId, isBillAudited, registerBillAuditRoutes } = require('../billAuditMeta');

const MF_POS_HEAD_SEL = `
  SELECT m.OS_ID AS os_id, m.OS_NO AS os_no, CONVERT(varchar(10), m.OS_DD, 23) AS os_dd,
    m.CUS_NO AS cus_no, m.USE_DEP AS use_dep, m.SAL_NO AS sal_no, m.CUS_OS_NO AS cus_os_no,
    m.BIL_TYPE AS bil_type, m.CUR_ID AS cur_id, m.TAX_ID AS tax_id,
    CONVERT(varchar(10), m.EST_DD, 23) AS est_dd, CAST(m.REM AS nvarchar(500)) AS rem,
    m.CLS_MP_ID AS cls_mp_id, m.CLS_ID AS cls_id, m.DIS_CNT AS dis_cnt,
    m.AMTN_NET AS amtn_net, m.TAX AS tax, m.BIL_ID AS bil_id, m.BIL_NO AS bil_no,
    CAST(c.NAME AS nvarchar(200)) AS cus_name,
    ${BILL_AUDIT_SELECT}
  FROM MF_POS m
  LEFT JOIN CUST c ON c.CUS_NO = m.CUS_NO`;

const TF_POS_LINE_SEL = `
  SELECT t.OS_ID AS os_id, t.OS_NO AS os_no, t.ITM AS itm, t.PRD_NO AS prd_no,
    CAST(t.PRD_NAME AS nvarchar(200)) AS prd_name, t.WH AS wh,
    CAST(w.NAME AS nvarchar(100)) AS wh_name, t.QTY AS qty, t.UT AS ut, t.UP AS up,
    t.AMTN AS amtn, t.TAX_RTO AS tax_rto, t.TAX AS tax,
    CONVERT(varchar(10), t.EST_DD, 23) AS est_dd, t.SUP_PRD_NO AS sup_prd_no,
    CAST(t.REM AS nvarchar(200)) AS rem, t.QTY_PS AS qty_ps,
    t.BIL_ID AS bil_id, t.QT_NO AS bil_no, t.OTH_ITM AS bil_itm,
    CAST(p.SPC AS nvarchar(200)) AS spc
  FROM TF_POS t
  LEFT JOIN MY_WH w ON w.WH = t.WH
  LEFT JOIN PRDT p ON p.PRD_NO = t.PRD_NO`;

async function loadMfPosHead(osId, osNo) {
  return queryOne(`${MF_POS_HEAD_SEL} WHERE m.OS_ID=@os_id AND m.OS_NO=@os_no`, {
    os_id: nstr(osId, 4),
    os_no: nstr(osNo, 20),
  });
}

async function loadMfPosByOsNo(osNo) {
  return queryOne(`${MF_POS_HEAD_SEL} WHERE m.OS_NO=@os_no`, { os_no: nstr(osNo, 20) });
}

async function loadTfPosLines(osId, osNo, rowToTfPos) {
  return (
    await queryAll(`${TF_POS_LINE_SEL} WHERE t.OS_ID=@os_id AND t.OS_NO=@os_no ORDER BY t.ITM`, {
      os_id: nstr(osId, 4),
      os_no: nstr(osNo, 20),
    })
  ).map(rowToTfPos);
}

async function insertTfPosLineSimple(tx, osId, osNo, ln, headEstDd) {
  await tx.exec(
    `INSERT INTO TF_POS (OS_ID, OS_NO, ITM, PRD_NO, PRD_NAME, WH, QTY, UT, UP, AMTN, TAX_RTO, TAX,
     EST_DD, SUP_PRD_NO, REM, QTY_PS)
     VALUES (@os_id, @os_no, @itm, @prd_no, @prd_name, @wh, @qty, @ut, @up, @amtn, @tax_rto, @tax,
     @est_dd, @sup_prd_no, @rem, @qty_ps)`,
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
    }
  );
}

function mfPosHeadParams(osId, osNo, head, taxId, totals) {
  return {
    os_id: nstr(osId, 4),
    os_no: nstr(osNo, 20),
    os_dd: ndate(head.os_dd || new Date().toISOString().slice(0, 10)),
    cus_no: nstr(head.cus_no, 20),
    use_dep: nstr(head.use_dep, 10),
    sal_no: nstr(head.sal_no, 10),
    cus_os_no: nstr(head.cus_os_no, 50),
    bil_type: nstr(head.bil_type, 4),
    cur_id: nstr(head.cur_id, 4),
    tax_id: nstr(taxId, 4),
    est_dd: ndate(head.est_dd),
    rem: nstr(head.rem, 500),
    cls_mp_id: nstr(head.cls_mp_id, 4),
    cls_id: nstr(head.cls_id, 4),
    dis_cnt: nfloat(head.dis_cnt ?? 0),
    amtn_net: nfloat(totals.amtn_net),
    tax: nfloat(totals.tax),
    bil_id: nstr(head.bil_id, 4),
    bil_no: nstr(head.bil_no, 20),
  };
}

function resolveBilFields(head, existing, normalized) {
  const bilId =
    head?.bil_id ??
    existing?.bil_id ??
    (normalized.some((ln) => ln.bil_id === SQ_BIL_ID) ? SQ_BIL_ID : null);
  const bilNo =
    head?.bil_no ??
    existing?.bil_no ??
    normalized.find((ln) => ln.bil_id === SQ_BIL_ID)?.bil_no ??
    null;
  return { bilId, bilNo };
}

function registerMfPosRoutes(app, deps, cfg) {
  const { calcLineAmounts, sumOrder, getCustomSqlExprs, rowToMfPos, rowToTfPos } = deps;
  const { osId, path, vendorLabel, linesMenu, shipPath, enableSqTransfer } = cfg;
  const label = osId === 'SO' ? '销售订单' : '采购单';
  const shippedMsg =
    osId === 'SO' ? '销售订单已有销货记录，不能删除' : '采购单已有进货记录，不能删除';

  app.get(`/api/${path}/next-no`, async (_req, res) => {
    try {
      res.json({ os_no: await nextOsNo(osId) });
    } catch (e) {
      console.error(`[${path}/next-no]`, e);
      res.status(500).json({ error: '获取单号失败' });
    }
  });

  app.get(`/api/${path}/open`, async (req, res) => {
    const { cus_no } = req.query;
    if (!cus_no) return res.status(400).json({ error: `请先选择${vendorLabel}` });
    try {
      const rows = await queryAll(
        `SELECT DISTINCT m.OS_NO AS os_no, CONVERT(varchar(10), m.OS_DD, 23) AS os_dd,
         m.CUS_OS_NO AS cus_os_no, CAST(m.REM AS nvarchar(500)) AS rem
         FROM MF_POS m
         JOIN TF_POS t ON t.OS_ID=@os_id AND t.OS_NO=m.OS_NO
         WHERE m.OS_ID=@os_id AND m.CUS_NO=@cus_no
           AND (COALESCE(t.QTY,0) - COALESCE(t.QTY_PS,0)) > 0.0001
         ORDER BY m.OS_DD DESC, m.OS_NO DESC`,
        { os_id: nstr(osId, 4), cus_no: nstr(String(cus_no), 20) }
      );
      res.json(rows);
    } catch (e) {
      console.error(`[${path}/open]`, e);
      res.status(500).json({ error: `读取未交完${label}失败` });
    }
  });

  app.get(`/api/${path}`, async (req, res) => {
    const { q, limit = '50', date_from, date_to } = req.query;
    try {
      const top = Math.min(parseInt(limit, 10) || 50, 200);
      let sqlText = `${MF_POS_HEAD_SEL.replace('SELECT', `SELECT TOP (${top})`)} WHERE m.OS_ID = @os_id`;
      const inputs = { os_id: nstr(osId, 4) };
      if (q) {
        sqlText += ' AND (m.OS_NO LIKE @q OR c.NAME LIKE @q OR m.CUS_OS_NO LIKE @q)';
        inputs.q = nstr(`%${q}%`, 200);
      }
      if (date_from) {
        sqlText += ' AND m.OS_DD >= @date_from';
        inputs.date_from = ndate(String(date_from));
      }
      if (date_to) {
        sqlText += ' AND m.OS_DD <= @date_to';
        inputs.date_to = ndate(String(date_to));
      }
      sqlText += ' ORDER BY m.OS_DD DESC, m.OS_NO DESC';
      res.json((await queryAll(sqlText, inputs)).map(rowToMfPos));
    } catch (e) {
      console.error(`[${path}/list]`, e);
      res.status(500).json({ error: `读取${label}列表失败` });
    }
  });

  app.get(`/api/${path}/lines`, async (req, res) => {
    const { q, os_no, cus_no, prd_no, date_from, date_to, limit = '500' } = req.query;
    try {
      const customExprs = getCustomSqlExprs(linesMenu);
      const extraSelect = customExprs.length
        ? `, ${customExprs.map((e) => `${e.sql_expr} AS ${e.col_key}`).join(', ')}`
        : '';
      const persisted = buildPersistedQueryParts(linesMenu, 'line');
      const top = Math.min(parseInt(String(limit), 10) || 500, 2000);
      let sqlText = `
        SELECT TOP (${top}) m.OS_NO AS os_no, CONVERT(varchar(10), m.OS_DD, 23) AS os_dd,
          CONVERT(varchar(10), m.EST_DD, 23) AS est_dd, m.CUS_NO AS cus_no,
          CAST(c.NAME AS nvarchar(200)) AS cus_name, m.CUS_OS_NO AS cus_os_no,
          m.SAL_NO AS sal_no, CAST(s.NAME AS nvarchar(100)) AS sal_name,
          m.USE_DEP AS use_dep, CAST(d.NAME AS nvarchar(100)) AS dep_name, m.CLS_ID AS cls_id,
          t.ITM AS itm, t.PRD_NO AS prd_no, CAST(t.PRD_NAME AS nvarchar(200)) AS prd_name,
          CAST(p.SPC AS nvarchar(200)) AS spc, t.SUP_PRD_NO AS sup_prd_no, t.WH AS wh,
          CAST(w.NAME AS nvarchar(100)) AS wh_name, t.QTY AS qty, t.QTY_PS AS qty_ps,
          (COALESCE(t.QTY, 0) - COALESCE(t.QTY_PS, 0)) AS qty_open,
          t.UT AS ut, t.UP AS up, t.AMTN AS amtn, t.TAX AS tax, t.TAX_RTO AS tax_rto,
          CONVERT(varchar(10), t.EST_DD, 23) AS line_est_dd, CAST(t.REM AS nvarchar(200)) AS line_rem
          ${extraSelect}${persisted.select}
        FROM MF_POS m
        JOIN TF_POS t ON t.OS_ID = @os_id AND t.OS_NO = m.OS_NO
        LEFT JOIN CUST c ON c.CUS_NO = m.CUS_NO
        LEFT JOIN SALM s ON s.SAL_NO = m.SAL_NO
        LEFT JOIN DEPT d ON d.DEP = m.USE_DEP
        LEFT JOIN PRDT p ON p.PRD_NO = t.PRD_NO
        LEFT JOIN MY_WH w ON w.WH = t.WH
        ${persisted.join}
        WHERE m.OS_ID = @os_id`;
      const inputs = { os_id: nstr(osId, 4) };
      if (os_no) {
        sqlText += ' AND m.OS_NO LIKE @os_no';
        inputs.os_no = nstr(`%${String(os_no)}%`, 20);
      }
      if (cus_no) {
        sqlText += ' AND (m.CUS_NO LIKE @cus_no OR c.NAME LIKE @cus_no)';
        inputs.cus_no = nstr(`%${String(cus_no)}%`, 200);
      }
      if (prd_no) {
        sqlText += ' AND (t.PRD_NO LIKE @prd_no OR t.PRD_NAME LIKE @prd_no OR p.SPC LIKE @prd_no)';
        inputs.prd_no = nstr(`%${String(prd_no)}%`, 200);
      }
      if (date_from) {
        sqlText += ' AND m.OS_DD >= @date_from';
        inputs.date_from = ndate(String(date_from));
      }
      if (date_to) {
        sqlText += ' AND m.OS_DD <= @date_to';
        inputs.date_to = ndate(String(date_to));
      }
      if (q) {
        sqlText +=
          ' AND (m.OS_NO LIKE @q OR c.NAME LIKE @q OR m.CUS_OS_NO LIKE @q OR t.PRD_NO LIKE @q OR t.PRD_NAME LIKE @q)';
        inputs.q = nstr(`%${String(q)}%`, 200);
      }
      sqlText += ' ORDER BY m.OS_DD DESC, m.OS_NO DESC, t.ITM';
      res.json(await queryAll(sqlText, inputs));
    } catch (e) {
      console.error(`[${path}/lines]`, e);
      res.status(500).json({ error: `读取${label}明细失败` });
    }
  });

  app.get(`/api/${path}/:osNo/${shipPath}`, async (req, res) => {
    try {
      const head = await loadMfPosHead(osId, req.params.osNo);
      if (!head) return res.status(404).json({ error: `${label}不存在` });
      const lines = (
        await queryAll(
          `${TF_POS_LINE_SEL.replace(
            'CAST(p.SPC AS nvarchar(200)) AS spc',
            'CAST(p.SPC AS nvarchar(200)) AS spc, (COALESCE(t.QTY,0) - COALESCE(t.QTY_PS,0)) AS qty_open'
          )} WHERE t.OS_ID=@os_id AND t.OS_NO=@os_no
             AND (COALESCE(t.QTY,0) - COALESCE(t.QTY_PS,0)) > 0.0001
           ORDER BY t.ITM`,
          { os_id: nstr(osId, 4), os_no: nstr(req.params.osNo, 20) }
        )
      ).map((row) => ({
        ...rowToTfPos(row),
        qty_open: row.qty_open,
        qty: row.qty_open,
      }));
      res.json({ head: rowToMfPos(head), lines });
    } catch (e) {
      console.error(`[${path}/${shipPath}]`, e);
      res.status(500).json({ error: `读取${label}未交明细失败` });
    }
  });

  app.get(`/api/${path}/:osNo`, async (req, res) => {
    try {
      const head = await loadMfPosHead(osId, req.params.osNo);
      if (!head) return res.status(404).json({ error: `${label}不存在` });
      const rawLines = await loadTfPosLines(osId, req.params.osNo, rowToTfPos);
      const merged = await attachBillExtFields(linesMenu, rowToMfPos(head), rawLines);
      res.json(merged);
    } catch (e) {
      console.error(`[${path}/get]`, e);
      res.status(500).json({ error: `读取${label}失败` });
    }
  });

  app.post(`/api/${path}`, async (req, res) => {
    const { head, lines } = req.body;
    if (!head?.cus_no) return res.status(400).json({ error: `请选择${vendorLabel}` });
    if (!lines?.length) return res.status(400).json({ error: '表身至少一行' });
    try {
      const os_no = head.os_no || (await nextOsNo(osId));
      if (await queryOne('SELECT 1 AS ok FROM MF_POS WHERE OS_NO=@os_no', { os_no: nstr(os_no, 20) })) {
        return res.status(409).json({ error: '单号已存在' });
      }
      const tax_id = head.tax_id || '2';
      const normalized = lines.map((ln, i) => {
        const c = calcLineAmounts(ln.qty, ln.up, tax_id, ln.tax_rto ?? 13);
        return { ...ln, itm: i + 1, amtn: c.amtn, tax: c.tax };
      });
      const totals = sumOrder(normalized, tax_id);

      await withTransaction(async (tx) => {
        let bilId = null;
        let bilNo = null;
        if (enableSqTransfer) {
          const bil = resolveBilFields(head, null, normalized);
          bilId = bil.bilId;
          bilNo = bil.bilNo;
          await assertSqLinesAvailable(tx, normalized);
        }
        const hp = mfPosHeadParams(osId, os_no, { ...head, bil_id: bilId, bil_no: bilNo }, tax_id, totals);
        const creator = billUserId(req);
        await tx.exec(
          `INSERT INTO MF_POS (OS_ID, OS_NO, OS_DD, CUS_NO, USE_DEP, SAL_NO, CUS_OS_NO, BIL_TYPE, CUR_ID,
           TAX_ID, EST_DD, REM, CLS_MP_ID, CLS_ID, DIS_CNT, AMTN_NET, TAX, BIL_ID, BIL_NO${creator ? ', USR, SYS_DATE' : ''})
           VALUES (@os_id, @os_no, @os_dd, @cus_no, @use_dep, @sal_no, @cus_os_no, @bil_type, @cur_id,
           @tax_id, @est_dd, @rem, @cls_mp_id, @cls_id, @dis_cnt, @amtn_net, @tax, @bil_id, @bil_no${creator ? ', @usr, GETDATE()' : ''})`,
          { ...hp, ...(creator ? { usr: creator } : {}) }
        );
        for (const ln of normalized) {
          if (enableSqTransfer) {
            await insertTfPosLine(tx, osId, os_no, ln, head.est_dd);
          } else {
            await insertTfPosLineSimple(tx, osId, os_no, ln, head.est_dd);
          }
        }
        if (enableSqTransfer) {
          await applySqQtyPo(tx, normalized);
          if (bilId === SQ_BIL_ID && bilNo) await linkSqPoNo(tx, bilNo, os_no);
        }
      });

      await persistBillExtFields(linesMenu, { head, lines: normalized });

      const saved = await loadMfPosByOsNo(os_no);
      const rawLines = await loadTfPosLines(osId, os_no, rowToTfPos);
      const merged = await attachBillExtFields(linesMenu, rowToMfPos(saved), rawLines);
      res.status(201).json(merged);
    } catch (e) {
      console.error(`[${path}/create]`, e);
      const msg = e?.message ? String(e.message) : '';
      if (msg && (enableSqTransfer || msg.includes('扩展字段'))) {
        return res.status(400).json({ error: msg });
      }
      res.status(500).json({ error: msg ? `新增${label}失败：${msg}` : `新增${label}失败` });
    }
  });

  app.put(`/api/${path}/:osNo`, async (req, res) => {
    try {
      const existing = await queryOne('SELECT * FROM MF_POS WHERE OS_ID=@os_id AND OS_NO=@os_no', {
        os_id: nstr(osId, 4),
        os_no: nstr(req.params.osNo, 20),
      });
      if (!existing) return res.status(404).json({ error: `${label}不存在` });
      if (isBillAudited(existing)) return res.status(409).json({ error: '已审核单据不可修改' });
      const { head, lines } = req.body;
      if (!lines?.length) return res.status(400).json({ error: '表身至少一行' });

      const tax_id = head?.tax_id ?? existing.tax_id ?? '2';
      const normalized = lines.map((ln, i) => {
        const c = calcLineAmounts(ln.qty, ln.up, tax_id, ln.tax_rto ?? 13);
        return { ...ln, itm: i + 1, amtn: c.amtn, tax: c.tax };
      });
      const totals = sumOrder(normalized, tax_id);

      await withTransaction(async (tx) => {
        let bilId = null;
        let bilNo = null;
        if (enableSqTransfer) {
          await reverseSqQtyPo(tx, osId, req.params.osNo);
          await assertSqLinesAvailable(tx, normalized);
          const bil = resolveBilFields(head, existing, normalized);
          bilId = bil.bilId;
          bilNo = bil.bilNo;
        }
        await tx.exec(
          `UPDATE MF_POS SET OS_DD=@os_dd, CUS_NO=@cus_no, USE_DEP=@use_dep, SAL_NO=@sal_no, CUS_OS_NO=@cus_os_no,
           BIL_TYPE=@bil_type, CUR_ID=@cur_id, TAX_ID=@tax_id, EST_DD=@est_dd, REM=@rem, CLS_MP_ID=@cls_mp_id,
           CLS_ID=@cls_id, DIS_CNT=@dis_cnt, AMTN_NET=@amtn_net, TAX=@tax, BIL_ID=@bil_id, BIL_NO=@bil_no
           WHERE OS_NO=@os_no`,
          {
            os_dd: ndate(head?.os_dd ?? existing.os_dd),
            cus_no: nstr(head?.cus_no ?? existing.cus_no, 20),
            use_dep: nstr(head?.use_dep ?? existing.use_dep, 10),
            sal_no: nstr(head?.sal_no ?? existing.sal_no, 10),
            cus_os_no: nstr(head?.cus_os_no ?? existing.cus_os_no, 50),
            bil_type: nstr(head?.bil_type ?? existing.bil_type, 4),
            cur_id: nstr(head?.cur_id ?? existing.cur_id, 4),
            tax_id: nstr(tax_id, 4),
            est_dd: ndate(head?.est_dd ?? existing.est_dd),
            rem: nstr(head?.rem ?? existing.rem, 500),
            cls_mp_id: nstr(head?.cls_mp_id ?? existing.cls_mp_id, 4),
            cls_id: nstr(head?.cls_id ?? existing.cls_id, 4),
            dis_cnt: nfloat(head?.dis_cnt ?? existing.dis_cnt),
            amtn_net: nfloat(totals.amtn_net),
            tax: nfloat(totals.tax),
            bil_id: nstr(enableSqTransfer ? bilId : head?.bil_id ?? existing.bil_id, 4),
            bil_no: nstr(enableSqTransfer ? bilNo : head?.bil_no ?? existing.bil_no, 20),
            os_no: nstr(req.params.osNo, 20),
          }
        );
        await tx.exec(`DELETE FROM TF_POS WHERE OS_ID=@os_id AND OS_NO=@os_no`, {
          os_id: nstr(osId, 4),
          os_no: nstr(req.params.osNo, 20),
        });
        for (const ln of normalized) {
          if (enableSqTransfer) {
            await insertTfPosLine(tx, osId, req.params.osNo, ln, head?.est_dd ?? existing.est_dd);
          } else {
            await insertTfPosLineSimple(tx, osId, req.params.osNo, ln, head?.est_dd ?? existing.est_dd);
          }
        }
        if (enableSqTransfer) {
          await applySqQtyPo(tx, normalized);
          if (bilId === SQ_BIL_ID && bilNo) await linkSqPoNo(tx, bilNo, req.params.osNo);
        }
      });

      await persistBillExtFields(linesMenu, { head, lines: normalized });

      res.json({ ok: true });
    } catch (e) {
      console.error(`[${path}/update]`, e);
      const msg = e?.message ? String(e.message) : '';
      if (msg && (enableSqTransfer || msg.includes('扩展字段'))) {
        return res.status(400).json({ error: msg });
      }
      res.status(500).json({ error: msg ? `修改${label}失败：${msg}` : `修改${label}失败` });
    }
  });

  app.delete(`/api/${path}/:osNo`, async (req, res) => {
    try {
      const existing = await queryOne('SELECT 1 AS ok FROM MF_POS WHERE OS_ID=@os_id AND OS_NO=@os_no', {
        os_id: nstr(osId, 4),
        os_no: nstr(req.params.osNo, 20),
      });
      if (!existing) return res.status(404).json({ error: `${label}不存在` });
      const shipped = await queryOne(
        `SELECT TOP 1 1 AS ok FROM TF_POS WHERE OS_ID=@os_id AND OS_NO=@os_no AND COALESCE(QTY_PS,0) > 0.0001`,
        { os_id: nstr(osId, 4), os_no: nstr(req.params.osNo, 20) }
      );
      if (shipped) return res.status(409).json({ error: shippedMsg });
      await withTransaction(async (tx) => {
        if (enableSqTransfer) await reverseSqQtyPo(tx, osId, req.params.osNo);
        await tx.exec(`DELETE FROM TF_POS WHERE OS_ID=@os_id AND OS_NO=@os_no`, {
          os_id: nstr(osId, 4),
          os_no: nstr(req.params.osNo, 20),
        });
        await tx.exec(`DELETE FROM MF_POS WHERE OS_ID=@os_id AND OS_NO=@os_no`, {
          os_id: nstr(osId, 4),
          os_no: nstr(req.params.osNo, 20),
        });
      });
      res.json({ ok: true });
    } catch (e) {
      console.error(`[${path}/delete]`, e);
      res.status(500).json({ error: `删除${label}失败` });
    }
  });

  registerBillAuditRoutes(app, {
    apiPath: path,
    billNoParam: 'osNo',
    label,
    table: 'MF_POS',
    whereSql: 'OS_ID=@os_id AND OS_NO=@os_no',
    buildParams: (req) => ({ os_id: nstr(osId, 4), os_no: nstr(req.params.osNo, 20) }),
    loadHeadRow: async (req) => loadMfPosByOsNo(req.params.osNo),
  });
}

function registerAllMfPosRoutes(app, deps) {
  registerMfPosRoutes(app, deps, {
    osId: 'SO',
    path: 'sales-orders',
    vendorLabel: '客户',
    linesMenu: 'InvAD',
    shipPath: 'ship-lines',
    enableSqTransfer: false,
  });
  registerMfPosRoutes(app, deps, {
    osId: 'PO',
    path: 'purchase-orders',
    vendorLabel: '厂商',
    linesMenu: 'InvAF',
    shipPath: 'receipt-lines',
    enableSqTransfer: true,
  });
}

module.exports = { registerMfPosRoutes, registerAllMfPosRoutes };
