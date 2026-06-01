const { rowToCust } = require('../db');
const { queryAll, queryOne, execSql, nstr, ndate, nint } = require('../repositories/mssqlHelpers');
const { saveArchiveExtFields, mergeArchiveExtFields, isExtFieldError } = require('../billExtFieldHook');

const CUST_SEL = `SELECT CUS_NO AS cus_no, OBJ_ID AS obj_id, CAST(NAME AS nvarchar(200)) AS name,
  CAST(SNM AS nvarchar(100)) AS snm, CUS_ARE AS cus_are, CAST(CNT_MAN1 AS nvarchar(50)) AS cnt_man1,
  CAST(CNT_MAN2 AS nvarchar(50)) AS cnt_man2, CAST(TEL1 AS nvarchar(50)) AS tel1, CAST(TEL2 AS nvarchar(50)) AS tel2,
  CAST(UNI_NO AS nvarchar(50)) AS uni_no, CAST(BIZ_DSC AS nvarchar(200)) AS biz_dsc,
  CAST(ADR2 AS nvarchar(200)) AS adr2, CONVERT(varchar(10), END_DD, 23) AS end_dd,
  CUR AS cur_id, ID1_TAX AS id1_tax, SAL AS sal, SAL_NO AS sal_no, CAST(BNK_NAME AS nvarchar(100)) AS bnk_name,
  CAST(ID_CODE AS nvarchar(50)) AS id_code, CAST(REM AS nvarchar(200)) AS rem FROM CUST`;

function registerCustRoutes(app) {
  app.get('/api/cust', async (req, res) => {
    const { q, obj_id, limit = '100' } = req.query;
    try {
      let sql = `${CUST_SEL} WHERE 1=1`;
      const inputs = {};
      if (obj_id) {
        sql += ' AND OBJ_ID = @obj_id';
        inputs.obj_id = nstr(obj_id, 4);
      }
      if (q) {
        sql += ' AND (CUS_NO LIKE @q OR NAME LIKE @q OR SNM LIKE @q)';
        inputs.q = nstr(`%${q}%`, 200);
      }
      const top = Math.min(parseInt(limit, 10) || 100, 5000);
      sql = sql.replace('SELECT', `SELECT TOP (${top})`);
      sql += ' ORDER BY CUS_NO';
      const rows = (await queryAll(sql, inputs)).map(rowToCust);
      const merged = await Promise.all(
        rows.map((row) => mergeArchiveExtFields('FasEA', { cus_no: row.cus_no }, row))
      );
      res.json(merged);
    } catch (e) {
      console.error('[cust/list]', e);
      res.status(500).json({ error: '读取客户列表失败' });
    }
  });

  app.get('/api/cust/:cusNo', async (req, res) => {
    try {
      const row = await queryOne(`${CUST_SEL} WHERE CUS_NO = @cus_no`, {
        cus_no: nstr(req.params.cusNo, 20),
      });
      if (!row) return res.status(404).json({ error: '客户不存在' });
      res.json(await mergeArchiveExtFields('FasEA', { cus_no: req.params.cusNo }, rowToCust(row)));
    } catch (e) {
      console.error('[cust/get]', e);
      res.status(500).json({ error: '读取客户失败' });
    }
  });

  app.post('/api/cust', async (req, res) => {
    const b = req.body || {};
    if (!b.cus_no) return res.status(400).json({ error: '客户代号不能为空' });
    if (!b.name) return res.status(400).json({ error: '全称不能为空' });
    try {
      if (await queryOne('SELECT 1 AS ok FROM CUST WHERE CUS_NO = @cus_no', { cus_no: nstr(b.cus_no, 20) })) {
        return res.status(409).json({ error: '客户代号已存在' });
      }
      await execSql(
        `INSERT INTO CUST (CUS_NO, OBJ_ID, NAME, SNM, CUS_ARE, CNT_MAN1, CNT_MAN2, TEL1, TEL2,
         UNI_NO, BIZ_DSC, ADR2, END_DD, CUR, ID1_TAX, SAL, SAL_NO, BNK_NAME, ID_CODE, REM)
         VALUES (@cus_no, @obj_id, @name, @snm, @cus_are, @cnt_man1, @cnt_man2, @tel1, @tel2,
         @uni_no, @biz_dsc, @adr2, @end_dd, @cur_id, @id1_tax, @sal, @sal_no, @bnk_name, @id_code, @rem)`,
        {
          cus_no: nstr(b.cus_no, 20),
          obj_id: nstr(b.obj_id || '1', 4),
          name: nstr(b.name, 200),
          snm: nstr(b.snm || b.name?.slice(0, 30), 100),
          cus_are: nstr(b.cus_are, 10),
          cnt_man1: nstr(b.cnt_man1, 50),
          cnt_man2: nstr(b.cnt_man2, 50),
          tel1: nstr(b.tel1, 50),
          tel2: nstr(b.tel2, 50),
          uni_no: nstr(b.uni_no, 50),
          biz_dsc: nstr(b.biz_dsc, 200),
          adr2: nstr(b.adr2, 200),
          end_dd: ndate(b.end_dd),
          cur_id: nstr(b.cur_id, 4),
          id1_tax: nstr(b.id1_tax || '1', 4),
          sal: nstr(b.sal, 12),
          sal_no: nstr(b.sal_no, 12),
          bnk_name: nstr(b.bnk_name, 100),
          id_code: nstr(b.id_code, 50),
          rem: nstr(b.rem, 200),
        }
      );
      await saveArchiveExtFields('FasEA', { cus_no: b.cus_no }, b);
      const row = await queryOne(`${CUST_SEL} WHERE CUS_NO = @cus_no`, { cus_no: nstr(b.cus_no, 20) });
      res.status(201).json(await mergeArchiveExtFields('FasEA', { cus_no: b.cus_no }, rowToCust(row)));
    } catch (e) {
      console.error('[cust/create]', e);
      if (isExtFieldError(e)) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: e.message || '新增客户失败' });
    }
  });

  app.put('/api/cust/:cusNo', async (req, res) => {
    try {
      const row = await queryOne(`${CUST_SEL} WHERE CUS_NO = @cus_no`, {
        cus_no: nstr(req.params.cusNo, 20),
      });
      if (!row) return res.status(404).json({ error: '客户不存在' });
      const b = req.body || {};
      await execSql(
        `UPDATE CUST SET OBJ_ID=@obj_id, NAME=@name, SNM=@snm, CUS_ARE=@cus_are, CNT_MAN1=@cnt_man1,
         CNT_MAN2=@cnt_man2, TEL1=@tel1, TEL2=@tel2, UNI_NO=@uni_no, BIZ_DSC=@biz_dsc, ADR2=@adr2,
         END_DD=@end_dd, CUR=@cur_id, ID1_TAX=@id1_tax, SAL=@sal, SAL_NO=@sal_no, BNK_NAME=@bnk_name,
         ID_CODE=@id_code, REM=@rem WHERE CUS_NO=@cus_no`,
        {
          cus_no: nstr(req.params.cusNo, 20),
          obj_id: nstr(b.obj_id ?? row.obj_id, 4),
          name: nstr(b.name ?? row.name, 200),
          snm: nstr(b.snm ?? row.snm, 100),
          cus_are: nstr(b.cus_are ?? row.cus_are, 10),
          cnt_man1: nstr(b.cnt_man1 ?? row.cnt_man1, 50),
          cnt_man2: nstr(b.cnt_man2 ?? row.cnt_man2, 50),
          tel1: nstr(b.tel1 ?? row.tel1, 50),
          tel2: nstr(b.tel2 ?? row.tel2, 50),
          uni_no: nstr(b.uni_no ?? row.uni_no, 50),
          biz_dsc: nstr(b.biz_dsc ?? row.biz_dsc, 200),
          adr2: nstr(b.adr2 ?? row.adr2, 200),
          end_dd: ndate(b.end_dd ?? row.end_dd),
          cur_id: nstr(b.cur_id ?? row.cur_id, 4),
          id1_tax: nstr(b.id1_tax ?? row.id1_tax, 4),
          sal: nstr(b.sal ?? row.sal, 12),
          sal_no: nstr(b.sal_no ?? row.sal_no, 12),
          bnk_name: nstr(b.bnk_name ?? row.bnk_name, 100),
          id_code: nstr(b.id_code ?? row.id_code, 50),
          rem: nstr(b.rem ?? row.rem, 200),
        }
      );
      await saveArchiveExtFields('FasEA', { cus_no: req.params.cusNo }, b);
      const updated = await queryOne(`${CUST_SEL} WHERE CUS_NO = @cus_no`, {
        cus_no: nstr(req.params.cusNo, 20),
      });
      res.json(await mergeArchiveExtFields('FasEA', { cus_no: req.params.cusNo }, rowToCust(updated)));
    } catch (e) {
      console.error('[cust/update]', e);
      if (isExtFieldError(e)) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: e.message || '修改客户失败' });
    }
  });
}

module.exports = { registerCustRoutes };
