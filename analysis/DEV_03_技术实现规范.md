# DEV-03 技术实现规范

> 原型栈：`erp-new/`。正式环境技术选型以 CONFIRM_05 为准；在此之前本规范约束 Web 原型代码。

---

## 1. 目录结构

```
erp-new/
  client/src/           # 目标：Vue 3 + Element Plus（见 DEV-04）
    views/              # 页面
    components/         # LookupField、LookupDialog 等
    layouts/            # MainLayout.vue
    api/                # 请求封装
  server/
    db.js           # SQLite schema + row mapper + 单号生成
    index.js        # REST 路由
    import_from_db11.js
  docs/             # 功能说明 + 验收（每菜单一份）
analysis/
  字段对照/         # 字段对照表（开发前必存在且已确认）
```

---

## 2. 命名约定

| 项 | 规则 | 例 |
|----|------|-----|
| 菜单代码 | 旧系统 DATAEX | InvCA, FasECA |
| 路由 | 短路径，单据可用 bil_id | `/sa`, `/so`, `/cust` |
| 页面文件 | `<语义>.vue` 或 `<语义>Page.vue` | Cust.vue, SalesOrder.vue |
| API 路径 | REST 复数、kebab | `/api/sales-shipments` |
| SQLite 表名 | 小写，贴近旧表 | mf_pss, tf_pss, prdt |

---

## 3. UI 规范

### 3.1 UI 视觉与交互

**完整规范见 [DEV_04_前端视觉与交互规范.md](./DEV_04_前端视觉与交互规范.md)**（色彩、顶+左布局、三种页面模板、**Element Plus** 主题）。

本节摘要：

### 3.2 开窗（已拍板）

- **页面入口**：`LookupPicker`（`preset` + `:data` / `loader`）
- **底层组件**：`LookupField`（可输入 + 联想下拉 + 「…」）+ `LookupDialog`（弹窗浏览）
- **交互**：
  - 可直接输入代号；输入时按 `searchKeys` 模糊联想
  - 选中联想项 / 失焦精确匹配 → 写入编码并 `@select(row)` 供联动回填
  - 「…」→ 打开 LookupDialog，单击（或确认）选中
- **配置**：`client-vue/src/config/lookups/presets.ts`（dept / cust / product / warehouse 等）
- 表身品号列：`ErpBillLineTable` 传 `:lookup-products` + `@select-product`
- **Enter 跳栏**：表头/表身容器用 `ErpEnterNavZone`（见 DEV-04 §6.6）
- 表身需要多选时再单独设计（受订单 txt 提到品号多选）

### 3.3 基础资料页

- 类型 A：**页内**左表单 + 右列表（见 DEV-04 §5.1）
- 类型 C：树 + 列表 + Modal（部门、中类）

### 3.4 单据页

- 上表头 Form + 下表身 Table（可编辑列）
- 右侧或下方：单据列表
- 表头：单号、日期、客户、转入单号、业务员、部门、币别、扣税、备注等 **按对照表**
- 表身：按对照表列顺序
- 合计区：未税、税额、合计

### 3.5 禁止

- 未在对照表中的栏位不得长期保留「临时 Input」
- 不得用 plain Input 代替应对照表标「开窗」的栏

---

## 4. API 规范

### 4.1 基础资料 CRUD

```
GET    /api/<resource>           # 列表
GET    /api/<resource>/:id       # 单笔
POST   /api/<resource>           # 新增
PUT    /api/<resource>/:id       # 修改
```

### 4.2 单据

```
GET    /api/<bills>/next-no
GET    /api/<bills>              # 列表（按 ps_id / os_id 过滤）
GET    /api/<bills>/:no          # 表头+表身
POST   /api/<bills>              # 存盘（含回写）
PUT    /api/<bills>/:no          # 修改
GET    /api/<source>/open        # 可转入单列表
GET    /api/<source>/:no/<action>-lines  # 可转入明细
```

### 4.3 错误响应

```json
{ "error": "中文说明" }
```

HTTP：400 校验、404 不存在、409 重复。

---

## 5. 数据库（SQLite 原型）

- 字段以对照表「本期做」为准建列
- 旧库补列用 `ALTER TABLE` 迁移块（见 `db.js` 现有模式）
- 导入脚本从 DB_11 拉样本；**按 ps_id / os_id 分单据类型**

---

## 6. 环境

| 项 | 要求 |
|----|------|
| Node | 建议 **22 LTS**（`better-sqlite3` 原生模块需 rebuild） |
| 启动 | `server`: `npm start`；`client`: `npm run dev` |
| 换 Node 版本后 | `cd erp-new/server && npm rebuild better-sqlite3` |

---

## 7. Git

- **不主动 commit**；仅用户要求时提交

---

## 8. 与字段对照表的关系

```
字段对照表（已确认） → db 列 → API 字段 → 前端 Form/Table 列
```

任何一层缺栏，视为 **未完成阶段 ④**，不得标验收通过。
