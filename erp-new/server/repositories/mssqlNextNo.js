const { queryOne } = require('./mssqlHelpers');

function todayPrefix(yy, mm) {
  return `${yy}${mm}`;
}

async function nextOsNo(osId = 'SO') {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const prefix = `${osId}${yy}${mm}`;
  const row = await queryOne(
    `SELECT TOP 1 OS_NO AS os_no FROM MF_POS WHERE OS_ID = @os_id AND OS_NO LIKE @pfx + '%' ORDER BY OS_NO DESC`,
    { os_id: osId, pfx: prefix }
  );
  let maxSeq = 0;
  if (row?.os_no) {
    const n = parseInt(String(row.os_no).slice(prefix.length), 10);
    if (!Number.isNaN(n)) maxSeq = n;
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}

async function nextPsNo(psId = 'SA') {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const prefix = `${psId}${yy}${mm}`;
  const row = await queryOne(
    `SELECT TOP 1 PS_NO AS ps_no FROM MF_PSS WHERE PS_ID = @ps_id AND PS_NO LIKE @pfx + '%' ORDER BY PS_NO DESC`,
    { ps_id: psId, pfx: prefix }
  );
  let maxSeq = 0;
  if (row?.ps_no) {
    const n = parseInt(String(row.ps_no).slice(prefix.length), 10);
    if (!Number.isNaN(n)) maxSeq = n;
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}

async function nextSqNo() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const prefix = `SQ${yy}${mm}`;
  const row = await queryOne(
    `SELECT TOP 1 SQ_NO AS sq_no FROM MF_SQ WHERE SQ_NO LIKE @pfx + '%' ORDER BY SQ_NO DESC`,
    { pfx: prefix }
  );
  let maxSeq = 0;
  if (row?.sq_no) {
    const n = parseInt(String(row.sq_no).slice(prefix.length), 10);
    if (!Number.isNaN(n)) maxSeq = n;
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}

async function nextPrdNo(idx1, idx2) {
  const rows = await require('./mssqlHelpers').queryAll(
    `SELECT PRD_NO AS prd_no FROM PRDT WHERE IDX1 = @idx1 AND PRD_NO LIKE '%-%' ORDER BY PRD_NO`,
    { idx1: String(idx1) }
  );
  let prefix;
  if (rows.length > 0) {
    prefix = String(rows[rows.length - 1].prd_no).split('-')[0];
  } else {
    const suffix = (idx2 && String(idx2).trim()) || '03';
    prefix = `${idx1}${suffix}`;
  }
  let maxSeq = 0;
  for (const r of rows) {
    const part = String(r.prd_no).split('-')[1];
    const n = parseInt(part, 10);
    if (!Number.isNaN(n) && n > maxSeq) maxSeq = n;
  }
  const next = maxSeq + 1;
  return { prd_no: `${prefix}-${String(next).padStart(4, '0')}`, prefix };
}

async function nextMoNo() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const prefix = `MO${yy}${mm}`;
  const row = await queryOne(
    `SELECT TOP 1 MO_NO AS mo_no FROM MF_MO WHERE MO_NO LIKE @pfx + '%' ORDER BY MO_NO DESC`,
    { pfx: prefix }
  );
  let maxSeq = 0;
  if (row?.mo_no) {
    const n = parseInt(String(row.mo_no).slice(prefix.length), 10);
    if (!Number.isNaN(n)) maxSeq = n;
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}

async function nextMlNo() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const prefix = `ML${yy}${mm}`;
  const row = await queryOne(
    `SELECT TOP 1 ML_NO AS ml_no FROM MF_ML
     WHERE MLID='ML' AND ML_ID='1' AND ML_NO LIKE @pfx + '%' ORDER BY ML_NO DESC`,
    { pfx: prefix }
  );
  let maxSeq = 0;
  if (row?.ml_no) {
    const n = parseInt(String(row.ml_no).slice(prefix.length), 10);
    if (!Number.isNaN(n)) maxSeq = n;
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}

async function nextMmNo() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const prefix = `MM${yy}${mm}`;
  const row = await queryOne(
    `SELECT TOP 1 MM_NO AS mm_no FROM MF_MM0
     WHERE MM_ID='MM' AND MM_NO LIKE @pfx + '%' ORDER BY MM_NO DESC`,
    { pfx: prefix }
  );
  let maxSeq = 0;
  if (row?.mm_no) {
    const n = parseInt(String(row.mm_no).slice(prefix.length), 10);
    if (!Number.isNaN(n)) maxSeq = n;
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}

async function nextJhNo() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const prefix = `JH${yy}${mm}`;
  const row = await queryOne(
    `SELECT TOP 1 JH_NO AS jh_no FROM MF_JH WHERE JH_NO LIKE @pfx + '%' ORDER BY JH_NO DESC`,
    { pfx: prefix }
  );
  let maxSeq = 0;
  if (row?.jh_no) {
    const n = parseInt(String(row.jh_no).slice(prefix.length), 10);
    if (!Number.isNaN(n)) maxSeq = n;
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}

async function nextMpNo() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const prefix = `MP${yy}${mm}`;
  const row = await queryOne(
    `SELECT TOP 1 MP_NO AS mp_no FROM MF_MP WHERE MP_NO LIKE @pfx + '%' ORDER BY MP_NO DESC`,
    { pfx: prefix }
  );
  let maxSeq = 0;
  if (row?.mp_no) {
    const n = parseInt(String(row.mp_no).slice(prefix.length), 10);
    if (!Number.isNaN(n)) maxSeq = n;
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}

module.exports = { nextOsNo, nextPsNo, nextSqNo, nextMoNo, nextMlNo, nextMmNo, nextJhNo, nextMpNo, nextPrdNo };
