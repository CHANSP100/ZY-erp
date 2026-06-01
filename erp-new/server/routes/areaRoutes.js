const { rowToArea, buildAreaTree } = require('../db');
const areaRepo = require('../repositories/areaRepository');
const { saveArchiveExtFields, mergeArchiveExtFields, isExtFieldError } = require('../billExtFieldHook');

const MENU_CODE = 'FasECG';
const AREA_ROOT = '00000000';

function registerAreaRoutes(app) {
  app.get('/api/area/tree', async (_req, res) => {
    try {
      const rows = (await areaRepo.listAll()).map(rowToArea);
      res.json(buildAreaTree(rows));
    } catch (e) {
      console.error('[area/tree]', e);
      res.status(500).json({ error: '读取区域树失败' });
    }
  });

  app.get('/api/area', async (_req, res) => {
    try {
      const rows = (await areaRepo.listAll())
        .filter((r) => r.area_no !== AREA_ROOT)
        .map(rowToArea);
      const merged = await Promise.all(
        rows.map((row) => mergeArchiveExtFields(MENU_CODE, { area_no: row.area_no }, row))
      );
      res.json(merged);
    } catch (e) {
      console.error('[area/list]', e);
      res.status(500).json({ error: '读取区域列表失败' });
    }
  });

  app.get('/api/area/:areaNo', async (req, res) => {
    try {
      const row = await areaRepo.getByNo(req.params.areaNo);
      if (!row) return res.status(404).json({ error: '区域不存在' });
      res.json(
        await mergeArchiveExtFields(MENU_CODE, { area_no: req.params.areaNo }, rowToArea(row))
      );
    } catch (e) {
      console.error('[area/get]', e);
      res.status(500).json({ error: '读取区域失败' });
    }
  });

  app.post('/api/area', async (req, res) => {
    const { area_no, area_up } = req.body || {};
    if (!area_no || !String(area_no).trim()) {
      return res.status(400).json({ error: '区域代号不能为空' });
    }
    try {
      if (await areaRepo.exists(String(area_no).trim())) {
        return res.status(409).json({ error: '区域代号已存在' });
      }
      const up = String(area_up || '').trim();
      if (up && up !== AREA_ROOT && !(await areaRepo.exists(up))) {
        return res.status(400).json({ error: '上层区域不存在' });
      }
      const row = await areaRepo.create(req.body);
      await saveArchiveExtFields(MENU_CODE, { area_no: String(area_no).trim() }, req.body);
      res.status(201).json(
        await mergeArchiveExtFields(MENU_CODE, { area_no: String(area_no).trim() }, rowToArea(row))
      );
    } catch (e) {
      console.error('[area/create]', e);
      if (isExtFieldError(e)) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: e.message || '新增区域失败' });
    }
  });

  app.put('/api/area/:areaNo', async (req, res) => {
    try {
      const existing = await areaRepo.getByNo(req.params.areaNo);
      if (!existing) return res.status(404).json({ error: '区域不存在' });
      const areaUpRaw = req.body?.area_up ?? existing.area_up;
      const areaUp = String(areaUpRaw || '').trim();
      if (areaUp && areaUp !== req.params.areaNo && areaUp !== AREA_ROOT && !(await areaRepo.exists(areaUp))) {
        return res.status(400).json({ error: '上层区域不存在' });
      }
      const row = await areaRepo.update(req.params.areaNo, req.body);
      await saveArchiveExtFields(MENU_CODE, { area_no: req.params.areaNo }, req.body);
      res.json(await mergeArchiveExtFields(MENU_CODE, { area_no: req.params.areaNo }, rowToArea(row)));
    } catch (e) {
      console.error('[area/update]', e);
      if (isExtFieldError(e)) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: e.message || '修改区域失败' });
    }
  });

  app.delete('/api/area/:areaNo', async (req, res) => {
    try {
      if (req.params.areaNo === AREA_ROOT) {
        return res.status(400).json({ error: '根区域不可删除' });
      }
      if (await areaRepo.isUsedByCust(req.params.areaNo)) {
        return res.status(400).json({ error: '该区域已被客户厂商引用，无法删除' });
      }
      if (await areaRepo.hasChild(req.params.areaNo)) {
        return res.status(400).json({ error: '存在下级区域，无法删除' });
      }
      const ok = await areaRepo.remove(req.params.areaNo);
      if (!ok) return res.status(404).json({ error: '区域不存在' });
      res.json({ ok: true });
    } catch (e) {
      console.error('[area/delete]', e);
      res.status(500).json({ error: e.message || '删除区域失败' });
    }
  });
}

module.exports = { registerAreaRoutes };
