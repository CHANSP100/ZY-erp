const { resolveUserFromRequest } = require('./auth');

function erpUserMiddleware(req, res, next) {
  const user = resolveUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: '请先登录' });
  }
  req.erpUser = user;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.erpUser?.is_admin) {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
}

module.exports = { erpUserMiddleware, requireAdmin };
