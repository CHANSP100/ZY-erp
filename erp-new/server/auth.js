const crypto = require('crypto');
const {
  getUserRow,
  rowToUser,
  isUserDisabled,
  getPermissionSummary,
} = require('./permissions');
const { getAuthMode, authenticateViaMssql } = require('./pswdMssqlAuth');

/** token -> { usr_id, expires } */
const sessions = new Map();

const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

function createToken(usrId) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { usr_id: usrId, expires: Date.now() + SESSION_MS });
  return token;
}

function getSession(token) {
  if (!token) return null;
  const s = sessions.get(token);
  if (!s) return null;
  if (s.expires < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return s;
}

function revokeToken(token) {
  if (token) sessions.delete(token);
}

function finishLogin(usrId) {
  const row = getUserRow(usrId);
  if (!row || isUserDisabled(row)) {
    return { error: '账号已停用' };
  }
  const user = rowToUser(row);
  const token = createToken(usrId);
  const permissions = getPermissionSummary(user.usr_id, user.is_admin);
  return { token, user: { ...user, permissions } };
}

function loginSqlite(usrId) {
  const row = getUserRow(usrId);
  if (!row) return { error: '账号不存在' };
  if (isUserDisabled(row)) return { error: '账号已停用' };
  return finishLogin(usrId);
}

async function login(usrId, _password, options = {}) {
  const id = String(usrId || '').trim();
  if (!id) return { error: '请输入账号' };

  const mode = getAuthMode();
  const compno = options.compno;

  if (mode === 'sqlite') {
    return loginSqlite(id);
  }

  // hybrid：本地账号优先，避免 MSSQL 连接阻塞登录
  if (mode === 'hybrid') {
    const local = loginSqlite(id);
    if (!local.error) return local;
  }

  if (mode === 'mssql' || mode === 'hybrid') {
    try {
      const mssqlResult = await authenticateViaMssql(id, { compno });
      if (!mssqlResult.error) {
        return finishLogin(mssqlResult.profile.usr_id);
      }
      if (mode === 'mssql') {
        const local = loginSqlite(id);
        if (!local.error) return local;
        return mssqlResult;
      }
    } catch (e) {
      console.error('[auth] MSSQL login failed:', e.message);
      if (mode === 'mssql') {
        const local = loginSqlite(id);
        if (!local.error) return local;
        return { error: '无法连接数据库服务器，请检查 MSSQL 配置' };
      }
    }
  }

  return { error: '账号不存在' };
}

function resolveUserFromRequest(req) {
  const auth = req.headers.authorization;
  if (auth && String(auth).startsWith('Bearer ')) {
    const token = String(auth).slice(7).trim();
    const session = getSession(token);
    if (!session) return null;
    const row = getUserRow(session.usr_id);
    if (!row || isUserDisabled(row)) return null;
    return rowToUser(row);
  }
  return null;
}

function resolveUserWithPermissions(req) {
  const user = resolveUserFromRequest(req);
  if (!user) return null;
  return {
    ...user,
    permissions: getPermissionSummary(user.usr_id, user.is_admin),
  };
}

module.exports = {
  login,
  getAuthMode,
  getSession,
  revokeToken,
  resolveUserFromRequest,
  resolveUserWithPermissions,
};
