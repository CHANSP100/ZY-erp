# CodeX 项目交接文档

> **项目**：SUNLIKE 9.0 旧 ERP → Web 新系统（`erp-new/`）  
> **交接日期**：2026-05-26  
> **读者**：CodeX / 接手 AI 或开发者  
> **读完本文 + `Project_Status.md` 即可开工**

---

## 1. 一句话说明

把天心 **SUNLIKE 9.0**（Delphi + SQL Server）按菜单逐项复刻为 Web ERP：**UI 对标金蝶云星空，业务逻辑 1:1 原生 SUNLIKE，禁止套用金蝶/用友/通用 ERP 逻辑**。一个菜单 = 一个交付单元，字段对照表确认后再写代码。

---

## 2. 接手后先读这 5 个文件

| 顺序 | 文件 | 用途 |
|------|------|------|
| 1 | **`AGENTS.md`** | AI 协作门禁、开发顺序、禁止事项 |
| 2 | **`Project_Status.md`** | 当前进度、已验收菜单、下一步 |
| 3 | **`Project_Brain.md`** | 长期拍板决策（勿随意改） |
| 4 | **`analysis/DEV_00_开发方案总纲.md`** | 原则层最高规范 |
| 5 | **`erp-new/docs/DEV_01_SUNLIKE9_核心业务基准规范.md`** | 业务逻辑唯一基准（精度、审核、联动、库存） |

做具体菜单前再读：`analysis/字段对照/<菜单>.md`（须 **已确认**）。

---

## 3. 技术栈与运行

| 层 | 技术 | 路径 |
|----|------|------|
| 前端（正式） | Vue 3 + Element Plus + Vite | `erp-new/client-vue/` |
| 后端 | Node.js + Express | `erp-new/server/` |
| 业务库 | **MSSQL**（Sunlike 库，可配置） | `server/data/db-connection.json` |
| 本地元数据 | SQLite（列配置、扩展字段元数据、权限缓存等） | `server/db.js` |
| 旧 React 原型 | 仅参考，**不再新增页面** | `erp-new/client/` |

### 启动

```powershell
# 后端 API（默认 3001）
cd erp-new\server
npm install
npm start

# 前端（默认 5173，代理 /api → 3001）
cd erp-new\client-vue
npm install
npm run dev
```

- 登录页：`http://localhost:5173/login`
- 改 `server/routes/*.js` 后需 **重启后端** 才生效
- Node 建议 **22 LTS**；换 Node 版本后执行 `npm rebuild better-sqlite3`

---

## 4. 目录地图

```
cursor/                          ← 项目根（本仓库）
├── CODEX_HANDOVER.md            ← 本文
├── AGENTS.md                    ← AI 协作总规则
├── Project_Brain.md             ← 长期决策
├── Project_Status.md            ← 当前进度（常更新）
├── .cursor/rules/               ← Cursor 自动注入规则（CodeX 建议同步）
│   └── sunlike9-dev01-baseline.mdc
├── .cursorignore                ← AI 索引排除（node_modules 等）
│
├── analysis/                    ← 方案 & 字段资料（开发前必读）
│   ├── DEV_00～DEV_07            ← 开发规范
│   ├── STD/                     ← 全局字段/菜单标准
│   ├── 字段对照/*.md            ← 每菜单字段对照（门禁）
│   ├── BACKLOG_菜单开发清单.md  ← 60 项菜单状态
│   └── dict_fld_keep44.txt      ← 44 表字段字典
│
├── 旧ERP文件/                   ← 截图、口述 txt、旧窗体说明
│
└── erp-new/                     ← 可运行代码
    ├── client-vue/src/
    │   ├── views/               ← 各菜单页面
    │   ├── components/erp/      ← 公共 UI 组件
    │   ├── config/fields/       ← 字段配置（与对照表对齐）
    │   └── config/detailGridRegistry.ts
    ├── server/
    │   ├── routes/              ← API 路由
    │   ├── menuTableRegistry.js ← 菜单→表→_Z 扩展表映射
    │   ├── extField*.js         ← 扩展字段读写
    │   └── billExtFieldHook.js  ← 单据/档案扩展字段钩子
    └── docs/                    ← 已实现功能说明 & DEV_01 业务基准
```

**`analysis/` 里大量 `db11_*.txt`、`gen_*.py` 是早期摸底导出，日常开发不用看。**

---

## 5. 已验收 / 已在跑的功能（2026-05-25 前）

### 进销九单 + 请购 + 权限（均已验收）

| 菜单 | 代码 | 路由 | 前端页面 |
|------|------|------|----------|
| 销售订单（受订单） | InvAD | `/so` | `SalesOrderPage.vue` |
| 销货单 | InvCA | `/sa` | `SalesShipmentPage.vue` |
| 销货折让 | InvCC | `/invcc` | `SalesAllowancePage.vue` |
| 销货退回 | InvCB | `/sb` | `SalesReturnPage.vue` |
| 请购单 | InvAQ | `/sq` | `PurchaseRequisitionPage.vue` |
| 采购单 | InvAF | `/po` | `PurchaseOrderPage.vue` |
| 进货单 | InvBA | `/pc` | `PurchaseReceiptPage.vue` |
| 进货退回 | InvBB | `/pb` | `PurchaseReturnPage.vue` |
| 进货折让 | InvBC | `/invbc` | `PurchaseAllowancePage.vue` |
| 权限设置 | SysAuth | `/sys/auth` | `PermissionSettingsPage.vue` |

单据链索引：`analysis/DEV_05_进销单据链_九单验收索引.md`

### 基础资料（部分已验收，部分在持续改 UI 骨架）

| 菜单 | 代码 | 路由 | 说明 |
|------|------|------|------|
| 中类 | OthHZYQD | `/indx` | 已套「中类骨架」 |
| 货品 | FasECA | `/prdt` | 中类树 + 骨架 ✅ 验收 |
| 客户厂商 | FasEA | `/cust` | 区域树 + 骨架 |
| 部门 | FasED | `/dept` | 部门树 + 骨架 ✅ 验收 |
| 仓库 | FasECB | `/wh` | 仓库树（up_wh）+ 骨架 |
| 员工 | FasEB | `/salm` | 部门树 + 骨架 |

菜单注册：`client-vue/src/config/menuRegistry.ts`（与 `server/permissions.js` PGM 一致）

### 扩展字段 / _Z 表（DEV-07 ✅ 验收）

- 方案：`analysis/DEV_07_扩展字段与_Z表_方案说明.md`
- 说明：`erp-new/docs/13_扩展字段与_Z表_功能说明.md`
- 九单 + 请购 + 档案：存盘/读取已接 `saveBillExtFields` / `mergeBillExtFields`
- 管理员可在表头/表身/网格右键「添加字段」，自动 `ALTER TABLE` _Z 表

### 已知待办（见 Project_Status）

- DEV-07：列表页扩展列展示完善；已审核单据扩展字段只读
- **多人同时编辑同一单据**：**未做**乐观锁/锁单（后存盘覆盖先存盘）；`LOCK_MAN`/`LOCK_DATE` 在对照表里标为二期

---

## 6. UI 两套骨架（后续菜单照抄）

### A. 档案类骨架（中类 / 货品 / 部门 / 客户 / 仓库 / 员工）

参考：`client-vue/src/views/IndxPage.vue`

| 要素 | 实现 |
|------|------|
| 布局 | `ErpBasePage` + `hide-head` |
| 左侧树 | `ErpCategoryTree`（中类树 / 部门树 / 区域树 / 仓库 up_wh 树等） |
| 工具栏 | `#main-toolbar`：新增 + 导出（`erp-btn-primary`） |
| 表格 | `ErpDetailGrid`（列头筛选、排序、列设置、框选复制） |
| 编辑 | `ErpEditDialog` + 字段配置 `config/fields/*.ts` |
| 扩展 | `ErpArchiveExtFields` 或 `ErpExtFieldZone` |

**不要**在档案列表页加 `ErpQueryBar`（已统一去掉，靠树 + 网格列筛选）。

### B. 单据类骨架（以销货单 InvCA 为准）

参考：`SalesShipmentPage.vue` + `SalesOrderPage.vue`（列表模式）

| 要素 | 实现 |
|------|------|
| 列表 | 工具栏（新增/导出/打印/刷新/日期查询）+ Tab（单据列表 / 明细） |
| 表格 | `ErpDetailGrid`（`InvAD_BILL` / `InvAD` 等 menuCode） |
| 编辑 | `SalesOrderFormView` 或 `ErpKingdeeBillEdit` 系 |
| 表身 | `ErpBillLineTable` / kingdee 版 |
| 扩展 | `ErpBillHeadExtFields` + 表身扩展列 |

**用户拍板**：以后大部分单据 **以销货单骨架套用**；表头表身 API 结构固定（`{ head, lines }`）。

销售订单列表页近期调整：去掉中间 `kd-so-query` 查询区；导出/打印/刷新按钮与新增同为主色样式。

---

## 7. 开发门禁（必须遵守）

```
资料齐 → analysis/字段对照/<菜单>.md
      → 用户确认（文件头状态 =「已确认」，或口头「按这个加」）
      → erp-new 开发
      → erp-new/docs/NN_菜单_功能说明.md
      → Project_Status 标待验收
      → 用户「通过/不通过」
```

| 规则 | 说明 |
|------|------|
| 未字段确认 | **不得**写该菜单页面/API（只能改 analysis） |
| 一次一个菜单 | 禁止同时开发多个菜单 |
| 业务逻辑 | 以 `DEV_01_SUNLIKE9` 为准，冲突问用户 |
| 字段中文 | 库注释为准，禁止 AI 自创标签 |
| Git | **不要** commit，除非用户明确要求 |

用户习惯：**直接口述缺哪些字段**，AI 加代码并回写对照表，比用户手改 md 更快。需标注：

- **只存库不展示** → 后端 save 写入，前端不出控件
- **hidden** → `widget: 'hidden'`，参与 payload 不渲染
- **只读/列表要表单不要** → `readonly` / `form: false`

---

## 8. 字段与代码同步路径

| 层 | 位置 | 作用 |
|----|------|------|
| 对照表 | `analysis/字段对照/*.md` | 规格源头 |
| 前端字段 | `client-vue/src/config/fields/*.ts` | `pickQuery/pickList/pickForm` |
| 明细网格 | `config/detailGridRegistry.ts` | 列展示、排序、格式化 |
| 后端主表 | `server/routes/*Routes.js` | SELECT/INSERT/UPDATE 固定列 |
| 扩展字段 | `menuTableRegistry.js` + `billExtFieldHook.js` | _Z 表动态读写 |

**加原表字段**：对照表 + `fields/*.ts` + 后端 SQL（三处）。  
**加扩展字段**：列设计/UI 添加即可，接口已标准化（菜单须在 registry 登记且路由已挂钩子）。

---

## 9. 关键后端文件

| 文件 | 作用 |
|------|------|
| `server/index.js` | 入口、中间件、网格/扩展字段 API |
| `server/routes/mfPssRoutes.js` | 销货/退回/折让 + 进货链（MF_PSS/TF_PSS） |
| `server/routes/mfPosRoutes.js` | 销售订单/采购单（MF_POS/TF_POS） |
| `server/sqOrdersRoutes.js` | 请购单 |
| `server/routes/indx|dept|cust|prdt|wh|salmRoutes.js` | 档案 API |
| `server/permissions.js` | PGM 权限与 API 守卫 |
| `server/gridConfig.js` | 明细网格列配置持久化 |
| `server/repositories/mssqlHelpers.js` | MSSQL 查询、`withTransaction` |

---

## 10. 关键前端组件

| 组件 | 用途 |
|------|------|
| `ErpBasePage` | 档案页布局（树 + 表格 + `#main-toolbar`） |
| `ErpDetailGrid` | 标准明细网格（5 项内置能力） |
| `ErpEditDialog` | 档案/简单编辑弹窗 |
| `ErpKingdeeBillEdit` / `SalesOrderFormView` | 单据编辑 |
| `ErpBillLineTable` | 单据表身 |
| `ErpArchiveExtFields` / `ErpExtFieldZone` | 扩展字段区 |
| `LookupField` + `LookupDialog` | 开窗选择 |

样式：`styles/erp-ui.scss`（档案/通用）、`styles/kingdee-order.scss`（单据 kd-so-*）

---

## 11. CodeX 环境建议配置

1. **复制 Cursor 规则**：将 `.cursor/rules/sunlike9-dev01-baseline.mdc` 内容设为 CodeX 项目规则（或等价 AGENTS 指令）。
2. **保留** `AGENTS.md`、`Project_Status.md` 并在每次里程碑后更新 Status。
3. **配置 `.cursorignore` 同类排除**：`node_modules/`、`dist/`、`.env`、大图/pdf。
4. **删除或忽略** 根目录 `Cursor_API*.txt`（API 密钥，非开发文档）。
5. **数据库**：确保 `server/data/db-connection.json` 指向可连的 Sunlike MSSQL；登录用系统用户（PSWD 表）。

---

## 12. 禁止事项（踩坑清单）

- 未确认字段对照表就写 `client-vue` / `server` 业务页
- 自创金蝶/用友业务逻辑（审核、流转、金额公式）
- 一次改多个菜单
- 修改后端路由后不重启服务
- 把 `analysis/db11_*.txt` 当日常文档读
- 已实现 **多人编辑锁**（当前没有，别假设有）

---

## 13. 推荐下一步工作（按优先级）

1. 按用户要求继续 **档案页统一中类骨架**（若还有菜单未对齐）
2. **DEV-07 收尾**：列表扩展列、已审核扩展字段只读
3. **销售订单** 列表/编辑与销货单骨架进一步对齐（用户正在迭代）
4. BACKLOG 中 **P1 剩余档案**（如 WagBA 等）— 先字段对照再开发
5. 若多人同时改单：**乐观锁**（MODIFY_DD 校验）— 尚未立项，需用户确认

---

## 14. 文档索引速查

| 主题 | 路径 |
|------|------|
| 单菜单流程 | `analysis/DEV_01_单菜单开发规范.md` |
| 字段对照模板 | `analysis/DEV_02_字段对照表规范与模板.md` |
| 技术/API 规范 | `analysis/DEV_03_技术实现规范.md` |
| UI 规范 | `analysis/DEV_04_前端视觉与交互规范.md` |
| 扩展字段方案 | `analysis/DEV_07_扩展字段与_Z表_方案说明.md` |
| 字段配置说明 | `client-vue/src/config/fields/README.md` |
| 菜单 BACKLOG | `analysis/BACKLOG_菜单开发清单.md` |

---

## 15. 联系上下文（Cursor 会话中近期改动，Status 可能未全写入）

- 客户列表：`CUST.CUR` 非 `CUR_ID`；后端需重启
- 员工/仓库/客户/部门等：套中类骨架 + 左侧树
- 销售订单：去掉列表中间查询区；工具栏按钮统一主色
- 表头排序图标：与列名同一行（`kingdee-order.scss`）
- 页签头统计标签（中类/货品/客户计数）已删除

**以代码 + 本文 + `Project_Status.md` 为准；有冲突问项目 owner。**

---

*交接文档结束。CodeX 接手请先读 §2 五文件，再读 `Project_Status.md`。*
