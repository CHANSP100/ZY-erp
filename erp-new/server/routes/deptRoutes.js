const { rowToDept, buildDeptTree } = require('../db');
const { queryAll, queryOne, execSql, nstr, ndate } = require('../repositories/mssqlHelpers');
const { saveArchiveExtFields, mergeArchiveExtFields, isExtFieldError } = require('../billExtFieldHook');

const DEPT_SEL = `SELECT DEP AS dep, CAST(NAME AS nvarchar(100)) AS name,
  CAST(ENG_NAME AS nvarchar(100)) AS eng_name, UP AS up, MAKE_ID AS make_id,
  CONVERT(varchar(10), STOP_DD, 23) AS stop_dd FROM DEPT`;

const MAKE_ID_VALUES = new Set(['1', '2', '3']);

function normalizeMakeId(value, fallback = '1') {
  const v = value == null ? '' : String(value).trim();
  return MAKE_ID_VALUES.has(v) ? v : fallback;
}

function registerDeptRoutes(app) {
  app.get('/api/dept/tree', async (_req, res) => {
    try {
      const rows = (await queryAll(`${DEPT_SEL} ORDER BY DEP`)).map(rowToDept);
      res.json(buildDeptTree(rows));
    } catch (e) {
      console.error('[dept/tree]', e);
      res.status(500).json({ error: '读取部门树失败' });
    }
  });

  app.get('/api/dept', async (_req, res) => {
    try {
      const rows = (await queryAll(`${DEPT_SEL} ORDER BY DEP`)).map(rowToDept);
      const merged = await Promise.all(
        rows.map((row) => mergeArchiveExtFields('FasED', { dep: row.dep }, row))
      );
      res.json(merged);
    } catch (e) {
      console.error('[dept/list]', e);
      res.status(500).json({ error: '读取部门列表失败' });
    }
  });

  app.get('/api/dept/:dep', async (req, res) => {
    try {
      const row = await queryOne(`${DEPT_SEL} WHERE DEP = @dep`, { dep: nstr(req.params.dep, 10) });
      if (!row) return res.status(404).json({ error: '部门不存在' });
      res.json(await mergeArchiveExtFields('FasED', { dep: req.params.dep }, rowToDept(row)));
    } catch (e) {
      console.error('[dept/get]', e);
      res.status(500).json({ error: '读取部门失败' });
    }
  });

  app.post('/api/dept', async (req, res) => {
    const { dep, name, eng_name, up, make_id, stop_dd } = req.body || {};
    if (!dep) return res.status(400).json({ error: '部门代号不能为空' });
    try {
      if (await queryOne('SELECT 1 AS ok FROM DEPT WHERE DEP = @dep', { dep: nstr(dep, 10) })) {
        return res.status(409).json({ error: '部门代号已存在' });
      }
      if (up) {
        if (!(await queryOne('SELECT 1 AS ok FROM DEPT WHERE DEP = @up', { up: nstr(up, 10) }))) {
          return res.status(400).json({ error: '上层部门不存在' });
        }
      }
      await execSql(
        `INSERT INTO DEPT (DEP, NAME, ENG_NAME, UP, MAKE_ID, STOP_DD) VALUES (@dep, @name, @eng_name, @up, @make_id, @stop_dd)`,
        {
          dep: nstr(dep, 10),
          name: nstr(name, 100),
          eng_name: nstr(eng_name, 100),
          up: nstr(up, 10),
          make_id: nstr(normalizeMakeId(make_id), 1),
          stop_dd: ndate(stop_dd),
        }
      );
      await saveArchiveExtFields('FasED', { dep }, req.body || {});
      const row = await queryOne(`${DEPT_SEL} WHERE DEP = @dep`, { dep: nstr(dep, 10) });
      res.status(201).json(await mergeArchiveExtFields('FasED', { dep }, rowToDept(row)));
    } catch (e) {
      console.error('[dept/create]', e);
      if (isExtFieldError(e)) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: e.message || '新增部门失败' });
    }
  });

  app.put('/api/dept/:dep', async (req, res) => {
    try {
      const row = await queryOne(`${DEPT_SEL} WHERE DEP = @dep`, { dep: nstr(req.params.dep, 10) });
      if (!row) return res.status(404).json({ error: '部门不存在' });
      const b = req.body || {};
      if (b.up && b.up !== req.params.dep) {
        if (!(await queryOne('SELECT 1 AS ok FROM DEPT WHERE DEP = @up', { up: nstr(b.up, 10) }))) {
          return res.status(400).json({ error: '上层部门不存在' });
        }
      }
      await execSql(
        `UPDATE DEPT SET NAME=@name, ENG_NAME=@eng_name, UP=@up, MAKE_ID=@make_id, STOP_DD=@stop_dd WHERE DEP=@dep`,
        {
          dep: nstr(req.params.dep, 10),
          name: nstr(b.name ?? row.name, 100),
          eng_name: nstr(b.eng_name ?? row.eng_name, 100),
          up: nstr(b.up ?? row.up, 10),
          make_id: nstr(normalizeMakeId(b.make_id ?? row.make_id), 1),
          stop_dd: ndate(b.stop_dd ?? row.stop_dd),
        }
      );
      await saveArchiveExtFields('FasED', { dep: req.params.dep }, b);
      const updated = await queryOne(`${DEPT_SEL} WHERE DEP = @dep`, { dep: nstr(req.params.dep, 10) });
      res.json(await mergeArchiveExtFields('FasED', { dep: req.params.dep }, rowToDept(updated)));
    } catch (e) {
      console.error('[dept/update]', e);
      if (isExtFieldError(e)) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: e.message || '修改部门失败' });
    }
  });
}

module.exports = { registerDeptRoutes };
