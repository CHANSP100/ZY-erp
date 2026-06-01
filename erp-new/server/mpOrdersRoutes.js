const { queryAll, queryOne, withTransaction, nstr, ndate, nfloat, nint } = require('./repositories/mssqlHelpers');
const { nextMpNo, nextMoNo } = require('./repositories/mssqlNextNo');
const { saveBillExtFields, mergeBillExtFields, isExtFieldError } = require('./billExtFieldHook');
const {
  BILL_AUDIT_SELECT,
  billUserId,
  billAuditFields,
  isBillAudited,
  auditBillHead,
  unauditBillHead,
} = require('./billAuditMeta');

const MF_MP_HEAD_SEL = `
  SELECT h.MP_NO AS mp_no, CONVERT(varchar(10), h.MP_DD, 23) AS mp_dd,
    CONVERT(varchar(10), h.EST_DD, 23) AS est_dd,
    h.DEP AS dep, h.SO_NO AS so_no, CAST(h.WH AS nvarchar(2000)) AS wh,
    h.BIL_TYPE AS bil_type, CAST(h.REM AS nvarchar(500)) AS rem,
    h.CANCEL_ID AS cancel_id,
    CAST(d.NAME AS nvarchar(100)) AS dep_name,
    ${BILL_AUDIT_SELECT.replace(/m\./g, 'h.')}
  FROM MF_MP h
  LEFT JOIN DEPT d ON d.DEP = h.DEP`;

const TF_MP1_SEL = `
  SELECT t.MP_NO AS mp_no, t.ITM AS itm, t.MRP_NO AS mrp_no, t.PRD_NO AS prd_no,
    CAST(t.PRD_NAME AS nvarchar(200)) AS prd_name, t.PRD_MARK AS prd_mark,
    t.WH AS wh, t.UNIT AS unit, t.SO_NO AS so_no,
    CONVERT(varchar(10), t.EST_DD, 23) AS est_dd,
    t.QTY_SO AS qty_so, t.QTY_NON AS qty_non, t.QTY_MIN AS qty_min,
    t.QTY_ON_WAY AS qty_on_way, t.QTY_ON_PRC AS qty_on_prc, t.QTY_ON_RSV AS qty_on_rsv,
    t.QTY AS qty, t.QTY_PO AS qty_po, t.QTY_SQ AS qty_sq,
    t.ID_NO AS id_no, t.BOM_NO AS bom_no, t.PO_YES AS po_yes,
    CAST(t.REM AS nvarchar(400)) AS rem, t.EST_ITM AS est_itm
  FROM TF_MP1 t`;

const TF_MP2_SEL = `
  SELECT t.MP_NO AS mp_no, t.ITM AS itm, t.PRD_NO AS prd_no,
    CAST(t.PRD_NAME AS nvarchar(200)) AS prd_name, t.PRD_MARK AS prd_mark,
    t.WH AS wh, t.CUS_NO AS cus_no, t.UNIT AS unit,
    t.QTY AS qty, t.QTY_PO AS qty_po, t.UP_PO AS up_po, t.AMTN_PO AS amtn_po,
    CONVERT(varchar(10), t.EST_DD, 23) AS est_dd, t.SO_NO AS so_no, t.PO_NO AS po_no,
    t.BAT_NO AS bat_no, t.CUR_ID AS cur_id, t.SUP_PRD_NO AS sup_prd_no,
    CAST(t.REM AS nvarchar(400)) AS rem
  FROM TF_MP2 t`;

const TF_MP3_SEL = `
  SELECT t.MP_NO AS mp_no, t.ITM AS itm, t.PRD_NO AS prd_no,
    CAST(t.PRD_NAME AS nvarchar(200)) AS prd_name, t.PRD_MARK AS prd_mark,
    t.WH AS wh, t.UNIT AS unit, t.QTY AS qty, t.QTY_MO AS qty_mo,
    CONVERT(varchar(10), t.STA_DD, 23) AS sta_dd,
    CONVERT(varchar(10), t.END_DD, 23) AS end_dd,
    t.DEP AS dep, t.MO_NO AS mo_no, t.ID_NO AS id_no, t.BOM_NO AS bom_no,
    t.SO_NO AS so_no, CONVERT(varchar(10), t.EST_DD, 23) AS est_dd,
    t.TW_ID AS tw_id, CAST(t.REM AS nvarchar(400)) AS rem
  FROM TF_MP3 t`;

const MF_POS_HEAD_FOR_MP = `
  SELECT m.OS_NO AS os_no, CONVERT(varchar(10), m.OS_DD, 23) AS os_dd,
    m.USE_DEP AS use_dep, m.BIL_TYPE AS bil_type,
    CONVERT(varchar(10), m.EST_DD, 23) AS est_dd
  FROM MF_POS m`;

const TF_POS_FOR_MP = `
  SELECT t.ITM AS itm, t.PRD_NO AS prd_no, CAST(t.PRD_NAME AS nvarchar(200)) AS prd_name,
    t.PRD_MARK AS prd_mark, t.WH AS wh, t.UT AS ut, t.QTY AS qty, t.QTY_PS AS qty_ps,
    CONVERT(varchar(10), t.EST_DD, 23) AS est_dd, CAST(t.REM AS nvarchar(200)) AS rem,
    m.CLS_MP_ID AS cls_mp_id
  FROM TF_POS t
  INNER JOIN MF_POS m ON m.OS_ID = t.OS_ID AND m.OS_NO = t.OS_NO`;

function parseWhList(whStr) {
  return String(whStr || '')
    .split(/[,;，；\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function loadMfMpHead(mpNo) {
  return queryOne(`${MF_MP_HEAD_SEL} WHERE h.MP_NO = @mp_no`, { mp_no: nstr(mpNo, 20) });
}

async function loadTfMp1Lines(mpNo, rowToTfMp1) {
  return (
    await queryAll(`${TF_MP1_SEL} WHERE t.MP_NO = @mp_no ORDER BY t.ITM`, { mp_no: nstr(mpNo, 20) })
  ).map(rowToTfMp1);
}

async function loadTfMp2Lines(mpNo, rowToTfMp2) {
  return (
    await queryAll(`${TF_MP2_SEL} WHERE t.MP_NO = @mp_no ORDER BY t.ITM`, { mp_no: nstr(mpNo, 20) })
  ).map(rowToTfMp2);
}

async function loadTfMp3Lines(mpNo, rowToTfMp3) {
  return (
    await queryAll(`${TF_MP3_SEL} WHERE t.MP_NO = @mp_no ORDER BY t.ITM`, { mp_no: nstr(mpNo, 20) })
  ).map(rowToTfMp3);
}

async function loadStockInWhs(prdNo, whList) {
  if (!prdNo || !whList.length) return 0;
  const placeholders = whList.map((_, i) => `@wh${i}`).join(',');
  const params = { prd_no: nstr(prdNo, 30) };
  whList.forEach((w, i) => {
    params[`wh${i}`] = nstr(w, 12);
  });
  const row = await queryOne(
    `SELECT COALESCE(SUM(QTY), 0) AS qty FROM PRDT1 WHERE PRD_NO = @prd_no AND WH IN (${placeholders})`,
    params
  );
  return row ? Number(row.qty) || 0 : 0;
}

async function loadQtyOnRsv(prdNo) {
  const row = await queryOne(
    `SELECT COALESCE(SUM(CASE WHEN t.QTY > COALESCE(t.QTY_PS, 0) THEN t.QTY - COALESCE(t.QTY_PS, 0) ELSE 0 END), 0) AS qty
     FROM TF_POS t
     WHERE t.OS_ID = 'SO' AND t.PRD_NO = @prd_no`,
    { prd_no: nstr(prdNo, 30) }
  );
  return row ? Math.round((Number(row.qty) || 0) * 100) / 100 : 0;
}

async function loadQtyOnWay(prdNo) {
  const row = await queryOne(
    `SELECT COALESCE(SUM(CASE WHEN t.QTY > COALESCE(t.QTY_RK, 0) THEN t.QTY - COALESCE(t.QTY_RK, 0) ELSE 0 END), 0) AS qty
     FROM TF_POS t
     INNER JOIN MF_POS m ON m.OS_ID = t.OS_ID AND m.OS_NO = t.OS_NO
       AND m.OS_ID = 'PO' AND m.CHK_MAN IS NOT NULL AND m.CHK_MAN <> ''
     WHERE t.PRD_NO = @prd_no`,
    { prd_no: nstr(prdNo, 30) }
  );
  return row ? Math.round((Number(row.qty) || 0) * 100) / 100 : 0;
}

async function loadQtyOnPrc(prdNo) {
  const row = await queryOne(
    `SELECT COALESCE(SUM(CASE WHEN COALESCE(m.QTY, 0) > COALESCE(m.QTY_FIN, 0)
      THEN COALESCE(m.QTY, 0) - COALESCE(m.QTY_FIN, 0) ELSE 0 END), 0) AS qty
     FROM MF_MO m
     WHERE m.MRP_NO = @prd_no AND m.CHK_MAN IS NOT NULL AND m.CHK_MAN <> ''
       AND (m.CLOSE_ID IS NULL OR m.CLOSE_ID <> 'T')`,
    { prd_no: nstr(prdNo, 30) }
  );
  return row ? Math.round((Number(row.qty) || 0) * 100) / 100 : 0;
}

async function loadPrdtMeta(prdNo) {
  return queryOne(
    `SELECT WH AS wh, UT AS unit, CAST(NAME AS nvarchar(200)) AS name,
      COALESCE(QTY_MIN, 0) AS qty_min, KND AS knd, COALESCE(UPR, 0) AS upr,
      CUS_NO AS cus_no, CUR_ID AS cur_id
     FROM PRDT WHERE PRD_NO = @prd_no`,
    { prd_no: nstr(prdNo, 30) }
  );
}

function mfMpHeadParams(mpNo, head) {
  return {
    mp_no: nstr(mpNo, 20),
    mp_dd: ndate(head.mp_dd || new Date().toISOString().slice(0, 10)),
    est_dd: ndate(head.est_dd || head.mp_dd),
    dep: nstr(head.dep, 8),
    so_no: nstr(head.so_no, 25),
    wh: nstr(head.wh, 2000),
    bil_type: nstr(head.bil_type, 2),
    rem: nstr(head.rem, 500),
    cancel_id: nstr(head.cancel_id, 1),
  };
}

async function insertTfMp1Line(tx, mpNo, ln) {
  await tx.exec(
    `INSERT INTO TF_MP1 (MP_NO, ITM, MRP_NO, PRD_NO, PRD_NAME, PRD_MARK, WH, UNIT, SO_NO, EST_DD,
     QTY_SO, QTY_NON, QTY_MIN, QTY_ON_WAY, QTY_ON_PRC, QTY_ON_RSV, QTY, QTY_PO, QTY_SQ,
     ID_NO, BOM_NO, PO_YES, REM, EST_ITM)
     VALUES (@mp_no, @itm, @mrp_no, @prd_no, @prd_name, @prd_mark, @wh, @unit, @so_no, @est_dd,
     @qty_so, @qty_non, @qty_min, @qty_on_way, @qty_on_prc, @qty_on_rsv, @qty, @qty_po, @qty_sq,
     @id_no, @bom_no, @po_yes, @rem, @est_itm)`,
    {
      mp_no: nstr(mpNo, 20),
      itm: nint(ln.itm),
      mrp_no: nstr(ln.mrp_no, 30),
      prd_no: nstr(ln.prd_no, 30),
      prd_name: nstr(ln.prd_name, 200),
      prd_mark: nstr(ln.prd_mark, 40),
      wh: nstr(ln.wh, 12),
      unit: nstr(ln.unit, 10),
      so_no: nstr(ln.so_no, 25),
      est_dd: ndate(ln.est_dd),
      qty_so: nfloat(ln.qty_so ?? 0),
      qty_non: nfloat(ln.qty_non ?? 0),
      qty_min: nfloat(ln.qty_min ?? 0),
      qty_on_way: nfloat(ln.qty_on_way ?? 0),
      qty_on_prc: nfloat(ln.qty_on_prc ?? 0),
      qty_on_rsv: nfloat(ln.qty_on_rsv ?? 0),
      qty: nfloat(ln.qty ?? 0),
      qty_po: nfloat(ln.qty_po ?? 0),
      qty_sq: nfloat(ln.qty_sq ?? 0),
      id_no: nstr(ln.id_no, 38),
      bom_no: nstr(ln.bom_no, 38),
      po_yes: nstr(ln.po_yes || 'N', 1),
      rem: nstr(ln.rem, 400),
      est_itm: nint(ln.est_itm ?? 0),
    }
  );
}

async function insertTfMp2Line(tx, mpNo, ln) {
  await tx.exec(
    `INSERT INTO TF_MP2 (MP_NO, ITM, PRD_NO, PRD_NAME, PRD_MARK, WH, CUS_NO, UNIT, QTY, QTY_PO,
     UP_PO, AMTN_PO, EST_DD, SO_NO, PO_NO, BAT_NO, CUR_ID, SUP_PRD_NO, REM)
     VALUES (@mp_no, @itm, @prd_no, @prd_name, @prd_mark, @wh, @cus_no, @unit, @qty, @qty_po,
     @up_po, @amtn_po, @est_dd, @so_no, @po_no, @bat_no, @cur_id, @sup_prd_no, @rem)`,
    {
      mp_no: nstr(mpNo, 20),
      itm: nint(ln.itm),
      prd_no: nstr(ln.prd_no, 30),
      prd_name: nstr(ln.prd_name, 200),
      prd_mark: nstr(ln.prd_mark, 40),
      wh: nstr(ln.wh, 12),
      cus_no: nstr(ln.cus_no, 12),
      unit: nstr(ln.unit, 10),
      qty: nfloat(ln.qty ?? 0),
      qty_po: nfloat(ln.qty_po ?? 0),
      up_po: nfloat(ln.up_po ?? 0),
      amtn_po: nfloat(ln.amtn_po ?? 0),
      est_dd: ndate(ln.est_dd),
      so_no: nstr(ln.so_no, 25),
      po_no: nstr(ln.po_no, 20),
      bat_no: nstr(ln.bat_no, 40),
      cur_id: nstr(ln.cur_id, 4),
      sup_prd_no: nstr(ln.sup_prd_no, 40),
      rem: nstr(ln.rem, 400),
    }
  );
}

async function insertTfMp3Line(tx, mpNo, ln) {
  await tx.exec(
    `INSERT INTO TF_MP3 (MP_NO, ITM, PRD_NO, PRD_NAME, PRD_MARK, WH, UNIT, QTY, QTY_MO,
     STA_DD, END_DD, DEP, MO_NO, ID_NO, BOM_NO, SO_NO, EST_DD, TW_ID, REM)
     VALUES (@mp_no, @itm, @prd_no, @prd_name, @prd_mark, @wh, @unit, @qty, @qty_mo,
     @sta_dd, @end_dd, @dep, @mo_no, @id_no, @bom_no, @so_no, @est_dd, @tw_id, @rem)`,
    {
      mp_no: nstr(mpNo, 20),
      itm: nint(ln.itm),
      prd_no: nstr(ln.prd_no, 30),
      prd_name: nstr(ln.prd_name, 200),
      prd_mark: nstr(ln.prd_mark, 40),
      wh: nstr(ln.wh, 12),
      unit: nstr(ln.unit, 10),
      qty: nfloat(ln.qty ?? 0),
      qty_mo: nfloat(ln.qty_mo ?? 0),
      sta_dd: ndate(ln.sta_dd),
      end_dd: ndate(ln.end_dd),
      dep: nstr(ln.dep, 8),
      mo_no: nstr(ln.mo_no, 20),
      id_no: nstr(ln.id_no, 38),
      bom_no: nstr(ln.bom_no, 38),
      so_no: nstr(ln.so_no, 25),
      est_dd: ndate(ln.est_dd),
      tw_id: nstr(ln.tw_id || 'N', 1),
      rem: nstr(ln.rem, 400),
    }
  );
}

async function deleteAllMpLines(tx, mpNo) {
  const p = { mp_no: nstr(mpNo, 20) };
  await tx.exec('DELETE FROM TF_MP1 WHERE MP_NO = @mp_no', p);
  await tx.exec('DELETE FROM TF_MP2 WHERE MP_NO = @mp_no', p);
  await tx.exec('DELETE FROM TF_MP3 WHERE MP_NO = @mp_no', p);
}

async function applyMpSoMark(tx, mpNo, mark) {
  const head = await tx.queryOne(`SELECT SO_NO AS so_no FROM MF_MP WHERE MP_NO = @mp_no`, {
    mp_no: nstr(mpNo, 20),
  });
  if (!head?.so_no) return;
  await tx.exec(
    `UPDATE MF_POS SET CLS_MP_ID = @mark WHERE OS_ID = 'SO' AND OS_NO = @os_no`,
    {
      mark: mark === 'clear' ? null : nstr('T', 1),
      os_no: nstr(head.so_no, 25),
    }
  );
}

async function runMpAnalysis(head, lines1, deps) {
  const { normalizeMpLine, normalizeMp2Line, normalizeMp3Line } = deps;
  const whList = parseWhList(head.wh);
  const analyzed = [];
  const lines2 = [];
  const lines3 = [];
  let itm2 = 0;
  let itm3 = 0;

  for (let i = 0; i < lines1.length; i++) {
    const base = { ...lines1[i], itm: i + 1 };
    if (!base.prd_no) continue;
    const meta = await loadPrdtMeta(base.prd_no);
    const wh = base.wh || whList[0] || meta?.wh || '';
    const stock = await loadStockInWhs(base.prd_no, whList.length ? whList : wh ? [wh] : []);
    const qtyMin = Number(meta?.qty_min) || Number(base.qty_min) || 0;
    const qtyOnWay = await loadQtyOnWay(base.prd_no);
    const qtyOnPrc = await loadQtyOnPrc(base.prd_no);
    const qtyOnRsv = await loadQtyOnRsv(base.prd_no);
    const qtyNon = Number(base.qty_non) || 0;
    const qtySo = Number(base.qty_so) || 0;
    const supply = stock + qtyOnWay + qtyOnPrc;
    const demand = qtyNon + qtyMin + qtyOnRsv;
    let qty = Math.max(0, Math.round((demand - supply) * 100) / 100);
    if (qty <= 0 && qtyNon > 0) qty = Math.round(qtyNon * 100) / 100;

    const poYes =
      String(base.po_yes || '').toUpperCase() === 'Y' ||
      ['4', '5', '6'].includes(String(meta?.knd || '').trim())
        ? 'Y'
        : 'N';

    const ln1 = normalizeMpLine({
      ...base,
      prd_name: base.prd_name || meta?.name || '',
      unit: base.unit || meta?.unit || '',
      wh,
      qty_min: qtyMin,
      qty_on_way: qtyOnWay,
      qty_on_prc: qtyOnPrc,
      qty_on_rsv: qtyOnRsv,
      qty_so: qtySo,
      qty,
      qty_po: poYes === 'Y' ? qty : 0,
      qty_sq: poYes === 'Y' ? qty : 0,
      po_yes: poYes,
      mrp_no: base.mrp_no || base.prd_no,
    });
    analyzed.push(ln1);

    if (poYes === 'Y' && qty > 0) {
      itm2 += 1;
      const upPo = Number(meta?.upr) || 0;
      lines2.push(
        normalizeMp2Line({
          itm: itm2,
          prd_no: ln1.prd_no,
          prd_name: ln1.prd_name,
          prd_mark: ln1.prd_mark,
          wh: ln1.wh,
          cus_no: meta?.cus_no || '',
          unit: ln1.unit,
          qty,
          qty_po: qty,
          up_po: upPo,
          amtn_po: Math.round(qty * upPo * 100) / 100,
          est_dd: ln1.est_dd || head.est_dd,
          so_no: ln1.so_no || head.so_no,
          cur_id: meta?.cur_id || '',
          rem: ln1.rem,
        })
      );
    } else if (qty > 0) {
      itm3 += 1;
      lines3.push(
        normalizeMp3Line({
          itm: itm3,
          prd_no: ln1.mrp_no || ln1.prd_no,
          prd_name: ln1.prd_name,
          prd_mark: ln1.prd_mark,
          wh: ln1.wh,
          unit: ln1.unit,
          qty,
          qty_mo: qty,
          sta_dd: head.mp_dd,
          end_dd: ln1.est_dd || head.est_dd,
          dep: head.dep,
          id_no: ln1.id_no,
          bom_no: ln1.bom_no,
          so_no: ln1.so_no || head.so_no,
          est_dd: ln1.est_dd || head.est_dd,
          tw_id: 'N',
          rem: ln1.rem,
        })
      );
    }
  }

  return { lines1: analyzed, lines2, lines3 };
}

async function persistMpBill(tx, mpNo, mpDd, head, lines1, lines2, lines3, creator) {
  await tx.exec(
    `INSERT INTO MF_MP (MP_NO, MP_DD, EST_DD, DEP, SO_NO, WH, BIL_TYPE, REM, CANCEL_ID${creator ? ', USR, SYS_DATE' : ''})
     VALUES (@mp_no, @mp_dd, @est_dd, @dep, @so_no, @wh, @bil_type, @rem, @cancel_id${creator ? ', @usr, GETDATE()' : ''})`,
    { ...mfMpHeadParams(mpNo, head), ...(creator ? { usr: creator } : {}) }
  );
  for (const ln of lines1) await insertTfMp1Line(tx, mpNo, ln);
  for (const ln of lines2) await insertTfMp2Line(tx, mpNo, ln);
  for (const ln of lines3) await insertTfMp3Line(tx, mpNo, ln);
}

async function updateMpBill(tx, mpNo, mpDd, head, lines1, lines2, lines3) {
  await tx.exec(
    `UPDATE MF_MP SET MP_DD=@mp_dd, EST_DD=@est_dd, DEP=@dep, SO_NO=@so_no, WH=@wh,
     BIL_TYPE=@bil_type, REM=@rem, CANCEL_ID=@cancel_id WHERE MP_NO=@mp_no`,
    mfMpHeadParams(mpNo, head)
  );
  await deleteAllMpLines(tx, mpNo);
  for (const ln of lines1) await insertTfMp1Line(tx, mpNo, ln);
  for (const ln of lines2) await insertTfMp2Line(tx, mpNo, ln);
  for (const ln of lines3) await insertTfMp3Line(tx, mpNo, ln);
}

async function autoAuditMp(tx, req, mpNo) {
  const usrId = billUserId(req);
  if (!usrId) return;
  await auditBillHead(tx, 'MF_MP', 'MP_NO = @mp_no', { mp_no: nstr(mpNo, 20) }, usrId);
  await applyMpSoMark(tx, mpNo, 'mark');
}

/** MF_MP / TF_MP1+2+3 生产需求分析单 (MrpABA) */
function registerMpOrdersRoutes(app, deps) {
  const { rowToMfMp, rowToTfMp1, rowToTfMp2, rowToTfMp3, normalizeMpLine, normalizeMp2Line, normalizeMp3Line } =
    deps;
  const label = '生产需求分析单';
  const normDeps = { normalizeMpLine, normalizeMp2Line, normalizeMp3Line };

  app.get('/api/production-requirements/next-no', async (_req, res) => {
    try {
      res.json({ mp_no: await nextMpNo() });
    } catch (e) {
      console.error('[production-requirements/next-no]', e);
      res.status(500).json({ error: '获取单号失败' });
    }
  });

  app.get('/api/production-requirements', async (req, res) => {
    const { q, limit = '50', date_from, date_to } = req.query;
    try {
      const top = Math.min(parseInt(limit, 10) || 50, 200);
      let sqlText = `${MF_MP_HEAD_SEL.replace('SELECT', `SELECT TOP (${top})`)} WHERE 1=1`;
      const inputs = {};
      if (q) {
        sqlText += ' AND (h.MP_NO LIKE @q OR h.SO_NO LIKE @q OR CAST(h.REM AS nvarchar(200)) LIKE @q)';
        inputs.q = nstr(`%${q}%`, 200);
      }
      if (date_from) {
        sqlText += ' AND h.MP_DD >= @date_from';
        inputs.date_from = ndate(String(date_from));
      }
      if (date_to) {
        sqlText += ' AND h.MP_DD <= @date_to';
        inputs.date_to = ndate(String(date_to));
      }
      sqlText += ' ORDER BY h.MP_DD DESC, h.MP_NO DESC';
      res.json((await queryAll(sqlText, inputs)).map(rowToMfMp));
    } catch (e) {
      console.error('[production-requirements/list]', e);
      res.status(500).json({ error: '读取生产需求分析单列表失败' });
    }
  });

  app.get('/api/production-requirements/open-sales-orders', async (req, res) => {
    const { limit = '100' } = req.query;
    try {
      const top = Math.min(parseInt(limit, 10) || 100, 200);
      const sqlText = `${MF_POS_HEAD_FOR_MP.replace('SELECT', `SELECT TOP (${top})`)}
        WHERE m.OS_ID = 'SO' AND m.CHK_MAN IS NOT NULL AND m.CHK_MAN <> ''
          AND (m.CANCEL_ID IS NULL OR m.CANCEL_ID <> 'T')
          AND (m.CLS_MP_ID IS NULL OR m.CLS_MP_ID = '' OR m.CLS_MP_ID <> 'T')
        ORDER BY m.OS_DD DESC, m.OS_NO DESC`;
      res.json(await queryAll(sqlText));
    } catch (e) {
      console.error('[production-requirements/open-sales-orders]', e);
      res.status(500).json({ error: '读取可转入受订单失败' });
    }
  });

  app.get('/api/production-requirements/transfer-from-so/:osNo', async (req, res) => {
    try {
      const osNo = req.params.osNo;
      const head = await queryOne(
        `${MF_POS_HEAD_FOR_MP} WHERE m.OS_ID = 'SO' AND m.OS_NO = @os_no`,
        { os_no: nstr(osNo, 25) }
      );
      if (!head) return res.status(404).json({ error: '受订单不存在' });
      if (!isBillAudited(head)) return res.status(409).json({ error: '受订单须已审核方可转入' });

      const rawLines = await queryAll(
        `${TF_POS_FOR_MP} WHERE t.OS_ID = 'SO' AND t.OS_NO = @os_no
         AND (m.CLS_MP_ID IS NULL OR m.CLS_MP_ID = '' OR m.CLS_MP_ID <> 'T')
         ORDER BY t.ITM`,
        { os_no: nstr(osNo, 25) }
      );

      const lines = rawLines
        .map((row) => {
          const qty = Number(row.qty) || 0;
          const qtyPs = Number(row.qty_ps) || 0;
          const openQty = Math.max(0, Math.round((qty - qtyPs) * 100) / 100);
          return {
            mrp_no: row.prd_no,
            prd_no: row.prd_no,
            prd_name: row.prd_name,
            prd_mark: row.prd_mark || '',
            wh: row.wh || '',
            unit: row.ut || '',
            so_no: osNo,
            est_dd: row.est_dd || head.est_dd,
            qty_so: qty,
            qty_non: openQty > 0.0001 ? openQty : qty,
            rem: row.rem || '',
            est_itm: row.itm,
            po_yes: 'N',
          };
        })
        .filter((ln) => ln.prd_no && Number(ln.qty_non) > 0.0001);

      res.json({
        head: {
          so_no: osNo,
          dep: head.use_dep,
          bil_type: head.bil_type,
          est_dd: head.est_dd,
          mp_dd: new Date().toISOString().slice(0, 10),
        },
        lines,
        lines_po: [],
        lines_mo: [],
      });
    } catch (e) {
      console.error('[production-requirements/transfer-from-so]', e);
      res.status(500).json({ error: '从受订单转入失败' });
    }
  });

  app.post('/api/production-requirements/analyze', async (req, res) => {
    try {
      const { head, lines } = req.body;
      if (!lines?.length) return res.status(400).json({ error: '请先录入需求分析明细' });
      const result = await runMpAnalysis(head || {}, lines, normDeps);
      res.json(result);
    } catch (e) {
      console.error('[production-requirements/analyze]', e);
      res.status(500).json({ error: '分析失败' });
    }
  });

  app.get('/api/production-requirements/:mpNo', async (req, res) => {
    try {
      const head = await loadMfMpHead(req.params.mpNo);
      if (!head) return res.status(404).json({ error: `${label}不存在` });
      const lines = await loadTfMp1Lines(req.params.mpNo, rowToTfMp1);
      const lines_po = await loadTfMp2Lines(req.params.mpNo, rowToTfMp2);
      const lines_mo = await loadTfMp3Lines(req.params.mpNo, rowToTfMp3);
      const merged = await mergeBillExtFields('MrpABA', rowToMfMp(head), lines);
      res.json({ head: merged.head, lines: merged.lines, lines_po, lines_mo });
    } catch (e) {
      console.error('[production-requirements/get]', e);
      res.status(500).json({ error: '读取生产需求分析单失败' });
    }
  });

  app.post('/api/production-requirements', async (req, res) => {
    const { head, lines, lines_po, lines_mo, auto_audit = true } = req.body;
    if (!lines?.length) return res.status(400).json({ error: '需求分析明细至少一行' });
    try {
      const mp_no = head.mp_no || (await nextMpNo());
      if (await queryOne('SELECT 1 AS ok FROM MF_MP WHERE MP_NO = @mp_no', { mp_no: nstr(mp_no, 20) })) {
        return res.status(409).json({ error: '单号已存在' });
      }
      const mpDd = head.mp_dd || new Date().toISOString().slice(0, 10);
      let lines1 = lines.map((ln, i) => normalizeMpLine({ ...ln, itm: i + 1, mp_no }));
      let lines2 = (lines_po || []).map((ln, i) => normalizeMp2Line({ ...ln, itm: i + 1, mp_no }));
      let lines3 = (lines_mo || []).map((ln, i) => normalizeMp3Line({ ...ln, itm: i + 1, mp_no }));

      const creator = billUserId(req);
      await withTransaction(async (tx) => {
        await persistMpBill(tx, mp_no, mpDd, head, lines1, lines2, lines3, creator);
        if (auto_audit !== false) await autoAuditMp(tx, req, mp_no);
      });

      await saveBillExtFields('MrpABA', { head: { ...head, mp_no }, lines: lines1 });

      const saved = await loadMfMpHead(mp_no);
      const merged = await mergeBillExtFields('MrpABA', rowToMfMp(saved), lines1);
      res.status(201).json({ head: merged.head, lines: lines1, lines_po: lines2, lines_mo: lines3 });
    } catch (e) {
      console.error('[production-requirements/create]', e);
      if (isExtFieldError(e)) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: '新增生产需求分析单失败' });
    }
  });

  app.put('/api/production-requirements/:mpNo', async (req, res) => {
    try {
      const existing = await queryOne('SELECT * FROM MF_MP WHERE MP_NO = @mp_no', {
        mp_no: nstr(req.params.mpNo, 20),
      });
      if (!existing) return res.status(404).json({ error: `${label}不存在` });
      if (isBillAudited(existing)) return res.status(409).json({ error: '已审核单据不可修改' });
      const { head, lines, lines_po, lines_mo, auto_audit = true } = req.body;
      if (!lines?.length) return res.status(400).json({ error: '需求分析明细至少一行' });

      const mpDd = head?.mp_dd || existing.MP_DD;
      const mergedHead = { ...existing, ...head, mp_no: req.params.mpNo };
      const lines1 = lines.map((ln, i) => normalizeMpLine({ ...ln, itm: i + 1, mp_no: req.params.mpNo }));
      const lines2 = (lines_po || []).map((ln, i) =>
        normalizeMp2Line({ ...ln, itm: i + 1, mp_no: req.params.mpNo })
      );
      const lines3 = (lines_mo || []).map((ln, i) =>
        normalizeMp3Line({ ...ln, itm: i + 1, mp_no: req.params.mpNo })
      );

      await withTransaction(async (tx) => {
        await applyMpSoMark(tx, req.params.mpNo, 'clear');
        await updateMpBill(tx, req.params.mpNo, mpDd, mergedHead, lines1, lines2, lines3);
        if (auto_audit !== false) await autoAuditMp(tx, req, req.params.mpNo);
      });
      await saveBillExtFields('MrpABA', { head: mergedHead, lines: lines1 });
      res.json({ ok: true });
    } catch (e) {
      console.error('[production-requirements/update]', e);
      if (isExtFieldError(e)) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: '修改生产需求分析单失败' });
    }
  });

  app.delete('/api/production-requirements/:mpNo', async (req, res) => {
    try {
      const existing = await queryOne('SELECT CHK_MAN FROM MF_MP WHERE MP_NO = @mp_no', {
        mp_no: nstr(req.params.mpNo, 20),
      });
      if (!existing) return res.status(404).json({ error: `${label}不存在` });
      if (isBillAudited(existing)) return res.status(409).json({ error: '已审核单据不能删除' });
      await withTransaction(async (tx) => {
        await applyMpSoMark(tx, req.params.mpNo, 'clear');
        await deleteAllMpLines(tx, req.params.mpNo);
        await tx.exec('DELETE FROM MF_MP WHERE MP_NO = @mp_no', { mp_no: nstr(req.params.mpNo, 20) });
      });
      res.json({ ok: true });
    } catch (e) {
      console.error('[production-requirements/delete]', e);
      res.status(500).json({ error: '删除生产需求分析单失败' });
    }
  });

  app.post('/api/production-requirements/:mpNo/unaudit', async (req, res) => {
    const mpNo = req.params.mpNo;
    try {
      const existing = await queryOne('SELECT CHK_MAN FROM MF_MP WHERE MP_NO = @mp_no', {
        mp_no: nstr(mpNo, 20),
      });
      if (!existing) return res.status(404).json({ error: `${label}不存在` });
      if (!isBillAudited(existing)) return res.status(409).json({ error: '未审核' });
      const hasPo = await queryOne(
        `SELECT 1 AS ok FROM TF_MP2 WHERE MP_NO=@mp_no AND PO_NO IS NOT NULL AND PO_NO<>''`,
        { mp_no: nstr(mpNo, 20) }
      );
      const hasMo = await queryOne(
        `SELECT 1 AS ok FROM TF_MP3 WHERE MP_NO=@mp_no AND MO_NO IS NOT NULL AND MO_NO<>''`,
        { mp_no: nstr(mpNo, 20) }
      );
      if (hasPo || hasMo) return res.status(409).json({ error: '已有下游采购/制令单，不可反审核' });
      await withTransaction(async (tx) => {
        await applyMpSoMark(tx, mpNo, 'clear');
        await unauditBillHead(tx, 'MF_MP', 'MP_NO = @mp_no', { mp_no: nstr(mpNo, 20) });
      });
      res.json({ ok: true, usr: '', sys_date: '', chk_man: '', cls_date: '' });
    } catch (e) {
      console.error('[production-requirements/unaudit]', e);
      res.status(500).json({ error: '反审核失败' });
    }
  });

  app.post('/api/production-requirements/:mpNo/transfer-mo', async (req, res) => {
    const mpNo = req.params.mpNo;
    const usrId = billUserId(req);
    if (!usrId) return res.status(401).json({ error: '请先登录' });
    try {
      const head = await loadMfMpHead(mpNo);
      if (!head) return res.status(404).json({ error: `${label}不存在` });
      if (!isBillAudited(head)) return res.status(409).json({ error: '须已审核方可转制令' });
      const moLines = await loadTfMp3Lines(
        mpNo,
        rowToTfMp3
      ).then((rows) => rows.filter((r) => !r.mo_no && Number(r.qty_mo || r.qty) > 0));
      if (!moLines.length) return res.status(400).json({ error: '无可转制令建议行' });

      const created = [];
      await withTransaction(async (tx) => {
        for (const ln of moLines) {
          const moNo = await nextMoNo();
          const qty = Number(ln.qty_mo || ln.qty) || 0;
          await tx.exec(
            `INSERT INTO MF_MO (MO_NO, MO_DD, STA_DD, END_DD, MRP_NO, PRD_MARK, WH, SO_NO, UNIT, QTY, DEP, REM, BIL_ID, BIL_NO, USR, SYS_DATE)
             VALUES (@mo_no, @mo_dd, @sta_dd, @end_dd, @mrp_no, @prd_mark, @wh, @so_no, @unit, @qty, @dep, @rem, 'MP', @bil_no, @usr, GETDATE())`,
            {
              mo_no: nstr(moNo, 20),
              mo_dd: ndate(head.mp_dd),
              sta_dd: ndate(ln.sta_dd || head.mp_dd),
              end_dd: ndate(ln.end_dd || ln.est_dd || head.est_dd),
              mrp_no: nstr(ln.prd_no, 30),
              prd_mark: nstr(ln.prd_mark, 40),
              wh: nstr(ln.wh, 12),
              so_no: nstr(ln.so_no || head.so_no, 25),
              unit: nstr(ln.unit, 10),
              qty: nfloat(qty),
              dep: nstr(ln.dep || head.dep, 8),
              rem: nstr(ln.rem, 500),
              bil_no: nstr(mpNo, 20),
              usr: usrId,
            }
          );
          await tx.exec(
            `UPDATE TF_MP3 SET MO_NO = @mo_no WHERE MP_NO = @mp_no AND ITM = @itm`,
            { mo_no: nstr(moNo, 20), mp_no: nstr(mpNo, 20), itm: nint(ln.itm) }
          );
          created.push({ mo_no: moNo, itm: ln.itm });
        }
      });
      res.json({ ok: true, created });
    } catch (e) {
      console.error('[production-requirements/transfer-mo]', e);
      res.status(500).json({ error: '转制令单失败' });
    }
  });
}

module.exports = { registerMpOrdersRoutes };
