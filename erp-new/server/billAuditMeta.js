const { queryOne, withTransaction, nstr } = require('./repositories/mssqlHelpers');

/** SUNLIKE 单据审核元数据列（SELECT 片段，前缀表别名 m） */
const BILL_AUDIT_SELECT = `
  m.USR AS usr,
  CONVERT(varchar(19), m.SYS_DATE, 120) AS sys_date,
  m.CHK_MAN AS chk_man,
  CONVERT(varchar(19), m.CLS_DATE, 120) AS cls_date`;

function billUserId(req) {
  const id = req?.erpUser?.usr_id;
  return id ? nstr(String(id).trim(), 12) : null;
}

function billAuditFields(row) {
  if (!row) {
    return { usr: '', sys_date: '', chk_man: '', cls_date: '' };
  }
  return {
    usr: row.usr ?? '',
    sys_date: row.sys_date ?? '',
    chk_man: row.chk_man ?? '',
    cls_date: row.cls_date ?? '',
  };
}

function isBillAudited(row) {
  return !!(row?.CHK_MAN || row?.chk_man);
}

async function auditBillHead(tx, table, whereSql, whereParams, usrId) {
  await tx.exec(
    `UPDATE ${table} SET CHK_MAN=@chk_man, CLS_DATE=GETDATE() WHERE ${whereSql}`,
    { ...whereParams, chk_man: nstr(usrId, 12) }
  );
}

async function unauditBillHead(tx, table, whereSql, whereParams) {
  await tx.exec(
    `UPDATE ${table} SET CHK_MAN=NULL, CLS_DATE=NULL WHERE ${whereSql}`,
    whereParams
  );
}

/**
 * 注册 POST /api/{path}/:{param}/audit 与 /unaudit
 * @param {object} cfg
 * @param {string} cfg.apiPath - 如 sales-orders
 * @param {string} cfg.billNoParam - 路由参数名，如 osNo
 * @param {string} cfg.label
 * @param {string} cfg.table - MF_POS / MF_SQ / MF_MO / MF_PSS
 * @param {string} cfg.whereSql - 含 @占位符，如 OS_ID=@os_id AND OS_NO=@os_no
 * @param {(req: import('express').Request) => object} cfg.buildParams
 * @param {(req: import('express').Request) => Promise<object|null>} cfg.loadHeadRow
 */
function registerBillAuditRoutes(app, cfg) {
  const { apiPath, billNoParam, label, table, whereSql, buildParams, loadHeadRow } = cfg;

  app.post(`/api/${apiPath}/:${billNoParam}/audit`, async (req, res) => {
    const usrId = billUserId(req);
    if (!usrId) return res.status(401).json({ error: '请先登录' });
    try {
      const params = buildParams(req);
      const existing = await queryOne(`SELECT CHK_MAN FROM ${table} WHERE ${whereSql}`, params);
      if (!existing) return res.status(404).json({ error: `${label}不存在` });
      if (isBillAudited(existing)) return res.status(409).json({ error: '已审核' });
      await withTransaction(async (tx) => {
        await auditBillHead(tx, table, whereSql, params, usrId);
      });
      const head = await loadHeadRow(req);
      res.json({ ok: true, ...billAuditFields(head) });
    } catch (e) {
      console.error(`[${apiPath}/audit]`, e);
      res.status(500).json({ error: '审核失败' });
    }
  });

  app.post(`/api/${apiPath}/:${billNoParam}/unaudit`, async (req, res) => {
    try {
      const params = buildParams(req);
      const existing = await queryOne(`SELECT CHK_MAN FROM ${table} WHERE ${whereSql}`, params);
      if (!existing) return res.status(404).json({ error: `${label}不存在` });
      if (!isBillAudited(existing)) return res.status(409).json({ error: '未审核' });
      await withTransaction(async (tx) => {
        await unauditBillHead(tx, table, whereSql, params);
      });
      res.json({ ok: true, usr: '', sys_date: '', chk_man: '', cls_date: '' });
    } catch (e) {
      console.error(`[${apiPath}/unaudit]`, e);
      res.status(500).json({ error: '反审核失败' });
    }
  });
}

module.exports = {
  BILL_AUDIT_SELECT,
  billUserId,
  billAuditFields,
  isBillAudited,
  auditBillHead,
  unauditBillHead,
  registerBillAuditRoutes,
};
