/**
 * 中类 → 货品大类 KND（SUNLIKE：选中类带出大类，缺省 2=制成品）
 */
const { rowToIndx } = require('../db');
const indxRepo = require('../repositories/indxRepository');
const { mergeArchiveExtFields } = require('../billExtFieldHook');
const { queryOne, nstr } = require('../repositories/mssqlHelpers');

const DEFAULT_KND = '2';

function pickKnd(raw) {
  const v = raw == null ? '' : String(raw).trim();
  return v || '';
}

async function resolveKndForIdx1(idxNo) {
  const code = String(idxNo || '').trim();
  if (!code) return DEFAULT_KND;

  try {
    const row = await indxRepo.getByNo(code);
    if (row) {
      const merged = await mergeArchiveExtFields('OthHZYQD', { idx_no: code }, rowToIndx(row));
      const fromExt = pickKnd(merged.knd ?? merged.ext_fields?.knd ?? merged.ext_fields?.KND);
      if (fromExt) return fromExt;
    }
  } catch {
    /* fall through */
  }

  try {
    const prdt = await queryOne(
      `SELECT TOP 1 KND AS knd FROM PRDT
       WHERE IDX1 = @idx1 AND ISNULL(LTRIM(RTRIM(KND)), '') <> ''
       ORDER BY SYS_DATE DESC, PRD_NO DESC`,
      { idx1: nstr(code, 10) }
    );
    const fromPrdt = pickKnd(prdt?.knd);
    if (fromPrdt) return fromPrdt;
  } catch {
    /* fall through */
  }

  return DEFAULT_KND;
}

module.exports = { resolveKndForIdx1, DEFAULT_KND };
