# 新 ERP 原型（中类 + 货品基础资料）

基于您在 `旧ERP文件/` 中的流程说明，已实现两个菜单的首期 Web 原型，并从 **DB_11** 导入样本数据。

## 启动

**一键启动（推荐）：** 双击 `一键启动.bat`，或：

```powershell
# 等价于下面两条命令，分别在两个窗口运行
cd erp-new\server && npm start          # API :3001
cd erp-new\client-vue && npm run dev    # 前端 :5180
```

手动分别启动：

```powershell
# 后端
cd C:\Users\admin\Desktop\cursor\erp-new\server
npm start

# 前端（正式 UI：Vue 3 + Element Plus，DEV-04 已确认）
cd ..\client-vue
npm install
npm run dev
```

浏览器：**http://localhost:5180**（顶栏 + 左侧菜单）

> 旧 React 原型仍在 `client/`，仅作 API/业务参考，不再新增页面。

## 目录

```
erp-new/
  server/       API + SQLite + DB_11 导入
  client-vue/   Vue 3 + Element Plus（正式前端）
  client/       React 探索原型（保留参考）
```

## 相关文档

**业务逻辑（最高优先级）**

- [docs/DEV_01_SUNLIKE9_核心业务基准规范.md](./docs/DEV_01_SUNLIKE9_核心业务基准规范.md) ← **SUNLIKE9.0 唯一业务基准；UI=金蝶云星空，逻辑=原生 SUNLIKE**（已同步至 `.cursor/rules/sunlike9-dev01-baseline.mdc`）

- [docs/01_中类_功能说明.md](./docs/01_中类_功能说明.md)
- [docs/02_货品基础资料_功能说明.md](./docs/02_货品基础资料_功能说明.md)
- [docs/后续资料完善清单.md](./docs/后续资料完善清单.md) ← **建议您下次补充的方向**
