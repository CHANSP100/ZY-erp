const fs = require('fs');
const path = require('path');

const dictPath = path.join(__dirname, '../../../analysis/dict_fld_keep44.txt');
const outPath = path.join(__dirname, '../../../analysis/字段对照/_mo_phase2_snippet.md');
const lines = fs.readFileSync(dictPath, 'utf8').split(/\r?\n/);

const headCurrent = new Set([
  'MO_NO', 'MO_DD', 'STA_DD', 'END_DD', 'OPN_DD', 'FIN_DD', 'MRP_NO', 'PRD_MARK', 'WH', 'SO_NO',
  'UNIT', 'QTY', 'DEP', 'CLOSE_ID', 'REM', 'QTY_FIN', 'BIL_ID', 'BIL_NO',
]);
const lineCurrent = new Set([
  'MO_NO', 'ITM', 'PRD_NO', 'PRD_NAME', 'PRD_MARK', 'WH', 'UNIT', 'QTY_STD', 'LOS_RTO',
  'QTY_RSV', 'QTY_LOST', 'QTY', 'BAT_NO', 'REM',
]);

function mapType(t, len) {
  if (t === 'A') return len && len !== '*' ? `varchar(${len})` : 'varchar';
  if (t === '@') return 'datetime';
  if (t === 'N') return 'numeric';
  if (t === 'M') return 'memo';
  if (t === 'I') return 'int';
  return t;
}

function widget(name, t) {
  if (name === 'ITM' || name === 'BIL_ID') return 'hidden';
  if (t === '@') return 'date';
  if (t === 'N' || t === 'I') return 'number';
  if (t === 'M') return 'textarea';
  if (name.endsWith('_NO') || name === 'MRP_NO' || name === 'DEP' || name === 'WH') return 'lookup';
  return 'input';
}

function parseTable(table) {
  return lines
    .filter((l) => l.startsWith(`${table}|`))
    .map((l) => {
      const p = l.split('|');
      return { no: p[1], name: p[2], type: p[3], len: p[4], note: p[6] || '' };
    });
}

function tableMd(title, rows, currentSet) {
  const phase2 = rows.filter((f) => !currentSet.has(f.name));
  let md = `### ${title}\n\n二期 **${phase2.length}** 项。\n\n`;
  md += '| # | 字段名 | 中文名称 | 类型 | 组件 | 查询 | 列表 | 表单 | 必填 | 只读 | 阶段 |\n';
  md += '|---|--------|----------|------|------|------|------|------|------|------|------|\n';
  phase2.forEach((f, i) => {
    const ro = ['USR', 'CHK_MAN', 'CLS_DATE', 'SYS_DATE', 'LOCK_MAN', 'LOCK_DATE', 'MODIFY_DD', 'MODIFY_MAN', 'PRT_USR', 'PRT_DATE'].includes(f.name) ? '是' : '否';
    md += `| ${i + 1} | ${f.name} | ${f.note} | ${mapType(f.type, f.len)} | ${widget(f.name, f.type)} | 否 | 否 | 否 | 否 | ${ro} | 二期 |\n`;
  });
  return md;
}

const mf = parseTable('MF_MO');
const tf = parseTable('TF_MO');
const out = tableMd('表头 — MF_MO', mf, headCurrent) + '\n' + tableMd('表身 — TF_MO', tf, lineCurrent);
fs.writeFileSync(outPath, '\uFEFF' + out, 'utf8');
console.log('written', outPath, 'head2', mf.filter((f) => !headCurrent.has(f.name)).length, 'line2', tf.filter((f) => !lineCurrent.has(f.name)).length);
