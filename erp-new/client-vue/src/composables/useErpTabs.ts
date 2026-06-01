import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { menuTitleForPath } from '@/config/menuRegistry';

export interface ErpTab {
  path: string;
  title: string;
}

/** 侧栏菜单名称 → 页签标题 */
export const MENU_TAB_TITLES: Record<string, string> = {
  '/indx': '中类',
  '/prdt': '货品',
  '/area': '客户供应商区域',
  '/cust': '客户厂商',
  '/dept': '部门',
  '/wh': '仓库',
  '/salm': '员工',
  '/so': '销售订单',
  '/sq': '请购单',
  '/po': '采购单',
  '/sa': '销货单',
  '/invcc': '销货折让',
  '/sb': '销货退回',
  '/pc': '进货单',
  '/pb': '进货退回',
  '/invbc': '进货折让',
  '/sys/auth': '权限设置',
  '/fasecf/list': 'BOM列表',
  '/fasecf/tree': 'BOM明细列表',
};

export function tabTitleForPath(path: string, fallback?: string): string {
  return MENU_TAB_TITLES[path] ?? menuTitleForPath(path) ?? fallback ?? path;
}

const tabs = ref<ErpTab[]>([]);

export function useErpTabs() {
  const route = useRoute();
  const router = useRouter();

  function openTab(path: string, title?: string) {
    const t = title ?? tabTitleForPath(path, String(route.meta.title ?? ''));
    if (!tabs.value.some((x) => x.path === path)) {
      tabs.value.push({ path, title: t });
    }
    if (route.path !== path) {
      router.push(path);
    }
  }

  function switchTab(path: string) {
    if (route.path !== path) {
      router.push(path);
    }
  }

  function closeTab(path: string) {
    const idx = tabs.value.findIndex((t) => t.path === path);
    if (idx === -1) return;
    const wasActive = route.path === path;
    tabs.value.splice(idx, 1);
    if (!tabs.value.length) {
      openTab('/indx');
      return;
    }
    if (wasActive) {
      const next = tabs.value[Math.min(idx, tabs.value.length - 1)];
      router.push(next.path);
    }
  }

  function syncTabFromRoute() {
    const path = route.path;
    if (
      !MENU_TAB_TITLES[path] &&
      !menuTitleForPath(path) &&
      path !== '/' &&
      !path.startsWith('/sys/') &&
      !path.startsWith('/fasecf')
    ) {
      return;
    }
    const normalized = path === '/' ? '/indx' : path;
    const title = tabTitleForPath(normalized, String(route.meta.title ?? ''));
    if (!tabs.value.some((t) => t.path === normalized)) {
      tabs.value.push({ path: normalized, title });
    }
  }

  watch(
    () => route.path,
    () => syncTabFromRoute(),
    { immediate: true }
  );

  return { tabs, openTab, switchTab, closeTab };
}
