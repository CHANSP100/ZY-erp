/**
 * 单据 _Z 扩展字段 — 路由层复用钩子
 */
const { persistBillExtFields, attachBillExtFields } = require('./extFieldPersist');
const { persistHeadExtFields, pickExtValues } = require('./extFieldPersist');

function isExtFieldError(e) {
  return e && typeof e.message === 'string' && e.message.includes('扩展字段');
}

async function saveBillExtFields(billMenuCode, body, lines) {
  if (!billMenuCode) return;
  await persistBillExtFields(billMenuCode, {
    head: body?.head || {},
    lines: lines ?? body?.lines ?? [],
  });
}

async function mergeBillExtFields(billMenuCode, head, lines) {
  if (!billMenuCode) return { head, lines };
  return attachBillExtFields(billMenuCode, head, lines);
}

/** 单表档案存盘写 _Z（仅表头） */
async function saveArchiveExtFields(menuCode, keyValues, body) {
  if (!menuCode) return;
  const vals = pickExtValues(menuCode, 'head', body || {});
  await persistHeadExtFields(menuCode, keyValues, vals);
}

/** 单表档案读取合并 _Z */
async function mergeArchiveExtFields(menuCode, keyValues, row) {
  if (!menuCode) return row;
  const { loadHeadExtFields } = require('./extFieldPersist');
  const ext = await loadHeadExtFields(menuCode, keyValues);
  return { ...row, ext_fields: ext, ...ext };
}

module.exports = {
  isExtFieldError,
  saveBillExtFields,
  mergeBillExtFields,
  saveArchiveExtFields,
  mergeArchiveExtFields,
};
