# STD 全局标准文档

> 原则见 [DEV-00](../DEV_00_开发方案总纲.md) §4～§5。  
> **STD-03（UI）** 不单独维护，以 [DEV-04](../DEV_04_前端视觉与交互规范.md) 为准。

| 文档 | 状态 | 说明 |
|------|------|------|
| [01_全局字段字典_销售链.md](./01_全局字段字典_销售链.md) | ⏳ 待编写 | 首期表范围 + 字段行 |
| [02_全局菜单与路由规范.md](./02_全局菜单与路由规范.md) | ⏳ 待编写 | BACKLOG 60 + 路由/文件名 |
| [03_单据类别Lookup规范_BIL_SPC.md](./03_单据类别Lookup规范_BIL_SPC.md) | ✅ 已确认 | 销售链 BIL_SPC / BILTYPE_VOH；InvAD/CA/CB/CC |

## 与单菜单对照表关系

```text
STD-01（全局字典，销售链表…）
    ↓ 裁剪 + 截图补行 + 转入/回写
analysis/字段对照/<菜单>.md
    ↓ 您「字段确认」
client-vue 页面开发
```

## 首期「销售链」相关表（待填入 STD-01）

| 表 | 用途 | 关联菜单 |
|----|------|----------|
| INDX | 中类 | OthHZYQD |
| PRDT | 货品 | FasECA |
| CUST | 客户 | FasEA |
| DEPT | 部门 | FasED |
| MY_WH | 仓库 | FasECB |
| SALM | 员工 | FasEB |
| MF_POS / TF_POS | 受订单 | InvAD |
| MF_PSS / TF_PSS | 销货/销退 | InvCA / InvCB |
| BIL_SPC | 单据类别设定（Lookup 主档） | InvAD / InvCA / InvCB / InvCC |

扩展顺序：销售链定稿 → 采购链 → 生产 → 其余 44 表。
