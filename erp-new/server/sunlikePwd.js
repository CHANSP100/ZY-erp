/**
 * SUNLIKE PSWD.PWD 加解密（与 analysis/SUNLIKE_PSWD_加解密.sql 一致）
 */
const ASCII_KEY = Buffer.from([0x4b, 0x65, 0xc7, 0xa4, 0x45, 0xe3, 0x1e, 0xd7, 0xa2]);
const ASCII_LEN5_MASK = Buffer.from([0xde, 0xba, 0xb5, 0x85, 0x58, 0x88, 0xda]);
const DBCS_KEY = Buffer.from([0x62, 0x22, 0x7e, 0x71]);

function isDbcs(str) {
  return /[^\x00-\x7f]/.test(str);
}

function encodePwd(plain) {
  if (!plain) return '';
  if (isDbcs(plain)) {
    const g = Buffer.from(plain, 'gbk');
    const enc = [];
    for (let i = 0; i < g.length; i++) {
      enc.push(g[i] ^ DBCS_KEY[i % 4]);
    }
    enc.push(enc[0]);
    enc.push((enc[1] + 2) & 0xff);
    return Buffer.from(enc).toString('hex').toUpperCase();
  }
  const dataBuf = Buffer.from(plain, 'ascii');
  if (dataBuf.length === 5) {
    const data = Buffer.concat([dataBuf, Buffer.from([0, 0])]);
    const out = Buffer.alloc(7);
    for (let i = 0; i < 7; i++) {
      out[i] = data[i] ^ ASCII_KEY[i % ASCII_KEY.length] ^ ASCII_LEN5_MASK[i];
    }
    return out.toString('hex').toUpperCase();
  }
  let data = dataBuf;
  let off = 0;
  if (data.length <= 4) {
    data = Buffer.concat([data, Buffer.from([0])]);
    off = 5;
  } else {
    data = data.subarray(0, 5);
  }
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) {
    out[i] = data[i] ^ ASCII_KEY[(off + i) % ASCII_KEY.length];
  }
  return out.toString('hex').toUpperCase();
}

function decodePwd(hexStr) {
  const h = String(hexStr || '')
    .trim()
    .toUpperCase();
  if (!h) return '';
  const c = Buffer.from(h, 'hex');
  if (c.length === 7) {
    const plain = Buffer.alloc(7);
    for (let i = 0; i < 7; i++) {
      plain[i] = c[i] ^ ASCII_KEY[i % ASCII_KEY.length] ^ ASCII_LEN5_MASK[i];
    }
    let end = plain.length;
    while (end > 0 && plain[end - 1] === 0) end -= 1;
    try {
      const t = plain.subarray(0, end).toString('ascii');
      if (encodePwd(t) === h) return t;
    } catch {
      /* */
    }
  }
  for (const [off, trimNull] of [
    [0, false],
    [5, true],
  ]) {
    const plain = Buffer.alloc(c.length);
    for (let i = 0; i < c.length; i++) {
      plain[i] = c[i] ^ ASCII_KEY[(off + i) % ASCII_KEY.length];
    }
    let s = plain;
    if (trimNull && s[s.length - 1] === 0) s = s.subarray(0, -1);
    try {
      const t = s.toString('ascii');
      if (encodePwd(t) === h) return t;
    } catch {
      /* */
    }
  }
  const body = c.subarray(0, -2);
  const plain = Buffer.alloc(body.length);
  for (let i = 0; i < body.length; i++) {
    plain[i] = body[i] ^ DBCS_KEY[i % 4];
  }
  return plain.toString('gbk');
}

function verifyPwd(plain, storedHex) {
  return encodePwd(plain) === String(storedHex || '').trim().toUpperCase();
}

module.exports = { encodePwd, decodePwd, verifyPwd };
