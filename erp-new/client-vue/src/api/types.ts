export interface Cust {
  cus_no: string;
  obj_id?: string;
  name: string;
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
  /** 责任业务 CUST.SAL，开窗 SALM */
  sal?: string;
  sal_no?: string;
  bnk_name?: string;
  id_code?: string;
  rem?: string;
  ext_fields?: Record<string, unknown>;
}

export interface Curr {
  cur_id: string;
  name?: string;
  exc_rto?: number;
}

export interface Dept {
  dep: string;
  name?: string;
  eng_name?: string;
  up?: string;
  /** 1生产 2管理 3管理/生产 */
  make_id?: string;
  stop_dd?: string;
  rem?: string;
  ext_fields?: Record<string, unknown>;
}

export interface DeptTreeNode extends Dept {
  key: string;
  title: string;
  children: DeptTreeNode[];
}

export interface Indx {
  idx_no: string;
  name?: string;
  idx_up?: string;
  stop_dd?: string;
  rem?: string;
  ext_fields?: Record<string, unknown>;
}

export interface IndxTreeNode extends Indx {
  key: string;
  title: string;
  children: IndxTreeNode[];
}

export interface Area {
  area_no: string;
  name?: string;
  area_up?: string;
  stop_dd?: string;
  rem?: string;
  ext_fields?: Record<string, unknown>;
}

export interface AreaTreeNode extends Area {
  key: string;
  title: string;
  children: AreaTreeNode[];
}

export interface PrdtUt {
  ut_id?: string;
  ut: string;
}

/** BIL_SPC 销售链单据类别（BIL_ID=SA, SPC_ID=OB） */
export interface BilSpc {
  bil_id?: string;
  spc_id?: string;
  spc_no: string;
  name?: string;
  rem?: string;
}

export interface Product {
  prd_no: string;
  idx1?: string;
  idx2?: string;
  knd?: string;
  name?: string;
  snm?: string;
  spc?: string;
  ut?: string;
  ut1?: string;
  wh?: string;
  wh_lc?: string;
  upr?: number;
  up_sal?: number;
  use_prdmark?: string;
  tw_id?: string;
  start_dd?: string;
  dfu_ut?: string;
  ml_ut?: string;
  quote_ut1?: string;
  quote_ut2?: string;
  quote_ut3?: string;
  spc_tax?: number;
  name_py?: string;
  qty_min?: number;
  qty_low?: number;
  valid_days?: number;
  qty_min1?: number;
  qty_max?: number;
  dep?: string;
  sal_no?: string;
  rem?: string;
  nouse_dd?: string;
  usr?: string;
  chk_man?: string;
  cls_date?: string;
  sys_date?: string;
  pic?: string;
  cadimg?: string;
  ext_fields?: Record<string, unknown>;
}

export interface OpenSalesShipment {
  ps_no: string;
  ps_dd?: string;
  cus_os_no?: string;
  rem?: string;
}

export interface Salm {
  sal_no: string;
  name?: string;
  eng_name?: string;
  name_py?: string;
  sex?: string;
  dep?: string;
  pos?: string;
  up_sal_no?: string;
  tel1?: string;
  tel2?: string;
  e_mail?: string;
  con_adr?: string;
  id_num?: string;
  bth?: string;
  dut_in_d?: string;
  dut_ot_d?: string;
  rem?: string;
  dep_name?: string;
  up_sal_name?: string;
  ext_fields?: Record<string, unknown>;
}

export interface Warehouse {
  wh: string;
  name?: string;
  dep?: string;
  up_wh?: string;
  adr?: string;
  tel_no?: string;
  stop_dd?: string;
  rem?: string;
  dep_name?: string;
  up_wh_name?: string;
  ext_fields?: Record<string, unknown>;
}

/** 单据制单/审核元数据（USR / SYS_DATE / CHK_MAN / CLS_DATE） */
export interface BillAuditMeta {
  usr?: string;
  sys_date?: string;
  chk_man?: string;
  cls_date?: string;
}

export interface SalesShipmentHead extends BillAuditMeta {
  ps_id?: string;
  ps_no: string;
  ps_dd: string;
  cus_no: string;
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
  zhang_id?: string;
  send_mth?: string;
  send_wh?: string;
  adr?: string;
  pay_mth?: string;
  pay_days?: number;
  pay_dd?: string;
  chk_dd?: string;
  inv_no?: string;
  rp_no?: string;
  voh_no?: string;
  contract?: string;
  ext_fields?: Record<string, unknown>;
}

export interface SalesShipmentLine {
  itm?: number;
  prd_no: string;
  prd_name?: string;
  prd_mark?: string;
  spc?: string;
  wh?: string;
  wh_name?: string;
  qty: number;
  ut?: string;
  up: number;
  amtn_net?: number;
  tax_rto?: number;
  tax?: number;
  est_dd?: string;
  sup_prd_no?: string;
  rem?: string;
  dis_cnt?: number;
  qty1?: number;
  bat_no?: string;
  os_id?: string;
  os_no?: string;
  src_itm?: number;
  qty_open?: number;
  cst_sal?: number;
  amt?: number;
  amtn?: number;
  qty_rtn?: number;
  ext_fields?: Record<string, unknown>;
}

export type SalesAllowanceHead = SalesShipmentHead;
export type SalesAllowanceLine = SalesShipmentLine;
export type SalesReturnHead = SalesShipmentHead;
export type SalesReturnLine = SalesShipmentLine;

export type PurchaseReceiptHead = SalesShipmentHead;
export type PurchaseReceiptLine = SalesShipmentLine;
export type PurchaseReturnHead = SalesShipmentHead;
export type PurchaseReturnLine = SalesShipmentLine;
export type PurchaseAllowanceHead = SalesShipmentHead;
export type PurchaseAllowanceLine = SalesShipmentLine;

export interface OpenSalesOrder {
  os_no: string;
  os_dd?: string;
  cus_os_no?: string;
  rem?: string;
}

export type OpenPurchaseOrder = OpenSalesOrder;

export type PurchaseOrderHead = SalesOrderHead;
export type PurchaseOrderLine = SalesOrderLine;
export type PurchaseOrderDetailLine = SalesOrderDetailLine;

export interface PurchaseRequisitionHead extends BillAuditMeta {
  sq_no?: string;
  sq_dd?: string;
  dep?: string;
  cus_no: string;
  sal_no?: string;
  est_dd?: string;
  rem?: string;
  po_no?: string;
  po_dep?: string;
  cur_id?: string;
  exc_rto?: number;
  cls_id?: string;
  bil_id?: string;
  bil_no?: string;
  amtn?: number;
  cus_name?: string;
  sal_name?: string;
  dep_name?: string;
  ext_fields?: Record<string, unknown>;
}

export interface PurchaseRequisitionLine {
  itm?: number;
  prd_no: string;
  prd_name?: string;
  prd_mark?: string;
  spc?: string;
  unit?: string;
  qty: number;
  up: number;
  amtn?: number;
  est_dd?: string;
  rem?: string;
  cus_no?: string;
  qty_po?: number;
  bat_no?: string;
  qty_open?: number;
  ext_fields?: Record<string, unknown>;
}

export interface OpenPurchaseRequisition {
  sq_no: string;
  sq_dd?: string;
  rem?: string;
}

export interface ManufacturingOrderHead extends BillAuditMeta {
  mo_no?: string;
  mo_dd?: string;
  sta_dd?: string;
  end_dd?: string;
  opn_dd?: string;
  fin_dd?: string;
  mrp_no: string;
  prd_mark?: string;
  wh?: string;
  so_no?: string;
  unit?: string;
  qty: number;
  dep?: string;
  bil_type?: string;
  build_bil?: string;
  close_id?: string;
  rem?: string;
  qty_fin?: number;
  bil_id?: string;
  bil_no?: string;
  chk_man?: string;
  mrp_name?: string;
  mrp_spc?: string;
  dep_name?: string;
  wh_name?: string;
  ext_fields?: Record<string, unknown>;
}

export interface ManufacturingOrderLine {
  itm?: number;
  mo_no?: string;
  prd_no: string;
  prd_name?: string;
  prd_mark?: string;
  wh?: string;
  unit?: string;
  qty_std?: number;
  los_rto?: number;
  qty_rsv?: number;
  qty_lost?: number;
  qty?: number;
  bat_no?: string;
  rem?: string;
  ext_fields?: Record<string, unknown>;
}

export interface MaterialIssueHead extends BillAuditMeta {
  ml_no?: string;
  ml_dd?: string;
  mo_no: string;
  mrp_no?: string;
  prd_name?: string;
  prd_mark?: string;
  unit?: string;
  qty?: number;
  wh_mtl?: string;
  dep?: string;
  bil_type?: string;
  id_no?: string;
  bat_no?: string;
  usr_no?: string;
  rem?: string;
  mlid?: string;
  ml_id?: string;
  bil_id?: string;
  bil_no?: string;
  mrp_spc?: string;
  dep_name?: string;
  wh_mtl_name?: string;
  usr_name?: string;
  ext_fields?: Record<string, unknown>;
}

export interface OverDepositWarning {
  mo_no: string;
  mo_qty: number;
  qty_fin_before: number;
  qty_add: number;
  qty_fin_after: number;
  over_qty: number;
}

export interface WarehouseDepositHead extends BillAuditMeta {
  mm_no?: string;
  mm_dd?: string;
  mo_no?: string;
  dep?: string;
  bil_type?: string;
  bil_id?: string;
  bil_no?: string;
  fin_id?: string;
  usr_no?: string;
  rem?: string;
  mm_id?: string;
  dep_name?: string;
  usr_name?: string;
  cancel_id?: string;
  ext_fields?: Record<string, unknown>;
}

export interface WarehouseDepositLine {
  itm?: number;
  mm_no?: string;
  mm_dd?: string;
  mo_no?: string;
  prd_no: string;
  prd_name?: string;
  prd_mark?: string;
  unit?: string;
  wh?: string;
  bat_no?: string;
  qty?: number;
  qty1?: number;
  valid_dd?: string;
  free_id?: string;
  so_no?: string;
  rem?: string;
  mo_qty?: number;
  qty_fin?: number;
  ext_fields?: Record<string, unknown>;
}

export interface ProductionPlanHead extends BillAuditMeta {
  jh_no?: string;
  jh_dd?: string;
  est_dd?: string;
  dep?: string;
  sal_no?: string;
  so_no?: string;
  cus_no?: string;
  cus_os_no?: string;
  bil_type?: string;
  bat_no?: string;
  close_id?: string;
  rem?: string;
  cancel_id?: string;
  dep_name?: string;
  sal_name?: string;
  cus_name?: string;
  ext_fields?: Record<string, unknown>;
}

export interface ProductionPlanLine {
  itm?: number;
  jh_no?: string;
  prd_no: string;
  prd_name?: string;
  prd_mark?: string;
  wh?: string;
  unit?: string;
  qty?: number;
  est_dd?: string;
  bat_no?: string;
  id_no?: string;
  os_id?: string;
  os_no?: string;
  est_itm?: number;
  cus_os_no?: string;
  sup_prd_no?: string;
  mp_cls_id?: string;
  rem?: string;
  pre_itm?: number;
  ext_fields?: Record<string, unknown>;
}

export interface OpenSalesOrderForJh {
  os_no: string;
  os_dd?: string;
  cus_no?: string;
  cus_name?: string;
  sal_no?: string;
  use_dep?: string;
  cus_os_no?: string;
  bil_type?: string;
  est_dd?: string;
}

export interface ProductionRequirementHead extends BillAuditMeta {
  mp_no?: string;
  mp_dd?: string;
  est_dd?: string;
  dep?: string;
  so_no?: string;
  wh?: string;
  bil_type?: string;
  rem?: string;
  cancel_id?: string;
  dep_name?: string;
  ext_fields?: Record<string, unknown>;
}

export interface ProductionRequirementLine1 {
  itm?: number;
  mp_no?: string;
  mrp_no?: string;
  prd_no: string;
  prd_name?: string;
  prd_mark?: string;
  wh?: string;
  unit?: string;
  so_no?: string;
  est_dd?: string;
  qty_so?: number;
  qty_non?: number;
  qty_min?: number;
  qty_on_way?: number;
  qty_on_prc?: number;
  qty_on_rsv?: number;
  qty?: number;
  qty_po?: number;
  qty_sq?: number;
  id_no?: string;
  bom_no?: string;
  po_yes?: string;
  rem?: string;
  est_itm?: number;
}

export interface ProductionRequirementLine2 {
  itm?: number;
  mp_no?: string;
  prd_no: string;
  prd_name?: string;
  prd_mark?: string;
  wh?: string;
  cus_no?: string;
  unit?: string;
  qty?: number;
  qty_po?: number;
  up_po?: number;
  amtn_po?: number;
  est_dd?: string;
  so_no?: string;
  po_no?: string;
  bat_no?: string;
  cur_id?: string;
  sup_prd_no?: string;
  rem?: string;
}

export interface ProductionRequirementLine3 {
  itm?: number;
  mp_no?: string;
  prd_no: string;
  prd_name?: string;
  prd_mark?: string;
  wh?: string;
  unit?: string;
  qty?: number;
  qty_mo?: number;
  sta_dd?: string;
  end_dd?: string;
  dep?: string;
  mo_no?: string;
  id_no?: string;
  bom_no?: string;
  so_no?: string;
  est_dd?: string;
  tw_id?: string;
  rem?: string;
}

export interface OpenSalesOrderForMp {
  os_no: string;
  os_dd?: string;
  use_dep?: string;
  bil_type?: string;
  est_dd?: string;
}

export interface MaterialIssueLine {
  itm?: number;
  ml_no?: string;
  mo_no?: string;
  prd_no: string;
  prd_name?: string;
  prd_mark?: string;
  wh?: string;
  unit?: string;
  qty_std?: number;
  los_rto?: number;
  qty_rsv?: number;
  qty?: number;
  qty_wh?: number;
  bat_no?: string;
  rem?: string;
  bil_itm?: number;
  ext_fields?: Record<string, unknown>;
}

export interface BomRecipeHead extends BillAuditMeta {
  bom_no: string;
  prd_no: string;
  pf_no: string;
  name?: string;
  prd_mark?: string;
  wh_no?: string;
  unit?: string;
  qty?: number;
  prd_knd?: string;
  spc?: string;
  valid_dd?: string;
  end_dd?: string;
  dep?: string;
  rem?: string;
  prd_name?: string;
  dep_name?: string;
  wh_name?: string;
}

export interface BomRecipeDetailLine {
  sys_date?: string;
  bom_no: string;
  head_prd_no?: string;
  pf_no?: string;
  head_name?: string;
  valid_dd?: string;
  itm?: number;
  prd_no: string;
  prd_name?: string;
  prd_mark?: string;
  wh_no?: string;
  unit?: string;
  qty?: number;
  los_rto?: number;
  qty_bas?: number;
  bom_id?: string;
  spc?: string;
  line_rem?: string;
}

export interface BomRecipeLine {
  itm?: number;
  bom_no?: string;
  prd_no: string;
  name?: string;
  prd_name?: string;
  prd_mark?: string;
  wh_no?: string;
  wh?: string;
  unit?: string;
  qty: number;
  los_rto?: number;
  qty_bas?: number;
  bom_id?: string;
  rem?: string;
  spc?: string;
}

export interface BomRecipeTreeNode {
  id: string;
  prd_no: string;
  bom_no?: string;
  pf_no?: string;
  knd?: string;
  label: string;
  children?: BomRecipeTreeNode[];
}

export interface OpenPurchaseReceipt {
  ps_no: string;
  ps_dd?: string;
  cus_os_no?: string;
  rem?: string;
}

export interface SalesOrderHead extends BillAuditMeta {
  os_id?: string;
  os_no: string;
  os_dd?: string;
  cus_no?: string;
  cus_name?: string;
  use_dep?: string;
  sal_no?: string;
  sal_name?: string;
  cus_os_no?: string;
  bil_type?: string;
  cur_id?: string;
  tax_id?: string;
  est_dd?: string;
  rem?: string;
  cls_mp_id?: string;
  cls_id?: string;
  dis_cnt?: number;
  amtn_net?: number;
  tax?: number;
  bil_id?: string;
  bil_no?: string;
  /** 扩展字段值（存 _Z 表） */
  ext_fields?: Record<string, unknown>;
}

export interface SalesOrderLine {
  itm?: number;
  prd_no: string;
  prd_name?: string;
  spc?: string;
  wh?: string;
  wh_name?: string;
  qty: number;
  qty_ps?: number;
  qty_open?: number;
  ut?: string;
  up: number;
  amtn?: number;
  tax_rto?: number;
  tax?: number;
  est_dd?: string;
  sup_prd_no?: string;
  rem?: string;
  /** 转入来源：请购单 SQ */
  bil_id?: string;
  bil_no?: string;
  bil_itm?: number;
  ext_fields?: Record<string, unknown>;
}

export interface SalesOrderDetailLine {
  os_no: string;
  os_dd?: string;
  est_dd?: string;
  cus_no?: string;
  cus_name?: string;
  cus_os_no?: string;
  sal_no?: string;
  sal_name?: string;
  use_dep?: string;
  dep_name?: string;
  cls_id?: string;
  itm: number;
  prd_no: string;
  prd_name?: string;
  spc?: string;
  sup_prd_no?: string;
  wh?: string;
  wh_name?: string;
  qty: number;
  qty_ps?: number;
  qty_open?: number;
  ut?: string;
  up?: number;
  amtn?: number;
  tax?: number;
  tax_rto?: number;
  line_est_dd?: string;
  line_rem?: string;
  [key: string]: unknown;
}

export interface MenuPermissionFlags {
  dsp: boolean;
  apd: boolean;
  upd: boolean;
  del: boolean;
  prt: boolean;
}

export interface MenuPermissionRow extends MenuPermissionFlags {
  pgm: string;
}

export interface ErpPermissionSummary {
  is_admin: boolean;
  menus: MenuPermissionRow[];
  deps: string[];
  whs: string[];
  all_wh: boolean;
  all_dep: boolean;
}

export interface SysAuthUser {
  usr_id: string;
  name: string;
  is_admin: boolean;
  dep?: string;
  b_dat?: string;
  e_dat?: string;
  depro_no?: string;
  rem?: string;
  mng?: string;
  tel1?: string;
  e_mail?: string;
}

export interface MenuCatalogItem {
  pgm: string;
  name: string;
  group: string;
}

export interface DeproLine {
  depro_no?: string;
  itm?: number;
  dep: string;
  rem?: string;
}

export interface ErpUser extends SysAuthUser {
  permissions?: ErpPermissionSummary;
}

export interface DetailGridColumn {
  col_key: string;
  db_field?: string;
  label: string;
  width?: number;
  min_width?: number;
  sort_order: number;
  visible_global: boolean;
  visible_user?: boolean;
  visible: boolean;
  is_system: boolean;
  sql_expr?: string | null;
  sql_expr_src?: string | null;
  widget: string;
  grid_area?: 'head' | 'line' | null;
  field_source?: 'sql' | 'input' | 'select' | null;
  required?: boolean;
  phys_type?: string | null;
  phys_len?: number | null;
  display_format?: string;
  select_config?: ExtFieldSelectConfig | null;
  z_table?: string | null;
  persist?: boolean;
}

export interface DetailGridMenuMeta {
  menuCode: string;
  listOnly: boolean;
  hasLine: boolean;
  headTable?: string | null;
  lineTable?: string | null;
}

export interface ExtFieldSelectConfig {
  mode: 'static' | 'table' | 'lookup';
  /** 固定选项 */
  options?: { value: string; label: string }[];
  /** 表/视图名 — 第 1 列落 _Z，第 2 列显示 */
  table_name?: string;
  /** @deprecated 旧版 lookup */
  lookup_table?: string;
  display_fields?: string[];
  save_field?: string;
}

export interface UpdateDetailGridColumnPayload {
  label?: string;
  field_source?: 'sql' | 'input' | 'select';
  required?: boolean;
  phys_len?: number;
  display_format?: string;
  sql_expr?: string;
  sql_expr_src?: string;
  select_config?: ExtFieldSelectConfig;
  width?: number;
  min_width?: number;
}

export interface AddDetailGridColumnPayload {
  col_key: string;
  label: string;
  mode?: 'list' | 'physical';
  grid_area?: 'head' | 'line';
  field_source?: 'sql' | 'input' | 'select';
  required?: boolean;
  phys_type?: string;
  phys_len?: number;
  display_format?: string;
  sql_expr?: string;
  sql_expr_src?: string;
  select_config?: ExtFieldSelectConfig;
  width?: number;
  min_width?: number;
}

export interface DbTableInfo {
  name: string;
  type: 'table' | 'view';
}

export interface DbColumnInfo {
  name: string;
  data_type: string;
}

export interface PrintTemplate {
  tpl_no: string;
  name: string;
  content: string;
  is_default: boolean;
  rem?: string;
  sort_order?: number;
}

export interface DbConnectionConfig {
  server: string;
  port?: string;
  loginType?: 'sql' | 'windows';
  businessDatabase: string;
  systemDatabase: string;
  user: string;
  password: string;
  saved?: boolean;
  testedAt?: string;
  authMode?: string;
}

export interface DbConnectionTestResult {
  ok: boolean;
  database: string;
  version?: string;
  server?: string;
  loginType?: string;
}
