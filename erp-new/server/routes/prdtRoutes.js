const { rowToPrdt } = require('../db');
const indxRepo = require('../repositories/indxRepository');
const { nextPrdNo } = require('../repositories/mssqlNextNo');
const { queryAll, queryOne, withTransaction, nstr, ndate, nfloat } = require('../repositories/mssqlHelpers');
const { saveArchiveExtFields, mergeArchiveExtFields, isExtFieldError } = require('../billExtFieldHook');
const { savePrdtPic, picUrlForRow, guessMime } = require('../repositories/prdtPic');
const { billUserId } = require('../billAuditMeta');
const { applyPrdtSaveDefaults, isPrdtMaterialKnd } = require('../utils/prdtSaveDefaults');
const { resolveKndForIdx1 } = require('../utils/indxKndResolver');

const PRDT_SEL = `SELECT p.PRD_NO AS prd_no, CAST(p.SNM AS nvarchar(100)) AS snm, p.IDX1 AS idx1, p.IDX2 AS idx2,
  p.KND AS knd, p.UT AS ut, p.UT1 AS ut1, CAST(p.NAME AS nvarchar(200)) AS name, CAST(p.SPC AS nvarchar(200)) AS spc,
  p.WH AS wh, p.WH_LC AS wh_lc, p.UPR AS upr, p.UP_SAL AS up_sal, p.USE_PRDMARK AS use_prdmark,
  p.TW_ID AS tw_id, p.DFU_UT AS dfu_ut, p.ML_UT AS ml_ut, p.QUOTE_UT1 AS quote_ut1, p.QUOTE_UT2 AS quote_ut2,
  p.QUOTE_UT3 AS quote_ut3, p.SPC_TAX AS spc_tax, CAST(p.NAME_PY AS nvarchar(200)) AS name_py,
  p.QTY_MIN AS qty_min, p.QTY_LOW AS qty_low, p.VALID_DAYS AS valid_days,
  p.QTY_MIN1 AS qty_min1, p.QTY_MAX AS qty_max, p.DEP AS dep, p.SAL_NO AS sal_no, CAST(p.REM AS nvarchar(200)) AS rem,
  p.USR AS usr, p.CHK_MAN AS chk_man,
  CONVERT(varchar(10), p.NOUSE_DD, 23) AS nouse_dd,
  CONVERT(varchar(10), p.SYS_DATE, 23) AS sys_date,
  CONVERT(varchar(19), p.CLS_DATE, 120) AS cls_date,
  CONVERT(varchar(10), p.START_DD, 23) AS start_dd,
  CASE WHEN pic.PIC IS NOT NULL AND DATALENGTH(pic.PIC) > 0 THEN 1 ELSE 0 END AS has_pic,
  CASE WHEN pic.CADIMG IS NOT NULL AND DATALENGTH(pic.CADIMG) > 0 THEN 1 ELSE 0 END AS has_cadimg
  FROM PRDT p LEFT JOIN PRDT_PIC pic ON pic.PRD_NO = p.PRD_NO`;

function mapPrdtRow(row) {
  const base = rowToPrdt(row);
  if (row.has_pic) base.pic = picUrlForRow(row.prd_no, 'pic');
  else base.pic = '';
  if (row.has_cadimg) base.cadimg = picUrlForRow(row.prd_no, 'cadimg');
  else base.cadimg = '';
  base.dfu_ut = row.dfu_ut;
  base.ml_ut = row.ml_ut;
  base.quote_ut1 = row.quote_ut1;
  base.quote_ut2 = row.quote_ut2;
  base.quote_ut3 = row.quote_ut3;
  base.spc_tax = row.spc_tax;
  base.name_py = row.name_py;
  base.start_dd = row.start_dd;
  base.nouse_dd = row.nouse_dd;
  base.usr = row.usr;
  base.chk_man = row.chk_man;
  base.cls_date = row.cls_date;
  return base;
}

async function preparePrdtBody(body, existing, opts = {}) {
  const b = { ...(body || {}) };
  if (b.idx1) {
    b.knd = await resolveKndForIdx1(b.idx1);
  }
  const prepared = applyPrdtSaveDefaults(b, existing, opts);
  if (isPrdtMaterialKnd(prepared.knd) && !String(prepared.ut ?? '').trim()) {
    const err = new Error('请选择主单位');
    err.status = 400;
    throw err;
  }
  return prepared;
}

async function bindPrdtInputs(body, existing, prdNo, opts = {}) {
  const b = await preparePrdtBody(body, existing, opts);
  return {
    prd_no: nstr(prdNo, 30),
    snm: nstr(b.snm, 100),
    idx1: nstr(b.idx1 ?? existing?.idx1 ?? existing?.IDX1, 10),
    idx2: nstr(b.idx2 ?? existing?.idx2 ?? existing?.IDX2, 10),
    knd: nstr(b.knd, 4),
    ut: nstr(b.ut ?? existing?.ut ?? existing?.UT, 10),
    ut1: nstr(b.ut1, 10),
    name: nstr(b.name, 200),
    spc: nstr(b.spc ?? existing?.spc ?? existing?.SPC, 200),
    wh: nstr(b.wh ?? existing?.wh ?? existing?.WH, 10),
    wh_lc: nstr(b.wh_lc ?? existing?.wh_lc ?? existing?.WH_LC, 20),
    upr: nfloat(b.upr),
    up_sal: nfloat(b.up_sal),
    use_prdmark: nstr(b.use_prdmark ?? existing?.use_prdmark ?? existing?.USE_PRDMARK, 4),
    tw_id: nstr(b.tw_id, 1),
    dfu_ut: nstr(b.dfu_ut, 1),
    ml_ut: nstr(b.ml_ut, 1),
    quote_ut1: nstr(b.quote_ut1, 1),
    quote_ut2: nstr(b.quote_ut2, 1),
    quote_ut3: nstr(b.quote_ut3, 1),
    spc_tax: nfloat(b.spc_tax),
    rto_cl: nfloat(b.rto_cl),
    pak_exc: nfloat(b.pak_exc),
    pak_nw: nfloat(b.pak_nw),
    pak_gw: nfloat(b.pak_gw),
    pak_meast: nfloat(b.pak_meast),
    qty_ad_id: nstr(b.qty_ad_id, 1),
    depro_no: nstr(b.depro_no, 8),
    mob_id1: nstr(b.mob_id1, 2),
    name_py: nstr(b.name_py, 200),
    start_dd: ndate(b.start_dd),
    nouse_dd: ndate(b.nouse_dd),
    qty_min: nfloat(b.qty_min),
    qty_low: nfloat(b.qty_low),
    valid_days: nfloat(b.valid_days),
    qty_min1: nfloat(b.qty_min1),
    qty_max: nfloat(b.qty_max),
    dep: nstr(b.dep ?? existing?.dep ?? existing?.DEP, 10),
    sal_no: nstr(b.sal_no ?? existing?.sal_no ?? existing?.SAL_NO, 10),
    rem: nstr(b.rem ?? existing?.rem ?? existing?.REM, 200),
  };
}

async function loadPrdtPicBinary(prdNo, field) {
  const col = field === 'cadimg' ? 'CADIMG' : 'PIC';
  const row = await queryOne(`SELECT ${col} AS blob FROM PRDT_PIC WHERE PRD_NO=@prd_no`, {
    prd_no: nstr(prdNo, 30),
  });
  const buf = row?.blob;
  if (!buf || (Buffer.isBuffer(buf) && buf.length === 0)) return null;
  return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
}

const PRDT_INSERT_COLS = `PRD_NO, NAME, SNM, SPC, KND, IDX1, UT, UT1, DFU_UT, WH, WH_LC, SPC_TAX,
  REM, PAK_EXC, PAK_NW, PAK_GW, PAK_MEAST, DEP, START_DD, NOUSE_DD, TW_ID, RTO_CL, ML_UT,
  QUOTE_UT1, QUOTE_UT2, QUOTE_UT3, DEPRO_NO, NAME_PY, MOB_ID1, QTY_AD_ID,
  UPR, UP_SAL, USE_PRDMARK, QTY_MIN, QTY_LOW, VALID_DAYS, QTY_MIN1, QTY_MAX, SAL_NO`;

const PRDT_INSERT_VALS = `@prd_no, @name, @snm, @spc, @knd, @idx1, @ut, @ut1, @dfu_ut, @wh, @wh_lc, @spc_tax,
  @rem, @pak_exc, @pak_nw, @pak_gw, @pak_meast, @dep, @start_dd, @nouse_dd, @tw_id, @rto_cl, @ml_ut,
  @quote_ut1, @quote_ut2, @quote_ut3, @depro_no, @name_py, @mob_id1, @qty_ad_id,
  @upr, @up_sal, @use_prdmark, @qty_min, @qty_low, @valid_days, @qty_min1, @qty_max, @sal_no`;

const PRDT_UPDATE_SET = `SNM=@snm, IDX1=@idx1, IDX2=@idx2, KND=@knd, UT=@ut, UT1=@ut1, NAME=@name, SPC=@spc,
  WH=@wh, WH_LC=@wh_lc, UPR=@upr, UP_SAL=@up_sal, USE_PRDMARK=@use_prdmark, TW_ID=@tw_id,
  DFU_UT=@dfu_ut, ML_UT=@ml_ut, QUOTE_UT1=@quote_ut1, QUOTE_UT2=@quote_ut2, QUOTE_UT3=@quote_ut3,
  SPC_TAX=@spc_tax, RTO_CL=@rto_cl, PAK_EXC=@pak_exc, PAK_NW=@pak_nw, PAK_GW=@pak_gw, PAK_MEAST=@pak_meast,
  QTY_AD_ID=@qty_ad_id, DEPRO_NO=@depro_no, MOB_ID1=@mob_id1, NAME_PY=@name_py, NOUSE_DD=@nouse_dd,
  QTY_MIN=@qty_min, QTY_LOW=@qty_low, VALID_DAYS=@valid_days, QTY_MIN1=@qty_min1, QTY_MAX=@qty_max,
  DEP=@dep, SAL_NO=@sal_no, REM=@rem`;

const PRDT_UT_SEL = `SELECT UT_ID AS ut_id, CAST(UT AS nvarchar(20)) AS ut FROM PRDT_UT`;

async function listPrdtUnits() {
  try {
    return await queryAll(`${PRDT_UT_SEL} ORDER BY UT`);
  } catch (e) {
    if (!/Invalid object name/i.test(String(e.message || ''))) throw e;
    return queryAll(
      `SELECT DISTINCT '1' AS ut_id, CAST(UT AS nvarchar(20)) AS ut
       FROM PRDT WHERE ISNULL(LTRIM(RTRIM(UT)), '') <> '' ORDER BY UT`
    );
  }
}

function registerPrdtRoutes(app) {
  app.get('/api/prdt/next-no', async (req, res) => {
    const { idx1, idx2 } = req.query;
    if (!idx1) return res.status(400).json({ error: '请先选择中类' });
    try {
      res.json(await nextPrdNo(String(idx1), idx2 ? String(idx2) : null));
    } catch (e) {
      console.error('[prdt/next-no]', e);
      res.status(500).json({ error: '取号失败' });
    }
  });

  /** PRDT_UT 主单位开窗（须在 /api/prdt/:prdNo 之前注册） */
  app.get('/api/prdt/units', async (_req, res) => {
    try {
      res.json(await listPrdtUnits());
    } catch (e) {
      console.error('[prdt/units]', e);
      res.status(500).json({ error: '读取单位列表失败' });
    }
  });

  app.post('/api/prdt/units/batch', async (req, res) => {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    const utList = rows
      .map((r) => String(r?.ut ?? '').trim())
      .filter((ut) => ut !== '');
    if (!utList.length) {
      return res.status(400).json({ error: '请填写单位' });
    }
    const unique = [...new Set(utList)];
    try {
      await withTransaction(async (tx) => {
        for (const ut of unique) {
          const exists = await tx.queryOne('SELECT 1 AS ok FROM PRDT_UT WHERE UT = @ut', {
            ut: nstr(ut, 8),
          });
          if (exists) continue;
          await tx.exec(
            `INSERT INTO PRDT_UT (UT_ID, UT) VALUES (@ut_id, @ut)`,
            { ut_id: nstr('1', 4), ut: nstr(ut, 8) }
          );
        }
      });
      res.json(await listPrdtUnits());
    } catch (e) {
      console.error('[prdt/units/batch]', e);
      res.status(500).json({ error: e.message || '保存单位失败' });
    }
  });

  app.get('/api/prdt', async (req, res) => {
    const { limit = '50' } = req.query;
    try {
      let sql = `${PRDT_SEL} WHERE 1=1`;
      const inputs = {};
      const textCols = [
        'idx1', 'prd_no', 'knd', 'name', 'spc', 'snm', 'ut', 'ut1', 'use_prdmark', 'tw_id',
        'wh', 'wh_lc', 'rem', 'dep', 'sal_no',
      ];
      const numCols = ['upr', 'up_sal', 'qty_min', 'qty_low', 'valid_days', 'qty_min1', 'qty_max'];
      for (const col of textCols) {
        const v = req.query[col];
        if (v != null && String(v).trim() !== '') {
          sql += ` AND CAST(p.${col.toUpperCase()} AS nvarchar(200)) LIKE @${col}`;
          inputs[col] = nstr(`%${String(v).trim()}%`, 200);
        }
      }
      for (const col of numCols) {
        const v = req.query[col];
        if (v != null && String(v).trim() !== '') {
          sql += ` AND p.${col.toUpperCase()} = @${col}`;
          inputs[col] = nfloat(Number(v));
        }
      }
      const kndIn = req.query.knd_in;
      if (kndIn != null && String(kndIn).trim() !== '') {
        const kinds = String(kndIn)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        if (kinds.length) {
          const placeholders = kinds.map((_, i) => `@knd_in_${i}`).join(', ');
          sql += ` AND LTRIM(RTRIM(CAST(p.KND AS nvarchar(10)))) IN (${placeholders})`;
          kinds.forEach((k, i) => {
            inputs[`knd_in_${i}`] = nstr(k, 4);
          });
          sql += ` AND ISNULL(p.STOP_ID, '') <> 'Y'`;
        }
      }
      if (req.query.sys_date) {
        sql += ' AND CONVERT(varchar(10), p.SYS_DATE, 23) = @sys_date';
        inputs.sys_date = nstr(String(req.query.sys_date), 10);
      }
      if (req.query.nouse_dd) {
        sql += ' AND CONVERT(varchar(10), p.NOUSE_DD, 23) = @nouse_dd';
        inputs.nouse_dd = nstr(String(req.query.nouse_dd), 10);
      }
      const top = Math.min(parseInt(String(limit), 10) || 50, 200);
      sql = sql.replace('SELECT', `SELECT TOP (${top})`);
      sql += ' ORDER BY p.PRD_NO DESC';
      res.json((await queryAll(sql, inputs)).map(mapPrdtRow));
    } catch (e) {
      console.error('[prdt/list]', e);
      res.status(500).json({ error: '读取货品列表失败' });
    }
  });

  app.get('/api/prdt/:prdNo', async (req, res) => {
    try {
      const row = await queryOne(`${PRDT_SEL} WHERE p.PRD_NO = @prd_no`, {
        prd_no: nstr(req.params.prdNo, 30),
      });
      if (!row) return res.status(404).json({ error: '货品不存在' });
      res.json(await mergeArchiveExtFields('FasECA', { prd_no: req.params.prdNo }, mapPrdtRow(row)));
    } catch (e) {
      console.error('[prdt/get]', e);
      res.status(500).json({ error: '读取货品失败' });
    }
  });

  app.post('/api/prdt', async (req, res) => {
    const body = req.body || {};
    let prd_no = body.prd_no;
    if (!body.idx1) return res.status(400).json({ error: '请选择中类' });
    if (!body.name) return res.status(400).json({ error: '品名不能为空' });
    try {
      if (!prd_no) prd_no = (await nextPrdNo(body.idx1, body.idx2)).prd_no;
      if (await queryOne('SELECT 1 AS ok FROM PRDT WHERE PRD_NO=@prd_no', { prd_no: nstr(prd_no, 30) })) {
        return res.status(409).json({ error: '货品代号已存在' });
      }
      if (!(await indxRepo.exists(String(body.idx1)))) {
        return res.status(400).json({ error: '中类不存在' });
      }
      if (await indxRepo.hasChild(String(body.idx1))) {
        return res.status(400).json({ error: '请选择末阶中类' });
      }
      const creator = billUserId(req);
      const inp = await bindPrdtInputs(body, null, prd_no, { isCreate: true });
      await withTransaction(async (tx) => {
        await tx.exec(
          `INSERT INTO PRDT (${PRDT_INSERT_COLS}${creator ? ', USR, SYS_DATE, CHK_MAN, CLS_DATE' : ''})
           VALUES (${PRDT_INSERT_VALS}${creator ? ', @usr, GETDATE(), @chk_man, GETDATE()' : ''})`,
          {
            ...inp,
            ...(creator ? { usr: creator, chk_man: creator } : {}),
          }
        );
        await savePrdtPic(tx, prd_no, body.pic, body.cadimg);
      });
      await saveArchiveExtFields('FasECA', { prd_no }, body);
      const row = await queryOne(`${PRDT_SEL} WHERE p.PRD_NO = @prd_no`, { prd_no: nstr(prd_no, 30) });
      res.status(201).json(await mergeArchiveExtFields('FasECA', { prd_no }, mapPrdtRow(row)));
    } catch (e) {
      console.error('[prdt/create]', e);
      if (e.status === 400) return res.status(400).json({ error: e.message });
      if (isExtFieldError(e)) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: e.message || '新增货品失败' });
    }
  });

  app.put('/api/prdt/:prdNo', async (req, res) => {
    try {
      const row = await queryOne('SELECT * FROM PRDT WHERE PRD_NO=@prd_no', {
        prd_no: nstr(req.params.prdNo, 30),
      });
      if (!row) return res.status(404).json({ error: '货品不存在' });
      const b = req.body || {};
      const idx1 = String(b.idx1 ?? row.IDX1 ?? row.idx1 ?? '').trim();
      if (idx1) {
        if (!(await indxRepo.exists(idx1))) {
          return res.status(400).json({ error: '中类不存在' });
        }
        if (await indxRepo.hasChild(idx1)) {
          return res.status(400).json({ error: '请选择末阶中类' });
        }
      }
      const creator = billUserId(req);
      const inp = await bindPrdtInputs(b, row, req.params.prdNo, { isCreate: false });
      const auditSql = creator ? ', CHK_MAN=@chk_man, CLS_DATE=GETDATE()' : '';
      await withTransaction(async (tx) => {
        await tx.exec(
          `UPDATE PRDT SET ${PRDT_UPDATE_SET}${auditSql} WHERE PRD_NO=@prd_no`,
          { ...inp, ...(creator ? { chk_man: creator } : {}) }
        );
        if ('pic' in b || 'cadimg' in b) {
          await savePrdtPic(
            tx,
            req.params.prdNo,
            'pic' in b ? b.pic : undefined,
            'cadimg' in b ? b.cadimg : undefined
          );
        }
      });
      await saveArchiveExtFields('FasECA', { prd_no: req.params.prdNo }, b);
      const updated = await queryOne(`${PRDT_SEL} WHERE p.PRD_NO = @prd_no`, {
        prd_no: nstr(req.params.prdNo, 30),
      });
      res.json(await mergeArchiveExtFields('FasECA', { prd_no: req.params.prdNo }, mapPrdtRow(updated)));
    } catch (e) {
      console.error('[prdt/update]', e);
      if (e.status === 400) return res.status(400).json({ error: e.message });
      if (isExtFieldError(e)) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: e.message || '修改货品失败' });
    }
  });

  app.get('/api/prdt/:prdNo/pic', async (req, res) => {
    try {
      const buf = await loadPrdtPicBinary(req.params.prdNo, 'pic');
      if (!buf) return res.status(404).end();
      res.set('Content-Type', guessMime(buf, 'image/jpeg'));
      res.set('Cache-Control', 'private, max-age=3600');
      res.send(buf);
    } catch (e) {
      console.error('[prdt/pic]', e);
      res.status(500).json({ error: '读取图片失败' });
    }
  });

  app.get('/api/prdt/:prdNo/cadimg', async (req, res) => {
    try {
      const buf = await loadPrdtPicBinary(req.params.prdNo, 'cadimg');
      if (!buf) return res.status(404).end();
      res.set('Content-Type', guessMime(buf, 'application/octet-stream'));
      res.set('Content-Disposition', `inline; filename="${req.params.prdNo}-cadimg"`);
      res.send(buf);
    } catch (e) {
      console.error('[prdt/cadimg]', e);
      res.status(500).json({ error: '读取图档失败' });
    }
  });
}

module.exports = { registerPrdtRoutes };
