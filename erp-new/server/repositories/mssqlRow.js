/**
 * 将 MSSQL 行转为 API 用小写字段（INDX 本期字段）
 */
function str(v) {
  if (v == null) return '';
  return String(v).trim();
}

function normalizeIndxRow(row) {
  if (!row) return null;
  return {
    idx_no: str(row.IDX_NO ?? row.idx_no),
    name: str(row.NAME ?? row.name),
    idx_up: str(row.IDX_UP ?? row.idx_up),
    stop_dd: str(row.STOP_DD ?? row.stop_dd),
    rem: str(row.REM ?? row.rem),
  };
}

const INDX_ROOT_NO = '0000000000';

/** 上层中类：空值存库为根节点代号（界面不可选） */
function normalizeIndxUp(val) {
  const s = str(val);
  return s || INDX_ROOT_NO;
}

function normalizeIndxPayload(body = {}) {
  return {
    idx_no: str(body.idx_no),
    name: str(body.name),
    idx_up: normalizeIndxUp(body.idx_up),
    stop_dd: str(body.stop_dd),
    rem: str(body.rem),
  };
}

function normalizeAreaRow(row) {
  if (!row) return null;
  return {
    area_no: str(row.AREA_NO ?? row.area_no),
    name: str(row.NAME ?? row.name),
    area_up: str(row.AREA_UP ?? row.area_up),
    stop_dd: str(row.STOP_DD ?? row.stop_dd),
    rem: str(row.REM ?? row.rem),
  };
}

const AREA_ROOT_NO = '00000000';

function normalizeAreaUp(val) {
  const s = str(val);
  return s || AREA_ROOT_NO;
}

function normalizeAreaPayload(body = {}) {
  return {
    area_no: str(body.area_no),
    name: str(body.name),
    area_up: normalizeAreaUp(body.area_up),
    stop_dd: str(body.stop_dd),
    rem: str(body.rem),
  };
}

module.exports = {
  normalizeIndxRow,
  normalizeIndxPayload,
  normalizeIndxUp,
  INDX_ROOT_NO,
  normalizeAreaRow,
  normalizeAreaPayload,
  normalizeAreaUp,
  AREA_ROOT_NO,
  str,
};
