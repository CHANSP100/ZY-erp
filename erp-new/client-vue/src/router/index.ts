import { createRouter, createWebHistory } from 'vue-router';
import { getAuthToken } from '@/api';
import MainLayout from '@/layouts/MainLayout.vue';
import { pathToPgm } from '@/config/menuRegistry';
import { authUser, fetchCurrentUser } from '@/composables/useAuth';

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginPage.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: '', redirect: '/indx' },
      { path: 'indx', component: () => import('@/views/IndxPage.vue'), meta: { title: '中类代号' } },
      { path: 'prdt', component: () => import('@/views/ProductPage.vue'), meta: { title: '货品基础资料' } },
      { path: 'fasecf', redirect: '/fasecf/list' },
      {
        path: 'fasecf/list',
        component: () => import('@/views/BomPage.vue'),
        meta: { title: 'BOM列表', pgm: 'FasECF' },
      },
      {
        path: 'fasecf/tree',
        component: () => import('@/views/BomPage.vue'),
        meta: { title: 'BOM明细列表', pgm: 'FasECF' },
      },
      { path: 'fasecf/lines', redirect: '/fasecf/tree' },
      { path: 'area', component: () => import('@/views/AreaPage.vue'), meta: { title: '客户供应商区域' } },
      { path: 'cust', component: () => import('@/views/CustPage.vue'), meta: { title: '客户厂商资料' } },
      { path: 'dept', component: () => import('@/views/DeptPage.vue'), meta: { title: '部门代号' } },
      { path: 'wh', component: () => import('@/views/WhPage.vue'), meta: { title: '仓库资料' } },
      { path: 'salm', component: () => import('@/views/SalmPage.vue'), meta: { title: '员工资料' } },
      { path: 'so', component: () => import('@/views/SalesOrderPage.vue'), meta: { title: '销售订单' } },
      { path: 'sq', component: () => import('@/views/PurchaseRequisitionPage.vue'), meta: { title: '请购单' } },
      { path: 'po', component: () => import('@/views/PurchaseOrderPage.vue'), meta: { title: '采购单' } },
      { path: 'sa', component: () => import('@/views/SalesShipmentPage.vue'), meta: { title: '销货单' } },
      { path: 'invcc', component: () => import('@/views/SalesAllowancePage.vue'), meta: { title: '销货折让' } },
      { path: 'sb', component: () => import('@/views/SalesReturnPage.vue'), meta: { title: '销货退回' } },
      { path: 'pc', component: () => import('@/views/PurchaseReceiptPage.vue'), meta: { title: '进货单' } },
      { path: 'pb', component: () => import('@/views/PurchaseReturnPage.vue'), meta: { title: '进货退回' } },
      { path: 'mo', component: () => import('@/views/ManufacturingOrderPage.vue'), meta: { title: '制令单' } },
      { path: 'mrpag', component: () => import('@/views/MaterialIssuePage.vue'), meta: { title: '生产领料' } },
      { path: 'mrpafc', component: () => import('@/views/WarehouseDepositPage.vue'), meta: { title: '缴库单' } },
      { path: 'mrpaa', component: () => import('@/views/ProductionPlanPage.vue'), meta: { title: '生产计划' } },
      { path: 'mrpaba', component: () => import('@/views/ProductionRequirementPage.vue'), meta: { title: '生产需求分析单' } },
      { path: 'invbc', component: () => import('@/views/PurchaseAllowancePage.vue'), meta: { title: '进货折让' } },
      {
        path: 'sys/auth',
        component: () => import('@/views/PermissionSettingsPage.vue'),
        meta: { title: '权限设置', pgm: 'SysAuth' },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

function canAccessRoute(path: string): boolean {
  const u = authUser.value;
  if (!u) return false;
  if (u.is_admin || u.permissions?.is_admin) return true;
  const pgm = pathToPgm(path);
  if (!pgm) return true;
  const m = u.permissions?.menus.find((x) => x.pgm === pgm);
  return m?.dsp ?? false;
}

router.beforeEach(async (to) => {
  const isPublic = to.meta.public === true;
  const token = getAuthToken();
  if (!token && !isPublic) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }
  if (token && to.path === '/login') {
    return { path: typeof to.query.redirect === 'string' ? to.query.redirect : '/indx' };
  }
  if (token && !isPublic) {
    if (!authUser.value) await fetchCurrentUser();
    if (!canAccessRoute(to.path)) {
      return { path: '/indx' };
    }
  }
  return true;
});

export default router;
