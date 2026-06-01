const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { rowToMfPos, rowToTfPos, rowToMfSq, rowToTfSq, rowToMfMo, rowToTfMo, rowToMfMl, rowToTfMl, rowToMfMm, rowToTfMm, rowToMfJh, rowToTfJh, rowToMfMp, rowToTfMp1, rowToTfMp2, rowToTfMp3, rowToMfBom, rowToTfBom, calcLineAmounts, sumOrder, calcSqLineAmt, sumSq, calcMoLine, calcMlLine, calcMmLine, normalizeJhLine, normalizeMpLine, normalizeMp2Line, normalizeMp3Line } = require('./db');
const {
  getColumns,
  setGlobalVisibility,
  setUserVisibility,
  addCustomColumn,
  updateCustomColumn,
  removeCustomColumn,
  reorderColumns,
  getCustomSqlExprs,
  getMenuGridMeta,
  listUsers,
  listSunlikeSqlFields,
} = require('./gridConfig');
const { listDbTables, listDbTableColumns, listTableSelectOptions } = require('./extField');
const {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} = require('./printTemplate');
const { erpUserMiddleware, requireAdmin } = require('./authMiddleware');
const { login: authLogin, revokeToken, resolveUserWithPermissions, getAuthMode } = require('./auth');
const { getDefaultCompno, resetMssqlPswdCache } = require('./pswdMssqlAuth');
const { getMssqlConfig, getSystemMssqlConfig, closePool } = require('./mssqlPool');
const {
  loadConfig,
  getEditorConfig,
  toPublicConfig,
  testBusinessConnection,
  saveConfig,
  validateConfigInput,
} = require('./dbConnectionConfig');
const { initPermissionsSchema, apiPermissionGuard } = require('./permissions');
const { registerPermissionsRoutes } = require('./permissionsRoutes');
const { registerSqOrdersRoutes } = require('./sqOrdersRoutes');
const { registerMoOrdersRoutes } = require('./moOrdersRoutes');
const { registerMlOrdersRoutes } = require('./mlOrdersRoutes');
const { registerMmOrdersRoutes } = require('./mmOrdersRoutes');
const { registerJhOrdersRoutes } = require('./jhOrdersRoutes');
const { registerMpOrdersRoutes } = require('./mpOrdersRoutes');
const { registerBomOrdersRoutes } = require('./bomOrdersRoutes');
const { registerIndxRoutes } = require('./routes/indxRoutes');
const { registerAreaRoutes } = require('./routes/areaRoutes');
const { registerDeptRoutes } = require('./routes/deptRoutes');
const { registerCurRoutes } = require('./routes/curRoutes');
const { registerWhRoutes } = require('./routes/whRoutes');
const { registerCustRoutes } = require('./routes/custRoutes');
const { registerSalmRoutes } = require('./routes/salmRoutes');
const { registerPrdtRoutes } = require('./routes/prdtRoutes');
const { registerBilSpcRoutes } = require('./routes/bilSpcRoutes');
const { registerAllMfPosRoutes } = require('./routes/mfPosRoutes');
const { registerMfPssRoutes } = require('./routes/mfPssRoutes');
const { queryOne } = require('./repositories/mssqlHelpers');
const indxRepo = require('./repositories/indxRepository');

const app = express();
const PORT = process.env.PORT || 3001;

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = `${Date.now()}-${file.originalname.replace(/[^\w.\-()\u4e00-\u9fff]/g, '_')}`;
    cb(null, safe);
  },
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.post('/api/auth/login', async (req, res) => {
  const { usr_id, compno } = req.body || {};
  if (!usr_id) {
    return res.status(400).json({ error: '请输入账号' });
  }
  try {
    const result = await authLogin(String(usr_id).trim(), '', { compno });
    if (result.error) return res.status(401).json({ error: result.error });
    res.json(result);
  } catch (e) {
    console.error('[login]', e);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const auth = req.headers.authorization;
  if (auth && String(auth).startsWith('Bearer ')) {
    revokeToken(String(auth).slice(7).trim());
  }
  res.json({ ok: true });
});

app.get('/api/db-config', (_req, res) => {
  res.json(getEditorConfig());
});

app.post('/api/db-config/test', async (req, res) => {
  const errMsg = validateConfigInput(req.body || {});
  if (errMsg) return res.status(400).json({ error: errMsg });
  try {
    const result = await testBusinessConnection(req.body || {});
    res.json({ ok: true, ...result });
  } catch (e) {
    console.error('[db-config/test]', e.message);
    res.status(400).json({ error: e.message || '连接失败，请检查 IP、数据库名与账号密码' });
  }
});

app.post('/api/db-config/save', async (req, res) => {
  const errMsg = validateConfigInput(req.body || {});
  if (errMsg) return res.status(400).json({ error: errMsg });
  try {
    await testBusinessConnection(req.body || {});
    await closePool();
    resetMssqlPswdCache();
    const saved = saveConfig(req.body || {});
    res.json({
      ok: true,
      config: toPublicConfig(saved),
    });
  } catch (e) {
    console.error('[db-config/save]', e.message);
    res.status(400).json({ error: e.message || '保存失败：请先测试业务数据库连接' });
  }
});

app.use('/api', (req, res, next) => {
  const path = req.path || '';
  const original = req.originalUrl || '';
  const isPublic =
    path === '/health' ||
    path.startsWith('/auth/login') ||
    path.startsWith('/db-config') ||
    original.startsWith('/api/db-config') ||
    original.startsWith('/api/auth/login') ||
    original === '/api/health';
  if (isPublic) return next();
  return erpUserMiddleware(req, res, () => apiPermissionGuard(req, res, next));
});

initPermissionsSchema();
registerPermissionsRoutes(app);
registerIndxRoutes(app);
registerAreaRoutes(app);
app.use('/uploads', express.static(uploadDir));

registerDeptRoutes(app);
registerCurRoutes(app);
registerWhRoutes(app);
registerCustRoutes(app);
registerSalmRoutes(app);
registerPrdtRoutes(app);
registerBilSpcRoutes(app);
registerAllMfPosRoutes(app, {
  calcLineAmounts,
  sumOrder,
  getCustomSqlExprs,
  rowToMfPos,
  rowToTfPos,
});
registerSqOrdersRoutes(app, {
  rowToMfSq,
  rowToTfSq,
  calcSqLineAmt,
  sumSq,
});
registerMoOrdersRoutes(app, {
  rowToMfMo,
  rowToTfMo,
  calcMoLine,
});
registerMlOrdersRoutes(app, {
  rowToMfMl,
  rowToTfMl,
  calcMlLine,
});
registerMmOrdersRoutes(app, {
  rowToMfMm,
  rowToTfMm,
  calcMmLine,
});
registerJhOrdersRoutes(app, {
  rowToMfJh,
  rowToTfJh,
  normalizeJhLine,
});
registerMpOrdersRoutes(app, {
  rowToMfMp,
  rowToTfMp1,
  rowToTfMp2,
  rowToTfMp3,
  normalizeMpLine,
  normalizeMp2Line,
  normalizeMp3Line,
});
registerBomOrdersRoutes(app, {
  rowToMfBom,
  rowToTfBom,
});
registerMfPssRoutes(app);

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未选择文件' });
  res.json({ path: `/uploads/${req.file.filename}`, filename: req.file.originalname });
});

async function mssqlCount(sql, inputs) {
  const row = await queryOne(sql, inputs || {});
  return Number(row?.c ?? 0);
}

app.get('/api/health', async (_req, res) => {
  try {
    const [
      indxCount, prdtCount, custCount, soCount, saCount, sbCount,
      salmCount, deptCount, whCount, sdCount, pcCount, pbCount, pdCount,
    ] = await Promise.all([
      indxRepo.countAll(),
      mssqlCount('SELECT COUNT(*) AS c FROM PRDT'),
      mssqlCount('SELECT COUNT(*) AS c FROM CUST'),
      mssqlCount("SELECT COUNT(*) AS c FROM MF_POS WHERE OS_ID='SO'"),
      mssqlCount("SELECT COUNT(*) AS c FROM MF_PSS WHERE PS_ID='SA'"),
      mssqlCount("SELECT COUNT(*) AS c FROM MF_PSS WHERE PS_ID='SB'"),
      mssqlCount('SELECT COUNT(*) AS c FROM SALM'),
      mssqlCount('SELECT COUNT(*) AS c FROM DEPT'),
      mssqlCount('SELECT COUNT(*) AS c FROM MY_WH'),
      mssqlCount("SELECT COUNT(*) AS c FROM MF_PSS WHERE PS_ID='SD'"),
      mssqlCount("SELECT COUNT(*) AS c FROM MF_PSS WHERE PS_ID='PC'"),
      mssqlCount("SELECT COUNT(*) AS c FROM MF_PSS WHERE PS_ID='PB'"),
      mssqlCount("SELECT COUNT(*) AS c FROM MF_PSS WHERE PS_ID='PD'"),
    ]);
    res.json({
      ok: true,
      indxCount, prdtCount, custCount, soCount, saCount, sbCount,
      sdCount, pcCount, pbCount, pdCount, salmCount, deptCount, whCount,
      authMode: getAuthMode(),
      mssqlCompno: getDefaultCompno(),
      mssqlServer: getMssqlConfig().server,
      mssqlDatabase: getMssqlConfig().database,
      mssqlSystemDatabase: getSystemMssqlConfig().database,
      dbConfigSaved: loadConfig().saved,
    });
  } catch (e) {
    console.error('[health]', e);
    res.status(503).json({ ok: false, error: e.message || '业务库连接失败' });
  }
});

// ---------- 用户 / 明细表列配置 ----------
app.get('/api/auth/me', (req, res) => {
  const user = resolveUserWithPermissions(req);
  if (!user) return res.status(401).json({ error: '请先登录' });
  res.json(user);
});

app.get('/api/auth/users', (_req, res) => {
  res.json(listUsers());
});

app.get('/api/detail-grid/:menuCode/meta', (req, res) => {
  res.json(getMenuGridMeta(req.params.menuCode));
});

app.get('/api/detail-grid/:menuCode/columns', (req, res) => {
  res.json(getColumns(req.params.menuCode, req.erpUser.usr_id));
});

app.get('/api/detail-grid/:menuCode/sql-fields', (req, res) => {
  res.json(listSunlikeSqlFields(req.params.menuCode));
});

app.put('/api/detail-grid/:menuCode/columns/global', requireAdmin, (req, res) => {
  const { col_key, visible } = req.body;
  if (!col_key) return res.status(400).json({ error: 'col_key 必填' });
  if (!setGlobalVisibility(req.params.menuCode, col_key, !!visible)) {
    return res.status(404).json({ error: '列不存在' });
  }
  res.json(getColumns(req.params.menuCode, req.erpUser.usr_id));
});

app.put('/api/detail-grid/:menuCode/columns/user', (req, res) => {
  const { col_key, visible } = req.body;
  if (!col_key) return res.status(400).json({ error: 'col_key 必填' });
  setUserVisibility(req.params.menuCode, req.erpUser.usr_id, col_key, !!visible);
  res.json(getColumns(req.params.menuCode, req.erpUser.usr_id));
});

app.put('/api/detail-grid/:menuCode/columns/order', requireAdmin, (req, res) => {
  const { col_keys } = req.body;
  if (!Array.isArray(col_keys) || !col_keys.length) {
    return res.status(400).json({ error: 'col_keys 必填' });
  }
  try {
    reorderColumns(req.params.menuCode, col_keys);
    res.json(getColumns(req.params.menuCode, req.erpUser.usr_id));
  } catch (e) {
    res.status(400).json({ error: e.message || '列顺序保存失败' });
  }
});

app.post('/api/detail-grid/:menuCode/columns', requireAdmin, async (req, res) => {
  try {
    await addCustomColumn(req.params.menuCode, req.body);
    res.status(201).json(getColumns(req.params.menuCode, req.erpUser.usr_id));
  } catch (e) {
    res.status(400).json({ error: e.message || '添加失败' });
  }
});

app.put('/api/detail-grid/:menuCode/columns/:colKey', requireAdmin, async (req, res) => {
  try {
    await updateCustomColumn(req.params.menuCode, req.params.colKey, req.body);
    res.json(getColumns(req.params.menuCode, req.erpUser.usr_id));
  } catch (e) {
    res.status(400).json({ error: e.message || '更改失败' });
  }
});

app.delete('/api/detail-grid/:menuCode/columns/:colKey', requireAdmin, (req, res) => {
  try {
    if (!removeCustomColumn(req.params.menuCode, req.params.colKey)) {
      return res.status(404).json({ error: '列不存在' });
    }
    res.json(getColumns(req.params.menuCode, req.erpUser.usr_id));
  } catch (e) {
    res.status(400).json({ error: e.message || '删除失败' });
  }
});

app.get('/api/ext-field/db-tables', async (_req, res) => {
  try {
    res.json(await listDbTables());
  } catch (e) {
    res.status(500).json({ error: e.message || '读取表清单失败' });
  }
});

app.get('/api/ext-field/db-tables/:tableName/columns', async (req, res) => {
  try {
    res.json(await listDbTableColumns(req.params.tableName));
  } catch (e) {
    res.status(500).json({ error: e.message || '读取字段失败' });
  }
});

app.get('/api/ext-field/table-select-options/:tableName', async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 500;
    res.json(await listTableSelectOptions(req.params.tableName, limit));
  } catch (e) {
    res.status(400).json({ error: e.message || '读取下拉选项失败' });
  }
});

// ---------- 打印模板 ----------
app.get('/api/print-template/:menuCode', (req, res) => {
  res.json(listTemplates(req.params.menuCode));
});

app.get('/api/print-template/:menuCode/:tplNo', (req, res) => {
  const tpl = getTemplate(req.params.menuCode, req.params.tplNo);
  if (!tpl) return res.status(404).json({ error: '模板不存在' });
  res.json(tpl);
});

app.post('/api/print-template/:menuCode', requireAdmin, (req, res) => {
  try {
    createTemplate(req.params.menuCode, req.body);
    res.status(201).json(listTemplates(req.params.menuCode));
  } catch (e) {
    res.status(400).json({ error: e.message || '新增失败' });
  }
});

app.put('/api/print-template/:menuCode/:tplNo', requireAdmin, (req, res) => {
  try {
    if (!updateTemplate(req.params.menuCode, req.params.tplNo, req.body)) {
      return res.status(404).json({ error: '模板不存在' });
    }
    res.json(listTemplates(req.params.menuCode));
  } catch (e) {
    res.status(400).json({ error: e.message || '保存失败' });
  }
});

app.delete('/api/print-template/:menuCode/:tplNo', requireAdmin, (req, res) => {
  if (!deleteTemplate(req.params.menuCode, req.params.tplNo)) {
    return res.status(404).json({ error: '模板不存在' });
  }
  res.json(listTemplates(req.params.menuCode));
});

app.listen(PORT, () => {
  console.log(`ERP API http://localhost:${PORT}`);
});
