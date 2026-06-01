const fs = require('fs');
const path = require('path');

const content = `---
description: SUNLIKE9.0 业务基准 + 金蝶 UI；ERP 全局强制规则
alwaysApply: true
---

# SUNLIKE9.0 核心业务基准（DEV-01）

完整规范：\`erp-new/docs/DEV_01_SUNLIKE9_核心业务基准规范.md\`

## 万能指令（永久复用）

本功能 UI 严格对标最新金蝶云星空商用视觉风格，业务逻辑 1:1 纯原生复刻天心 SUNLIKE9.0 整套机制，严格遵守 DEV-01 全局参数、单据流转、字段联动、显隐只读规则，结合对应字段对照表与 \`client-vue/src/config/fields/*.ts\` 开发，**禁止自主创作业务逻辑、禁止套用金蝶/用友/通用 ERP 业务逻辑**。规则冲突默认以 SUNLIKE9.0 原生逻辑为准，**无法判定则立即询问确认**。

## 分层标准

| 层 | 标准 |
|----|------|
| UI | 金蝶云星空：ErpBasePage / ErpBillPage / ErpListPage 及 erp-* 样式 |
| 业务 | 纯 SUNLIKE9.0：参数、编码、流转、联动、校验、提示文案 |
| 字段 | 对照表 + config/fields/*.ts；字段配置不定义业务规则 |

## 关键业务要点（摘要）

- **精度**：数量 2、单价 4、金额 2、税率 2、比率 4；按 9.0 算法，禁止自定义四舍五入偏差
- **空值**：数值默认 0，文本默认空，禁止 null 乱码展示
- **档案**：编码唯一；名称必填；停用=是不可选用且灰色；分类禁选自身及下级
- **单据流转**：草稿→提交→审核→完成；未审核可删，已审核须反审核后改删；审核后全表只读
- **按钮显隐**：按 DEV-01 第二节状态表，禁止自创按钮逻辑
- **库存**：审核更新、反审核回滚、作废不参与；负库存跟系统参数
- **联动**：选货品/往来/仓库后按 SUNLIKE 原生回填；数量金额税额公式不得自造

## 开发顺序

1. 读 DEV-01 + 菜单功能说明 / 字段对照表
2. UI 用已规范组件，只换业务字段
3. 业务逻辑对齐 SUNLIKE，不确定先问用户
`;

const targets = [
  path.join(__dirname, '..', '.cursor/rules/sunlike9-dev01-baseline.mdc'),
  path.join(__dirname, '..', '..', '.cursor/rules/sunlike9-dev01-baseline.mdc'),
];

for (const file of targets) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
  console.log('written', file, fs.statSync(file).size);
}
