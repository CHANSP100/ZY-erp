const { requireAdmin } = require('./authMiddleware');
const {
  MENU_CATALOG,
  listUsersFull,
  createUser,
  updateUser,
  deleteUser,
  listMenuPermissions,
  saveMenuPermissions,
  copyMenuPermissions,
  getDeproSet,
  saveDeproSet,
  listUserWh,
  saveUserWh,
  getPermissionSummary,
} = require('./permissions');

function registerPermissionsRoutes(app) {
  app.get('/api/sys-auth/catalog', (_req, res) => {
    res.json(MENU_CATALOG);
  });

  app.get('/api/sys-auth/my-permissions', (req, res) => {
    const u = req.erpUser;
    res.json(getPermissionSummary(u.usr_id, u.is_admin));
  });

  app.get('/api/sys-auth/users', requireAdmin, (_req, res) => {
    res.json(listUsersFull());
  });

  app.post('/api/sys-auth/users', requireAdmin, (req, res) => {
    try {
      res.status(201).json(createUser(req.body || {}));
    } catch (e) {
      res.status(400).json({ error: e.message || '保存失败' });
    }
  });

  app.put('/api/sys-auth/users/:usrId', requireAdmin, (req, res) => {
    try {
      const row = updateUser(req.params.usrId, req.body || {});
      if (!row) return res.status(404).json({ error: '用户不存在' });
      res.json(row);
    } catch (e) {
      res.status(400).json({ error: e.message || '保存失败' });
    }
  });

  app.delete('/api/sys-auth/users/:usrId', requireAdmin, (req, res) => {
    if (req.params.usrId === req.erpUser.usr_id) {
      return res.status(400).json({ error: '不能删除当前登录用户' });
    }
    deleteUser(req.params.usrId);
    res.json({ ok: true });
  });

  app.get('/api/sys-auth/users/:usrId/menus', requireAdmin, (req, res) => {
    res.json(listMenuPermissions(req.params.usrId));
  });

  app.put('/api/sys-auth/users/:usrId/menus', requireAdmin, (req, res) => {
    const rows = req.body?.menus ?? req.body;
    res.json(saveMenuPermissions(req.params.usrId, rows));
  });

  app.post('/api/sys-auth/users/:usrId/menus/copy', requireAdmin, (req, res) => {
    const from = String(req.body?.from_usr_id || '').trim();
    if (!from) return res.status(400).json({ error: 'from_usr_id 必填' });
    try {
      res.json(copyMenuPermissions(from, req.params.usrId));
    } catch (e) {
      res.status(400).json({ error: e.message || '复制失败' });
    }
  });

  app.get('/api/sys-auth/depro/:deproNo', requireAdmin, (req, res) => {
    res.json(getDeproSet(req.params.deproNo));
  });

  app.put('/api/sys-auth/depro/:deproNo', requireAdmin, (req, res) => {
    try {
      res.json(saveDeproSet(req.params.deproNo, req.body?.lines ?? req.body));
    } catch (e) {
      res.status(400).json({ error: e.message || '保存失败' });
    }
  });

  app.get('/api/sys-auth/users/:usrId/wh', requireAdmin, (req, res) => {
    res.json(listUserWh(req.params.usrId));
  });

  app.put('/api/sys-auth/users/:usrId/wh', requireAdmin, (req, res) => {
    const whs = req.body?.whs ?? req.body;
    res.json(saveUserWh(req.params.usrId, whs));
  });
}

module.exports = { registerPermissionsRoutes };
