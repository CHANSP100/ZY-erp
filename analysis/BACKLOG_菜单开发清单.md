# BACKLOG — 菜单逐项开发清单

> 工作方式：**一次只做一个菜单/功能**，您验收通过后再做下一项。

## 统计

| 项目 | 数量 |
|------|------|
| 原保留菜单 | 71 |
| 您标注「不要」 | 11 |
| **待开发菜单** | **60** |
| 待补充（后期） | 您口头说明 |

## 您标注「不要」的菜单（不做）

| 菜单代码 | 界面中文 | 表头 | 表身 |
|----------|----------|------|------|
| INVXK | 非生产补料单 | MF_IJ | TF_IJ |
| InvAE | 受订退回 | MF_POS | TF_POS |
| InvGD | 销货退回送检 | MF_TI | TF_TI |
| InvGE | 配送退回送检 | MF_TI | TF_TI |
| MrpAGH | 报废单[入废品仓] | MF_IJ | TF_IJ |
| MrpBEA | 批次托工单 | MF_WT |  |
| MrpBL | 非生产性送检来源单 | MF_TI | TF_TI |
| MrpBLD | 领料送检 | MF_TI | TF_TI |
| POS_CUST | POS会员客户 | CUST | POSCARD |
| SebCA | 设备维修领料单 | MF_IJ | TF_IJ |
| SebCB | 设备维修退料单 | MF_IJ | TF_IJ |

## 开发顺序（按阶段，阶段内从上到下）

| 状态 | 阶段 | 序号 | 菜单代码 | 界面中文 | 表头 | 表身 | 前置依赖 |
|------|------|------|----------|----------|------|------|----------|
| ✅已完成 | P1 | 1 | FasED | 部门代号 | DEPT |  |  |
| ✅已完成 | P1 | 2 | FasECB | 仓库资料 | MY_WH |  |  |
| ✅已完成 | P1 | 3 | OthHZYQD | 中类代号/工厂型体 | INDX |  |  |
| ✅已完成 | P1 | 4 | FasECA | 货品基础资料（Vue 验收✅ 2026-05-23） | PRDT |  | FasED,FasECB |
| ✅已完成 | P1 | 5 | FasEA | 客户厂商资料 | CUST |  | FasECA |
| ✅已完成 | P1 | 6 | FasEB | 员工资料 | SALM |  |  |
| ⏳待开发 | P1 | 7 | WagBA | 人事基本资料设置 | MF_YG |  |  |
| ✅已完成 | P2 | 8 | FasECF | BOM物料配方输入 | MF_BOM | TF_BOM | FasECA |
| ⏳待开发 | P3 | 9 | UP_DEF | 一般售价政策 | UP_DEF |  |  |
| ⏳待开发 | P3 | 10 | UP_DEFA | 一般采购政策 | UP_DEF |  |  |
| ⏳待开发 | P3 | 11 | Up_DefB | 一般托工定价政策 | UP_DEF |  |  |
| ✅已完成 | P4 | 12 | InvAQ | 请购单（Vue 验收✅ 2026-05-24） | MF_SQ | TF_SQ | FasECA,CUST |
| ✅已完成 | P4 | 13 | InvAD | 受订单 | MF_POS | TF_POS | FasECA,CUST |
| ✅已完成 | P4 | 14 | InvAF | 采购单（Vue 验收✅ 2026-05-24） | MF_POS | TF_POS | FasECA,CUST |
| ⏳待开发 | P4 | 15 | InvAG | 采购退回 | MF_POS | TF_POS | FasECA,CUST |
| ⏳待开发 | P4 | 16 | InvADA | 受订变更作业 | MF_BG | TF_BG | FasECA,CUST |
| ⏳待开发 | P4 | 17 | InvAFC | 采购变更作业 | MF_BG | TF_BG | FasECA,CUST |
| ⏳待开发 | P4 | 18 | InvHC | 采购核价单 | MF_HJ | TF_HJ | FasECA,CUST |
| ⏳待开发 | P4 | 19 | InvHD | 售价核价单 | MF_HJ | TF_HJ | FasECA,CUST |
| ✅已完成 | P5 | 20 | InvBA | 进货单（Vue 验收✅ 2026-05-24） | MF_PSS | TF_PSS |  |
| ✅已完成 | P5 | 21 | InvBB | 进货退回（Vue 验收✅ 2026-05-24） | MF_PSS | TF_PSS | InvBA |
| ✅已完成 | P5 | 22 | InvBC | 进货折让（Vue 验收✅ 2026-05-24） | MF_PSS | TF_PSS | InvBA |
| ✅已完成 | P5 | 23 | InvCA | 销货单（Vue 验收✅ 2026-05-23） | MF_PSS | TF_PSS | InvAD |
| ✅已完成 | P5 | 24 | InvCB | 销货退回（Vue 验收✅ 2026-05-24） | MF_PSS | TF_PSS | InvCA |
| ✅已完成 | P5 | 25 | InvCC | 销货折让（Vue 验收✅ 2026-05-23） | MF_PSS | TF_PSS | InvCA |
| ⏳待验收 | P6 | 26 | MrpABA | 生产需求分析单 | MF_MP | TF_MP1 | FasECF,BOM |
| ⏳待开发 | P6 | 27 | MrpAC | 制令单 | MF_MO | TF_MO | FasECF,BOM |
| ✅已完成 | P6 | 28 | MrpAG | 生产领料 | MF_ML | TF_ML | FasECF,BOM |
| ⏳待开发 | P6 | 29 | MrpAFC | 缴库单 | MF_MM0 | TF_MM0 | FasECF,BOM |
| ⏳待开发 | P6 | 30 | MrpAA | 生产计划 | MF_JH | TF_JH | FasECF,BOM |
| ⏳待开发 | P6 | 31 | MrpAGI | 生产退料 | MF_ML | TF_ML | FasECF,BOM |
| ⏳待开发 | P6 | 32 | MrpAGJ | 生产补料 | MF_ML | TF_ML | FasECF,BOM |
| ⏳待开发 | P7 | 33 | MrpBE | 托外加工单 | MF_TW | TF_TW |  |
| ⏳待开发 | P7 | 34 | MrpBF | 托外加工缴回单 | MF_TB | TF_TB |  |
| ⏳待开发 | P7 | 35 | MrpBR | 托工退回单 | MF_TC | TF_TC |  |
| ⏳待开发 | P7 | 36 | MrpAGK | 托工领料 | MF_ML | TF_ML |  |
| ⏳待开发 | P7 | 37 | MrpAGL | 托工退料 | MF_ML | TF_ML |  |
| ⏳待开发 | P7 | 38 | MrpAGM | 托工补料 | MF_ML | TF_ML |  |
| ⏳待开发 | P7 | 39 | MrpAHJ | 托工核价单 | MF_HJ | TF_HJ |  |
| ⏳待开发 | P8 | 40 | InvDE | 存货调整单 | MF_IJ | TF_IJ |  |
| ⏳待开发 | P8 | 41 | InvDEA | 月末成本调整单 | MF_IJ | TF_IJ |  |
| ⏳待开发 | P8 | 42 | InvDEB | 月初标准成本调整单 | MF_IJ | TF_IJ |  |
| ⏳待开发 | P8 | 43 | InvDEE | 库存报废单 | MF_IJ | TF_IJ |  |
| ⏳待开发 | P8 | 44 | InvXA | 生产领料[存货] | MF_IJ | TF_IJ |  |
| ⏳待开发 | P8 | 45 | InvXB | 生产退料[存货] | MF_IJ | TF_IJ |  |
| ⏳待开发 | P8 | 46 | InvXC | 成品缴库[存货] | MF_IJ | TF_IJ |  |
| ⏳待开发 | P8 | 47 | DrpXH | 期初调整单 | MF_IJ | TF_IJ |  |
| ⏳待开发 | P8 | 48 | MrpHSA | 期初制令单 | MF_MO | TF_MO |  |
| ⏳待开发 | P8 | 49 | MrpHSC | 期初托工单 | MF_TW | TF_TW |  |
| ⏳待开发 | P9 | 50 | MrpAZ | 生产变更作业 | MF_CS | TF_CS |  |
| ⏳待开发 | P9 | 51 | MrpADA | 订单变更分析作业 | MF_DA | TF_DA |  |
| ⏳待开发 | P9 | 52 | MrpAGA | 非生产领料 | MF_IJ | TF_IJ |  |
| ⏳待开发 | P9 | 53 | MrpAGG | 非生产退料 | MF_IJ | TF_IJ |  |
| ⏳待开发 | P9 | 54 | FixT0 | 固定资产入库单 | MF_TI | TF_TI |  |
| ⏳待开发 | P9 | 55 | InvGA | 进货送检 | MF_TI | TF_TI |  |
| ⏳待开发 | P9 | 56 | InvGB | 出货送检 | MF_TI | TF_TI |  |
| ⏳待开发 | P9 | 57 | InvGC | 存货送检 | MF_TI | TF_TI |  |
| ⏳待开发 | P9 | 58 | MrpBLA | 制成品送检 | MF_TI | TF_TI |  |
| ⏳待开发 | P9 | 59 | MrpBLB | 托工送检 | MF_TI | TF_TI |  |
| ⏳待开发 | P9 | 60 | MrpBLC | 退料送检 | MF_TI | TF_TI |  |

## 待补充菜单（您说后期再补）

| 界面中文 | 菜单代码 | 状态 |
|----------|----------|------|
| （待您提供） | | 📌待补充 |

## 单项完成定义（验收门禁）

每个菜单必须全部满足才可标 ✅：

1. **流程**：与您提供的截图/步骤一致（或已确认无截图）
2. **数据**：表头/表身可增删改查；DB_11 迁移或对接完成
3. **规则**：审核/状态/单号规则与旧系统一致（或书面变更）
4. **联调**：前置菜单数据可正常被引用
5. **您签字**：该菜单验收通过

## 状态图例

| 符号 | 含义 |
|------|------|
| ▶当前建议 | 建议下一个开发的菜单 |
| ⏳待开发 | 排队中 |
| 🔄开发中 | 进行中 |
| ✅已完成 | 您已验收 |
| ❌不要 | 您已剔除 |
| 📌待补充 | 后期新增 |