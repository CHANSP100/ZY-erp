import axios from 'axios';

const http = axios.create({ baseURL: '' });

export type Indx = {
  idx_no: string;
  name?: string;
  idx_up?: string;
  stop_dd?: string;
  rem?: string;
};

export type IndxTreeNode = Indx & {
  key: string;
  title: string;
  children: IndxTreeNode[];
};

export type Warehouse = { wh: string; name?: string };

export type Dept = {
  dep: string;
  name?: string;
  eng_name?: string;
  up?: string;
  stop_dd?: string;
  rem?: string;
};

export type DeptTreeNode = Dept & {
  key: string;
  title: string;
  children: DeptTreeNode[];
};

export type WarehouseFull = {
  wh: string;
  name?: string;
  dep?: string;
  dep_name?: string;
  up_wh?: string;
  up_wh_name?: string;
  adr?: string;
  tel_no?: string;
  stop_dd?: string;
  rem?: string;
};

export type Prdt = {
  prd_no: string;
  snm?: string;
  idx1?: string;
  idx2?: string;
  ut?: string;
  name?: string;
  spc?: string;
  wh?: string;
  valid_days?: number;
  qty_min1?: number;
  qty_max?: number;
  pic_path?: string;
  doc_path?: string;
  rem?: string;
  stop_id?: string;
  sys_date?: string;
};

export type Cust = {
  cus_no: string;
  obj_id?: string;
  name?: string;
  snm?: string;
  cus_are?: string;
  cnt_man1?: string;
  cnt_man2?: string;
  tel1?: string;
  tel2?: string;
  uni_no?: string;
  biz_dsc?: string;
  adr2?: string;
  end_dd?: string;
  cur_id?: string;
  id1_tax?: string;
  sal_no?: string;
  bnk_name?: string;
  id_code?: string;
  rem?: string;
};

export type Salm = {
  sal_no: string;
  name?: string;
  eng_name?: string;
  name_py?: string;
  sex?: string;
  dep?: string;
  dep_name?: string;
  pos?: string;
  up_sal_no?: string;
  up_sal_name?: string;
  tel1?: string;
  tel2?: string;
  e_mail?: string;
  con_adr?: string;
  id_num?: string;
  bth?: string;
  dut_in_d?: string;
  dut_ot_d?: string;
  rem?: string;
};

export type OpenSalesShipment = {
  ps_no: string;
  ps_dd?: string;
  cus_os_no?: string;
  rem?: string;
};

export type SalesOrderHead = {
  os_id?: string;
  os_no: string;
  os_dd?: string;
  cus_no?: string;
  cus_name?: string;
  use_dep?: string;
  sal_no?: string;
  cus_os_no?: string;
  bil_type?: string;
  cur_id?: string;
  tax_id?: string;
  est_dd?: string;
  rem?: string;
  cls_mp_id?: string | boolean;
  cls_id?: string | boolean;
  dis_cnt?: number;
  amtn_net?: number;
  tax?: number;
  bil_id?: string;
  bil_no?: string;
};

export type SalesOrderLine = {
  os_id?: string;
  os_no?: string;
  itm?: number;
  prd_no?: string;
  prd_name?: string;
  wh?: string;
  wh_name?: string;
  qty?: number;
  qty_open?: number;
  ut?: string;
  up?: number;
  amtn?: number;
  tax_rto?: number;
  tax?: number;
  est_dd?: string;
  sup_prd_no?: string;
  rem?: string;
  qty_ps?: number;
  spc?: string;
};

export type OpenSalesOrder = {
  os_no: string;
  os_dd?: string;
  cus_os_no?: string;
  rem?: string;
};

export type SalesShipmentHead = {
  ps_id?: string;
  ps_no: string;
  ps_dd?: string;
  cus_no?: string;
  cus_name?: string;
  dep?: string;
  sal_no?: string;
  cus_os_no?: string;
  bil_type?: string;
  cur_id?: string;
  tax_id?: string;
  os_id?: string;
  os_no?: string;
  rem?: string;
  dis_cnt?: number;
  amtn_net?: number;
  tax?: number;
};

export type SalesShipmentLine = {
  ps_id?: string;
  ps_no?: string;
  itm?: number;
  prd_no?: string;
  prd_name?: string;
  wh?: string;
  wh_name?: string;
  qty?: number;
  qty_open?: number;
  ut?: string;
  up?: number;
  amtn_net?: number;
  tax_rto?: number;
  tax?: number;
  est_dd?: string;
  sup_prd_no?: string;
  rem?: string;
  os_id?: string;
  os_no?: string;
  src_itm?: number;
  spc?: string;
};

export type SalesReturnHead = SalesShipmentHead;
export type SalesReturnLine = SalesShipmentLine;

export const api = {
  health: () => http.get('/api/health'),
  indxTree: () => http.get<IndxTreeNode[]>('/api/indx/tree'),
  indxList: () => http.get<Indx[]>('/api/indx'),
  createIndx: (data: Indx) => http.post<Indx>('/api/indx', data),
  updateIndx: (idxNo: string, data: Partial<Indx>) => http.put<Indx>(`/api/indx/${idxNo}`, data),
  deptTree: () => http.get<DeptTreeNode[]>('/api/dept/tree'),
  deptList: () => http.get<Dept[]>('/api/dept'),
  getDept: (dep: string) => http.get<Dept>(`/api/dept/${dep}`),
  createDept: (data: Partial<Dept>) => http.post<Dept>('/api/dept', data),
  updateDept: (dep: string, data: Partial<Dept>) => http.put<Dept>(`/api/dept/${dep}`, data),
  whList: () => http.get<WarehouseFull[]>('/api/wh'),
  getWh: (wh: string) => http.get<WarehouseFull>(`/api/wh/${wh}`),
  createWh: (data: Partial<WarehouseFull>) => http.post<WarehouseFull>('/api/wh', data),
  updateWh: (wh: string, data: Partial<WarehouseFull>) => http.put<WarehouseFull>(`/api/wh/${wh}`, data),
  warehouses: () => http.get<Warehouse[]>('/api/warehouses'),
  nextPrdNo: (idx1: string, idx2?: string) =>
    http.get<{ prd_no: string; prefix: string }>('/api/prdt/next-no', { params: { idx1, idx2 } }),
  prdtList: (params?: { idx1?: string; q?: string; limit?: number }) =>
    http.get<Prdt[]>('/api/prdt', { params }),
  getPrdt: (prdNo: string) => http.get<Prdt>(`/api/prdt/${prdNo}`),
  createPrdt: (data: Partial<Prdt>) => http.post<Prdt>('/api/prdt', data),
  updatePrdt: (prdNo: string, data: Partial<Prdt>) => http.put<Prdt>(`/api/prdt/${prdNo}`, data),
  custList: (params?: { q?: string; obj_id?: string; limit?: number }) =>
    http.get<Cust[]>('/api/cust', { params }),
  getCust: (cusNo: string) => http.get<Cust>(`/api/cust/${cusNo}`),
  createCust: (data: Partial<Cust>) => http.post<Cust>('/api/cust', data),
  updateCust: (cusNo: string, data: Partial<Cust>) => http.put<Cust>(`/api/cust/${cusNo}`, data),
  salmList: (params?: { q?: string; limit?: number }) => http.get<Salm[]>('/api/salm', { params }),
  getSalm: (salNo: string) => http.get<Salm>(`/api/salm/${salNo}`),
  createSalm: (data: Partial<Salm>) => http.post<Salm>('/api/salm', data),
  updateSalm: (salNo: string, data: Partial<Salm>) => http.put<Salm>(`/api/salm/${salNo}`, data),
  nextSalesOrderNo: () => http.get<{ os_no: string }>('/api/sales-orders/next-no'),
  salesOrderList: (params?: { q?: string; limit?: number }) =>
    http.get<SalesOrderHead[]>('/api/sales-orders', { params }),
  getSalesOrder: (osNo: string) =>
    http.get<{ head: SalesOrderHead; lines: SalesOrderLine[] }>(`/api/sales-orders/${osNo}`),
  createSalesOrder: (data: { head: Partial<SalesOrderHead>; lines: SalesOrderLine[] }) =>
    http.post<{ head: SalesOrderHead; lines: SalesOrderLine[] }>('/api/sales-orders', data),
  updateSalesOrder: (osNo: string, data: { head: Partial<SalesOrderHead>; lines: SalesOrderLine[] }) =>
    http.put(`/api/sales-orders/${osNo}`, data),
  openSalesOrders: (cusNo: string) =>
    http.get<OpenSalesOrder[]>('/api/sales-orders/open', { params: { cus_no: cusNo } }),
  salesOrderShipLines: (osNo: string) =>
    http.get<{ head: SalesOrderHead; lines: SalesOrderLine[] }>(`/api/sales-orders/${osNo}/ship-lines`),
  nextSalesShipmentNo: () => http.get<{ ps_no: string }>('/api/sales-shipments/next-no'),
  salesShipmentList: (params?: { q?: string; limit?: number }) =>
    http.get<SalesShipmentHead[]>('/api/sales-shipments', { params }),
  getSalesShipment: (psNo: string) =>
    http.get<{ head: SalesShipmentHead; lines: SalesShipmentLine[] }>(`/api/sales-shipments/${psNo}`),
  createSalesShipment: (data: { head: Partial<SalesShipmentHead>; lines: SalesShipmentLine[] }) =>
    http.post<{ head: SalesShipmentHead; lines: SalesShipmentLine[] }>('/api/sales-shipments', data),
  updateSalesShipment: (psNo: string, data: { head: Partial<SalesShipmentHead>; lines: SalesShipmentLine[] }) =>
    http.put(`/api/sales-shipments/${psNo}`, data),
  openSalesShipments: (cusNo: string) =>
    http.get<OpenSalesShipment[]>('/api/sales-shipments/open', { params: { cus_no: cusNo } }),
  salesShipmentReturnLines: (psNo: string) =>
    http.get<{ head: SalesShipmentHead; lines: SalesShipmentLine[] }>(
      `/api/sales-shipments/${psNo}/return-lines`
    ),
  nextSalesReturnNo: () => http.get<{ ps_no: string }>('/api/sales-returns/next-no'),
  salesReturnList: (params?: { q?: string; limit?: number }) =>
    http.get<SalesReturnHead[]>('/api/sales-returns', { params }),
  getSalesReturn: (psNo: string) =>
    http.get<{ head: SalesReturnHead; lines: SalesReturnLine[] }>(`/api/sales-returns/${psNo}`),
  createSalesReturn: (data: { head: Partial<SalesReturnHead>; lines: SalesReturnLine[] }) =>
    http.post<{ head: SalesReturnHead; lines: SalesReturnLine[] }>('/api/sales-returns', data),
  updateSalesReturn: (psNo: string, data: { head: Partial<SalesReturnHead>; lines: SalesReturnLine[] }) =>
    http.put(`/api/sales-returns/${psNo}`, data),
  upload: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return http.post<{ path: string; filename: string }>('/api/upload', fd);
  },
};
