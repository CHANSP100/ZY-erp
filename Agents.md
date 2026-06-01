# Agents — AI 协作说明



> 任何 AI 接手时：**先读本文 → Project_Brain → Project_Status → DEV_00**。



## ⚠️ 强制门禁（2026-05-23 起）



| 条件 | 允许 |

|------|------|

| 用户未回复「**方案确认**」 | 只写/改 `analysis/DEV_*`、`CONFIRM_*`、`analysis/字段对照/*` |

| 菜单未回复「**xxx 字段确认**」 | 不得写该菜单的页面/API |

| 用户说「做 xxx」 | 先问：对照表是否已确认；未确认则 **只出对照表** |



---



## 启动清单



1. `Project_Status.md` — 当前阶段

2. `Project_Brain.md` — 拍板决策

3. `analysis/DEV_00_开发方案总纲.md`

4. 若做具体菜单：`analysis/字段对照/<菜单>.md` 须 **状态=已确认**

5. 截图：`旧ERP文件/截图/` + `analysis/screenshot_manifest.json`

6. 字段字典：`analysis/dict_fld_keep44.txt`



---



## 固定工作流程



```

资料齐 → 写 analysis/字段对照/<菜单>.md

      → 等用户「字段确认」

      → erp-new 开发

      → erp-new/docs/NN_菜单_功能说明.md

      → Project_Status 标待验收

      → 等「通过/不通过」

```



**禁止：** 以「首期 MVP」「先跑通」为由跳过字段确认。



---



## 文档索引



| 文档 | 用途 |

|------|------|

| DEV_00 | 方案总纲 |

| DEV_01 | 单菜单五阶段 |

| DEV_02 | 对照表模板 |

| DEV_03 | 代码/API/UI 规范 |

| CONFIRM_06 | 用户方案确认 |



---



## 代码约定（摘要，详见 DEV_03）



- 前端：`erp-new/client` — **Vue 3 + Element Plus**（现有 React+Ant 为待迁移探索代码）

- 后端：`erp-new/server` — Express + SQLite

- 开窗：`LookupField` + `LookupModal`

- Node 建议 22 LTS；换版本后 `npm rebuild better-sqlite3`



---



## 用户指令



| 用户说 | AI 做 |

|--------|-------|

| 「方案确认」 | 更新 Status；按 CONFIRM_06 D 节出对照表 |

| 「做 xxx 字段对照表」 | 只写 `analysis/字段对照/xxx.md` |

| 「xxx 字段确认」 | 该菜单可开发 |

| 「xxx 通过/不通过」 | 更新 BACKLOG / Status |



---



## 禁止



- 未字段确认就写页面

- 一次多个菜单

- 未经要求 git commit

- 私自删对照表中的「本期做」栏位


