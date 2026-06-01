
CREATE VIEW VIEW_SO AS
SELECT     CONVERT(varchar(10), A.OS_DD, 23) AS 日期,  A.OS_NO AS 单号,C.SNM AS 客户, B.ITM AS 序号, B.CUS_OS_NO AS 客户单号, B.SUP_PRD_NO AS 客户品号, B.PRD_NO AS 品号, 
                      B.PRD_NAME AS 品名, D.SPC AS 规格, D.UT AS 单位, B.EST_DD AS 交期,F.NAME 仓库, DATEDIFF(day, B.EST_DD, GETDATE()) AS 逾期天数, B.QTY AS 数量, B.QTY_PS AS 已交数, B.QTY - ISNULL(B.QTY_PS, 0) 
                      AS 未交数, E.QTY_ON_WAY + E.QTY_ON_PRC + E.QTY - E.QTY_ON_RSV - E.QTY_ON_ODR AS 可用量, E.QTY_ON_ODR AS 受订量, E.QTY_ON_WAY AS 在途量, E.QTY_ON_PRC AS 在制量, 
                      E.QTY_ON_RSV AS 未领量, E.QTY AS 库存量,CASE WHEN A.OS_ID = 'SO' AND A.CLS_ID = 'F' AND (B.QTY - ISNULL(B.QTY_PS, 0) > 0) THEN '未结案' ELSE '结案' END 结案否
FROM         dbo.MF_POS AS A LEFT OUTER JOIN
                      dbo.TF_POS AS B ON A.OS_NO = B.OS_NO LEFT OUTER JOIN
                      dbo.CUST AS C ON A.CUS_NO = C.CUS_NO LEFT OUTER JOIN
                      dbo.PRDT AS D ON B.PRD_NO = D.PRD_NO LEFT OUTER JOIN
                      dbo.PRDT1 AS E ON B.PRD_NO = E.PRD_NO AND B.WH = E.WH
                      LEFT JOIN  MY_WH F ON B.WH=F.WH 
CREATE VIEW VIEW_PO AS                      
           SELECT     A.OS_NO AS 单号, CONVERT(varchar(10), A.OS_DD, 23) AS 日期, C.SNM AS 供应商, B.ITM AS 序号, B.PRD_NO AS 品号, B.PRD_NAME AS 品名, D.SPC AS 规格, D.UT AS 单位, B.EST_DD AS 交期, 
                      DATEDIFF(day, B.EST_DD, GETDATE()) AS 逾期天数, B.QTY AS 数量, B.QTY_PS AS 已交数, B.QTY - ISNULL(B.QTY_PS, 0) AS 未交数, 
                      E.QTY_ON_WAY + E.QTY_ON_PRC + E.QTY - E.QTY_ON_RSV - E.QTY_ON_ODR AS 可用量, E.QTY_ON_ODR AS 受订量, E.QTY_ON_WAY AS 在途量, E.QTY_ON_PRC AS 在制量, 
                      E.QTY_ON_RSV AS 未领量, E.QTY AS 库存量,CASE WHEN A.OS_ID = 'PO' AND A.CLS_ID = 'F' AND (B.QTY - ISNULL(B.QTY_PS, 0) > 0) THEN '未结案' ELSE '结案' END 结案否
FROM         dbo.MF_POS AS A LEFT OUTER JOIN
                      dbo.TF_POS AS B ON A.OS_NO = B.OS_NO LEFT OUTER JOIN
                      dbo.CUST AS C ON A.CUS_NO = C.CUS_NO LEFT OUTER JOIN
                      dbo.PRDT AS D ON B.PRD_NO = D.PRD_NO LEFT OUTER JOIN
                      dbo.PRDT1 AS E ON B.PRD_NO = E.PRD_NO AND B.WH = E.WH
                      
CREATE VIEW VIEW_MO AS                      
                      
                      SELECT     CONVERT(varchar(10), A.MO_DD, 23) AS 日期, A.MO_NO AS 制令单号, C.SNM AS 客户简称, A.MRP_NO AS 品号, D.NAME AS 品名, D.SPC AS 规格, B.SUP_PRD_NO AS 客户料号, 
                      B.CUS_OS_NO AS 客户订单号, D.UT AS 单位, A.QTY AS 生产数量, A.QTY_FIN AS 缴库数量, A.QTY - A.QTY_FIN AS 生产欠数, A.SO_NO AS 销售订单, B1.CLS_ID AS 订单结案否, A.EST_ITM AS 项次, 
                      B.QTY AS 订单数量, B.QTY_PS AS 销货数量, B.QTY - B.QTY_PS AS 订单欠数, E.QTY_ON_WAY + E.QTY_ON_PRC + E.QTY - E.QTY_ON_RSV - E.QTY_ON_ODR AS 可用量, 
                      E.QTY_ON_ODR AS 受订量, E.QTY_ON_WAY AS 在途量, E.QTY_ON_PRC AS 在制量, E.QTY_ON_RSV AS 未领量, E.QTY AS 库存量
FROM         dbo.MF_MO AS A LEFT OUTER JOIN
                      dbo.TF_POS AS B ON A.SO_NO = B.OS_NO AND A.EST_ITM = B.ITM LEFT OUTER JOIN
                      dbo.MF_POS AS B1 ON A.SO_NO = B1.OS_NO LEFT OUTER JOIN
                      dbo.CUST AS C ON A.CUS_NO = C.CUS_NO LEFT OUTER JOIN
                      dbo.PRDT AS D ON A.MRP_NO = D.PRD_NO LEFT OUTER JOIN
                      dbo.PRDT1 AS E ON A.MRP_NO = E.PRD_NO AND A.WH = E.WH
WHERE     (B.OS_ID = 'SO') AND (A.CLOSE_ID <> 'T') AND (B1.OS_ID = 'SO')
                      
  sql = "select * from view_os where 日期 >= '" & tj & "'" & " AND 日期<='" & tj1 & "'" & "AND 结案否 = '" & TJ3 & "'"                    
                      
                      
 
                      
                      
                      


