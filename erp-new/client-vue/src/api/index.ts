import axios from 'axios';
import type {
  Cust,
  Curr,
  DbConnectionConfig,
  DbConnectionTestResult,
  Dept,
  DeptTreeNode,
  DetailGridColumn,
  DetailGridMenuMeta,
  AddDetailGridColumnPayload,
  UpdateDetailGridColumnPayload,
  DbTableInfo,
  DbColumnInfo,
  PrintTemplate,
  ErpUser,
  ErpPermissionSummary,
  MenuCatalogItem,
  MenuPermissionRow,
  SysAuthUser,
  DeproLine,
  Indx,
  IndxTreeNode,
  Area,
  AreaTreeNode,
  OpenPurchaseOrder,
  OpenPurchaseReceipt,
  OpenPurchaseRequisition,
  OpenSalesOrder,
  OpenSalesShipment,
  Product,
  PrdtUt,
  BilSpc,
  PurchaseAllowanceHead,
  PurchaseAllowanceLine,
  PurchaseReceiptHead,
  PurchaseReceiptLine,
  PurchaseRequisitionHead,
  PurchaseRequisitionLine,
  ManufacturingOrderHead,
  ManufacturingOrderLine,
  MaterialIssueHead,
  MaterialIssueLine,
  ProductionPlanHead,
  ProductionPlanLine,
  OpenSalesOrderForJh,
  ProductionRequirementHead,
  ProductionRequirementLine1,
  ProductionRequirementLine2,
  ProductionRequirementLine3,
  OpenSalesOrderForMp,
  WarehouseDepositHead,
  WarehouseDepositLine,
  OverDepositWarning,
  BomRecipeHead,
  BomRecipeLine,
  BomRecipeDetailLine,
  BomRecipeTreeNode,
  BillAuditMeta,
  PurchaseReturnHead,
  PurchaseReturnLine,
  SalesAllowanceHead,
  SalesAllowanceLine,
  SalesReturnHead,
  SalesReturnLine,
  SalesOrderHead,
  SalesOrderLine,
  SalesOrderDetailLine,
  SalesShipmentHead,
  SalesShipmentLine,
  Salm,
  Warehouse,
} from './types';

const http = axios.create({ baseURL: '/api' });

const USER_KEY = 'erp-user-id';
const TOKEN_KEY = 'erp-auth-token';

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const usrId = localStorage.getItem(USER_KEY);
  if (usrId) {
    config.headers['X-Erp-User'] = usrId;
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      clearAuth();
      const path = window.location.pathname;
      if (path !== '/login') {
        window.location.href = `/login?redirect=${encodeURIComponent(path)}`;
      }
    }
    return Promise.reject(err);
  }
);

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function setErpUserId(usrId: string) {
  localStorage.setItem(USER_KEY, usrId);
}

export function getErpUserId(): string {
  return localStorage.getItem(USER_KEY) || '';
}

export const api = {
  indxTree: () => http.get<IndxTreeNode[]>('/indx/tree'),

  indxList: () => http.get<Indx[]>('/indx'),

  indxKnd: (idxNo: string) => http.get<{ knd: string }>(`/indx/${encodeURIComponent(idxNo)}/knd`),

  getIndx: (idxNo: string) => http.get<Indx>(`/indx/${idxNo}`),

  createIndx: (payload: Indx) => http.post<Indx>('/indx', payload),

  updateIndx: (idxNo: string, payload: Partial<Indx>) => http.put<Indx>(`/indx/${idxNo}`, payload),

  areaTree: () => http.get<AreaTreeNode[]>('/area/tree'),

  areaList: () => http.get<Area[]>('/area'),

  getArea: (areaNo: string) => http.get<Area>(`/area/${areaNo}`),

  createArea: (payload: Area) => http.post<Area>('/area', payload),

  updateArea: (areaNo: string, payload: Partial<Area>) => http.put<Area>(`/area/${areaNo}`, payload),

  nextPrdNo: (idx1: string, idx2?: string) =>
    http.get<{ prd_no: string }>('/prdt/next-no', { params: { idx1, idx2 } }),

  productList: (params?: Partial<Product> & { limit?: number; knd_in?: string }) =>
    http.get<Product[]>('/prdt', { params }),

  getProduct: (prdNo: string) => http.get<Product>(`/prdt/${prdNo}`),

  createProduct: (payload: Product) => http.post<Product>('/prdt', payload),

  updateProduct: (prdNo: string, payload: Product) => http.put<Product>(`/prdt/${prdNo}`, payload),

  prdtUtList: () => http.get<PrdtUt[]>('/prdt/units'),

  prdtUtBatchSave: (payload: { rows: { ut: string }[] }) =>
    http.post<PrdtUt[]>('/prdt/units/batch', payload),

  bilSpcList: (params?: { bil_id?: string; spc_id?: string }) =>
    http.get<BilSpc[]>('/bil-spc', { params: { bil_id: 'SA', spc_id: 'OB', ...params } }),

  bilSpcBatchSave: (payload: {
    bil_id?: string;
    spc_id?: string;
    rows: { spc_no: string; name?: string; rem?: string }[];
    deleted?: string[];
  }) => http.post<BilSpc[]>('/bil-spc/batch', { bil_id: 'SA', spc_id: 'OB', ...payload }),

  uploadFile: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return http.post<{ path: string; filename: string }>('/upload', fd);
  },

  custList: (params?: { q?: string; obj_id?: string; limit?: number }) =>
    http.get<Cust[]>('/cust', { params }),

  getCust: (cusNo: string) => http.get<Cust>(`/cust/${cusNo}`),

  curList: () => http.get<Curr[]>('/cur'),

  getCurr: (curId: string) => http.get<Curr>(`/cur/${encodeURIComponent(curId)}`),

  createCust: (payload: Cust) => http.post<Cust>('/cust', payload),

  updateCust: (cusNo: string, payload: Partial<Cust>) => http.put<Cust>(`/cust/${cusNo}`, payload),

  salmList: (params?: { q?: string; limit?: number }) =>
    http.get<Salm[]>('/salm', { params }),

  getSalm: (salNo: string) => http.get<Salm>(`/salm/${salNo}`),

  createSalm: (payload: Salm) => http.post<Salm>('/salm', payload),

  updateSalm: (salNo: string, payload: Partial<Salm>) => http.put<Salm>(`/salm/${salNo}`, payload),

  deptTree: () => http.get<DeptTreeNode[]>('/dept/tree'),

  deptList: () => http.get<Dept[]>('/dept'),

  getDept: (dep: string) => http.get<Dept>(`/dept/${dep}`),

  createDept: (payload: Dept) => http.post<Dept>('/dept', payload),

  updateDept: (dep: string, payload: Partial<Dept>) => http.put<Dept>(`/dept/${dep}`, payload),

  whList: () => http.get<Warehouse[]>('/wh'),

  getWh: (wh: string) => http.get<Warehouse>(`/wh/${wh}`),

  createWh: (payload: Warehouse) => http.post<Warehouse>('/wh', payload),

  updateWh: (wh: string, payload: Partial<Warehouse>) => http.put<Warehouse>(`/wh/${wh}`, payload),

  warehouses: () => http.get<Warehouse[]>('/wh'),

  nextSalesShipmentNo: () => http.get<{ ps_no: string }>('/sales-shipments/next-no'),

  salesShipmentList: (params?: { q?: string; limit?: number }) =>
    http.get<SalesShipmentHead[]>('/sales-shipments', { params }),

  getSalesShipment: (psNo: string) =>
    http.get<{ head: SalesShipmentHead; lines: SalesShipmentLine[] }>(`/sales-shipments/${psNo}`),

  createSalesShipment: (payload: { head: SalesShipmentHead; lines: SalesShipmentLine[] }) =>
    http.post<{ head: SalesShipmentHead; lines: SalesShipmentLine[] }>('/sales-shipments', payload),

  updateSalesShipment: (psNo: string, payload: { head: SalesShipmentHead; lines: SalesShipmentLine[] }) =>
    http.put(`/sales-shipments/${psNo}`, payload),

  deleteSalesShipment: (psNo: string) => http.delete(`/sales-shipments/${psNo}`),

  auditSalesShipment: (psNo: string) =>
    http.post<BillAuditMeta & { ok: boolean }>(`/sales-shipments/${psNo}/audit`),
  unauditSalesShipment: (psNo: string) =>
    http.post<BillAuditMeta & { ok: boolean }>(`/sales-shipments/${psNo}/unaudit`),

  openSalesOrders: (cusNo: string) =>
    http.get<OpenSalesOrder[]>('/sales-orders/open', { params: { cus_no: cusNo } }),

  nextSalesOrderNo: () => http.get<{ os_no: string }>('/sales-orders/next-no'),

  salesOrderList: (params?: { q?: string; date_from?: string; date_to?: string; limit?: number }) =>
    http.get<SalesOrderHead[]>('/sales-orders', { params }),

  salesOrderDetailList: (params?: {
    q?: string;
    os_no?: string;
    cus_no?: string;
    prd_no?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
  }) => http.get<SalesOrderDetailLine[]>('/sales-orders/lines', { params }),

  getSalesOrder: (osNo: string) =>
    http.get<{ head: SalesOrderHead; lines: SalesOrderLine[] }>(`/sales-orders/${osNo}`),

  createSalesOrder: (payload: { head: SalesOrderHead; lines: SalesOrderLine[] }) =>
    http.post<{ head: SalesOrderHead; lines: SalesOrderLine[] }>('/sales-orders', payload),

  updateSalesOrder: (osNo: string, payload: { head: SalesOrderHead; lines: SalesOrderLine[] }) =>
    http.put(`/sales-orders/${osNo}`, payload),

  deleteSalesOrder: (osNo: string) => http.delete(`/sales-orders/${osNo}`),

  auditSalesOrder: (osNo: string) => http.post<BillAuditMeta & { ok: boolean }>(`/sales-orders/${osNo}/audit`),
  unauditSalesOrder: (osNo: string) => http.post<BillAuditMeta & { ok: boolean }>(`/sales-orders/${osNo}/unaudit`),

  nextPurchaseOrderNo: () => http.get<{ os_no: string }>('/purchase-orders/next-no'),

  purchaseOrderList: (params?: { q?: string; date_from?: string; date_to?: string; limit?: number }) =>
    http.get<SalesOrderHead[]>('/purchase-orders', { params }),

  purchaseOrderDetailList: (params?: {
    q?: string;
    os_no?: string;
    cus_no?: string;
    prd_no?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
  }) => http.get<SalesOrderDetailLine[]>('/purchase-orders/lines', { params }),

  getPurchaseOrder: (osNo: string) =>
    http.get<{ head: SalesOrderHead; lines: SalesOrderLine[] }>(`/purchase-orders/${osNo}`),

  createPurchaseOrder: (payload: { head: SalesOrderHead; lines: SalesOrderLine[] }) =>
    http.post<{ head: SalesOrderHead; lines: SalesOrderLine[] }>('/purchase-orders', payload),

  updatePurchaseOrder: (osNo: string, payload: { head: SalesOrderHead; lines: SalesOrderLine[] }) =>
    http.put(`/purchase-orders/${osNo}`, payload),

  deletePurchaseOrder: (osNo: string) => http.delete(`/purchase-orders/${osNo}`),

  auditPurchaseOrder: (osNo: string) => http.post<BillAuditMeta & { ok: boolean }>(`/purchase-orders/${osNo}/audit`),
  unauditPurchaseOrder: (osNo: string) =>
    http.post<BillAuditMeta & { ok: boolean }>(`/purchase-orders/${osNo}/unaudit`),

  salesOrderShipLines: (osNo: string) =>
    http.get<{ head: SalesOrderHead; lines: SalesOrderLine[] }>(`/sales-orders/${osNo}/ship-lines`),

  openSalesShipments: (cusNo: string) =>
    http.get<OpenSalesShipment[]>('/sales-shipments/open', { params: { cus_no: cusNo } }),

  salesShipmentAllowanceLines: (psNo: string) =>
    http.get<{ head: SalesShipmentHead; lines: SalesShipmentLine[] }>(
      `/sales-shipments/${psNo}/allowance-lines`
    ),

  salesShipmentReturnLines: (psNo: string) =>
    http.get<{ head: SalesShipmentHead; lines: SalesShipmentLine[] }>(
      `/sales-shipments/${psNo}/return-lines`
    ),

  nextSalesAllowanceNo: () => http.get<{ ps_no: string }>('/sales-allowances/next-no'),

  salesAllowanceList: (params?: { q?: string; limit?: number }) =>
    http.get<SalesAllowanceHead[]>('/sales-allowances', { params }),

  getSalesAllowance: (psNo: string) =>
    http.get<{ head: SalesAllowanceHead; lines: SalesAllowanceLine[] }>(`/sales-allowances/${psNo}`),

  createSalesAllowance: (payload: { head: SalesAllowanceHead; lines: SalesAllowanceLine[] }) =>
    http.post<{ head: SalesAllowanceHead; lines: SalesAllowanceLine[] }>('/sales-allowances', payload),

  updateSalesAllowance: (psNo: string, payload: { head: SalesAllowanceHead; lines: SalesAllowanceLine[] }) =>
    http.put(`/sales-allowances/${psNo}`, payload),

  deleteSalesAllowance: (psNo: string) => http.delete(`/sales-allowances/${psNo}`),

  auditSalesAllowance: (psNo: string) =>
    http.post<BillAuditMeta & { ok: boolean }>(`/sales-allowances/${psNo}/audit`),
  unauditSalesAllowance: (psNo: string) =>
    http.post<BillAuditMeta & { ok: boolean }>(`/sales-allowances/${psNo}/unaudit`),

  nextSalesReturnNo: () => http.get<{ ps_no: string }>('/sales-returns/next-no'),

  salesReturnList: (params?: { q?: string; limit?: number }) =>
    http.get<SalesReturnHead[]>('/sales-returns', { params }),

  getSalesReturn: (psNo: string) =>
    http.get<{ head: SalesReturnHead; lines: SalesReturnLine[] }>(`/sales-returns/${psNo}`),

  createSalesReturn: (payload: { head: SalesReturnHead; lines: SalesReturnLine[] }) =>
    http.post<{ head: SalesReturnHead; lines: SalesReturnLine[] }>('/sales-returns', payload),

  updateSalesReturn: (psNo: string, payload: { head: SalesReturnHead; lines: SalesReturnLine[] }) =>
    http.put(`/sales-returns/${psNo}`, payload),

  deleteSalesReturn: (psNo: string) => http.delete(`/sales-returns/${psNo}`),

  auditSalesReturn: (psNo: string) => http.post<BillAuditMeta & { ok: boolean }>(`/sales-returns/${psNo}/audit`),
  unauditSalesReturn: (psNo: string) => http.post<BillAuditMeta & { ok: boolean }>(`/sales-returns/${psNo}/unaudit`),

  nextPurchaseRequisitionNo: () => http.get<{ sq_no: string }>('/purchase-requisitions/next-no'),

  purchaseRequisitionList: (params?: { q?: string; limit?: number; date_from?: string; date_to?: string }) =>
    http.get<PurchaseRequisitionHead[]>('/purchase-requisitions', { params }),

  getPurchaseRequisition: (sqNo: string) =>
    http.get<{ head: PurchaseRequisitionHead; lines: PurchaseRequisitionLine[] }>(
      `/purchase-requisitions/${sqNo}`
    ),

  createPurchaseRequisition: (payload: { head: PurchaseRequisitionHead; lines: PurchaseRequisitionLine[] }) =>
    http.post<{ head: PurchaseRequisitionHead; lines: PurchaseRequisitionLine[] }>(
      '/purchase-requisitions',
      payload
    ),

  updatePurchaseRequisition: (
    sqNo: string,
    payload: { head: PurchaseRequisitionHead; lines: PurchaseRequisitionLine[] }
  ) => http.put(`/purchase-requisitions/${sqNo}`, payload),

  deletePurchaseRequisition: (sqNo: string) => http.delete(`/purchase-requisitions/${sqNo}`),

  auditPurchaseRequisition: (sqNo: string) =>
    http.post<BillAuditMeta & { ok: boolean }>(`/purchase-requisitions/${sqNo}/audit`),
  unauditPurchaseRequisition: (sqNo: string) =>
    http.post<BillAuditMeta & { ok: boolean }>(`/purchase-requisitions/${sqNo}/unaudit`),

  openPurchaseRequisitions: (cusNo: string) =>
    http.get<OpenPurchaseRequisition[]>('/purchase-requisitions/open', { params: { cus_no: cusNo } }),

  purchaseRequisitionPoLines: (sqNo: string) =>
    http.get<{ head: PurchaseRequisitionHead; lines: PurchaseRequisitionLine[] }>(
      `/purchase-requisitions/${sqNo}/po-lines`
    ),

  nextManufacturingOrderNo: () => http.get<{ mo_no: string }>('/manufacturing-orders/next-no'),

  manufacturingOrderList: (params?: { q?: string; limit?: number; date_from?: string; date_to?: string }) =>
    http.get<ManufacturingOrderHead[]>('/manufacturing-orders', { params }),

  getManufacturingOrder: (moNo: string) =>
    http.get<{ head: ManufacturingOrderHead; lines: ManufacturingOrderLine[] }>(
      `/manufacturing-orders/${moNo}`
    ),

  createManufacturingOrder: (payload: { head: ManufacturingOrderHead; lines: ManufacturingOrderLine[] }) =>
    http.post<{ head: ManufacturingOrderHead; lines: ManufacturingOrderLine[] }>(
      '/manufacturing-orders',
      payload
    ),

  updateManufacturingOrder: (
    moNo: string,
    payload: { head: ManufacturingOrderHead; lines: ManufacturingOrderLine[] }
  ) => http.put(`/manufacturing-orders/${moNo}`, payload),

  deleteManufacturingOrder: (moNo: string) => http.delete(`/manufacturing-orders/${moNo}`),

  auditManufacturingOrder: (moNo: string) =>
    http.post<BillAuditMeta & { ok: boolean }>(`/manufacturing-orders/${moNo}/audit`),
  unauditManufacturingOrder: (moNo: string) =>
    http.post<BillAuditMeta & { ok: boolean }>(`/manufacturing-orders/${moNo}/unaudit`),

  openManufacturingOrdersForMl: (params?: { limit?: number }) =>
    http.get<ManufacturingOrderHead[]>('/manufacturing-orders/open-for-ml', { params }),

  manufacturingOrderMlLines: (moNo: string) =>
    http.get<{ head: ManufacturingOrderHead; lines: MaterialIssueLine[] }>(
      `/manufacturing-orders/${moNo}/ml-lines`
    ),

  openManufacturingOrdersForMm: (params?: { limit?: number }) =>
    http.get<ManufacturingOrderHead[]>('/manufacturing-orders/open-for-mm', { params }),

  manufacturingOrderMmLines: (moNo: string) =>
    http.get<{ head: ManufacturingOrderHead; lines: WarehouseDepositLine[] }>(
      `/manufacturing-orders/${moNo}/mm-lines`
    ),

  nextWarehouseDepositNo: () => http.get<{ mm_no: string }>('/warehouse-deposits/next-no'),

  warehouseDepositList: (params?: { q?: string; limit?: number; date_from?: string; date_to?: string }) =>
    http.get<WarehouseDepositHead[]>('/warehouse-deposits', { params }),

  getWarehouseDeposit: (mmNo: string) =>
    http.get<{ head: WarehouseDepositHead; lines: WarehouseDepositLine[] }>(`/warehouse-deposits/${mmNo}`),

  createWarehouseDeposit: (payload: { head: WarehouseDepositHead; lines: WarehouseDepositLine[] }) =>
    http.post<{ head: WarehouseDepositHead; lines: WarehouseDepositLine[] }>('/warehouse-deposits', payload),

  updateWarehouseDeposit: (
    mmNo: string,
    payload: { head: WarehouseDepositHead; lines: WarehouseDepositLine[] }
  ) => http.put(`/warehouse-deposits/${mmNo}`, payload),

  deleteWarehouseDeposit: (mmNo: string) => http.delete(`/warehouse-deposits/${mmNo}`),

  checkWarehouseDepositOver: (payload: { lines: WarehouseDepositLine[]; mm_no?: string }) =>
    http.post<{ warnings: OverDepositWarning[] }>('/warehouse-deposits/check-over', payload),

  auditWarehouseDeposit: (mmNo: string) =>
    http.post<BillAuditMeta & { ok: boolean; warnings?: OverDepositWarning[] }>(
      `/warehouse-deposits/${mmNo}/audit`
    ),
  unauditWarehouseDeposit: (mmNo: string) =>
    http.post<BillAuditMeta & { ok: boolean }>(`/warehouse-deposits/${mmNo}/unaudit`),

  nextMaterialIssueNo: () => http.get<{ ml_no: string }>('/material-issues/next-no'),

  materialIssueList: (params?: { q?: string; limit?: number; date_from?: string; date_to?: string }) =>
    http.get<MaterialIssueHead[]>('/material-issues', { params }),

  getMaterialIssue: (mlNo: string) =>
    http.get<{ head: MaterialIssueHead; lines: MaterialIssueLine[] }>(`/material-issues/${mlNo}`),

  createMaterialIssue: (payload: { head: MaterialIssueHead; lines: MaterialIssueLine[] }) =>
    http.post<{ head: MaterialIssueHead; lines: MaterialIssueLine[] }>('/material-issues', payload),

  updateMaterialIssue: (
    mlNo: string,
    payload: { head: MaterialIssueHead; lines: MaterialIssueLine[] }
  ) => http.put(`/material-issues/${mlNo}`, payload),

  deleteMaterialIssue: (mlNo: string) => http.delete(`/material-issues/${mlNo}`),

  auditMaterialIssue: (mlNo: string) =>
    http.post<BillAuditMeta & { ok: boolean }>(`/material-issues/${mlNo}/audit`),
  unauditMaterialIssue: (mlNo: string) =>
    http.post<BillAuditMeta & { ok: boolean }>(`/material-issues/${mlNo}/unaudit`),

  nextProductionPlanNo: () => http.get<{ jh_no: string }>('/production-plans/next-no'),

  productionPlanList: (params?: { q?: string; limit?: number; date_from?: string; date_to?: string }) =>
    http.get<ProductionPlanHead[]>('/production-plans', { params }),

  openSalesOrdersForJh: (params?: { limit?: number }) =>
    http.get<OpenSalesOrderForJh[]>('/production-plans/open-sales-orders', { params }),

  productionPlanTransferFromSo: (osNo: string) =>
    http.get<{ head: Partial<ProductionPlanHead>; lines: ProductionPlanLine[] }>(
      `/production-plans/transfer-from-so/${osNo}`
    ),

  getProductionPlan: (jhNo: string) =>
    http.get<{ head: ProductionPlanHead; lines: ProductionPlanLine[] }>(`/production-plans/${jhNo}`),

  createProductionPlan: (payload: { head: ProductionPlanHead; lines: ProductionPlanLine[] }) =>
    http.post<{ head: ProductionPlanHead; lines: ProductionPlanLine[] }>('/production-plans', payload),

  updateProductionPlan: (
    jhNo: string,
    payload: { head: ProductionPlanHead; lines: ProductionPlanLine[] }
  ) => http.put(`/production-plans/${jhNo}`, payload),

  deleteProductionPlan: (jhNo: string) => http.delete(`/production-plans/${jhNo}`),

  auditProductionPlan: (jhNo: string) =>
    http.post<BillAuditMeta & { ok: boolean }>(`/production-plans/${jhNo}/audit`),
  unauditProductionPlan: (jhNo: string) =>
    http.post<BillAuditMeta & { ok: boolean }>(`/production-plans/${jhNo}/unaudit`),

  nextProductionRequirementNo: () => http.get<{ mp_no: string }>('/production-requirements/next-no'),

  productionRequirementList: (params?: { q?: string; limit?: number; date_from?: string; date_to?: string }) =>
    http.get<ProductionRequirementHead[]>('/production-requirements', { params }),

  openSalesOrdersForMp: (params?: { limit?: number }) =>
    http.get<OpenSalesOrderForMp[]>('/production-requirements/open-sales-orders', { params }),

  productionRequirementTransferFromSo: (osNo: string) =>
    http.get<{
      head: Partial<ProductionRequirementHead>;
      lines: ProductionRequirementLine1[];
      lines_po: ProductionRequirementLine2[];
      lines_mo: ProductionRequirementLine3[];
    }>(`/production-requirements/transfer-from-so/${osNo}`),

  analyzeProductionRequirement: (payload: {
    head: ProductionRequirementHead;
    lines: ProductionRequirementLine1[];
  }) =>
    http.post<{
      lines1: ProductionRequirementLine1[];
      lines2: ProductionRequirementLine2[];
      lines3: ProductionRequirementLine3[];
    }>('/production-requirements/analyze', payload),

  getProductionRequirement: (mpNo: string) =>
    http.get<{
      head: ProductionRequirementHead;
      lines: ProductionRequirementLine1[];
      lines_po: ProductionRequirementLine2[];
      lines_mo: ProductionRequirementLine3[];
    }>(`/production-requirements/${mpNo}`),

  createProductionRequirement: (payload: {
    head: ProductionRequirementHead;
    lines: ProductionRequirementLine1[];
    lines_po?: ProductionRequirementLine2[];
    lines_mo?: ProductionRequirementLine3[];
  }) =>
    http.post<{
      head: ProductionRequirementHead;
      lines: ProductionRequirementLine1[];
      lines_po: ProductionRequirementLine2[];
      lines_mo: ProductionRequirementLine3[];
    }>('/production-requirements', payload),

  updateProductionRequirement: (
    mpNo: string,
    payload: {
      head: ProductionRequirementHead;
      lines: ProductionRequirementLine1[];
      lines_po?: ProductionRequirementLine2[];
      lines_mo?: ProductionRequirementLine3[];
    }
  ) => http.put(`/production-requirements/${mpNo}`, payload),

  deleteProductionRequirement: (mpNo: string) => http.delete(`/production-requirements/${mpNo}`),

  unauditProductionRequirement: (mpNo: string) =>
    http.post<BillAuditMeta & { ok: boolean }>(`/production-requirements/${mpNo}/unaudit`),

  transferProductionRequirementMo: (mpNo: string) =>
    http.post<{ ok: boolean; created: { mo_no: string; itm?: number }[] }>(
      `/production-requirements/${mpNo}/transfer-mo`
    ),

  stockQty: (prdNo: string, wh: string) =>
    http.get<{ qty: number }>('/stock/qty', { params: { prd_no: prdNo, wh } }),

  bomRecipeList: (params?: { q?: string; limit?: number; date_from?: string; date_to?: string }) =>
    http.get<BomRecipeHead[]>('/bom-recipes', { params }),

  bomRecipeDetailList: (params?: {
    q?: string;
    bom_no?: string;
    prd_no?: string;
    limit?: number;
    date_from?: string;
    date_to?: string;
  }) => http.get<BomRecipeDetailLine[]>('/bom-recipes/lines', { params }),

  bomRecipeTree: () => http.get<BomRecipeTreeNode[]>('/bom-recipes/tree'),

  getBomRecipeByProduct: (prdNo: string, pfNo?: string) =>
    http.get<{ head: BomRecipeHead; lines: BomRecipeLine[]; is_new: boolean }>(
      `/bom-recipes/by-product/${encodeURIComponent(prdNo)}`,
      { params: pfNo ? { pf_no: pfNo } : undefined }
    ),

  getBomRecipe: (bomNo: string) =>
    http.get<{ head: BomRecipeHead; lines: BomRecipeLine[] }>(
      `/bom-recipes/${encodeURIComponent(bomNo)}`
    ),

  createBomRecipe: (payload: { head: BomRecipeHead; lines: BomRecipeLine[] }) =>
    http.post<{ head: BomRecipeHead; lines: BomRecipeLine[] }>('/bom-recipes', payload),

  updateBomRecipe: (bomNo: string, payload: { head: BomRecipeHead; lines: BomRecipeLine[] }) =>
    http.put<{ ok: boolean; head?: BomRecipeHead; lines?: BomRecipeLine[] }>(
      `/bom-recipes/${encodeURIComponent(bomNo)}`,
      payload
    ),

  deleteBomRecipe: (bomNo: string) => http.delete(`/bom-recipes/${encodeURIComponent(bomNo)}`),

  auditBomRecipe: (bomNo: string) =>
    http.post<BillAuditMeta & { ok: boolean }>(`/bom-recipes/${encodeURIComponent(bomNo)}/audit`),
  unauditBomRecipe: (bomNo: string) =>
    http.post<BillAuditMeta & { ok: boolean }>(`/bom-recipes/${encodeURIComponent(bomNo)}/unaudit`),

  openPurchaseOrders: (cusNo: string) =>
    http.get<OpenPurchaseOrder[]>('/purchase-orders/open', { params: { cus_no: cusNo } }),

  purchaseOrderReceiptLines: (osNo: string) =>
    http.get<{ head: SalesOrderHead; lines: SalesOrderLine[] }>(`/purchase-orders/${osNo}/receipt-lines`),

  nextPurchaseReceiptNo: () => http.get<{ ps_no: string }>('/purchase-receipts/next-no'),

  purchaseReceiptList: (params?: { q?: string; limit?: number }) =>
    http.get<PurchaseReceiptHead[]>('/purchase-receipts', { params }),

  getPurchaseReceipt: (psNo: string) =>
    http.get<{ head: PurchaseReceiptHead; lines: PurchaseReceiptLine[] }>(`/purchase-receipts/${psNo}`),

  createPurchaseReceipt: (payload: { head: PurchaseReceiptHead; lines: PurchaseReceiptLine[] }) =>
    http.post<{ head: PurchaseReceiptHead; lines: PurchaseReceiptLine[] }>('/purchase-receipts', payload),

  updatePurchaseReceipt: (psNo: string, payload: { head: PurchaseReceiptHead; lines: PurchaseReceiptLine[] }) =>
    http.put(`/purchase-receipts/${psNo}`, payload),

  deletePurchaseReceipt: (psNo: string) => http.delete(`/purchase-receipts/${psNo}`),

  auditPurchaseReceipt: (psNo: string) =>
    http.post<BillAuditMeta & { ok: boolean }>(`/purchase-receipts/${psNo}/audit`),
  unauditPurchaseReceipt: (psNo: string) =>
    http.post<BillAuditMeta & { ok: boolean }>(`/purchase-receipts/${psNo}/unaudit`),

  openPurchaseReceipts: (cusNo: string) =>
    http.get<OpenPurchaseReceipt[]>('/purchase-receipts/open', { params: { cus_no: cusNo } }),

  purchaseReceiptReturnLines: (psNo: string) =>
    http.get<{ head: PurchaseReceiptHead; lines: PurchaseReceiptLine[] }>(
      `/purchase-receipts/${psNo}/return-lines`
    ),

  purchaseReceiptAllowanceLines: (psNo: string) =>
    http.get<{ head: PurchaseReceiptHead; lines: PurchaseReceiptLine[] }>(
      `/purchase-receipts/${psNo}/allowance-lines`
    ),

  nextPurchaseReturnNo: () => http.get<{ ps_no: string }>('/purchase-returns/next-no'),

  purchaseReturnList: (params?: { q?: string; limit?: number }) =>
    http.get<PurchaseReturnHead[]>('/purchase-returns', { params }),

  getPurchaseReturn: (psNo: string) =>
    http.get<{ head: PurchaseReturnHead; lines: PurchaseReturnLine[] }>(`/purchase-returns/${psNo}`),

  createPurchaseReturn: (payload: { head: PurchaseReturnHead; lines: PurchaseReturnLine[] }) =>
    http.post<{ head: PurchaseReturnHead; lines: PurchaseReturnLine[] }>('/purchase-returns', payload),

  updatePurchaseReturn: (psNo: string, payload: { head: PurchaseReturnHead; lines: PurchaseReturnLine[] }) =>
    http.put(`/purchase-returns/${psNo}`, payload),

  deletePurchaseReturn: (psNo: string) => http.delete(`/purchase-returns/${psNo}`),

  auditPurchaseReturn: (psNo: string) =>
    http.post<BillAuditMeta & { ok: boolean }>(`/purchase-returns/${psNo}/audit`),
  unauditPurchaseReturn: (psNo: string) =>
    http.post<BillAuditMeta & { ok: boolean }>(`/purchase-returns/${psNo}/unaudit`),

  nextPurchaseAllowanceNo: () => http.get<{ ps_no: string }>('/purchase-allowances/next-no'),

  purchaseAllowanceList: (params?: { q?: string; limit?: number }) =>
    http.get<PurchaseAllowanceHead[]>('/purchase-allowances', { params }),

  getPurchaseAllowance: (psNo: string) =>
    http.get<{ head: PurchaseAllowanceHead; lines: PurchaseAllowanceLine[] }>(`/purchase-allowances/${psNo}`),

  createPurchaseAllowance: (payload: { head: PurchaseAllowanceHead; lines: PurchaseAllowanceLine[] }) =>
    http.post<{ head: PurchaseAllowanceHead; lines: PurchaseAllowanceLine[] }>('/purchase-allowances', payload),

  updatePurchaseAllowance: (psNo: string, payload: { head: PurchaseAllowanceHead; lines: PurchaseAllowanceLine[] }) =>
    http.put(`/purchase-allowances/${psNo}`, payload),

  deletePurchaseAllowance: (psNo: string) => http.delete(`/purchase-allowances/${psNo}`),

  auditPurchaseAllowance: (psNo: string) =>
    http.post<BillAuditMeta & { ok: boolean }>(`/purchase-allowances/${psNo}/audit`),
  unauditPurchaseAllowance: (psNo: string) =>
    http.post<BillAuditMeta & { ok: boolean }>(`/purchase-allowances/${psNo}/unaudit`),

  authLogin: (payload: { usr_id: string; password: string }) =>
    http.post<{ token: string; user: ErpUser }>('/auth/login', payload),

  dbConfigGet: () => http.get<DbConnectionConfig>('/db-config'),

  dbConfigTest: (payload: DbConnectionConfig) =>
    http.post<DbConnectionTestResult>('/db-config/test', payload),

  dbConfigSave: (payload: DbConnectionConfig) =>
    http.post<{ ok: boolean; config: DbConnectionConfig }>('/db-config/save', payload),

  authLogout: () => http.post<{ ok: boolean }>('/auth/logout'),

  authMe: () => http.get<ErpUser>('/auth/me'),

  authUsers: () => http.get<ErpUser[]>('/auth/users'),

  sysAuthCatalog: () => http.get<MenuCatalogItem[]>('/sys-auth/catalog'),

  sysAuthMyPermissions: () => http.get<ErpPermissionSummary>('/sys-auth/my-permissions'),

  sysAuthUsers: () => http.get<SysAuthUser[]>('/sys-auth/users'),

  sysAuthCreateUser: (payload: SysAuthUser & { pwd?: string }) =>
    http.post<SysAuthUser>('/sys-auth/users', payload),

  sysAuthUpdateUser: (usrId: string, payload: Partial<SysAuthUser & { pwd?: string }>) =>
    http.put<SysAuthUser>(`/sys-auth/users/${encodeURIComponent(usrId)}`, payload),

  sysAuthDeleteUser: (usrId: string) =>
    http.delete<{ ok: boolean }>(`/sys-auth/users/${encodeURIComponent(usrId)}`),

  sysAuthUserMenus: (usrId: string) =>
    http.get<MenuPermissionRow[]>(`/sys-auth/users/${encodeURIComponent(usrId)}/menus`),

  sysAuthSaveUserMenus: (usrId: string, menus: MenuPermissionRow[]) =>
    http.put<MenuPermissionRow[]>(`/sys-auth/users/${encodeURIComponent(usrId)}/menus`, { menus }),

  sysAuthCopyUserMenus: (usrId: string, fromUsrId: string) =>
    http.post<MenuPermissionRow[]>(`/sys-auth/users/${encodeURIComponent(usrId)}/menus/copy`, {
      from_usr_id: fromUsrId,
    }),

  sysAuthDepro: (deproNo: string) =>
    http.get<DeproLine[]>(`/sys-auth/depro/${encodeURIComponent(deproNo)}`),

  sysAuthSaveDepro: (deproNo: string, lines: DeproLine[]) =>
    http.put<DeproLine[]>(`/sys-auth/depro/${encodeURIComponent(deproNo)}`, { lines }),

  sysAuthUserWh: (usrId: string) => http.get<string[]>(`/sys-auth/users/${encodeURIComponent(usrId)}/wh`),

  sysAuthSaveUserWh: (usrId: string, whs: string[]) =>
    http.put<string[]>(`/sys-auth/users/${encodeURIComponent(usrId)}/wh`, { whs }),

  detailGridColumns: (menuCode: string) =>
    http.get<DetailGridColumn[]>(`/detail-grid/${menuCode}/columns`),

  detailGridMeta: (menuCode: string) =>
    http.get<DetailGridMenuMeta>(`/detail-grid/${menuCode}/meta`),

  detailGridSetGlobal: (menuCode: string, col_key: string, visible: boolean) =>
    http.put<DetailGridColumn[]>(`/detail-grid/${menuCode}/columns/global`, { col_key, visible }),

  detailGridSetUser: (menuCode: string, col_key: string, visible: boolean) =>
    http.put<DetailGridColumn[]>(`/detail-grid/${menuCode}/columns/user`, { col_key, visible }),

  detailGridAddColumn: (menuCode: string, payload: AddDetailGridColumnPayload) =>
    http.post<DetailGridColumn[]>(`/detail-grid/${menuCode}/columns`, payload),

  detailGridUpdateColumn: (
    menuCode: string,
    colKey: string,
    payload: UpdateDetailGridColumnPayload
  ) => http.put<DetailGridColumn[]>(`/detail-grid/${menuCode}/columns/${colKey}`, payload),

  extFieldDbTables: () => http.get<DbTableInfo[]>('/ext-field/db-tables'),

  extFieldDbTableColumns: (tableName: string) =>
    http.get<DbColumnInfo[]>(`/ext-field/db-tables/${encodeURIComponent(tableName)}/columns`),

  extFieldTableSelectOptions: (tableName: string, limit?: number) =>
    http.get<{ value: string; label: string }[]>(
      `/ext-field/table-select-options/${encodeURIComponent(tableName)}`,
      { params: limit ? { limit } : undefined }
    ),

  detailGridRemoveColumn: (menuCode: string, colKey: string) =>
    http.delete<DetailGridColumn[]>(`/detail-grid/${menuCode}/columns/${colKey}`),

  detailGridReorderColumns: (menuCode: string, col_keys: string[]) =>
    http.put<DetailGridColumn[]>(`/detail-grid/${menuCode}/columns/order`, { col_keys }),

  printTemplates: (menuCode: string) => http.get<PrintTemplate[]>(`/print-template/${menuCode}`),

  printTemplateGet: (menuCode: string, tplNo: string) =>
    http.get<PrintTemplate>(`/print-template/${menuCode}/${tplNo}`),

  printTemplateCreate: (
    menuCode: string,
    payload: { tpl_no: string; name: string; content?: string; is_default?: boolean; rem?: string }
  ) => http.post<PrintTemplate[]>(`/print-template/${menuCode}`, payload),

  printTemplateUpdate: (
    menuCode: string,
    tplNo: string,
    payload: { name?: string; content?: string; is_default?: boolean; rem?: string }
  ) => http.put<PrintTemplate[]>(`/print-template/${menuCode}/${tplNo}`, payload),

  printTemplateDelete: (menuCode: string, tplNo: string) =>
    http.delete<PrintTemplate[]>(`/print-template/${menuCode}/${tplNo}`),
};
