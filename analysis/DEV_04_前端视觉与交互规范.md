# DEV-04 前端视觉与交互规范

> **状态：✅ 已确认**（2026-05-23，2026-05-23 修订：弹窗编辑为主、底栏版权、查询区）  
> **Element Plus** · **顶栏 + 左侧菜单 + 底栏版权** · **大部份弹窗编辑**  
> 原则层见 [DEV-00](./DEV_00_开发方案总纲.md)；字段见 [DEV-02](./DEV_02_字段对照表规范与模板.md) + [STD-01](./STD/01_全局字段字典_销售链.md)

---

## 1. 设计定位

| 项 | 规定 |
|----|------|
| 系统类型 | 工厂制造业 ERP（生产、进销存、仓储、财务） |
| 风格 | 商务简约、稳重专业、扁平化、低视觉干扰 |
| 禁止 | 卡通化、花哨动效、每页自创样式 |
| 适配 | 电脑端为主，**19–27 英寸**显示器；内容区最小宽度建议 ≥ 1280px |
| 组件库 | **Element Plus**（Vue 3 官方组件库） |

### 1.1 与当前 `erp-new` 原型说明

现有 `erp-new/client` 为早期 **React + Ant Design** 探索代码，**不代表最终 UI 栈**。  
按本文确认后，前端将 **迁移为 Vue 3 + Element Plus + Vite**（或您指定的 Vue 工程结构）；在此之前 **不继续用 Ant Design 叠新页面**。

后端 API（Node + SQLite）可继续复用。

---

## 2. 全局布局（顶栏 + 左侧菜单）

### 2.1 框架结构

使用 Element Plus 布局组件：`el-container` / `el-header` / `el-aside` / `el-main`。

```text
┌──────────────────────────────────────────────────────────┐
│ el-header：Logo / 系统名 / 统计 Tag（可选）                 │
├──────────┬───────────────────────────────────────────────┤
│ el-aside │  el-main（padding 16px，背景 #F5F7FA）          │
│ el-menu  │  业务内容                                      │
├──────────┴───────────────────────────────────────────────┤
│ el-footer：一行版权文字（如 © 2026 企业名称 · ERP）          │
└──────────────────────────────────────────────────────────┘
```

| 区域 | 规定 |
|------|------|
| 顶栏 | 高度 56px；**不放业务菜单** |
| 左侧 | `el-menu`，默认宽 **220px**，可折叠 |
| 主体 | `el-main`，背景 `#F5F7FA` |
| 底栏 | 高度 **32px**，**一行版权文字**，不阻塞开发 |

### 2.2 菜单与路由

- 使用 **Vue Router**，路径规则见 [DEV_03](./DEV_03_技术实现规范.md) §2  
- `el-menu` 的 `index` 与路由 path 一致  
- 分组：`el-sub-menu`（基础资料 / 销售 / 采购…）

---

## 3. 色彩（固定色值 → Element Plus 主题）

通过 **CSS 变量** 或 `element-plus` 主题覆盖注入，**禁止页面内散落硬编码色值**。

| 用途 | 色值 | Element Plus 变量（示例） |
|------|------|---------------------------|
| 主题主色 | `#165DFF` | `--el-color-primary` |
| 成功 | `#00B42A` | `--el-color-success` |
| 警告 | `#FF7D00` | `--el-color-warning` |
| 错误 | `#F53F3F` | `--el-color-danger` |
| 禁用 | `#C9CDD4` | `--el-text-color-disabled` |
| 标题文字 | `#1D2129` | `--el-text-color-primary` |
| 正文 | `#4E5969` | `--el-text-color-regular` |
| 辅助说明 | `#86909C` | `--el-text-color-secondary` |
| 边框 | `#E5E7EB` | `--el-border-color` |
| 页面背景 | `#F5F7FA` | 布局外层背景 |
| 卡片/表单底 | `#FFFFFF` | `--el-bg-color` |

`main.ts` 或全局 SCSS 示例：

```scss
:root {
  --el-color-primary: #165dff;
  --el-color-success: #00b42a;
  --el-color-warning: #ff7d00;
  --el-color-danger: #f53f3f;
  --el-border-radius-base: 4px;
}
```

---

## 4. 字体

| 层级 | 字号 | 字重 |
|------|------|------|
| 页面标题 | 18px | 600 |
| 模块/Card 标题 | 16px | 500 |
| 表单标签、表格正文 | 14px | 400 |
| 提示、备注 | 12px | 400 |

- 字体栈：`"Microsoft YaHei", "PingFang SC", sans-serif`  
- 行高：**1.5**  
- 表单：`el-form` 统一 `label-position="left"`（或全站统一 `top`，二选一）

---

## 4.5 查询区（列表/档案页强制）

**适用：** 档案列表、基础资料列表、报表列表（非单据录入主界面）。

| 项 | 规定 |
|----|------|
| 位置 | 页面 **最上方**，`el-card` 或灰色条 |
| 按钮 | 右端或行尾：**查询**（primary）、**重置**（default）；导出二期 |
| 间距 | 与 DEV-04 全局 gutter 16px 一致 |

**单据录入页：** 主区为表头+表身；筛选/查询放在 **右侧单据列表顶** 或侧栏，**不要求**整页顶栏再套一层查询区。

---

## 5. 页面类型模板（三种）

字段列 **以 DEV_02 对照表为准**；本节只规定 **版式**。

### 5.1 类型 A — 档案/基础资料（列表 + 弹窗编辑，默认）

**主区：** 顶 **查询区** + `el-table` 列表  
**编辑：** **大部份**用 `el-dialog` 两列/三列表单（新增/双击行编辑）

| 项 | 规定 |
|----|------|
| 操作 | 列表页右上：**新增**（§12.3）；查询/重置在查询区右下 |
| 弹窗 | 宽 **800px**（§12.5）；footer 右下：取消｜存盘 |
| 表单 | **2 列**网格；标签 120px、控件 240px |
| 开窗 | **LookupField + LookupDialog** |
| 示例 | 客户、员工、货品、仓库 |

> 极少数简单项可用页内编辑，须在 STD-02 / 对照表注明例外。

### 5.2 类型 B — 单据

```text
el-row：宽栏（约 16）表头 Form + 表身 Table + 合计
       窄栏（约 8）本单列表
```

| 项 | 规定 |
|----|------|
| 操作 | 新增｜转入｜存盘（primary） |
| 表头 | 栅格布局；单号只读 |
| 表身 | `el-table` + 列内编辑 |
| 侧栏列表 | 顶可加 **简易查询**（单号/日期/客户） |
| 合计 | 表身下：未税、税额、合计 |

### 5.3 类型 C — 树形资料

**左** `el-tree` + **右** 列表（顶查询区）+ **`el-dialog`** 新增/编辑（与 5.1 弹窗规范相同）

---

## 6. 组件与样式（Element Plus）

### 6.1 基础控件

| 场景 | 组件 |
|------|------|
| 文本 | `el-input` |
| 数字/金额 | `el-input-number` |
| 日期 | `el-date-picker`，`style="width: 100%"` |
| 枚举 | `el-select` |
| 多选 | `el-checkbox` / `el-checkbox-group` |
| 卡片 | `el-card` |
| 分页 | `el-pagination` |

- 圆角 **4px**（`--el-border-radius-base: 4px`）  
- 尺寸统一 `size="default"`（或全站 `small`，二选一）

### 6.2 按钮（三类）

| 类型 | 用途 | Element Plus |
|------|------|--------------|
| 主要 | 存盘、提交、审核 | `type="primary"` |
| 次要 | 新增、查询、重置、取消 | default |
| 危险 | 删除、作废 | `type="danger"` |

### 6.3 表格

| 项 | 规定 |
|----|------|
| 组件 | `el-table` |
| 表头 | 背景 `#f5f7fa`、加粗、居中（§12.4） |
| 边框 | `border` |
| 行高 | 48px |
| 操作列 | 宽 120px，`fixed="right"` |

### 6.4 弹窗

| 项 | 规定 |
|----|------|
| 组件 | `el-dialog` |
| 宽度 | **800px**（§12.5） |
| 按钮 | `#footer`  slot，右对齐 |
| 开窗 | LookupDialog ≥ 720px |

### 6.5 开窗（Lookup）

- **LookupPicker**（页面统一入口）：`preset` + `:data` / `loader` + `@select`
- **LookupField**：`el-autocomplete` 可输入 + 联想下拉 + `el-button`（…）
- **Enter（开窗栏）**：
  1. 联想面板打开 → Enter 选中高亮项 → 跳下一栏
  2. 联想关闭 → 按 **valueKey 编码** 在候选集精确匹配
  3. 本地未命中 → `resolveByCode` 服务端按编码补查；仍不在候选集 → **弹窗**（搜索框带当前输入）
  4. 匹配成功 → 联动回填 + 跳下一栏
- **blur（开窗栏）**：与 Enter 相同校验；未命中则**恢复**上次有效值（不留无效字符）
- **校验范围**：当前开窗 `:data`（含业务过滤，如 BOM 母件 KND=2/3）
- **预设**：`config/lookups/presets.ts`（dept、cust、product、warehouse、salm 等）
- 新页面禁止手写 `LookupField` + 独立 `LookupDialog` 组合，应使用 `LookupPicker`

### 6.6 Enter 跳下一栏（键盘录入）

- **容器**：`ErpEnterNavZone` 或 `useFormEnterNav(containerRef)` 包住表头 Form / 表身 Grid
- **规则**：
  - 普通输入框、数字：Enter → 下一可编辑栏
  - **日期/日期时间**：Enter 不跳栏（由日期面板处理）；仍可通过 Tab 进入日期栏
  - 表头末栏 Enter → 跳入表身（`onLastField`）
  - **表身任一行末栏** Enter → 增行 + 聚焦新行第一栏（`onRowLast`）
  - 多行备注：Enter 换行；Ctrl+Enter → 下一栏
- **查询区例外**：Enter 执行查询（`@keyup.enter="onQuery"`），容器可加 `data-enter-nav-skip`
- 新单据/档案表单应默认包一层 `ErpEnterNavZone`，禁止每页手写 `@keyup.enter` 跳栏

### 6.7 反馈

| 场景 | API |
|------|-----|
| 成功/失败 | `ElMessage.success` / `ElMessage.error` |
| 加载 | `v-loading` 或按钮 `:loading` |
| 确认删除 | `ElMessageBox.confirm` |

---

## 7. 字段与控件（引用 DEV-02）

| 规则 | 出处 |
|------|------|
| 界面中文 ↔ 数据库字段 | DEV-02 |
| 控件类型 | DEV-02「控件类型」列 |
| 未确认不得开发 | DEV-01 阶段 ③ |

---

## 8. 代码组织（Vue 3 + Element Plus）

```text
client/src/
  layouts/
    MainLayout.vue        # el-container 顶+左+main
  styles/
    element-variables.scss
    erp-ui.scss           # §12 商业质感
  components/
    erp/
      ErpBasePage.vue      # 基础资料页骨架（查询+列表+弹窗）
      ErpBillPage.vue      # 单据列表页骨架（上工具栏+左树+中表格）
      ErpBillToolbar.vue   # 单据顶栏（操作+查询+按钮）
      ErpBillQueryField.vue
      ErpBillTree.vue      # 左侧分类树
      ErpBillEditDialog.vue # 单据编辑弹窗（表头+表身）
      ErpListPage.vue      # 纯数据列表页骨架（统计/台账）
      ErpQueryPanel.vue    # 查询区 + 更多筛选
      ErpQueryField.vue
      ErpFormSection.vue
      index.ts             # 统一导出
    LookupField.vue
    LookupDialog.vue
  views/                  # 页面（或 pages/）
  router/index.ts
  main.ts                 # app.use(ElementPlus)
  api/                    # 请求封装
```

- 沿用 Element Plus **原生样式**，仅通过 CSS 变量适配本规范色值  
- 公共样式抽离，**减少每页重复 CSS**

---

## 9. 实施顺序

| 顺序 | 内容 |
|------|------|
| 1 | 您确认 **DEV-04 + DEV-00** |
| 2 | 新建/迁移 Vue 3 + Element Plus 工程，`MainLayout` 顶+左 + 主题变量 |
| 3 | 重写 Lookup 公共组件 |
| 4 | 每菜单：**DEV-02 字段确认** → 按 §5 模板开发 |
| 5 | 探索原型 9 项：先字段对照回补，再在 Element Plus 上重做页面 |

**确认前：不新建 Ant Design 页面；现有 React 原型仅作 API/业务参考。**

---

## 12. 商业质感强制细则（ERP 专用）

> **AI 与前端实现必须严格执行**；全局样式见 `client-vue/src/styles/erp-ui.scss`。

### 12.1 页面空间与留白

| 项 | 值 |
|----|-----|
| 页面整体内边距 | **24px** |
| 查询区卡片内边距 | **20px** |
| 表单控件水平/垂直间距 | **16px** |
| 卡片/表格上下间距 | **20px** |
| 按钮组间距 | **12px** |
| 表格上下留白 | **16px** |

### 12.2 查询区布局（固定 2 行 ×5 列）

- 所有查询控件严格 **2×5 网格**，不得随意换行
- 下拉/输入框：**宽 200px，高 36px**
- **查询**、**重置** 固定 **第 2 行最右侧**（重置紧跟查询）
- 标签 **右对齐**，与控件间距 **8px**
- 禁止控件高低不一、长短不一

### 12.3 按钮样式与位置（全局唯一）

| 按钮 | 样式与位置 |
|------|------------|
| **新增** | 主色 `#165DFF` 实心，`type="primary"`，**页面右上角** |
| **查询 / 重置** | 灰色边框 `default`，**查询区右下角** |
| **表格操作** | `el-button link` 文字按钮，不用大按钮 |
| 全站 | 按钮文案、图标搭配一致 |

### 12.4 表格规范

| 项 | 规定 |
|----|------|
| 表头 | 背景 `#f5f7fa`，文字加粗、居中 |
| 边框 | `border` 模式 |
| 行高 | **48px** |
| 操作列 | 宽 **120px**，`fixed="right"` |
| 列宽 | 按业务分配，避免过宽/过窄 |
| 分页 | 表格 **底部居中** `el-pagination` |

### 12.5 表单 / 弹窗规范

| 项 | 规定 |
|----|------|
| 标签宽 | **120px**，右对齐 |
| 控件 | **宽 240px，高 36px** |
| 必填 | 红星在标签右侧，间距 **4px** |
| 弹窗 | **宽 800px**，高度自适应；底部按钮 **右对齐** |
| 布局 | **2 列** 网格严格对齐 |

### 12.6 色彩与层次

主色 `#165DFF` **仅用于**：主按钮、选中菜单、表格高亮、必填星号。  
禁止在边框/背景/正文滥用主色。

| 项 | 值 |
|----|-----|
| 卡片/弹窗阴影 | `0 2px 12px 0 rgba(0,0,0,0.08)` |
| 页面背景 | `#f5f7fa` |
| 卡片背景 | `#ffffff` |

---

## 14. 现代简洁后台（2026-05-23 视觉方向）

> 在 §12 约束之上，**默认采用现代简洁后台**（非 1:1 复刻旧 ERP）。

| 项 | 现代简洁做法 |
|----|----------------|
| 查询 | **首行 5 个常用条件** +「更多筛选」折叠；标签在输入框**上方**（12px 辅色） |
| 列表 | 白卡片 + 轻阴影；`stripe` + 行 hover；条数左、分页右 |
| 弹窗 | 分组标题（左侧色条）；字段分 **基础 / 价格库存 / 其他 / 附件** |
| 组件 | 必须用 `client-vue/src/components/erp/*` 骨架，禁止单页堆样式 |

| 组件 | 含义 | 适用场景 |
|------|------|----------|
| **ErpBasePage** | 基础资料页 | 物料、客户、供应商、仓库档案 |
| **ErpBillPage** | 业务单据页 | 订单、入库、出库、退货单据 |
| **ErpListPage** | 纯数据列表页 | 统计查询、台账类页面 |

- 档案类菜单：**ErpBasePage** + `ErpQueryPanel` + 弹窗表单；查询/列表字段严格按 DEV-02「查询=是」「列表=是」
- 单据类菜单：**ErpBillPage** + `ErpBillToolbar` + `ErpBillTree` + 中间列表表格；**编辑统一走 `ErpBillEditDialog` 弹窗**（表头+表身+合计）
- 只读统计/台账：**ErpListPage**；无默认「新增」，可选 `#query` / `#toolbar`

### 14.2 单据页布局（金蝶云星空风格）

| 区域 | 组件 | 说明 |
|------|------|------|
| 顶部 | `ErpBillToolbar` | 左：新增/刷新等操作；中：`ErpBillQueryField` 查询项；右：查询/重置 |
| 左侧 | `ErpBillTree` | 分类树（如部门），宽 **220px** |
| 中间 | `#table` 槽 | 单据列表表格，双击或点「编辑」打开弹窗 |
| 编辑 | `ErpBillEditDialog` | 宽 **960px**；内含表头表单、表身表格、合计行 |

全局尺寸见 `erp-ui.scss` 变量：`--erp-bill-tree-w`、`--erp-bill-btn-h`、`--erp-bill-row-h`、`--erp-bill-query-w`。

**黄金页：**

| 类型 | 参考路由 | 组件 |
|------|----------|------|
| 基础资料 | `货品 /prdt` | ErpBasePage |
| 业务单据 | `销货单 /sa` | ErpBillPage |
| 纯列表 | （待建） | ErpListPage |

其余同类型菜单复制对应黄金页，只换字段配置。

### 14.1 商用体验验收清单

- [ ] 首屏 5 秒内能理解「查什么、点什么」
- [ ] 查询区不拥挤；录入字段只在弹窗
- [ ] 加载 / 空数据 / 存盘 loading 有反馈
- [ ] 主色仅用于主按钮、链接、必填星号
- [ ] 全站列表页视觉与货品一致

---

## 10. 已合并的旧文档

| 旧文件 | 说明 |
|--------|------|
| `前端视觉 & 开发规范.md` | 已并入本文 |
| `设计规范文档.md` | 已并入本文 |

---

## 11. 确认

| 项 | 拍板值 | 状态 |
|----|--------|------|
| 组件库 | Element Plus（Vue 3） | ✅ |
| 布局 | 顶 + 左 + **底栏一行版权** | ✅ |
| 编辑 | **大部份弹窗**；单据整页 | ✅ 2026-05-23 修订 |
| 查询 | 列表/档案必有；单据在侧栏 | ✅ |

公共模板：`components/erp/*`（货品已落地）；单据仍用整页模板。
