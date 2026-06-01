# 字段配置（与对照表对齐）

页面 UI 的**查询 / 列表 / 表单**字段顺序、中文标签、数据库字段名，以本目录配置为准，并与 `analysis/字段对照/*.md` 或 `docs/*_功能说明.md` 保持同步。

**业务逻辑**（编码规则、审核流转、联动计算、停用/只读等）以 [docs/DEV_01_SUNLIKE9_核心业务基准规范.md](../../../docs/DEV_01_SUNLIKE9_核心业务基准规范.md) 为唯一基准；本目录仅负责字段映射与控件类型，不定义业务规则。

| 文件 | 对照表 | 页面 |
|------|--------|------|
| `fasIndx.ts` | `01_中类_功能说明.md` | `/indx` |
| `fasECA.ts` | `货品.md` / `02_货品` | `/prdt` |
| `invBill.ts` → `INV_CA` | `销货单.md` | `/sa` |
| `invBill.ts` → `INV_CC` | `销货折让.md` | `/invcc` |

## 修改流程

1. 先改 `analysis/字段对照/<菜单>.md`（本期表：# 序号、中文名称、查询/列表/表单）
2. 再改本目录对应 `*.ts` 中同名字段的 `order`、`label`、`query`/`list`/`form`
3. 页面通过 `pickQuery` / `pickList` / `pickForm` 自动取列；表单项带 `data-field="PS_NO"` 便于核对库字段

## 字段项说明

```ts
{
  order: 1,           // 对照表 #
  dbField: 'PS_NO',   // 库字段名（大写）
  key: 'ps_no',       // 前端/API 属性
  label: '单号',      // 界面标签
  query: true,        // 顶栏查询
  list: true,         // 中间列表列
  form: true,         // 编辑弹窗
  widget: 'lookup',   // 控件类型
  area: 'head',       // head | line | sub
}
```
