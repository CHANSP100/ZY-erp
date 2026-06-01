import { inject, watch, type InjectionKey, type Ref } from 'vue';

/** 扩展字段 reload 信号（ErpExtFieldZone / ErpBillPage 等 provide） */
export const BILL_EXT_FIELD_RELOAD_KEY: InjectionKey<Ref<number>> = Symbol('billExtFieldReload');

export function useBillExtFieldReload(onReload: () => void | Promise<void>) {
  const reloadKey = inject(BILL_EXT_FIELD_RELOAD_KEY, null);
  if (!reloadKey) return;
  watch(reloadKey, () => {
    void onReload();
  });
}
