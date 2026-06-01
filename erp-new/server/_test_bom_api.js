const http = require('http');
const { queryOne } = require('./repositories/mssqlHelpers');

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 3001,
        path: `/api${path}`,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let parsed = raw;
          try {
            parsed = JSON.parse(raw);
          } catch {
            /* text */
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  const login = await request('POST', '/api/auth/login', { usr_id: 'ADMIN', password: '' });
  console.log('login', login.status, login.body);
  const token = login.body?.token;
  if (!token) process.exit(1);

  const prd = await queryOne(
    "SELECT TOP 1 PRD_NO AS prd_no, NAME AS name, KND AS knd, UT AS ut, WH AS wh, SPC AS spc FROM PRDT WHERE KND IN ('2','3') AND ISNULL(STOP_ID,'') <> 'Y'"
  );
  const child = await queryOne(
    "SELECT TOP 1 PRD_NO AS prd_no, NAME AS name, UT AS ut, WH AS wh FROM PRDT WHERE KND IN ('4','5') AND ISNULL(STOP_ID,'') <> 'Y'"
  );
  if (!prd || !child) {
    console.log('no products');
    process.exit(1);
  }
  const pf = String(Date.now()).slice(-5);
  const payload = {
    head: {
      bom_no: '',
      prd_no: prd.prd_no,
      pf_no: pf,
      name: prd.name,
      prd_mark: '',
      wh_no: prd.wh || '',
      unit: String(prd.ut || '').slice(0, 1),
      qty: 1,
      prd_knd: prd.knd,
      spc: prd.spc || '',
      valid_dd: '',
      end_dd: '',
      dep: '',
      rem: '',
    },
    lines: [
      {
        prd_no: child.prd_no,
        name: child.name,
        prd_mark: '',
        wh_no: child.wh || '',
        unit: String(child.ut || '').slice(0, 1),
        qty: 1,
        los_rto: 0,
        qty_bas: 1,
        bom_id: '',
        rem: '',
      },
    ],
  };
  const res = await request('POST', '/bom-recipes', payload, token);
  console.log('status', res.status);
  console.log('body', JSON.stringify(res.body, null, 2));
  if (res.status >= 400) process.exit(1);
})();
