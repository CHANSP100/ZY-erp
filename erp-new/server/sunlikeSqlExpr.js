/**
 * Sunlike SQL 表达式翻译（服务端，与 client utils/sunlikeSqlExpr.ts 规则一致）
 */
const INV_AD_HEAD = [
  ['OS_DD', 'os_dd'], ['OS_NO', 'os_no'], ['EST_DD', 'est_dd'], ['CUS_NO', 'cus_no'],
  ['CUS_OS_NO', 'cus_os_no'], ['BIL_TYPE', 'bil_type'], ['USE_DEP', 'use_dep'], ['SAL_NO', 'sal_no'],
  ['CUR_ID', 'cur_id'], ['TAX_ID', 'tax_id'], ['DIS_CNT', 'dis_cnt'], ['CLS_MP_ID', 'cls_mp_id'],
  ['CLS_ID', 'cls_id'], ['REM', 'rem'], ['OS_ID', 'os_id'],
];

const INV_AD_LINE = [
  ['ITM', 'itm'], ['PRD_NO', 'prd_no'], ['PRD_NAME', 'prd_name'], ['SPC', 'spc'], ['WH', 'wh'],
  ['QTY', 'qty'], ['UNIT', 'ut'], ['UP', 'up'], ['AMTN', 'amtn'], ['TAX', 'tax'], ['TAX_RTO', 'tax_rto'],
  ['EST_DD', 'est_dd'], ['SUP_PRD_NO', 'sup_prd_no'], ['REM', 'rem'],
];

function buildMap(headRows, lineRows) {
  const map = new Map();
  for (const [db, col] of headRows) {
    map.set(`M.${db}`, `m.${col}`);
    map.set(`M${db}`, `m.${col}`);
  }
  for (const [db, col] of lineRows) {
    map.set(`T.${db}`, `t.${col}`);
    map.set(`T${db}`, `t.${col}`);
  }
  return map;
}

const TOKEN_MAPS = {
  InvAD: buildMap(INV_AD_HEAD, INV_AD_LINE),
  InvAD_BILL: buildMap(INV_AD_HEAD, []),
};

function getMap(menuCode) {
  return TOKEN_MAPS[menuCode] || new Map();
}

function translateSunlikeSqlExpr(src, menuCode) {
  let s = String(src || '').trim();
  if (!s) return s;
  const map = getMap(menuCode);

  s = s.replace(/:(M|T)\.([A-Za-z0-9_]+)/gi, (_m, p, field) => {
    const key = `${String(p).toUpperCase()}.${String(field).toUpperCase()}`;
    const ref = map.get(key);
    if (!ref) throw new Error(`未知字段引用 :${key}`);
    return ref;
  });

  s = s.replace(/:(M|T)([A-Z][A-Z0-9_]*)/gi, (_m, p, field) => {
    const key = `${String(p).toUpperCase()}${String(field).toUpperCase()}`;
    const ref = map.get(key);
    if (!ref) throw new Error(`未知字段引用 :${p}${field}`);
    return ref;
  });

  s = s.replace(/\bFROM\s+PRDT\b/gi, 'FROM prdt');
  s = s.replace(/\bFROM\s+CUST\b/gi, 'FROM cust');
  s = s.replace(/\bFROM\s+SALM\b/gi, 'FROM salm');
  s = s.replace(/\bFROM\s+DEPT\b/gi, 'FROM dept');
  s = s.replace(/\bFROM\s+MY_WH\b/gi, 'FROM my_wh');

  if (/^\s*SELECT\b/i.test(s) && !s.startsWith('(')) {
    s = `(${s})`;
  }
  return s;
}

function listSunlikeSqlFields(menuCode) {
  const out = [];
  if (menuCode === 'InvAD' || menuCode === 'InvAD_BILL') {
    for (const [db, col] of INV_AD_HEAD) {
      out.push({ prefix: 'M', dbField: db, token: `M.${db}`, sqlRef: `m.${col}`, tableLabel: 'MF_POS' });
    }
  }
  if (menuCode === 'InvAD') {
    for (const [db, col] of INV_AD_LINE) {
      out.push({ prefix: 'T', dbField: db, token: `T.${db}`, sqlRef: `t.${col}`, tableLabel: 'TF_POS' });
    }
  }
  return out;
}

module.exports = { translateSunlikeSqlExpr, listSunlikeSqlFields };
