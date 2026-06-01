const { rowToSalm } = require('../db');
const { queryAll, queryOne, execSql, nstr, ndate } = require('../repositories/mssqlHelpers');
const { saveArchiveExtFields, mergeArchiveExtFields, isExtFieldError } = require('../billExtFieldHook');

const SALM_SEL = `SELECT s.SAL_NO AS sal_no, CAST(s.NAME AS nvarchar(100)) AS name,
  CAST(s.ENG_NAME AS nvarchar(100)) AS eng_name, CAST(s.NAME_PY AS nvarchar(50)) AS name_py,
  s.SEX AS sex, s.DEP AS dep, CAST(s.POS AS nvarchar(50)) AS pos, s.UP_SAL_NO AS up_sal_no,
  CAST(s.TEL1 AS nvarchar(50)) AS tel1, CAST(s.TEL2 AS nvarchar(50)) AS tel2,
  CAST(s.E_MAIL AS nvarchar(100)) AS e_mail, CAST(s.CON_ADR AS nvarchar(200)) AS con_adr,
  CAST(s.ID_NUM AS nvarchar(50)) AS id_num, CONVERT(varchar(10), s.BTH, 23) AS bth,
  CONVERT(varchar(10), s.DUT_IN_D, 23) AS dut_in_d, CONVERT(varchar(10), s.DUT_OT_D, 23) AS dut_ot_d,
  CAST(s.REM AS nvarchar(200)) AS rem,
  CAST(d.NAME AS nvarchar(100)) AS dep_name, CAST(u.NAME AS nvarchar(100)) AS up_sal_name
  FROM SALM s
  LEFT JOIN DEPT d ON d.DEP = s.DEP
  LEFT JOIN SALM u ON u.SAL_NO = s.UP_SAL_NO`;

function registerSalmRoutes(app) {
  app.get('/api/salm', async (req, res) => {
    const { q, limit = '100' } = req.query;
    try {
      let sql = `${SALM_SEL} WHERE 1=1`;
      const inputs = {};
      if (q) {
        sql += ' AND (s.SAL_NO LIKE @q OR s.NAME LIKE @q OR s.NAME_PY LIKE @q)';
        inputs.q = nstr(`%${q}%`, 100);
      }
      const top = Math.min(parseInt(limit, 10) || 100, 5000);
      sql = sql.replace('SELECT', `SELECT TOP (${top})`);
      sql += ' ORDER BY s.SAL_NO';
      res.json((await queryAll(sql, inputs)).map(rowToSalm));
    } catch (e) {
      console.error('[salm/list]', e);
      res.status(500).json({ error: '读取员工列表失败' });
    }
  });

  app.get('/api/salm/:salNo', async (req, res) => {
    try {
      const row = await queryOne(`${SALM_SEL} WHERE s.SAL_NO = @sal_no`, {
        sal_no: nstr(req.params.salNo, 10),
      });
      if (!row) return res.status(404).json({ error: '员工不存在' });
      res.json(await mergeArchiveExtFields('FasEB', { sal_no: req.params.salNo }, rowToSalm(row)));
    } catch (e) {
      console.error('[salm/get]', e);
      res.status(500).json({ error: '读取员工失败' });
    }
  });

  app.post('/api/salm', async (req, res) => {
    const b = req.body || {};
    if (!b.sal_no) return res.status(400).json({ error: '员工代号不能为空' });
    try {
      if (await queryOne('SELECT 1 AS ok FROM SALM WHERE SAL_NO = @sal_no', { sal_no: nstr(b.sal_no, 10) })) {
        return res.status(409).json({ error: '员工代号已存在' });
      }
      await execSql(
        `INSERT INTO SALM (SAL_NO, NAME, ENG_NAME, NAME_PY, SEX, DEP, POS, UP_SAL_NO, TEL1, TEL2,
         E_MAIL, CON_ADR, ID_NUM, BTH, DUT_IN_D, DUT_OT_D, REM)
         VALUES (@sal_no, @name, @eng_name, @name_py, @sex, @dep, @pos, @up_sal_no, @tel1, @tel2,
         @e_mail, @con_adr, @id_num, @bth, @dut_in_d, @dut_ot_d, @rem)`,
        {
          sal_no: nstr(b.sal_no, 10),
          name: nstr(b.name, 100),
          eng_name: nstr(b.eng_name, 100),
          name_py: nstr(b.name_py, 50),
          sex: nstr(b.sex, 4),
          dep: nstr(b.dep, 10),
          pos: nstr(b.pos, 50),
          up_sal_no: nstr(b.up_sal_no, 10),
          tel1: nstr(b.tel1, 50),
          tel2: nstr(b.tel2, 50),
          e_mail: nstr(b.e_mail, 100),
          con_adr: nstr(b.con_adr, 200),
          id_num: nstr(b.id_num, 50),
          bth: ndate(b.bth),
          dut_in_d: ndate(b.dut_in_d),
          dut_ot_d: ndate(b.dut_ot_d),
          rem: nstr(b.rem, 200),
        }
      );
      await saveArchiveExtFields('FasEB', { sal_no: b.sal_no }, b);
      const row = await queryOne(`${SALM_SEL} WHERE s.SAL_NO = @sal_no`, { sal_no: nstr(b.sal_no, 10) });
      res.status(201).json(await mergeArchiveExtFields('FasEB', { sal_no: b.sal_no }, rowToSalm(row)));
    } catch (e) {
      console.error('[salm/create]', e);
      if (isExtFieldError(e)) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: e.message || '新增员工失败' });
    }
  });

  app.put('/api/salm/:salNo', async (req, res) => {
    try {
      const row = await queryOne(`${SALM_SEL} WHERE s.SAL_NO = @sal_no`, {
        sal_no: nstr(req.params.salNo, 10),
      });
      if (!row) return res.status(404).json({ error: '员工不存在' });
      const b = req.body || {};
      await execSql(
        `UPDATE SALM SET NAME=@name, ENG_NAME=@eng_name, NAME_PY=@name_py, SEX=@sex, DEP=@dep, POS=@pos,
         UP_SAL_NO=@up_sal_no, TEL1=@tel1, TEL2=@tel2, E_MAIL=@e_mail, CON_ADR=@con_adr, ID_NUM=@id_num,
         BTH=@bth, DUT_IN_D=@dut_in_d, DUT_OT_D=@dut_ot_d, REM=@rem WHERE SAL_NO=@sal_no`,
        {
          sal_no: nstr(req.params.salNo, 10),
          name: nstr(b.name ?? row.name, 100),
          eng_name: nstr(b.eng_name ?? row.eng_name, 100),
          name_py: nstr(b.name_py ?? row.name_py, 50),
          sex: nstr(b.sex ?? row.sex, 4),
          dep: nstr(b.dep ?? row.dep, 10),
          pos: nstr(b.pos ?? row.pos, 50),
          up_sal_no: nstr(b.up_sal_no ?? row.up_sal_no, 10),
          tel1: nstr(b.tel1 ?? row.tel1, 50),
          tel2: nstr(b.tel2 ?? row.tel2, 50),
          e_mail: nstr(b.e_mail ?? row.e_mail, 100),
          con_adr: nstr(b.con_adr ?? row.con_adr, 200),
          id_num: nstr(b.id_num ?? row.id_num, 50),
          bth: ndate(b.bth ?? row.bth),
          dut_in_d: ndate(b.dut_in_d ?? row.dut_in_d),
          dut_ot_d: ndate(b.dut_ot_d ?? row.dut_ot_d),
          rem: nstr(b.rem ?? row.rem, 200),
        }
      );
      await saveArchiveExtFields('FasEB', { sal_no: req.params.salNo }, b);
      const updated = await queryOne(`${SALM_SEL} WHERE s.SAL_NO = @sal_no`, {
        sal_no: nstr(req.params.salNo, 10),
      });
      res.json(await mergeArchiveExtFields('FasEB', { sal_no: req.params.salNo }, rowToSalm(updated)));
    } catch (e) {
      console.error('[salm/update]', e);
      if (isExtFieldError(e)) return res.status(400).json({ error: e.message });
      res.status(500).json({ error: e.message || '修改员工失败' });
    }
  });
}

module.exports = { registerSalmRoutes };
