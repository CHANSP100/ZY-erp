const { queryAll, queryOne, nstr } = require('../repositories/mssqlHelpers');

const CUR_SEL = `SELECT CUR_ID AS cur_id, CAST(NAME AS nvarchar(20)) AS name, EXC_RTO AS exc_rto FROM CUR_ID`;

function registerCurRoutes(app) {
  app.get('/api/cur', async (_req, res) => {
    try {
      const rows = await queryAll(`${CUR_SEL} ORDER BY CUR_ID`);
      res.json(rows);
    } catch (e) {
      console.error('[cur/list]', e);
      res.status(500).json({ error: '读取币别列表失败' });
    }
  });

  app.get('/api/cur/:curId', async (req, res) => {
    try {
      const row = await queryOne(`${CUR_SEL} WHERE CUR_ID = @cur_id`, {
        cur_id: nstr(req.params.curId, 4),
      });
      if (!row) return res.status(404).json({ error: '币别不存在' });
      res.json(row);
    } catch (e) {
      console.error('[cur/get]', e);
      res.status(500).json({ error: '读取币别失败' });
    }
  });
}

module.exports = { registerCurRoutes };
