/**
 * 货品 PRDT 存盘 — SUNLIKE 9.0 系统默认值（对齐旧 ERP INSERT 补填逻辑）
 */
const { pinyin } = require('pinyin');

function isPrdtMaterialKnd(knd) {
  const k = String(knd ?? '').trim();
  return k === '4' || k === '5';
}

function isPrdtTwIdVisible(knd) {
  const k = String(knd ?? '').trim();
  return k === '2' || k === '3';
}

const PRDT_TW_ID_PURCHASE = '5';

function pickText(value, fallback = '') {
  const v = value == null ? '' : String(value).trim();
  if (v !== '') return v;
  return fallback == null ? '' : String(fallback).trim();
}

function pickWithDefault(value, existing, defaultVal) {
  return pickText(value, pickText(existing, defaultVal));
}

function pickNum(value, fallback = 0) {
  if (value == null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

function isCjk(ch) {
  return /[\u4e00-\u9fff]/.test(ch);
}

/** 单字两码助记（SUNLIKE：拼音前两字母大写，如 田 tian→TI；不足则补首字母） */
function pyPair(ch) {
  const arr = pinyin(ch, { style: pinyin.STYLE_NORMAL });
  const py = (arr[0] && arr[0][0]) || '';
  if (!py) return '';
  const u = py.replace(/[^a-z]/gi, '').toUpperCase();
  if (u.length >= 2) return u.slice(0, 2);
  return u.length === 1 ? u + u : '';
}

/** 助记码：品名各字 + 规格首字，格式 (XX)(XX)... */
function buildPrdtNamePy(name, spc) {
  let out = '';
  for (const ch of String(name || '')) {
    if (!isCjk(ch)) continue;
    const p = pyPair(ch);
    if (p) out += `(${p})`;
  }
  for (const ch of String(spc || '')) {
    if (!isCjk(ch)) continue;
    const p = pyPair(ch);
    if (p) {
      out += `(${p})`;
      break;
    }
  }
  return out;
}

const { DEFAULT_KND } = require('./indxKndResolver');

/**
 * 合并用户录入 + 系统默认值（同步部分；KND 由路由层 resolveKndForIdx1 预先写入）
 */
function applyPrdtSaveDefaults(body, existing, opts = {}) {
  const e = existing || {};
  const b = { ...(body || {}) };
  const isCreate = !!opts.isCreate;

  const name = pickText(b.name, e.name || e.NAME);
  b.name = name;
  b.snm = pickText(b.snm, name);
  b.knd = pickText(b.knd, e.knd || e.KND || DEFAULT_KND);
  b.nouse_dd = pickText(b.nouse_dd, e.nouse_dd || e.NOUSE_DD);

  b.ut1 = pickText(b.ut1, e.ut1 || e.UT1);
  b.dfu_ut = pickWithDefault(b.dfu_ut, e.dfu_ut || e.DFU_UT, '1');
  b.ml_ut = pickWithDefault(b.ml_ut, e.ml_ut || e.ML_UT, '1');
  b.quote_ut1 = pickWithDefault(b.quote_ut1, e.quote_ut1 || e.QUOTE_UT1, '1');
  b.quote_ut2 = pickWithDefault(b.quote_ut2, e.quote_ut2 || e.QUOTE_UT2, '1');
  b.quote_ut3 = pickWithDefault(b.quote_ut3, e.quote_ut3 || e.QUOTE_UT3, '1');
  b.qty_ad_id = pickWithDefault(b.qty_ad_id, e.qty_ad_id || e.QTY_AD_ID, '1');
  b.depro_no = pickText(b.depro_no, e.depro_no || e.DEPRO_NO);
  b.mob_id1 = pickText(b.mob_id1, e.mob_id1 || e.MOB_ID1);

  const ext = b.ext_fields && typeof b.ext_fields === 'object' ? b.ext_fields : {};
  if (b.spc_tax == null && ext.spc_tax != null) b.spc_tax = ext.spc_tax;
  if (b.spc_tax == null && ext.SPC_TAX != null) b.spc_tax = ext.SPC_TAX;

  b.upr = pickNum(b.upr, pickNum(e.upr ?? e.UPR, 0));
  b.up_sal = pickNum(b.up_sal, pickNum(e.up_sal ?? e.UP_SAL, 0));
  b.spc_tax = pickNum(b.spc_tax, pickNum(e.spc_tax ?? e.SPC_TAX, 0));
  b.rto_cl = pickNum(b.rto_cl, pickNum(e.rto_cl ?? e.RTO_CL, 0));
  b.pak_exc = pickNum(b.pak_exc, pickNum(e.pak_exc ?? e.PAK_EXC, 0));
  b.pak_nw = pickNum(b.pak_nw, pickNum(e.pak_nw ?? e.PAK_NW, 0));
  b.pak_gw = pickNum(b.pak_gw, pickNum(e.pak_gw ?? e.PAK_GW, 0));
  b.pak_meast = pickNum(b.pak_meast, pickNum(e.pak_meast ?? e.PAK_MEAST, 0));
  b.qty_min = pickNum(b.qty_min, pickNum(e.qty_min ?? e.QTY_MIN, 0));
  b.qty_low = pickNum(b.qty_low, pickNum(e.qty_low ?? e.QTY_LOW, 0));
  b.valid_days = pickNum(b.valid_days, pickNum(e.valid_days ?? e.VALID_DAYS, 0));
  b.qty_min1 = pickNum(b.qty_min1, pickNum(e.qty_min1 ?? e.QTY_MIN1, 0));
  b.qty_max = pickNum(b.qty_max, pickNum(e.qty_max ?? e.QTY_MAX, 0));

  if (isPrdtTwIdVisible(b.knd)) {
    b.tw_id = pickWithDefault(b.tw_id, e.tw_id || e.TW_ID, '2');
  } else if (isPrdtMaterialKnd(b.knd)) {
    b.tw_id = PRDT_TW_ID_PURCHASE;
  } else {
    b.tw_id = '';
  }

  const nameChanged = name !== pickText(e.name || e.NAME);
  const spcChanged = pickText(b.spc, e.spc || e.SPC) !== pickText(e.spc || e.SPC);
  if (isCreate || nameChanged || spcChanged || !pickText(e.name_py || e.NAME_PY)) {
    b.name_py = buildPrdtNamePy(name, b.spc);
  } else {
    b.name_py = pickText(b.name_py, e.name_py || e.NAME_PY);
  }

  if (isCreate) {
    b.start_dd = pickText(b.start_dd, todayDateOnly());
  } else {
    b.start_dd = pickText(b.start_dd, e.start_dd || e.START_DD);
  }

  return b;
}

module.exports = {
  applyPrdtSaveDefaults,
  buildPrdtNamePy,
  isPrdtTwIdVisible,
  isPrdtMaterialKnd,
};
