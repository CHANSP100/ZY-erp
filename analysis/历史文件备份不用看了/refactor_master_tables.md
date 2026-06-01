# ERP 重构保留总表（菜单驱动）

保留菜单 **71** 个 | 保留表 **44** 张

| 表名 | 行数 | 中文名 | 角色 | 关联菜单 | 配对表头 | 配对表身 | 功能说明 |
|------|------|--------|------|----------|----------|----------|----------|
| PRDT | 10,100 | 货品基础资料库 | 主数据 | FasECA | - | - | Ʒ |
| TF_BOM | 9,384 | Mrp商品物料表表身档 | 表身 | FasECF | MF_BOM | TF_BOM | BOM䷽ |
| MF_BOM | 5,755 | Mrp商品物料表表头档 | 表头 | FasECF | MF_BOM | TF_BOM | BOM䷽ |
| TF_IJ | 1,361 | 调整表身档 | 表身 | DrpXH, INVXK, InvDE, InvDEA, InvDEB, InvDEE …(+8) | MF_IJ | TF_IJ | [] / ³׼ɱ |
| TF_MP1 | 212 | 库存不足量需求库 | 表身 | MrpABA | MF_MP | TF_MP1 | - |
| TF_POS | 93 | 采购受订表身档 | 表身 | InvAD, InvAE, InvAF, InvAG | MF_POS | TF_POS | ɹ / ɹ˻ |
| MF_MO | 80 | Mrp制令单表头档 | 表头 | MrpAC, MrpHSA | MF_MO | TF_MO | ڳ /  |
| TF_PSS | 72 | 进/销/退/折表身档 | 表身 | InvBA, InvBB, InvBC, InvCA, InvCB, InvCC | MF_PSS | TF_PSS | ˻ |
| TF_ML | 67 | 领料单表身档 | 表身 | MrpAG, MrpAGI, MrpAGJ, MrpAGK, MrpAGL, MrpAGM | MF_ML | TF_ML | ϵ / й |
| TF_MM0 | 66 | 缴库单表身 | 表身 | MrpAFC | MF_MM0 | TF_MM0 | ɿⵥ |
| TF_TW | 65 | 托外加工单表身档 | 表身 | MrpBE, MrpHSC | MF_TW | TF_TW | ӹ / ڳй |
| TF_MO | 59 | 制令单表身 | 表身 | MrpAC, MrpHSA | MF_MO | TF_MO | ڳ /  |
| MF_TW | 54 | 托外加工单表头档 | 表头 | MrpBE, MrpHSC | MF_TW | TF_TW | ӹ / ڳй |
| TF_TB | 50 | 托外加工缴回单表身档 | 表身 | MrpBF | MF_TB | TF_TB | ӹɻص |
| MF_TB | 49 | 托外加工缴回单表头档 | 表头 | MrpBF | MF_TB | TF_TB | ӹɻص |
| SALM | 46 | 业务员资料档 | 主数据 | FasEB | - | - | Ա |
| MF_YG | 44 | 人事薪资主库 | 表头 | WagBA | MF_YG | - | » |
| MF_POS | 42 | 采购受订表头档 | 表头 | InvAD, InvAE, InvAF, InvAG | MF_POS | TF_POS | ɹ / ɹ˻ |
| CUST | 38 | 客户/厂商库 | 主数据 | FasEA, POS_CUST | - | - | POSԱͻ / ͻ |
| MF_IJ | 32 | 调整主库 | 表头 | DrpXH, INVXK, InvDE, InvDEA, InvDEB, InvDEE …(+8) | MF_IJ | TF_IJ | [] / ³׼ɱ |
| MF_PSS | 29 | 进销货表头档 | 表头 | InvBA, InvBB, InvBC, InvCA, InvCB, InvCC | MF_PSS | TF_PSS | ˻ |
| TF_SQ | 26 | 请购单表身资料库 | 表身 | InvAQ | MF_SQ | TF_SQ | 빺 |
| MF_ML | 18 | 领料单表头档 | 表头 | MrpAG, MrpAGI, MrpAGJ, MrpAGK, MrpAGL, MrpAGM | MF_ML | TF_ML | ϵ / й |
| MF_MP | 17 | 生产需求/计划分析表头档 | 表头 | MrpABA | MF_MP | TF_MP1 | - |
| MF_MM0 | 16 | 缴库单表头 | 表头 | MrpAFC | MF_MM0 | TF_MM0 | ɿⵥ |
| INDX | 15 | 中类资料库 | 主数据 | OthHZYQD | - | - | / |
| TF_CS | 12 | 生产变更作业明细库 | 表身 | MrpAZ | MF_CS | TF_CS | ҵ |
| DEPT | 11 | 部门代号库 | 主数据 | FasED | - | - | Ŵ |
| MF_CS | 11 | 生产变更单主库 | 表头 | MrpAZ | MF_CS | TF_CS | ҵ |
| MF_SQ | 10 | 请购单表头资料库 | 表头 | InvAQ | MF_SQ | TF_SQ | 빺 |
| MY_WH | 9 | 库位库 | 主数据 | FasECB | - | - | ֿ |
| TF_BG | 5 | 采购/受订变更作业表身库 | 表身 | InvADA, InvAFC | MF_BG | TF_BG | ɹҵ / ܶҵ |
| MF_BG | 5 | 采购/受订变更作业表头库 | 表头 | InvADA, InvAFC | MF_BG | TF_BG | ɹҵ / ܶҵ |
| MF_DA | 2 | 订单变更分析表头档 | 表头 | MrpADA | MF_DA | TF_DA | ҵ |
| MF_WT | 2 | 批次托工单表头 | 表头 | MrpBEA | MF_WT | - | й |
| UP_DEF | 2 | 定价政策 | 主数据 | UP_DEF, UP_DEFA, Up_DefB | - | - | һɹ / һй |
| MF_TI | 1 | 入库单表头 | 表头 | FixT0, InvGA, InvGB, InvGC, InvGD, InvGE …(+5) | MF_TI | TF_TI | ƳƷͼ / Ƴͼ |
| TF_TC | 1 | 托外加工退回单表身 | 表身 | MrpBR | MF_TC | TF_TC | й˻ص |
| MF_HJ | 1 | 核价单表头资料库 | 表头 | InvHC, InvHD, MrpAHJ | MF_HJ | TF_HJ | ɹ˼۵ / й˼۵ |
| MF_TC | 1 | 托外加工退回单表头 | 表头 | MrpBR | MF_TC | TF_TC | й˻ص |
| TF_JH | 1 | 生产计划单表身档 | 表身 | MrpAA | MF_JH | TF_JH | ƻ |
| TF_HJ | 1 | 核价单表身资料库 | 表身 | InvHC, InvHD, MrpAHJ | MF_HJ | TF_HJ | ɹ˼۵ / й˼۵ |
| MF_JH | 1 | 生产计划单表头档 | 表头 | MrpAA | MF_JH | TF_JH | ƻ |
| TF_TI | 1 | 入库单表身 | 表身 | FixT0, InvGA, InvGB, InvGC, InvGD, InvGE …(+5) | MF_TI | TF_TI | ƳƷͼ / Ƴͼ |