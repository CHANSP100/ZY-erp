const { rowToCust } = require('../db');
const { queryAll } = require('../repositories/mssqlHelpers');
const { mergeArchiveExtFields } = require('../billExtFieldHook');

const CUST_SEL = `SELECT CUS_NO AS cus_no, OBJ_ID AS obj_id, CAST(NAME AS nvarchar(200)) AS name,
  CAST(SNM AS nvarchar(100)) AS snm, CUS_ARE AS cus_are, CAST(CNT_MAN1 AS nvarchar(50)) AS cnt_man1,
  CAST(CNT_MAN2 AS nvarchar(50)) AS cnt_man2, CAST(TEL1 AS nvarchar(50)) AS tel1, CAST(TEL2 AS nvarchar(50)) AS tel2,
  CAST(UNI_NO AS nvarchar(50)) AS uni_no, CAST(BIZ_DSC AS nvarchar(200)) AS biz_dsc,
  CAST(ADR2 AS nvarchar(200)) AS adr2, CONVERT(varchar(10), END_DD, 23) AS end_dd,
  CUR AS cur_id, ID1_TAX AS id1_tax, SAL_NO AS sal_no, CAST(BNK_NAME AS nvarchar(100)) AS bnk_name,
  CAST(ID_CODE AS nvarchar(50)) AS id_code, CAST(REM AS nvarchar(200)) AS rem FROM CUST`;

(async () => {
  try {
    const sql = CUST_SEL.replace('SELECT', 'SELECT TOP (5000)') + ' ORDER BY CUS_NO';
    const rows = (await queryAll(sql)).map(rowToCust);
    console.log('rows', rows.length);
    const merged = await Promise.all(
      rows.map((row) => mergeArchiveExtFields('FasEA', { cus_no: row.cus_no }, row))
    );
    console.log('merged OK', merged.length);
  } catch (e) {
    console.error('FAIL', e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();
