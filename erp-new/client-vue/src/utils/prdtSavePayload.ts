import type { Product } from '@/api/types';
import {
  isPrdtMaterialKnd,
  isPrdtTwIdVisible,
  PRDT_TW_ID_PURCHASE,
} from '@/config/prdtTwId';
import { fmtText, todayStr } from '@/utils/sunlike';
import { buildArchiveSavePayload } from '@/utils/billExtPayload';

/** 存盘前合并 SUNLIKE 系统默认值（与 server/utils/prdtSaveDefaults.js 对齐） */
export function applyPrdtFormDefaults(form: Product, isCreate: boolean): Product {
  const data: Product = { ...form };
  const name = fmtText(data.name);
  data.name = name;

  if (!fmtText(data.snm)) data.snm = name;

  if (isPrdtTwIdVisible(data.knd)) {
    if (!fmtText(data.tw_id)) data.tw_id = '2';
  } else if (isPrdtMaterialKnd(data.knd)) {
    data.tw_id = PRDT_TW_ID_PURCHASE;
  } else {
    data.tw_id = '';
  }

  data.upr = data.upr ?? 0;
  data.up_sal = data.up_sal ?? 0;
  data.dfu_ut = fmtText(data.dfu_ut) || '1';
  data.ml_ut = fmtText(data.ml_ut) || '1';
  data.quote_ut1 = fmtText(data.quote_ut1) || '1';
  data.quote_ut2 = fmtText(data.quote_ut2) || '1';
  data.quote_ut3 = fmtText(data.quote_ut3) || '1';
  data.qty_min = data.qty_min ?? 0;
  data.qty_low = data.qty_low ?? 0;
  data.valid_days = data.valid_days ?? 0;
  data.qty_min1 = data.qty_min1 ?? 0;
  data.qty_max = data.qty_max ?? 0;

  if (isCreate && !fmtText(data.start_dd)) {
    data.start_dd = todayStr();
  }
  if (!fmtText(data.knd)) data.knd = '2';

  return data;
}

export function buildPrdtSavePayload(form: Product, isCreate: boolean) {
  return buildArchiveSavePayload(applyPrdtFormDefaults(form, isCreate));
}
