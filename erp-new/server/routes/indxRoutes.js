const { rowToIndx, buildIndxTree } = require('../db');
const indxRepo = require('../repositories/indxRepository');
const { resolveKndForIdx1 } = require('../utils/indxKndResolver');
const { saveArchiveExtFields, mergeArchiveExtFields, isExtFieldError } = require('../billExtFieldHook');
function registerIndxRoutes(app) {
  app.get('/api/indx/tree', async (_req, res) => {
    try {
      const rows = (await indxRepo.listAll()).map(rowToIndx);
      res.json(buildIndxTree(rows));
    } catch (e) {
      console.error('[indx/tree]', e);
      res.status(500).json({ error: '读取中类树失败' });
    }
  });

  app.get('/api/indx', async (_req, res) => {
    try {
      const rows = (await indxRepo.listAll())
        .filter((r) => r.idx_no !== '0000000000')
        .map(rowToIndx);
      const merged = await Promise.all(
        rows.map((row) => mergeArchiveExtFields('OthHZYQD', { idx_no: row.idx_no }, row))
      );
      res.json(merged);
    } catch (e) {
      console.error('[indx/list]', e);
      res.status(500).json({ error: '读取中类列表失败' });
    }
  });

  app.get('/api/indx/:idxNo', async (req, res) => {
    try {
      const row = await indxRepo.getByNo(req.params.idxNo);
      if (!row) return res.status(404).json({ error: '中类不存在' });
      res.json(await mergeArchiveExtFields('OthHZYQD', { idx_no: req.params.idxNo }, rowToIndx(row)));
    } catch (e) {
      console.error('[indx/get]', e);
      res.status(500).json({ error: '读取中类失败' });
    }
  });

  app.get('/api/indx/:idxNo/knd', async (req, res) => {
    try {
      if (!(await indxRepo.exists(req.params.idxNo))) {
        return res.status(404).json({ error: '中类不存在' });
      }
      res.json({ knd: await resolveKndForIdx1(req.params.idxNo) });
    } catch (e) {
      console.error('[indx/knd]', e);
      res.status(500).json({ error: '读取中类大类失败' });
    }
  });

  app.post('/api/indx', async (req, res) => {
    const { idx_no, idx_up } = req.body || {};
    if (!idx_no || !String(idx_no).trim()) {
      return res.status(400).json({ error: '中类代号不能为空' });
    }
    try {
      if (await indxRepo.exists(String(idx_no).trim())) {
        return res.status(409).json({ error: '中类代号已存在' });
      }
      const up = String(idx_up || '').trim();
      if (up && !(await indxRepo.exists(up))) {
        return res.status(400).json({ error: '上层中类不存在' });
      }
      const row = await indxRepo.create(req.body);
      await saveArchiveExtFields('OthHZYQD', { idx_no: String(idx_no).trim() }, req.body);
      res.status(201).json(
        await mergeArchiveExtFields('OthHZYQD', { idx_no: String(idx_no).trim() }, rowToIndx(row))
      );
    } catch (e) {
      console.error('[indx/create]', e);
      if (isExtFieldError(e)) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: e.message || '新增中类失败' });
    }
  });

  app.put('/api/indx/:idxNo', async (req, res) => {
    try {
      const existing = await indxRepo.getByNo(req.params.idxNo);
      if (!existing) return res.status(404).json({ error: '中类不存在' });
      const idxUpRaw = req.body?.idx_up ?? existing.idx_up;
      const idxUp = String(idxUpRaw || '').trim();
      if (idxUp && idxUp !== req.params.idxNo && !(await indxRepo.exists(idxUp))) {
        return res.status(400).json({ error: '上层中类不存在' });
      }
      const row = await indxRepo.update(req.params.idxNo, req.body);
      await saveArchiveExtFields('OthHZYQD', { idx_no: req.params.idxNo }, req.body);
      res.json(await mergeArchiveExtFields('OthHZYQD', { idx_no: req.params.idxNo }, rowToIndx(row)));
    } catch (e) {
      console.error('[indx/update]', e);
      if (isExtFieldError(e)) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: e.message || '修改中类失败' });
    }
  });

  app.delete('/api/indx/:idxNo', async (req, res) => {
    try {
      if (await indxRepo.isUsedByPrdt(req.params.idxNo)) {
        return res.status(400).json({ error: '该中类已被货品引用，无法删除' });
      }
      if (await indxRepo.hasChild(req.params.idxNo)) {
        return res.status(400).json({ error: '存在下级中类，无法删除' });
      }
      const ok = await indxRepo.remove(req.params.idxNo);
      if (!ok) return res.status(404).json({ error: '中类不存在' });
      res.json({ ok: true });
    } catch (e) {
      console.error('[indx/delete]', e);
      res.status(500).json({ error: e.message || '删除中类失败' });
    }
  });
}

module.exports = { registerIndxRoutes };
