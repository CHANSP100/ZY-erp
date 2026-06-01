/**
 * 明细表 Sunlike SQL — M=表头(MF) T=表身(TF) 字段令牌与翻译
 */
import type { ErpFieldMeta } from '@/config/fields/types';
import { INV_AD } from '@/config/fields/soBill';
import { INV_AF } from '@/config/fields/poBill';

export interface SunlikeSqlFieldToken {
  prefix: 'M' | 'T';
  dbField: string;
  label: string;
  token: string;
  sqlRef: string;
  tableLabel: string;
}

export interface DetailGridMenuSqlMeta {
  menuCode: string;
  headTable: string;
  lineTable: string;
  headAlias: string;
  lineAlias: string;
}

const MENU_SQL_META: Record<string, DetailGridMenuSqlMeta> = {
  InvAD: {
    menuCode: 'InvAD',
    headTable: 'MF_POS',
    lineTable: 'TF_POS',
    headAlias: 'm',
    lineAlias: 't',
  },
  InvAD_BILL: {
    menuCode: 'InvAD_BILL',
    headTable: 'MF_POS',
    lineTable: 'MF_POS',
    headAlias: 'm',
    lineAlias: 'm',
  },
  InvAF: {
    menuCode: 'InvAF',
    headTable: 'MF_POS',
    lineTable: 'TF_POS',
    headAlias: 'm',
    lineAlias: 't',
  },
  InvAF_BILL: {
    menuCode: 'InvAF_BILL',
    headTable: 'MF_POS',
    lineTable: 'MF_POS',
    headAlias: 'm',
    lineAlias: 'm',
  },
};

function headSqlColumn(f: ErpFieldMeta): string {
  return f.key;
}

function lineSqlColumn(f: ErpFieldMeta): string {
  if (f.dbField === 'EST_DD') return 'est_dd';
  if (f.dbField === 'UNIT') return 'ut';
  if (f.dbField === 'REM') return 'rem';
  return f.key;
}

function buildTokens(
  fields: ErpFieldMeta[],
  prefix: 'M' | 'T',
  alias: string,
  tableLabel: string
): SunlikeSqlFieldToken[] {
  return fields
    .filter((f) => f.widget !== 'hidden')
    .map((f) => {
      const col = prefix === 'M' ? headSqlColumn(f) : lineSqlColumn(f);
      return {
        prefix,
        dbField: f.dbField,
        label: f.label,
        token: `${prefix}.${f.dbField}`,
        sqlRef: `${alias}.${col}`,
        tableLabel,
      };
    });
}

export function getDetailGridMenuMeta(menuCode: string): DetailGridMenuSqlMeta | undefined {
  return MENU_SQL_META[menuCode];
}

export function getSunlikeSqlFieldTokens(menuCode: string): SunlikeSqlFieldToken[] {
  const meta = MENU_SQL_META[menuCode];
  if (!meta) return [];

  if (menuCode === 'InvAD') {
    return [
      ...buildTokens(INV_AD.head, 'M', meta.headAlias, meta.headTable),
      ...buildTokens(INV_AD.line, 'T', meta.lineAlias, meta.lineTable),
    ];
  }
  if (menuCode === 'InvAD_BILL') {
    return buildTokens(INV_AD.head, 'M', meta.headAlias, meta.headTable);
  }
  if (menuCode === 'InvAF') {
    return [
      ...buildTokens(INV_AF.head, 'M', meta.headAlias, meta.headTable),
      ...buildTokens(INV_AF.line, 'T', meta.lineAlias, meta.lineTable),
    ];
  }
  if (menuCode === 'InvAF_BILL') {
    return buildTokens(INV_AF.head, 'M', meta.headAlias, meta.headTable);
  }
  return [];
}

function tokenMap(menuCode: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const t of getSunlikeSqlFieldTokens(menuCode)) {
    map.set(t.token.toUpperCase(), t.sqlRef);
    map.set(`${t.prefix}${t.dbField}`.toUpperCase(), t.sqlRef);
  }
  return map;
}

export function translateSunlikeSqlExpr(src: string, menuCode: string): string {
  let s = String(src || '').trim();
  if (!s) return s;

  const map = tokenMap(menuCode);

  s = s.replace(/:(M|T)\.([A-Za-z0-9_]+)/gi, (_m, p: string, field: string) => {
    const key = `${String(p).toUpperCase()}.${String(field).toUpperCase()}`;
    const ref = map.get(key);
    if (!ref) throw new Error(`未知字段引用 :${key}`);
    return ref;
  });

  s = s.replace(/:(M|T)([A-Z][A-Z0-9_]*)/gi, (_m, p: string, field: string) => {
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

export function filterSunlikeTokens(menuCode: string, query: string): SunlikeSqlFieldToken[] {
  const q = query.trim().toUpperCase();
  const all = getSunlikeSqlFieldTokens(menuCode);
  if (!q) return all;
  return all.filter(
    (t) =>
      t.token.toUpperCase().includes(q) ||
      t.dbField.toUpperCase().includes(q) ||
      t.label.includes(query.trim())
  );
}
