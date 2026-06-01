/**
 * PRDT_PIC — image 列读写（上传文件 → 二进制落库）
 */
const fs = require('fs');
const path = require('path');
const { sql, nstr } = require('./mssqlHelpers');

const serverRoot = path.join(__dirname, '..');
const imageSqlType = sql.Image || sql.VarBinary(sql.MAX);

function nimage(buffer) {
  if (buffer == null) return { type: imageSqlType, value: null };
  return { type: imageSqlType, value: buffer };
}

function normalizePicPath(val) {
  const s = String(val).trim();
  const uploadsAt = s.indexOf('/uploads/');
  if (uploadsAt >= 0) return s.slice(uploadsAt).split('?')[0];
  const apiAt = s.indexOf('/api/prdt/');
  if (apiAt >= 0) return s.slice(apiAt).split('?')[0];
  return s;
}

/** 存盘入参：/uploads/ 新上传 | /api/prdt/... 保持不变 | 空=清空 */
function parsePicSaveValue(val) {
  if (val == null || val === '') return { action: 'clear' };
  const s = normalizePicPath(val);
  if (!s) return { action: 'clear' };
  if (s.startsWith('/api/prdt/')) return { action: 'keep' };
  if (s.startsWith('/uploads/')) {
    const rel = s.replace(/^\//, '').replace(/\.\./g, '');
    const fp = path.join(serverRoot, rel);
    if (!fs.existsSync(fp)) throw new Error('上传文件不存在，请重新上传');
    return { action: 'set', buffer: fs.readFileSync(fp) };
  }
  throw new Error('无效的图片/图档路径');
}

async function savePrdtPic(tx, prdNo, pic, cadimg) {
  const picSpec = pic !== undefined ? parsePicSaveValue(pic) : null;
  const cadSpec = cadimg !== undefined ? parsePicSaveValue(cadimg) : null;
  if (!picSpec && !cadSpec) return;

  const existing = await tx.queryOne('SELECT 1 AS ok FROM PRDT_PIC WHERE PRD_NO=@prd_no', {
    prd_no: nstr(prdNo, 30),
  });

  const sets = [];
  const inputs = { prd_no: nstr(prdNo, 30) };

  if (picSpec) {
    if (picSpec.action === 'set') {
      sets.push('PIC=CONVERT(IMAGE, @pic)');
      inputs.pic = nimage(picSpec.buffer);
    } else if (picSpec.action === 'clear') {
      sets.push('PIC=NULL');
    }
  }
  if (cadSpec) {
    if (cadSpec.action === 'set') {
      sets.push('CADIMG=CONVERT(IMAGE, @cadimg)');
      inputs.cadimg = nimage(cadSpec.buffer);
    } else if (cadSpec.action === 'clear') {
      sets.push('CADIMG=NULL');
    }
  }
  if (!sets.length) return;

  if (existing) {
    await tx.exec(`UPDATE PRDT_PIC SET ${sets.join(', ')} WHERE PRD_NO=@prd_no`, inputs);
  } else {
    const cols = ['PRD_NO'];
    const vals = ['@prd_no'];
    if (picSpec?.action === 'set') {
      cols.push('PIC');
      vals.push('CONVERT(IMAGE, @pic)');
      inputs.pic = nimage(picSpec.buffer);
    }
    if (cadSpec?.action === 'set') {
      cols.push('CADIMG');
      vals.push('CONVERT(IMAGE, @cadimg)');
      inputs.cadimg = nimage(cadSpec.buffer);
    }
    if (cols.length === 1) return;
    await tx.exec(`INSERT INTO PRDT_PIC (${cols.join(', ')}) VALUES (${vals.join(', ')})`, inputs);
  }
}

function picUrlForRow(prdNo, field) {
  return `/api/prdt/${encodeURIComponent(prdNo)}/${field}`;
}

const MIME_BY_EXT = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.dwg': 'application/acad',
  '.dxf': 'application/dxf',
  '.pdf': 'application/pdf',
};

function guessMime(buf, fallback = 'application/octet-stream') {
  if (!buf || buf.length < 4) return fallback;
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'image/png';
  if (buf[0] === 0x47 && buf[1] === 0x49) return 'image/gif';
  if (buf.slice(0, 4).toString('ascii') === '%PDF') return 'application/pdf';
  return fallback;
}

module.exports = {
  nimage,
  parsePicSaveValue,
  savePrdtPic,
  picUrlForRow,
  MIME_BY_EXT,
  guessMime,
};
