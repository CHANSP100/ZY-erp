# STD-03 单据类别 Lookup 规范（BIL_SPC）

> **状态：已确认（用户口述 + SQL 跟踪，2026-05-27）**  
> 原则：业务逻辑 1:1 对齐 SUNLIKE 9.0；禁止套用金蝶/用友/通用 ERP 单据类别模型。  
> UI 组件：`LookupField` + `LookupModal`（见 DEV-04）。  
> **说明：** 本文件编号 STD-03 指「基础 Lookup 规范」；界面总则仍以 [DEV-04](../DEV_04_前端视觉与交互规范.md) 为准。

---

## 1. 跟踪依据（原生 9.0）

在 **销售受订单（InvAD）** 表头「单据类别」弹窗中 **新增** 一条类别，代号 **E6** 时，跟踪到的存盘 SQL 为：

```sql
-- ① 主档：单据类别设定
INSERT INTO BIL_SPC (BIL_ID, SPC_ID, SPC_NO, NAME, REM)
VALUES ('SA', 'OB', 'E6', 'E6', '')

-- ② 凭证模版映射（受订单）
DELETE FROM BILTYPE_VOH
 WHERE BIL_ID = 'SA' AND SPC_ID = 'OB' AND SPC_NO = 'E6' AND ID = 'SO'

INSERT INTO BILTYPE_VOH (BIL_ID, SPC_ID, SPC_NO, ID, VOH_ID)
VALUES ('SA', 'OB', 'E6', 'SO', '')
```

**现象（用户确认）：** 新增 E6 后，下列菜单的「单据类别」开窗 **均可选到 E6**：

| 菜单代码 | 界面中文 | 单据 ID | 表头表 |
|----------|----------|---------|--------|
| InvAD | 销售受订单 | `SO` | MF_POS |
| InvCA | 销货单 | `SA` | MF_PSS |
| InvCB | 销货退回 | `SB` | MF_PSS |
| InvCC | 销货折让 | `SD` | MF_PSS |

口述补充（`旧ERP文件/04受订单.txt`）：单据类别可开窗选择基础表；维护入口在 **开窗弹窗 →「编辑」→ 二级维护弹窗**（见 §3.5）。

**UI 口述（2026-05-27，用户确认）：** 销售订单（受订单 InvAD）表头「单据类别」为开窗选择；一级弹窗含 **「编辑」「选取」**；点 **编辑** 打开二级 **单据类型增删改查** 弹窗，含 **新增、删除** 按钮，可维护单据类型。

---

## 2. 数据模型

### 2.1 BIL_SPC — 单据类别设定（Lookup 主数据源）

| 序 | 字段 | 类型 | 说明 |
|----|------|------|------|
| 1 | BIL_ID | char(2) | 来源单识别码 / 模块标识 |
| 2 | SPC_ID | char(2) | 特定 ID（销售链单据类别固定 `OB`） |
| 3 | SPC_NO | char(12) | 类别代号 → 写入各单表头 **BIL_TYPE** |
| 4 | NAME | nvarchar(100) | 名称（开窗显示） |
| 5 | REM | nvarchar(100) | 备注 |
| 6 | MRK | char(8) | 品牌（跟踪样例未写入，存盘时按 9.0 是否必填再核） |

**主键逻辑（复合）：** `BIL_ID + SPC_ID + SPC_NO`

### 2.2 BILTYPE_VOH — 单据类别凭证模版设定（二期）

| 序 | 字段 | 类型 | 说明 |
|----|------|------|------|
| 1 | BIL_ID | char(2) | 同 BIL_SPC |
| 2 | SPC_ID | char(2) | 同 BIL_SPC |
| 3 | SPC_NO | char(4) | 类别代号 |
| 4 | ID | char(2) | 单据 ID（如 SO / SA / SB / SD） |
| 5 | VOH_ID | char(2) | 凭证模版代号；空串 = 未绑定 |

**作用：** 按「模块 + 类别 + 具体单据种类」维护凭证模版；**不决定** 类别是否出现在 Lookup 列表。  
**本期：** Lookup 与新增类别 **仅实现 BIL_SPC**；BILTYPE_VOH 随凭证模版功能（对照表二期 VOH_* 字段）再做。

### 2.3 与 BIL_TYPE 表的区别

库中存在 `BIL_TYPE`（单据类别使用权…），样例库 **无数据**。  
**销售链单据类别开窗以 `BIL_SPC` 为准**（与 SQL 跟踪一致），不得混用 `BIL_TYPE` 作为 Lookup 源。

### 2.4 各单表头存值

| 物理字段 | 存什么 | 精度 |
|----------|--------|------|
| MF_POS.BIL_TYPE | BIL_SPC.SPC_NO | varchar(2) 库注释；样例 E6 为 2 位 |
| MF_PSS.BIL_TYPE | 同上 | 同上 |

---

## 3. 销售链 Lookup 规则（强制）

### 3.1 开窗列表条件

```
BIL_ID = 'SA'
AND SPC_ID = 'OB'
```

**不按** `OS_ID` / `PS_ID` 过滤；销售链四单 **共用同一列表**。

### 3.2 一级弹窗 — 开窗选择（LookupDialog）

表头 `BIL_TYPE` 使用 `LookupField` 触发；弹窗对标 SUNLIKE **开窗选择**，交互模式 **`interaction: 'confirm'`**（单击行高亮，须点 **选取** 才回填）。

| 元素 | 说明 |
|------|------|
| 标题 | 如「选择单据类别」 |
| 模糊查询 | 对 `SPC_NO`、`NAME`（及可选 `REM`） |
| 列表列 | 代号（SPC_NO）、名称（NAME）、备注（REM） |
| 底栏按钮（顺序） | **编辑** → 取消 → **选取**（主按钮） |

**选取：** 将当前高亮行的 `SPC_NO` 写入表头 `BIL_TYPE`，关闭一级弹窗。  
**编辑：** 打开二级维护弹窗（§3.5）；**不关闭** 一级弹窗；维护保存成功后 **刷新一级列表**。

> 实现参考：`PrdtUtLookupDialog.vue`（一级 `LookupDialog` + `footer-before` 插槽放「编辑」）。

### 3.3 开窗列（列表字段）

| 列 | 字段 | 说明 |
|----|------|------|
| 代号 | SPC_NO | 选中后写入表头 BIL_TYPE |
| 名称 | NAME | 展示 |
| 备注 | REM | 展示 |

### 3.4 默认值与带入

| 场景 | 规则 |
|------|------|
| 受订单新建 | 可选；无强制默认（以参数/环境为准，未跟踪到则留空） |
| 销货单等从受订单转入 | **从源单表头带出 BIL_TYPE**（`旧ERP文件/05销货单.txt` 第 23 行） |
| 已审核单 | 表头只读，Lookup 禁用（DEV-01 单据状态） |

### 3.5 二级弹窗 — 单据类型维护（增删改查）

由一级弹窗 **「编辑」** 打开；`append-to-body`，标题如 **「单据类别维护」**。

#### 工具栏

| 按钮 | 行为 |
|------|------|
| **新增** | 表格追加一行空记录，可录入代号/名称/备注 |
| **删除** | 删除当前选中行（或勾选行）；已存盘记录调用 `DELETE` API |

#### 表格（可编辑）

| 列 | 字段 | 必填 | 说明 |
|----|------|------|------|
| 代号 | SPC_NO | 是 | 同 `BIL_ID+SPC_ID` 下唯一；存盘写入 BIL_TYPE |
| 名称 | NAME | 否 | 默认可与代号相同（跟踪样例 E6/E6） |
| 备注 | REM | 否 | |

#### 底栏

| 按钮 | 行为 |
|------|------|
| 取消 | 关闭二级弹窗，不刷新一级 |
| 保存 | 批量提交增/改/删；成功后关闭二级弹窗，**刷新一级 Lookup 列表** |

#### 存盘与后端（对齐 §1 SQL）

| 操作 | SQL / API |
|------|-----------|
| 新增 | `INSERT BIL_SPC (BIL_ID,SPC_ID,SPC_NO,NAME,REM)`，固定 `BIL_ID='SA'`, `SPC_ID='OB'` |
| 修改 | `UPDATE BIL_SPC SET NAME=?, REM=? WHERE …`（代号是否可改：**待旧 ERP 跟踪**） |
| 删除 | `DELETE BIL_SPC WHERE …`；若已有单据引用该 `SPC_NO`，**禁止删除或提示**（规则待跟踪） |

新增单条时，9.0 另写 `BILTYPE_VOH`（受订单 `ID='SO'`）；**本期 Web 可不写 VOH**，与 §2.2 一致。

#### 权限与状态

| 场景 | 规则 |
|------|------|
| 单据已审核 | 一级 Lookup 禁用，**不可** 打开维护弹窗 |
| 单据草稿/新建 | 允许选取与维护 |

---

## 4. 适用菜单与字段对照引用

以下菜单表头 **BIL_TYPE** 须改为 **Lookup（BIL_SPC）**，不得再用纯文本框：

| 菜单 | 对照表 | 阶段 |
|------|--------|------|
| InvAD 受订单 | `analysis/字段对照/受订单.md` | 本期 |
| InvCA 销货单 | `analysis/字段对照/销货单.md` | 本期 |
| InvCB 销货退回 | `analysis/字段对照/销货退回.md` | 本期 |
| InvCC 销货折让 | `analysis/字段对照/销货折让.md` | 本期 |

字段配置：`widget: 'lookup'`，lookup 类型标识建议 `bilSpcSales`（实现时与 `config/fields/*.ts` 统一）。

---

## 5. 采购链 / 生产链（待补充）

本次 SQL 跟踪仅覆盖 **销售链 `BIL_ID='SA'`**。  
进货单、采购单等应有 **独立 BIL_ID + SPC_ID** 组合，需另行在旧 ERP 跟踪后追加本节，**禁止猜测**。

| 链 | BIL_ID | SPC_ID | 状态 |
|----|--------|--------|------|
| 销售 | SA | OB | ✅ 本文已确认 |
| 采购 | — | — | ⏳ 待跟踪 |
| 生产 | — | — | ⏳ 待跟踪 |

---

## 6. erp-new 实现清单（开发时用，本文不写代码）

### 6.1 后端

- [ ] SQLite 表 `bil_spc`（字段对齐 §2.1）  
- [ ] `GET /api/bil-spc?bil_id=SA&spc_id=OB` — 一级 Lookup 列表  
- [ ] `POST /api/bil-spc` — 新增单条  
- [ ] `PUT /api/bil-spc/:spc_no` — 修改（若允许改名称/备注）  
- [ ] `DELETE /api/bil-spc/:spc_no` — 删除（含引用校验，规则待跟踪）  
- [ ] 或 `POST /api/bil-spc/batch` — 二级弹窗批量保存（增删改一次提交）  
- [ ] 种子数据：从旧库迁移或手工维护常用类别  

### 6.2 前端

- [ ] `LOOKUP_PRESETS.bilSpcSales`：`interaction: 'confirm'`，列 SPC_NO/NAME/REM  
- [ ] `BilSpcSalesLookupDialog`：一级 Lookup + 底栏 **编辑 / 选取**（对标 `PrdtUtLookupDialog`）  
- [ ] `BilSpcEditDialog`：二级维护，工具栏 **新增 / 删除**，表格可编辑，底栏 **保存**  
- [ ] 替换 InvAD / InvCA / InvCB / InvCC 表头 BIL_TYPE 文本框  
- [ ] 转入单逻辑：销货单等从源单复制 `bil_type`  

### 6.3 验收要点

1. 受订单表头点「…」→ 一级弹窗有 **编辑、选取**；选行后点选取回填 `BIL_TYPE`。  
2. 点 **编辑** → 二级弹窗可 **新增、删除** 类别；保存后一级列表刷新，四单共用可见新类别。  
3. 表头存盘值为 SPC_NO，不是 NAME。  
4. 从受订单转入销货单，BIL_TYPE 与源单一致。  

---

## 7. 变更记录

| 日期 | 说明 |
|------|------|
| 2026-05-27 | 初稿：用户确认 E6、BIL_SPC INSERT、销折让=InvCC/SD、四单共用 Lookup |
| 2026-05-27 | 补充 UI：一级开窗（编辑+选取）→ 二级维护（新增+删除）；对标 PrdtUtLookupDialog |
