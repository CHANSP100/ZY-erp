const { queryAll, queryOne, withTransaction, nstr, ndate, nfloat, nint } = require('./repositories/mssqlHelpers');
const { BILL_AUDIT_SELECT, billUserId, isBillAudited, registerBillAuditRoutes } = require('./billAuditMeta');

/** BOM 代号含「->」，路径参数须 decodeURIComponent */
function decodeBomNoParam(raw) {
  try {
    return decodeURIComponent(String(raw ?? ''));
  } catch {
    return String(raw ?? '');
  }
}

const MF_BOM_HEAD_SEL = `
  SELECT m.BOM_NO AS bom_no, m.PRD_NO AS prd_no, m.PF_NO AS pf_no,
    CAST(m.NAME AS nvarchar(200)) AS name, m.PRD_MARK AS prd_mark,
    m.WH_NO AS wh_no, m.UNIT AS unit, m.QTY AS qty,
    m.PRD_KND AS prd_knd, CAST(m.SPC AS nvarchar(200)) AS spc,
    CONVERT(varchar(10), m.VALID_DD, 23) AS valid_dd,
    CONVERT(varchar(10), m.END_DD, 23) AS end_dd,
    m.DEP AS dep, CAST(m.REM AS nvarchar(500)) AS rem,
    CAST(p.NAME AS nvarchar(200)) AS prd_name,
    CAST(d.NAME AS nvarchar(100)) AS dep_name,
    CAST(w.NAME AS nvarchar(100)) AS wh_name,
    ${BILL_AUDIT_SELECT}
  FROM MF_BOM m
  LEFT JOIN PRDT p ON p.PRD_NO = m.PRD_NO
  LEFT JOIN DEPT d ON d.DEP = m.DEP
  LEFT JOIN MY_WH w ON w.WH = m.WH_NO`;

const TF_BOM_LINE_SEL = `
  SELECT t.BOM_NO AS bom_no, t.ITM AS itm, t.PRD_NO AS prd_no,
    CAST(t.NAME AS nvarchar(200)) AS name, t.PRD_MARK AS prd_mark,
    t.WH_NO AS wh_no, t.UNIT AS unit, t.QTY AS qty,
    t.LOS_RTO AS los_rto, t.QTY_BAS AS qty_bas, t.BOM_ID AS bom_id,
    CAST(t.REM AS nvarchar(200)) AS rem,
    CAST(p.SPC AS nvarchar(200)) AS spc
  FROM TF_BOM t
  LEFT JOIN PRDT p ON p.PRD_NO = t.PRD_NO`;

async function loadMfBomHead(bomNo) {
  return queryOne(`${MF_BOM_HEAD_SEL} WHERE m.BOM_NO = @bom_no`, { bom_no: nstr(bomNo, 38) });
}

async function loadTfBomLines(bomNo, rowToTfBom) {
  return (
    await queryAll(`${TF_BOM_LINE_SEL} WHERE t.BOM_NO = @bom_no ORDER BY t.ITM`, {
      bom_no: nstr(bomNo, 38),
    })
  ).map(rowToTfBom);
}

async function insertTfBomLine(tx, bomNo, ln) {
  await tx.exec(
    `INSERT INTO TF_BOM (BOM_NO, ITM, PRD_NO, NAME, PRD_MARK, WH_NO, UNIT, QTY, LOS_RTO, QTY_BAS, BOM_ID, REM)
     VALUES (@bom_no, @itm, @prd_no, @name, @prd_mark, @wh_no, @unit, @qty, @los_rto, @qty_bas, @bom_id, @rem)`,
    {
      bom_no: nstr(bomNo, 38),
      itm: nint(ln.itm),
      prd_no: nstr(ln.prd_no, 30),
      name: nstr(ln.name, 100),
      prd_mark: nstr(ln.prd_mark, 40),
      wh_no: nstr(ln.wh_no, 12),
      unit: nbomUnit(ln.unit),
      qty: nfloat(ln.qty ?? 0),
      los_rto: nfloat(ln.los_rto ?? 0),
      qty_bas: nfloat(ln.qty_bas ?? 1),
      bom_id: nstr(ln.bom_id, 1),
      rem: nstr(ln.rem, 200),
    }
  );
}

function nbomUnit(value) {
  const v = value == null || value === '' ? null : String(value).slice(0, 1);
  return nstr(v, 1);
}

function mfBomHeadParams(bomNo, head) {
  return {
    bom_no: nstr(bomNo, 38),
    prd_no: nstr(head.prd_no, 30),
    pf_no: nstr(head.pf_no, 6),
    name: nstr(head.name, 100),
    prd_mark: nstr(head.prd_mark, 40),
    wh_no: nstr(head.wh_no, 12),
    unit: nbomUnit(head.unit),
    qty: nfloat(head.qty ?? 0),
    prd_knd: nstr(head.prd_knd, 1),
    spc: nstr(head.spc, 200),
    valid_dd: ndate(head.valid_dd),
    end_dd: ndate(head.end_dd),
    dep: nstr(head.dep, 8),
    rem: nstr(head.rem, 100),
  };
}

async function assertUniqueProductVersion(bomNo, prdNo, pfNo) {
  const pf = pfNo == null || pfNo === '' ? '' : String(pfNo).trim();
  const dup = await queryOne(
    `SELECT TOP 1 BOM_NO AS bom_no FROM MF_BOM
     WHERE PRD_NO = @prd_no AND ISNULL(PF_NO, '') = @pf_no AND BOM_NO <> @bom_no`,
    { prd_no: nstr(prdNo, 30), pf_no: nstr(pf, 6), bom_no: nstr(bomNo, 38) }
  );
  if (dup) {
    const err = new Error(
      pf ? `母件 ${prdNo} 版本 ${pf} 已存在 BOM ${dup.bom_no}` : `母件 ${prdNo} 已存在 BOM ${dup.bom_no}`
    );
    err.status = 409;
    throw err;
  }
}

function buildBomNo(prdNo, pfNo) {
  const prd = String(prdNo || '').trim();
  const pf = pfNo == null || pfNo === '' ? '' : String(pfNo).trim();
  return `${prd}->${pf}`;
}

async function stampBomAuditOnSave(tx, bomNo, usrId) {
  if (!usrId) return;
  await tx.exec(
    `UPDATE MF_BOM SET CHK_MAN=@chk_man, CLS_DATE=GETDATE() WHERE BOM_NO=@bom_no`,
    { bom_no: nstr(bomNo, 38), chk_man: nstr(usrId, 12) }
  );
}

function pickDefaultBomForPrd(bomIndex, prdNo) {
  const list = bomIndex.filter((b) => b.prd_no === prdNo);
  if (!list.length) return null;
  return list.sort((a, b) => String(a.pf_no || '').localeCompare(String(b.pf_no || '')))[0];
}

function buildBomTreeNode(prdNo, bomIndex, linesByBom, visited) {
  if (visited.has(prdNo)) return null;
  visited.add(prdNo);
  const bom = pickDefaultBomForPrd(bomIndex, prdNo);
  const id = bom ? `bom:${bom.bom_no}` : `prd:${prdNo}`;
  const label = bom
    ? `${bom.prd_no} ${bom.name || ''}`.trim()
    : `${prdNo}`;
  const children = [];
  if (bom) {
    const lines = linesByBom.get(bom.bom_no) || [];
    for (const ln of lines) {
      if (ln.knd === '2' || ln.knd === '3') {
        const child = buildBomTreeNode(ln.prd_no, bomIndex, linesByBom, visited);
        if (child) children.push(child);
      }
    }
  }
  return {
    id,
    prd_no: prdNo,
    bom_no: bom?.bom_no || '',
    pf_no: bom?.pf_no || '',
    knd: bom?.knd || '',
    label,
    children: children.length ? children : undefined,
  };
}

async function buildBomRecipeTree() {
  const heads = await queryAll(`
    SELECT m.BOM_NO AS bom_no, m.PRD_NO AS prd_no, m.PF_NO AS pf_no,
      CAST(m.NAME AS nvarchar(200)) AS name,
      COALESCE(NULLIF(m.PRD_KND, ''), p.KND, '') AS knd
    FROM MF_BOM m
    LEFT JOIN PRDT p ON p.PRD_NO = m.PRD_NO
  `);
  const lines = await queryAll(`
    SELECT t.BOM_NO AS bom_no, t.PRD_NO AS prd_no,
      COALESCE(p.KND, '') AS knd
    FROM TF_BOM t
    LEFT JOIN PRDT p ON p.PRD_NO = t.PRD_NO
  `);
  const products = await queryAll(`
    SELECT p.PRD_NO AS prd_no, CAST(p.NAME AS nvarchar(200)) AS name, p.KND AS knd
    FROM PRDT p
    WHERE p.KND IN ('2', '3') AND ISNULL(p.STOP_ID, '') <> 'Y'
  `);

  const linesByBom = new Map();
  for (const ln of lines) {
    if (!linesByBom.has(ln.bom_no)) linesByBom.set(ln.bom_no, []);
    linesByBom.get(ln.bom_no).push(ln);
  }

  const childPrds = new Set(lines.map((ln) => ln.prd_no));
  const rootPrds = new Set();
  const nodes = [];

  for (const bom of heads) {
    if (bom.knd === '2') rootPrds.add(bom.prd_no);
  }
  for (const bom of heads) {
    if (bom.knd === '3' && !childPrds.has(bom.prd_no)) rootPrds.add(bom.prd_no);
  }
  for (const p of products) {
    if (!heads.some((b) => b.prd_no === p.prd_no)) rootPrds.add(p.prd_no);
  }

  for (const prdNo of [...rootPrds].sort()) {
    const node = buildBomTreeNode(prdNo, heads, linesByBom, new Set());
    if (node) nodes.push(node);
  }

  return nodes;
}

async function loadBomByProduct(prdNo, pfNo) {
  let head;
  if (pfNo) {
    head = await queryOne(`${MF_BOM_HEAD_SEL} WHERE m.PRD_NO = @prd_no AND m.PF_NO = @pf_no`, {
      prd_no: nstr(prdNo, 30),
      pf_no: nstr(pfNo, 6),
    });
  } else {
    head = await queryOne(
      `${MF_BOM_HEAD_SEL.replace(/\bSELECT\b/, 'SELECT TOP (1)')} WHERE m.PRD_NO = @prd_no ORDER BY m.PF_NO`,
      { prd_no: nstr(prdNo, 30) }
    );
  }
  if (head) {
    return { head, bom_no: head.bom_no, is_new: false };
  }

  const prod = await queryOne(
    `SELECT p.PRD_NO AS prd_no, CAST(p.NAME AS nvarchar(200)) AS name,
      p.KND AS knd, CAST(p.SPC AS nvarchar(200)) AS spc, p.UT AS unit, p.WH AS wh_no
     FROM PRDT p WHERE p.PRD_NO = @prd_no`,
    { prd_no: nstr(prdNo, 30) }
  );
  if (!prod) return null;
  if (prod.knd !== '2' && prod.knd !== '3') return null;

  return {
    head: {
      bom_no: '',
      prd_no: prod.prd_no,
      pf_no: '',
      name: prod.name || '',
      prd_mark: '',
      wh_no: prod.wh_no || '',
      unit: prod.unit ? String(prod.unit).slice(0, 1) : '',
      qty: 1,
      prd_knd: prod.knd || '',
      spc: prod.spc || '',
      valid_dd: '',
      end_dd: '',
      dep: '',
      rem: '',
      prd_name: prod.name || '',
    },
    lines: [],
    is_new: true,
  };
}

/** MF_BOM / TF_BOM — BOM物料配方输入 (FasECF) */
function registerBomOrdersRoutes(app, deps) {
  const { rowToMfBom, rowToTfBom } = deps;
  const label = 'BOM表';

  app.get('/api/bom-recipes', async (req, res) => {
    const { q, limit = '50', date_from, date_to } = req.query;
    try {
      const top = Math.min(parseInt(limit, 10) || 50, 200);
      let sqlText = `${MF_BOM_HEAD_SEL.replace('SELECT', `SELECT TOP (${top})`)} WHERE 1=1`;
      const inputs = {};
      if (q) {
        sqlText +=
          ' AND (m.BOM_NO LIKE @q OR m.PRD_NO LIKE @q OR m.PF_NO LIKE @q OR m.NAME LIKE @q OR p.NAME LIKE @q)';
        inputs.q = nstr(`%${q}%`, 200);
      }
      if (date_from) {
        sqlText += ' AND m.SYS_DATE >= @date_from';
        inputs.date_from = ndate(String(date_from));
      }
      if (date_to) {
        sqlText += ' AND m.SYS_DATE <= @date_to';
        inputs.date_to = ndate(String(date_to));
      }
      sqlText += ' ORDER BY m.SYS_DATE DESC, m.BOM_NO DESC';
      res.json((await queryAll(sqlText, inputs)).map(rowToMfBom));
    } catch (e) {
      console.error('[bom-recipes/list]', e);
      res.status(500).json({ error: '读取BOM列表失败' });
    }
  });

  app.get('/api/bom-recipes/tree', async (_req, res) => {
    try {
      res.json(await buildBomRecipeTree());
    } catch (e) {
      console.error('[bom-recipes/tree]', e);
      res.status(500).json({ error: '读取BOM树失败' });
    }
  });

  app.get('/api/bom-recipes/lines', async (req, res) => {
    const { q, bom_no, prd_no, date_from, date_to, limit = '500' } = req.query;
    try {
      const top = Math.min(parseInt(String(limit), 10) || 500, 2000);
      let sqlText = `
        SELECT TOP (${top})
          CONVERT(varchar(10), m.SYS_DATE, 23) AS sys_date,
          m.BOM_NO AS bom_no, m.PRD_NO AS head_prd_no, m.PF_NO AS pf_no,
          CAST(m.NAME AS nvarchar(200)) AS head_name,
          CONVERT(varchar(10), m.VALID_DD, 23) AS valid_dd,
          t.ITM AS itm, t.PRD_NO AS prd_no,
          CAST(t.NAME AS nvarchar(200)) AS prd_name,
          CAST(p.SPC AS nvarchar(200)) AS spc,
          t.PRD_MARK AS prd_mark, t.WH_NO AS wh_no, t.UNIT AS unit,
          t.QTY AS qty, t.LOS_RTO AS los_rto, t.QTY_BAS AS qty_bas,
          t.BOM_ID AS bom_id, CAST(t.REM AS nvarchar(200)) AS line_rem
        FROM MF_BOM m
        JOIN TF_BOM t ON t.BOM_NO = m.BOM_NO
        LEFT JOIN PRDT p ON p.PRD_NO = t.PRD_NO
        WHERE 1=1`;
      const inputs = {};
      if (bom_no) {
        sqlText += ' AND m.BOM_NO LIKE @bom_no';
        inputs.bom_no = nstr(`%${String(bom_no)}%`, 200);
      }
      if (prd_no) {
        sqlText +=
          ' AND (m.PRD_NO LIKE @prd_no OR m.NAME LIKE @prd_no OR t.PRD_NO LIKE @prd_no OR t.NAME LIKE @prd_no OR p.SPC LIKE @prd_no)';
        inputs.prd_no = nstr(`%${String(prd_no)}%`, 200);
      }
      if (date_from) {
        sqlText += ' AND m.SYS_DATE >= @date_from';
        inputs.date_from = ndate(String(date_from));
      }
      if (date_to) {
        sqlText += ' AND m.SYS_DATE <= @date_to';
        inputs.date_to = ndate(String(date_to));
      }
      if (q) {
        sqlText +=
          ' AND (m.BOM_NO LIKE @q OR m.PRD_NO LIKE @q OR m.NAME LIKE @q OR t.PRD_NO LIKE @q OR t.NAME LIKE @q)';
        inputs.q = nstr(`%${String(q)}%`, 200);
      }
      sqlText += ' ORDER BY m.SYS_DATE DESC, m.BOM_NO DESC, t.ITM';
      res.json(await queryAll(sqlText, inputs));
    } catch (e) {
      console.error('[bom-recipes/lines]', e);
      res.status(500).json({ error: '读取BOM明细列表失败' });
    }
  });

  app.get('/api/bom-recipes/by-product/:prdNo', async (req, res) => {
    try {
      const result = await loadBomByProduct(req.params.prdNo, req.query.pf_no);
      if (!result) return res.status(404).json({ error: '成品/半成品不存在或不可维护BOM' });
      const lines = result.is_new
        ? []
        : await loadTfBomLines(result.bom_no, rowToTfBom);
      res.json({
        head: rowToMfBom(result.head),
        lines,
        is_new: result.is_new,
      });
    } catch (e) {
      console.error('[bom-recipes/by-product]', e);
      res.status(500).json({ error: '按品号读取BOM失败' });
    }
  });

  app.get('/api/bom-recipes/:bomNo', async (req, res) => {
    try {
      const bomNo = decodeBomNoParam(req.params.bomNo);
      const head = await loadMfBomHead(bomNo);
      if (!head) return res.status(404).json({ error: `${label}不存在` });
      const lines = await loadTfBomLines(bomNo, rowToTfBom);
      res.json({ head: rowToMfBom(head), lines });
    } catch (e) {
      console.error('[bom-recipes/get]', e);
      res.status(500).json({ error: '读取BOM失败' });
    }
  });

  app.post('/api/bom-recipes', async (req, res) => {
    const { head, lines } = req.body;
    if (!head?.prd_no?.trim()) return res.status(400).json({ error: '请选择母件品号' });
    if (!lines?.length) return res.status(400).json({ error: '表身至少一行' });
    try {
      const bom_no = String(head.bom_no || buildBomNo(head.prd_no, head.pf_no)).trim();
      if (!bom_no) return res.status(400).json({ error: '无法生成BOM代号' });
      head.bom_no = bom_no;
      if (await queryOne('SELECT 1 AS ok FROM MF_BOM WHERE BOM_NO = @bom_no', { bom_no: nstr(bom_no, 38) })) {
        return res.status(409).json({ error: 'BOM代号已存在' });
      }
      await assertUniqueProductVersion(bom_no, head.prd_no, head.pf_no);

      const normalized = lines
        .filter((ln) => ln?.prd_no?.trim())
        .map((ln, i) => ({ ...ln, itm: i + 1, bom_no }));
      if (!normalized.length) return res.status(400).json({ error: '表身至少一行有效子件' });
      for (const ln of normalized) {
        if (ln.prd_no === head.prd_no) {
          return res.status(400).json({ error: '子件品号不可与母件相同' });
        }
      }

      await withTransaction(async (tx) => {
        const creator = billUserId(req);
        await tx.exec(
          `INSERT INTO MF_BOM (BOM_NO, PRD_NO, PF_NO, NAME, PRD_MARK, WH_NO, UNIT, QTY, PRD_KND, SPC,
           VALID_DD, END_DD, DEP, REM${creator ? ', USR, SYS_DATE' : ''})
           VALUES (@bom_no, @prd_no, @pf_no, @name, @prd_mark, @wh_no, @unit, @qty, @prd_knd, @spc,
           @valid_dd, @end_dd, @dep, @rem${creator ? ', @usr, GETDATE()' : ''})`,
          { ...mfBomHeadParams(bom_no, head), ...(creator ? { usr: creator } : {}) }
        );
        for (const ln of normalized) {
          await insertTfBomLine(tx, bom_no, ln);
        }
        await stampBomAuditOnSave(tx, bom_no, creator);
      });

      const saved = await loadMfBomHead(bom_no);
      const rawLines = await loadTfBomLines(bom_no, rowToTfBom);
      res.status(201).json({ head: rowToMfBom(saved), lines: rawLines });
    } catch (e) {
      console.error('[bom-recipes/create]', e);
      if (e.status === 409) return res.status(409).json({ error: e.message });
      res.status(500).json({ error: '新增BOM失败' });
    }
  });

  app.put('/api/bom-recipes/:bomNo', async (req, res) => {
    try {
      const bomNo = decodeBomNoParam(req.params.bomNo);
      const existing = await queryOne('SELECT * FROM MF_BOM WHERE BOM_NO = @bom_no', {
        bom_no: nstr(bomNo, 38),
      });
      if (!existing) return res.status(404).json({ error: `${label}不存在` });

      const { head, lines } = req.body;
      if (!lines?.length) return res.status(400).json({ error: '表身至少一行' });
      const mergedHead = { ...existing, ...head, bom_no: bomNo };
      if (!mergedHead.prd_no) return res.status(400).json({ error: '请选择母件品号' });
      await assertUniqueProductVersion(bomNo, mergedHead.prd_no, mergedHead.pf_no);

      const normalized = lines
        .filter((ln) => ln?.prd_no?.trim())
        .map((ln, i) => ({ ...ln, itm: i + 1, bom_no: bomNo }));
      if (!normalized.length) return res.status(400).json({ error: '表身至少一行有效子件' });
      for (const ln of normalized) {
        if (ln.prd_no === mergedHead.prd_no) {
          return res.status(400).json({ error: '子件品号不可与母件相同' });
        }
      }

      await withTransaction(async (tx) => {
        await tx.exec(
          `UPDATE MF_BOM SET PRD_NO=@prd_no, PF_NO=@pf_no, NAME=@name, PRD_MARK=@prd_mark,
           WH_NO=@wh_no, UNIT=@unit, QTY=@qty, PRD_KND=@prd_knd, SPC=@spc,
           VALID_DD=@valid_dd, END_DD=@end_dd, DEP=@dep, REM=@rem
           WHERE BOM_NO=@bom_no`,
          mfBomHeadParams(bomNo, mergedHead)
        );
        await tx.exec('DELETE FROM TF_BOM WHERE BOM_NO = @bom_no', {
          bom_no: nstr(bomNo, 38),
        });
        for (const ln of normalized) {
          await insertTfBomLine(tx, bomNo, ln);
        }
        await stampBomAuditOnSave(tx, bomNo, billUserId(req));
      });
      const saved = await loadMfBomHead(bomNo);
      const rawLines = await loadTfBomLines(bomNo, rowToTfBom);
      res.json({ ok: true, head: rowToMfBom(saved), lines: rawLines });
    } catch (e) {
      console.error('[bom-recipes/update]', e);
      if (e.status === 409) return res.status(409).json({ error: e.message });
      res.status(500).json({ error: '修改BOM失败' });
    }
  });

  app.delete('/api/bom-recipes/:bomNo', async (req, res) => {
    try {
      const bomNo = decodeBomNoParam(req.params.bomNo);
      const existing = await queryOne('SELECT CHK_MAN FROM MF_BOM WHERE BOM_NO = @bom_no', {
        bom_no: nstr(bomNo, 38),
      });
      if (!existing) return res.status(404).json({ error: `${label}不存在` });
      await withTransaction(async (tx) => {
        await tx.exec('DELETE FROM TF_BOM WHERE BOM_NO = @bom_no', {
          bom_no: nstr(bomNo, 38),
        });
        await tx.exec('DELETE FROM MF_BOM WHERE BOM_NO = @bom_no', {
          bom_no: nstr(bomNo, 38),
        });
      });
      res.json({ ok: true });
    } catch (e) {
      console.error('[bom-recipes/delete]', e);
      res.status(500).json({ error: '删除BOM失败' });
    }
  });

  registerBillAuditRoutes(app, {
    apiPath: 'bom-recipes',
    billNoParam: 'bomNo',
    label,
    table: 'MF_BOM',
    whereSql: 'BOM_NO = @bom_no',
    buildParams: (req) => ({ bom_no: nstr(decodeBomNoParam(req.params.bomNo), 38) }),
    loadHeadRow: async (req) => loadMfBomHead(decodeBomNoParam(req.params.bomNo)),
  });
}

module.exports = { registerBomOrdersRoutes };
