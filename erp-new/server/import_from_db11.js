/**
 * 从 DB_11 导入基础资料 + 受订单样本
 * 用法: node import_from_db11.js
 */
const sql = require('mssql');
const { db } = require('./db');
const { fixRows } = require('./encoding');

const config = {
  server: process.env.MSSQL_SERVER || '127.0.0.1',
  database: process.env.MSSQL_DB || 'DB_11',
  user: process.env.MSSQL_USER || 'SA',
  password: process.env.MSSQL_PASSWORD || '2285',
  options: { encrypt: false, trustServerCertificate: true },
};

const PRDT_LIMIT = parseInt(process.env.PRDT_IMPORT_LIMIT || '500', 10);

async function main() {
  const pool = await sql.connect(config);
  console.log('已连接', config.database);

  const indxRows = fixRows(
    (
      await pool.request().query(`
      SELECT IDX_NO, CAST(NAME AS nvarchar(100)) AS NAME, IDX_UP,
        CONVERT(varchar(10), STOP_DD, 23) AS STOP_DD, CAST(REM AS nvarchar(200)) AS REM
      FROM INDX ORDER BY IDX_NO
    `)
    ).recordset
  );

  const whRows = fixRows(
    (
      await pool.request().query(`
      SELECT WH, CAST(NAME AS nvarchar(100)) AS NAME, DEP, UP_WH, CAST(ADR AS nvarchar(200)) AS ADR, TEL_NO,
        CONVERT(varchar(10), STOP_DD, 23) AS STOP_DD, CAST(REM AS nvarchar(100)) AS REM
      FROM MY_WH ORDER BY WH
    `)
    ).recordset
  );

  const deptRows = fixRows(
    (
      await pool.request().query(`
      SELECT DEP, CAST(NAME AS nvarchar(100)) AS NAME, CAST(ENG_NAME AS nvarchar(100)) AS ENG_NAME, UP,
        CONVERT(varchar(10), STOP_DD, 23) AS STOP_DD
      FROM DEPT ORDER BY DEP
    `)
    ).recordset
  );

  const prdtRows = fixRows(
    (
      await pool.request().query(`
      SELECT TOP (${PRDT_LIMIT})
        PRD_NO, CAST(SNM AS nvarchar(100)) AS SNM, IDX1, IDX2, UT, CAST(NAME AS nvarchar(200)) AS NAME,
        CAST(SPC AS nvarchar(max)) AS SPC,
        WH, VALID_DAYS, QTY_MIN1, QTY_MAX,
        CAST(REM AS nvarchar(500)) AS REM, STOP_ID
      FROM PRDT ORDER BY PRD_NO
    `)
    ).recordset
  );

  const custRows = fixRows(
    (
      await pool.request().query(`
      SELECT CUS_NO, OBJ_ID, CAST(NAME AS nvarchar(200)) AS NAME, CAST(SNM AS nvarchar(100)) AS SNM, CUS_ARE,
        CAST(CNT_MAN1 AS nvarchar(50)) AS CNT_MAN1, CAST(CNT_MAN2 AS nvarchar(50)) AS CNT_MAN2,
        TEL1, TEL2, UNI_NO, CAST(BIZ_DSC AS nvarchar(200)) AS BIZ_DSC, CAST(ADR2 AS nvarchar(500)) AS ADR2,
        CONVERT(varchar(10), END_DD, 23) AS END_DD, CUR AS CUR_ID, ID1_TAX, SAL AS SAL_NO,
        CAST(BNK_NAME AS nvarchar(100)) AS BNK_NAME, ID_CODE, CAST(REM AS nvarchar(500)) AS REM
      FROM CUST ORDER BY CUS_NO
    `)
    ).recordset
  );

  const salmRows = fixRows(
    (
      await pool.request().query(`
      SELECT SAL_NO, CAST(NAME AS nvarchar(100)) AS NAME, CAST(ENG_NAME AS nvarchar(100)) AS ENG_NAME,
        CAST(NAME_PY AS nvarchar(100)) AS NAME_PY, SEX, DEP, CAST(POS AS nvarchar(50)) AS POS, UP_SAL_NO,
        TEL1, TEL2, E_MAIL, CAST(CON_ADR AS nvarchar(120)) AS CON_ADR, ID_NUM,
        CONVERT(varchar(10), BTH, 23) AS BTH,
        CONVERT(varchar(10), DUT_IN_D, 23) AS DUT_IN_D,
        CONVERT(varchar(10), DUT_OT_D, 23) AS DUT_OT_D,
        CAST(REM AS nvarchar(200)) AS REM
      FROM SALM ORDER BY SAL_NO
    `)
    ).recordset
  );

  const mfPosRows = fixRows(
    (
      await pool.request().query(`
      SELECT OS_ID, OS_NO, CONVERT(varchar(10), OS_DD, 23) AS OS_DD, CUS_NO, USE_DEP, SAL_NO,
        CUS_OS_NO, BIL_TYPE, CUR_ID, TAX_ID, CONVERT(varchar(10), EST_DD, 23) AS EST_DD,
        CAST(REM AS nvarchar(500)) AS REM, CLS_MP_ID, CLS_ID, DIS_CNT, AMTN_NET, TAX, BIL_ID, BIL_NO
      FROM MF_POS WHERE OS_ID = 'SO' ORDER BY OS_NO
    `)
    ).recordset
  );

  const tfPosRows = fixRows(
    (
      await pool.request().query(`
      SELECT OS_ID, OS_NO, ITM, PRD_NO, CAST(PRD_NAME AS nvarchar(200)) AS PRD_NAME, WH, QTY, UT, UP, AMTN,
        TAX_RTO, TAX, CONVERT(varchar(10), EST_DD, 23) AS EST_DD, SUP_PRD_NO,
        CAST(REM AS nvarchar(200)) AS REM, QTY_PS
      FROM TF_POS WHERE OS_ID = 'SO' ORDER BY OS_NO, ITM
    `)
    ).recordset
  );

  const mfPssRows = fixRows(
    (
      await pool.request().query(`
      SELECT PS_ID, PS_NO, CONVERT(varchar(10), PS_DD, 23) AS PS_DD, CUS_NO, DEP, SAL_NO,
        CUS_OS_NO, BIL_TYPE, CUR_ID, TAX_ID, OS_ID, OS_NO,
        CAST(REM AS nvarchar(500)) AS REM, DIS_CNT
      FROM MF_PSS WHERE PS_ID IN ('SA','SB') ORDER BY PS_NO
    `)
    ).recordset
  );

  const tfPssRows = fixRows(
    (
      await pool.request().query(`
      SELECT PS_ID, PS_NO, ITM, PRD_NO, CAST(PRD_NAME AS nvarchar(200)) AS PRD_NAME, WH, QTY, UT, UP,
        AMTN_NET, TAX_RTO, TAX, CONVERT(varchar(10), EST_DD, 23) AS EST_DD, SUP_PRD_NO,
        CAST(REM AS nvarchar(200)) AS REM, OS_ID, OS_NO, QTY_RTN
      FROM TF_PSS WHERE PS_ID IN ('SA','SB') ORDER BY PS_NO, ITM
    `)
    ).recordset
  );

  await pool.close();

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM tf_pss').run();
    db.prepare('DELETE FROM mf_pss').run();
    db.prepare('DELETE FROM tf_pos').run();
    db.prepare('DELETE FROM mf_pos').run();
    db.prepare('DELETE FROM cust').run();
    db.prepare('DELETE FROM salm').run();
    db.prepare('DELETE FROM prdt').run();
    db.prepare('DELETE FROM indx').run();
    db.prepare('DELETE FROM my_wh').run();
    db.prepare('DELETE FROM dept').run();

    const insDept = db.prepare(
      'INSERT INTO dept (dep, name, eng_name, up, stop_dd) VALUES (?,?,?,?,?)'
    );
    for (const r of deptRows) {
      insDept.run(r.DEP, r.NAME, r.ENG_NAME, r.UP, r.STOP_DD);
    }

    const insIndx = db.prepare(
      'INSERT INTO indx (idx_no, name, idx_up, stop_dd, rem) VALUES (?,?,?,?,?)'
    );
    for (const r of indxRows) insIndx.run(r.IDX_NO, r.NAME, r.IDX_UP, r.STOP_DD, r.REM);

    const insWh = db.prepare(
      'INSERT INTO my_wh (wh, name, dep, up_wh, adr, tel_no, stop_dd, rem) VALUES (?,?,?,?,?,?,?,?)'
    );
    for (const r of whRows) {
      insWh.run(r.WH, r.NAME, r.DEP, r.UP_WH, r.ADR, r.TEL_NO, r.STOP_DD, r.REM);
    }

    const insPrdt = db.prepare(
      `INSERT INTO prdt (prd_no, snm, idx1, idx2, ut, name, spc, wh, valid_days, qty_min1, qty_max, rem, stop_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
    );
    for (const r of prdtRows) {
      insPrdt.run(
        r.PRD_NO, r.SNM, r.IDX1, r.IDX2, r.UT, r.NAME, r.SPC, r.WH,
        r.VALID_DAYS, r.QTY_MIN1, r.QTY_MAX, r.REM, r.STOP_ID
      );
    }

    const insCust = db.prepare(
      `INSERT INTO cust (cus_no, obj_id, name, snm, cus_are, cnt_man1, cnt_man2, tel1, tel2,
       uni_no, biz_dsc, adr2, end_dd, cur_id, id1_tax, sal_no, bnk_name, id_code, rem)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    );
    for (const r of custRows) {
      insCust.run(
        r.CUS_NO, r.OBJ_ID, r.NAME, r.SNM, r.CUS_ARE, r.CNT_MAN1, r.CNT_MAN2, r.TEL1, r.TEL2,
        r.UNI_NO, r.BIZ_DSC, r.ADR2, r.END_DD, r.CUR_ID, r.ID1_TAX, r.SAL_NO, r.BNK_NAME, r.ID_CODE, r.REM
      );
    }

    const insSalm = db.prepare(
      `INSERT INTO salm (sal_no, name, eng_name, name_py, sex, dep, pos, up_sal_no, tel1, tel2,
       e_mail, con_adr, id_num, bth, dut_in_d, dut_ot_d, rem) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    );
    for (const r of salmRows) {
      insSalm.run(
        r.SAL_NO, r.NAME, r.ENG_NAME, r.NAME_PY, r.SEX, r.DEP, r.POS, r.UP_SAL_NO,
        r.TEL1, r.TEL2, r.E_MAIL, r.CON_ADR, r.ID_NUM, r.BTH, r.DUT_IN_D, r.DUT_OT_D, r.REM
      );
    }

    const insMf = db.prepare(
      `INSERT INTO mf_pos (os_id, os_no, os_dd, cus_no, use_dep, sal_no, cus_os_no, bil_type, cur_id,
       tax_id, est_dd, rem, cls_mp_id, cls_id, dis_cnt, amtn_net, tax, bil_id, bil_no)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    );
    for (const r of mfPosRows) {
      insMf.run(
        r.OS_ID, r.OS_NO, r.OS_DD, r.CUS_NO, r.USE_DEP, r.SAL_NO, r.CUS_OS_NO, r.BIL_TYPE, r.CUR_ID,
        r.TAX_ID, r.EST_DD, r.REM, r.CLS_MP_ID, r.CLS_ID, r.DIS_CNT, r.AMTN_NET, r.TAX, r.BIL_ID, r.BIL_NO
      );
    }

    const insTf = db.prepare(
      `INSERT INTO tf_pos (os_id, os_no, itm, prd_no, prd_name, wh, qty, ut, up, amtn, tax_rto, tax,
       est_dd, sup_prd_no, rem, qty_ps) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    );
    for (const r of tfPosRows) {
      insTf.run(
        r.OS_ID, r.OS_NO, r.ITM, r.PRD_NO, r.PRD_NAME, r.WH, r.QTY, r.UT, r.UP, r.AMTN,
        r.TAX_RTO, r.TAX, r.EST_DD, r.SUP_PRD_NO, r.REM, r.QTY_PS
      );
    }

    const insMfPss = db.prepare(
      `INSERT INTO mf_pss (ps_id, ps_no, ps_dd, cus_no, dep, sal_no, cus_os_no, bil_type, cur_id,
       tax_id, os_id, os_no, rem, dis_cnt, amtn_net, tax)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    );
    for (const r of mfPssRows) {
      insMfPss.run(
        r.PS_ID, r.PS_NO, r.PS_DD, r.CUS_NO, r.DEP, r.SAL_NO, r.CUS_OS_NO, r.BIL_TYPE, r.CUR_ID,
        r.TAX_ID, r.OS_ID, r.OS_NO, r.REM, r.DIS_CNT, null, null
      );
    }

    const insTfPss = db.prepare(
      `INSERT INTO tf_pss (ps_id, ps_no, itm, prd_no, prd_name, wh, qty, ut, up, amtn_net, tax_rto, tax,
       est_dd, sup_prd_no, rem, os_id, os_no, src_itm, qty_rtn) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    );
    for (const r of tfPssRows) {
      insTfPss.run(
        r.PS_ID, r.PS_NO, r.ITM, r.PRD_NO, r.PRD_NAME, r.WH, r.QTY, r.UT, r.UP, r.AMTN_NET,
        r.TAX_RTO, r.TAX, r.EST_DD, r.SUP_PRD_NO, r.REM, r.OS_ID, r.OS_NO, null,
        r.PS_ID === 'SA' ? r.QTY_RTN ?? 0 : 0
      );
    }
  });
  tx();

  const saHead = mfPssRows.filter((r) => r.PS_ID === 'SA').length;
  const sbHead = mfPssRows.filter((r) => r.PS_ID === 'SB').length;
  const saLines = tfPssRows.filter((r) => r.PS_ID === 'SA').length;
  const sbLines = tfPssRows.filter((r) => r.PS_ID === 'SB').length;
  console.log(
    `导入完成: 部门 ${deptRows.length}，中类 ${indxRows.length}，仓库 ${whRows.length}，货品 ${prdtRows.length}，` +
      `客户 ${custRows.length}，员工 ${salmRows.length}，` +
      `受订单 ${mfPosRows.length}/${tfPosRows.length} 行，` +
      `销货单 ${saHead}/${saLines} 行，销货退回 ${sbHead}/${sbLines} 行`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
