const { queryAll, queryOne, withTransaction, nstr, nchar } = require('../repositories/mssqlHelpers');

const BIL_SPC_SEL = `SELECT CAST(BIL_ID AS nvarchar(2)) AS bil_id,
  CAST(SPC_ID AS nvarchar(2)) AS spc_id,
  CAST(SPC_NO AS nvarchar(12)) AS spc_no,
  CAST(NAME AS nvarchar(100)) AS name,
  CAST(REM AS nvarchar(100)) AS rem
FROM BIL_SPC`;

function normalizeBilSpcRow(row) {
  return {
    bil_id: row.bil_id || '',
    spc_id: row.spc_id || '',
    spc_no: String(row.spc_no || '').trim(),
    name: row.name == null ? '' : String(row.name),
    rem: row.rem == null ? '' : String(row.rem),
  };
}

async function listBilSpc(bilId, spcId) {
  try {
    const rows = await queryAll(
      `${BIL_SPC_SEL} WHERE BIL_ID = @bil_id AND SPC_ID = @spc_id ORDER BY SPC_NO`,
      { bil_id: nchar(bilId, 2), spc_id: nchar(spcId, 2) }
    );
    return rows.map(normalizeBilSpcRow);
  } catch (e) {
    if (!/Invalid object name/i.test(String(e.message || ''))) throw e;
    return [];
  }
}

async function isBilSpcReferenced(spcNo, txApi = null) {
  const q = txApi?.queryOne ?? queryOne;
  const row = await q(
    `SELECT TOP 1 1 AS ok FROM MF_POS WHERE BIL_TYPE = @spc_no
     UNION ALL
     SELECT TOP 1 1 AS ok FROM MF_PSS WHERE BIL_TYPE = @spc_no`,
    { spc_no: nstr(spcNo, 12) }
  );
  return !!row;
}

function registerBilSpcRoutes(app) {
  app.get('/api/bil-spc', async (req, res) => {
    const bilId = String(req.query.bil_id ?? 'SA').trim();
    const spcId = String(req.query.spc_id ?? 'OB').trim();
    try {
      res.json(await listBilSpc(bilId, spcId));
    } catch (e) {
      console.error('[bil-spc/list]', e);
      res.status(500).json({ error: '读取单据类别失败' });
    }
  });

  app.post('/api/bil-spc/batch', async (req, res) => {
    const bilId = String(req.body?.bil_id ?? 'SA').trim();
    const spcId = String(req.body?.spc_id ?? 'OB').trim();
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    const deleted = Array.isArray(req.body?.deleted) ? req.body.deleted : [];

    const upserts = rows
      .map((r) => ({
        spc_no: String(r?.spc_no ?? '').trim(),
        name: String(r?.name ?? '').trim(),
        rem: String(r?.rem ?? '').trim(),
      }))
      .filter((r) => r.spc_no !== '');

    if (!upserts.length && !deleted.length) {
      return res.status(400).json({ error: '没有可保存的数据' });
    }

    const seen = new Set();
    for (const r of upserts) {
      if (seen.has(r.spc_no)) {
        return res.status(400).json({ error: `类别代号重复：${r.spc_no}` });
      }
      seen.add(r.spc_no);
    }

    try {
      await withTransaction(async (tx) => {
        for (const spcNo of deleted.map((d) => String(d ?? '').trim()).filter(Boolean)) {
          if (await isBilSpcReferenced(spcNo, tx)) {
            throw new Error(`类别「${spcNo}」已被单据引用，不能删除`);
          }
          await tx.exec(
            `DELETE FROM BIL_SPC WHERE BIL_ID = @bil_id AND SPC_ID = @spc_id AND SPC_NO = @spc_no`,
            {
              bil_id: nchar(bilId, 2),
              spc_id: nchar(spcId, 2),
              spc_no: nstr(spcNo, 12),
            }
          );
        }

        for (const r of upserts) {
          const name = r.name || r.spc_no;
          const existing = await tx.queryOne(
            `SELECT 1 AS ok FROM BIL_SPC
             WHERE BIL_ID = @bil_id AND SPC_ID = @spc_id AND SPC_NO = @spc_no`,
            {
              bil_id: nchar(bilId, 2),
              spc_id: nchar(spcId, 2),
              spc_no: nstr(r.spc_no, 12),
            }
          );
          if (existing) {
            await tx.exec(
              `UPDATE BIL_SPC SET NAME = @name, REM = @rem
               WHERE BIL_ID = @bil_id AND SPC_ID = @spc_id AND SPC_NO = @spc_no`,
              {
                bil_id: nchar(bilId, 2),
                spc_id: nchar(spcId, 2),
                spc_no: nstr(r.spc_no, 12),
                name: nstr(name, 100),
                rem: nstr(r.rem, 100),
              }
            );
          } else {
            await tx.exec(
              `INSERT INTO BIL_SPC (BIL_ID, SPC_ID, SPC_NO, NAME, REM)
               VALUES (@bil_id, @spc_id, @spc_no, @name, @rem)`,
              {
                bil_id: nchar(bilId, 2),
                spc_id: nchar(spcId, 2),
                spc_no: nstr(r.spc_no, 12),
                name: nstr(name, 100),
                rem: nstr(r.rem, 100),
              }
            );
          }
        }
      });
      res.json(await listBilSpc(bilId, spcId));
    } catch (e) {
      console.error('[bil-spc/batch]', e);
      const msg = e.message || '保存单据类别失败';
      const status = /引用|重复|已存在/.test(msg) ? 400 : 500;
      res.status(status).json({ error: msg });
    }
  });
}

module.exports = { registerBilSpcRoutes, listBilSpc };
