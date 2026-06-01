const { rowToWh } = require('../db');
const { queryAll, queryOne, execSql, nstr, ndate } = require('../repositories/mssqlHelpers');
const { whAllowedSet } = require('../permissions');
const { saveArchiveExtFields, mergeArchiveExtFields, isExtFieldError } = require('../billExtFieldHook');

const WH_SEL = `SELECT w.WH AS wh, CAST(w.NAME AS nvarchar(100)) AS name, w.DEP AS dep, w.UP_WH AS up_wh,
  CAST(w.ADR AS nvarchar(200)) AS adr, CAST(w.TEL_NO AS nvarchar(50)) AS tel_no,
  CONVERT(varchar(10), w.STOP_DD, 23) AS stop_dd, CAST(w.REM AS nvarchar(200)) AS rem,
  CAST(d.NAME AS nvarchar(100)) AS dep_name, CAST(u.NAME AS nvarchar(100)) AS up_wh_name
  FROM MY_WH w
  LEFT JOIN DEPT d ON d.DEP = w.DEP
  LEFT JOIN MY_WH u ON u.WH = w.UP_WH`;

function registerWhRoutes(app) {
  app.get('/api/warehouses', async (req, res) => {
    try {
      let rows = await queryAll(`SELECT WH AS wh, CAST(NAME AS nvarchar(100)) AS name FROM MY_WH ORDER BY WH`);
      const allowed = req.erpUser ? whAllowedSet(req.erpUser.usr_id, req.erpUser.is_admin) : null;
      if (allowed) rows = rows.filter((r) => allowed.has(r.wh));
      res.json(rows);
    } catch (e) {
      console.error('[warehouses]', e);
      res.status(500).json({ error: '读取仓库列表失败' });
    }
  });

  app.get('/api/wh', async (req, res) => {
    try {
      let rows = await queryAll(`${WH_SEL} ORDER BY w.WH`);
      const allowed = whAllowedSet(req.erpUser.usr_id, req.erpUser.is_admin);
      if (allowed) rows = rows.filter((r) => allowed.has(r.wh));
      res.json(rows.map(rowToWh));
    } catch (e) {
      console.error('[wh/list]', e);
      res.status(500).json({ error: '读取仓库列表失败' });
    }
  });

  app.get('/api/wh/:wh', async (req, res) => {
    try {
      const row = await queryOne(`${WH_SEL} WHERE w.WH = @wh`, { wh: nstr(req.params.wh, 10) });
      if (!row) return res.status(404).json({ error: '仓库不存在' });
      res.json(await mergeArchiveExtFields('FasECB', { wh: req.params.wh }, rowToWh(row)));
    } catch (e) {
      console.error('[wh/get]', e);
      res.status(500).json({ error: '读取仓库失败' });
    }
  });

  app.post('/api/wh', async (req, res) => {
    const b = req.body || {};
    if (!b.wh) return res.status(400).json({ error: '仓库代号不能为空' });
    try {
      if (await queryOne('SELECT 1 AS ok FROM MY_WH WHERE WH = @wh', { wh: nstr(b.wh, 10) })) {
        return res.status(409).json({ error: '仓库代号已存在' });
      }
      await execSql(
        `INSERT INTO MY_WH (WH, NAME, DEP, UP_WH, ADR, TEL_NO, STOP_DD, REM)
         VALUES (@wh, @name, @dep, @up_wh, @adr, @tel_no, @stop_dd, @rem)`,
        {
          wh: nstr(b.wh, 10),
          name: nstr(b.name, 100),
          dep: nstr(b.dep, 10),
          up_wh: nstr(b.up_wh, 10),
          adr: nstr(b.adr, 200),
          tel_no: nstr(b.tel_no, 50),
          stop_dd: ndate(b.stop_dd),
          rem: nstr(b.rem, 200),
        }
      );
      await saveArchiveExtFields('FasECB', { wh: b.wh }, b);
      const row = await queryOne(`${WH_SEL} WHERE w.WH = @wh`, { wh: nstr(b.wh, 10) });
      res.status(201).json(await mergeArchiveExtFields('FasECB', { wh: b.wh }, rowToWh(row)));
    } catch (e) {
      console.error('[wh/create]', e);
      if (isExtFieldError(e)) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: e.message || '新增仓库失败' });
    }
  });

  app.put('/api/wh/:wh', async (req, res) => {
    try {
      const row = await queryOne('SELECT * FROM MY_WH WHERE WH = @wh', { wh: nstr(req.params.wh, 10) });
      if (!row) return res.status(404).json({ error: '仓库不存在' });
      const b = req.body || {};
      await execSql(
        `UPDATE MY_WH SET NAME=@name, DEP=@dep, UP_WH=@up_wh, ADR=@adr, TEL_NO=@tel_no, STOP_DD=@stop_dd, REM=@rem WHERE WH=@wh`,
        {
          wh: nstr(req.params.wh, 10),
          name: nstr(b.name ?? row.name, 100),
          dep: nstr(b.dep ?? row.dep, 10),
          up_wh: nstr(b.up_wh ?? row.up_wh, 10),
          adr: nstr(b.adr ?? row.adr, 200),
          tel_no: nstr(b.tel_no ?? row.tel_no, 50),
          stop_dd: ndate(b.stop_dd ?? row.stop_dd),
          rem: nstr(b.rem ?? row.rem, 200),
        }
      );
      await saveArchiveExtFields('FasECB', { wh: req.params.wh }, b);
      const updated = await queryOne(`${WH_SEL} WHERE w.WH = @wh`, { wh: nstr(req.params.wh, 10) });
      res.json(await mergeArchiveExtFields('FasECB', { wh: req.params.wh }, rowToWh(updated)));
    } catch (e) {
      console.error('[wh/update]', e);
      if (isExtFieldError(e)) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: e.message || '修改仓库失败' });
    }
  });
}

module.exports = { registerWhRoutes };
