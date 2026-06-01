/**
 * 员工 SALM
 * 同步自：analysis/字段对照/员工.md
 */
import type { ErpFieldMeta } from './types';

export const FAS_SALM_MAIN: ErpFieldMeta[] = [
  { order: 1, dbField: 'SAL_NO', key: 'sal_no', label: '员工代号', query: true, list: true, form: true, required: true, widget: 'input', area: 'head', width: 100 },
  { order: 2, dbField: 'NAME', key: 'name', label: '名称', query: true, list: true, form: true, widget: 'input', area: 'head', minWidth: 120 },
  { order: 3, dbField: 'SEX', key: 'sex', label: '性别', form: true, widget: 'select', area: 'head' },
  { order: 4, dbField: 'ENG_NAME', key: 'eng_name', label: '英文名称', form: true, widget: 'input', area: 'head' },
  { order: 5, dbField: 'NAME_PY', key: 'name_py', label: '助记码', query: true, form: true, widget: 'input', area: 'head' },
  { order: 6, dbField: 'POS', key: 'pos', label: '职称', list: true, form: true, widget: 'input', area: 'head', width: 90 },
  { order: 7, dbField: 'DEP', key: 'dep', label: '部门代号', query: true, list: true, form: true, widget: 'lookup', area: 'head', width: 100 },
  { order: 8, dbField: 'UP_SAL_NO', key: 'up_sal_no', label: '上级业务', form: true, widget: 'lookup', area: 'head' },
  { order: 9, dbField: 'TEL1', key: 'tel1', label: '电话号码', list: true, form: true, widget: 'input', area: 'head', width: 110 },
  { order: 10, dbField: 'TEL2', key: 'tel2', label: '手机号码', list: true, form: true, widget: 'input', area: 'head', width: 110 },
  { order: 11, dbField: 'E_MAIL', key: 'e_mail', label: '电子邮件', form: true, widget: 'input', area: 'head' },
  { order: 12, dbField: 'CON_ADR', key: 'con_adr', label: '联络地址', form: true, widget: 'input', area: 'head' },
  { order: 13, dbField: 'ID_NUM', key: 'id_num', label: '身份证号', form: true, widget: 'input', area: 'head' },
  { order: 14, dbField: 'BTH', key: 'bth', label: '生日', form: true, widget: 'date', area: 'head' },
  { order: 15, dbField: 'DUT_IN_D', key: 'dut_in_d', label: '到职日', form: true, widget: 'date', area: 'head' },
  { order: 16, dbField: 'DUT_OT_D', key: 'dut_ot_d', label: '离职日', form: true, widget: 'date', area: 'head' },
  { order: 17, dbField: 'REM', key: 'rem', label: '摘要', form: true, widget: 'textarea', area: 'head' },
];

export const FAS_SALM = {
  menuCode: 'FasEB',
  doc: 'analysis/字段对照/员工.md',
  main: FAS_SALM_MAIN,
};

export const FAS_SALM_QUERY_MAIN_KEYS = ['sal_no', 'name', 'name_py', 'dep'] as const;

export const FAS_SALM_QUERY_MORE_KEYS = [] as const;
