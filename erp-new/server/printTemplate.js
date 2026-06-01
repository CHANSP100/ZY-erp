/**
 * 打印模板 — 按菜单维护，供明细表/单据打印选用
 */
const { db } = require('./db');

const SEEDS = {
  InvAD: [
    {
      tpl_no: 'SO_DETAIL_STD',
      name: '销售订单明细标准',
      is_default: 1,
      rem: '含全部可见列',
      content:
        '<div class="erp-print-doc"><h2 class="erp-print-title">{{title}}</h2><p class="erp-print-meta">打印时间：{{print_time}} · 共 {{row_count}} 行</p>{{table}}</div>',
    },
    {
      tpl_no: 'SO_DETAIL_SIMPLE',
      name: '销售订单明细简版',
      is_default: 0,
      rem: '主要字段',
      content:
        '<div class="erp-print-doc"><h2 class="erp-print-title">{{title}}</h2><p class="erp-print-meta">打印时间：{{print_time}}</p>{{table}}</div>',
    },
    {
      tpl_no: 'SO_DETAIL_QR',
      name: '销售订单明细（含二维码）',
      is_default: 0,
      rem: '右上角单号二维码',
      content:
        '<div class="erp-print-doc"><div class="erp-print-head"><div><h2 class="erp-print-title">{{title}}</h2><p class="erp-print-meta">单号：{{doc_no}} · 打印：{{print_time}} · {{row_count}} 行</p></div>{{qrcode}}</div>{{table}}</div>',
    },
  ],
  InvAF: [
    {
      tpl_no: 'PO_DETAIL_QR',
      name: '采购单明细（含二维码）',
      is_default: 0,
      rem: '右上角单号二维码',
      content:
        '<div class="erp-print-doc"><div class="erp-print-head"><div><h2 class="erp-print-title">{{title}}</h2><p class="erp-print-meta">单号：{{doc_no}} · 打印：{{print_time}} · {{row_count}} 行</p></div>{{qrcode}}</div>{{table}}</div>',
    },
  ],
};

function initPrintTemplateSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS erp_print_tpl (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      menu_code TEXT NOT NULL,
      tpl_no TEXT NOT NULL,
      name TEXT NOT NULL,
      content TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      rem TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      UNIQUE(menu_code, tpl_no)
    );
  `);

  const ins = db.prepare(`
    INSERT OR IGNORE INTO erp_print_tpl (menu_code, tpl_no, name, content, is_default, rem, sort_order)
    VALUES (@menu_code, @tpl_no, @name, @content, @is_default, @rem, @sort_order)
  `);

  for (const [menuCode, list] of Object.entries(SEEDS)) {
    list.forEach((t, i) => {
      ins.run({
        menu_code: menuCode,
        tpl_no: t.tpl_no,
        name: t.name,
        content: t.content,
        is_default: t.is_default ? 1 : 0,
        rem: t.rem ?? '',
        sort_order: i + 1,
      });
    });
  }

  const tplNamePatches = [
    { tpl_no: 'SO_DETAIL_STD', name: '销售订单明细标准' },
    { tpl_no: 'SO_DETAIL_SIMPLE', name: '销售订单明细简版' },
    { tpl_no: 'SO_DETAIL_QR', name: '销售订单明细（含二维码）' },
    { tpl_no: 'PO_DETAIL_QR', name: '采购单明细（含二维码）' },
  ];
  const patchTplName = db.prepare(
    `UPDATE erp_print_tpl SET name = ? WHERE menu_code = 'InvAD' AND tpl_no = ?`
  );
  for (const p of tplNamePatches) {
    patchTplName.run(p.name, p.tpl_no);
  }
}

function rowToTpl(r) {
  return {
    tpl_no: r.tpl_no,
    name: r.name,
    content: r.content ?? '',
    is_default: !!r.is_default,
    rem: r.rem ?? '',
    sort_order: r.sort_order,
  };
}

function listTemplates(menuCode) {
  return db
    .prepare(`SELECT * FROM erp_print_tpl WHERE menu_code = ? ORDER BY sort_order, tpl_no`)
    .all(menuCode)
    .map(rowToTpl);
}

function getTemplate(menuCode, tplNo) {
  const r = db
    .prepare(`SELECT * FROM erp_print_tpl WHERE menu_code = ? AND tpl_no = ?`)
    .get(menuCode, tplNo);
  return r ? rowToTpl(r) : null;
}

function clearDefault(menuCode) {
  db.prepare(`UPDATE erp_print_tpl SET is_default = 0 WHERE menu_code = ?`).run(menuCode);
}

function createTemplate(menuCode, payload) {
  const { tpl_no, name, content, is_default, rem } = payload;
  if (!tpl_no || !/^[A-Za-z0-9_]{1,32}$/.test(tpl_no)) {
    throw new Error('模板代号须为 1–32 位英文、数字或下划线');
  }
  if (!name?.trim()) throw new Error('模板名称必填');

  const maxOrder =
    db.prepare(`SELECT COALESCE(MAX(sort_order), 0) AS m FROM erp_print_tpl WHERE menu_code = ?`).get(menuCode).m +
    1;

  if (is_default) clearDefault(menuCode);

  db.prepare(
    `INSERT INTO erp_print_tpl (menu_code, tpl_no, name, content, is_default, rem, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(menuCode, tpl_no, name.trim(), content ?? '', is_default ? 1 : 0, rem ?? '', maxOrder);
}

function updateTemplate(menuCode, tplNo, payload) {
  const existing = getTemplate(menuCode, tplNo);
  if (!existing) return false;

  const name = payload.name?.trim() ?? existing.name;
  const content = payload.content ?? existing.content;
  const is_default = payload.is_default ?? existing.is_default;
  const rem = payload.rem ?? existing.rem;

  if (is_default) clearDefault(menuCode);

  db.prepare(
    `UPDATE erp_print_tpl SET name = ?, content = ?, is_default = ?, rem = ?
     WHERE menu_code = ? AND tpl_no = ?`
  ).run(name, content, is_default ? 1 : 0, rem, menuCode, tplNo);
  return true;
}

function deleteTemplate(menuCode, tplNo) {
  const r = db
    .prepare(`DELETE FROM erp_print_tpl WHERE menu_code = ? AND tpl_no = ?`)
    .run(menuCode, tplNo);
  return r.changes > 0;
}

initPrintTemplateSchema();

module.exports = {
  initPrintTemplateSchema,
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
};
