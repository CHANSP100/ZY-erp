import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Table,
  message,
} from 'antd';
import dayjs from 'dayjs';
import LookupField from '../components/LookupField';
import LookupModal from '../components/LookupModal';
import {
  api,
  type Cust,
  type OpenSalesShipment,
  type SalesReturnHead,
  type SalesReturnLine,
  type Salm,
  type Warehouse,
} from '../api';

type LineRow = SalesReturnLine & { key: string };

const TAX_OPTIONS = [
  { value: '1', label: '不计税' },
  { value: '2', label: '应税内含' },
  { value: '3', label: '应税外加' },
];

function newLine(key: string): LineRow {
  return {
    key,
    prd_no: '',
    prd_name: '',
    wh: '',
    qty: 0,
    ut: '',
    up: 0,
    amtn_net: 0,
    tax_rto: 13,
    tax: 0,
    est_dd: '',
    sup_prd_no: '',
    rem: '',
    os_id: 'SA',
    os_no: '',
  };
}

function recalcLine(ln: LineRow, taxId: string): LineRow {
  const qty = Number(ln.qty) || 0;
  const up = Number(ln.up) || 0;
  const rto = Number(ln.tax_rto) || 0;
  const gross = Math.round(qty * up * 100) / 100;
  let amtn_net = gross;
  let tax = 0;
  if (taxId === '2') {
    tax = Math.round((gross * rto) / (100 + rto) * 100) / 100;
    amtn_net = Math.round((gross - tax) * 100) / 100;
  } else if (taxId === '3') {
    amtn_net = gross;
    tax = Math.round((amtn_net * rto) / 100 * 100) / 100;
  }
  return { ...ln, amtn_net, tax };
}

export default function SalesReturnPage() {
  const [form] = Form.useForm<SalesReturnHead>();
  const [lines, setLines] = useState<LineRow[]>([]);
  const [returns, setReturns] = useState<SalesReturnHead[]>([]);
  const [custs, setCusts] = useState<Cust[]>([]);
  const [whs, setWhs] = useState<Warehouse[]>([]);
  const [salms, setSalms] = useState<Salm[]>([]);
  const [openShipments, setOpenShipments] = useState<OpenSalesShipment[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [custPicker, setCustPicker] = useState(false);
  const [salPicker, setSalPicker] = useState(false);
  const [saPicker, setSaPicker] = useState(false);

  const taxId = Form.useWatch('tax_id', form) || '2';
  const cusNo = Form.useWatch('cus_no', form);
  const salNo = Form.useWatch('sal_no', form);

  const totals = useMemo(() => {
    let amtn = 0;
    let tax = 0;
    for (const ln of lines) {
      amtn += Number(ln.amtn_net) || 0;
      tax += Number(ln.tax) || 0;
    }
    return {
      amtn_net: Math.round(amtn * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round((amtn + tax) * 100) / 100,
    };
  }, [lines]);

  const load = async () => {
    const [sr, c, w, s] = await Promise.all([
      api.salesReturnList({ limit: 100 }),
      api.custList({ limit: 500 }),
      api.warehouses(),
      api.salmList(),
    ]);
    setReturns(sr.data);
    setCusts(c.data);
    setWhs(w.data);
    setSalms(s.data);
  };

  useEffect(() => {
    load().catch(() => message.error('加载销货退回失败'));
  }, []);

  const onNew = async () => {
    form.resetFields();
    const { data } = await api.nextSalesReturnNo();
    form.setFieldsValue({
      ps_no: data.ps_no,
      ps_dd: dayjs(),
      tax_id: '2',
      dis_cnt: 0,
      os_id: 'SA',
    } as unknown as SalesReturnHead);
    setLines([]);
    setEditing(null);
  };

  useEffect(() => {
    onNew().catch(() => {});
  }, []);

  const applyCust = (c: Cust) => {
    form.setFieldsValue({
      cus_no: c.cus_no,
      sal_no: c.sal_no,
      cur_id: c.cur_id || 'RMB',
      tax_id: c.id1_tax || '2',
    });
  };

  const custName = (no?: string) => custs.find((c) => c.cus_no === no)?.name || '';
  const salName = (no?: string) => salms.find((s) => s.sal_no === no)?.name || '';

  const openSaTransfer = async () => {
    const cus = form.getFieldValue('cus_no');
    if (!cus) return message.warning('请先选择客户');
    const { data } = await api.openSalesShipments(String(cus));
    if (!data.length) return message.info('该客户没有可退回的销货单');
    setOpenShipments(data);
    setSaPicker(true);
  };

  const transferFromSa = async (psNo: string) => {
    try {
      const { data } = await api.salesShipmentReturnLines(psNo);
      const head = data.head;
      form.setFieldsValue({
        os_id: 'SA',
        os_no: head.ps_no,
        cus_no: head.cus_no,
        sal_no: head.sal_no,
        cur_id: head.cur_id,
        tax_id: head.tax_id,
        cus_os_no: head.cus_os_no,
        bil_type: head.bil_type,
        dep: head.dep,
      });
      setLines(
        data.lines.map((ln, i) =>
          recalcLine(
            {
              ...newLine(String(i + 1)),
              key: String(i + 1),
              prd_no: ln.prd_no,
              prd_name: ln.prd_name,
              wh: ln.wh,
              spc: ln.spc,
              qty: ln.qty_open ?? ln.qty,
              ut: ln.ut,
              up: ln.up,
              tax_rto: ln.tax_rto,
              est_dd: ln.est_dd,
              sup_prd_no: ln.sup_prd_no,
              rem: ln.rem,
              os_id: 'SA',
              os_no: head.ps_no,
              src_itm: ln.itm,
            },
            String(head.tax_id || '2')
          )
        )
      );
      setSaPicker(false);
      message.success(`已从销货单 ${psNo} 带入表身`);
    } catch {
      message.error('转入失败');
    }
  };

  const onSave = async () => {
    const head = await form.validateFields();
    if (!lines.length) return message.warning('请先转入或录入表身');
    const payload = {
      head: {
        ...head,
        ps_dd: head.ps_dd ? (head.ps_dd as unknown as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
      },
      lines: lines.map(({ key: _k, spc: _s, qty_open: _q, ...rest }) => rest),
    };
    try {
      if (editing) {
        await api.updateSalesReturn(editing, payload);
        message.success('更新成功');
      } else {
        await api.createSalesReturn(payload);
        message.success('存盘成功');
        onNew();
      }
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      message.error(err.response?.data?.error || '存盘失败');
    }
  };

  const openReturn = async (psNo: string) => {
    const { data } = await api.getSalesReturn(psNo);
    setEditing(psNo);
    form.setFieldsValue({
      ...data.head,
      ps_dd: data.head.ps_dd ? dayjs(data.head.ps_dd) : undefined,
    } as unknown as SalesReturnHead);
    setLines(data.lines.map((l, i) => recalcLine({ ...l, key: String(i + 1) }, String(data.head.tax_id || '2'))));
  };

  const updateLine = (idx: number, patch: Partial<LineRow>) => {
    setLines((prev) => {
      const next = [...prev];
      next[idx] = recalcLine({ ...next[idx], ...patch }, taxId);
      return next;
    });
  };

  return (
    <div style={{ padding: 16 }}>
      <Row gutter={16}>
        <Col span={16}>
          <Card
            title="销货退回"
            extra={
              <Space>
                <Button onClick={onNew}>新增</Button>
                <Button onClick={openSaTransfer}>从销货单转入</Button>
                <Button type="primary" onClick={onSave}>
                  存盘
                </Button>
              </Space>
            }
          >
            <Form form={form} layout="vertical">
              <Row gutter={8}>
                <Col span={6}>
                  <Form.Item name="ps_no" label="销退单号">
                    <Input readOnly />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="ps_dd" label="销退日期" rules={[{ required: true }]}>
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="os_no" label="转入单号（销货单）">
                    <Input readOnly placeholder="从销货单转入" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="cus_os_no" label="客户单号">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item name="cus_no" label="客户" rules={[{ required: true }]}>
                    <LookupField display={custName(cusNo)} onOpen={() => setCustPicker(true)} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="sal_no" label="业务人员">
                    <LookupField display={salName(salNo)} onOpen={() => setSalPicker(true)} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="bil_type" label="单据类别">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={8}>
                <Col span={6}>
                  <Form.Item name="cur_id" label="币别">
                    <Input placeholder="RMB" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="tax_id" label="扣税类别">
                    <Select
                      options={TAX_OPTIONS}
                      onChange={() => setLines((prev) => prev.map((l) => recalcLine(l, form.getFieldValue('tax_id'))))}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="dep" label="部门">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="dis_cnt" label="折扣%">
                    <InputNumber min={0} max={100} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="rem" label="备注">
                <Input />
              </Form.Item>
              <Form.Item name="os_id" hidden>
                <Input />
              </Form.Item>
            </Form>

            <Table
              size="small"
              rowKey="key"
              dataSource={lines}
              pagination={false}
              scroll={{ x: 1100 }}
              columns={[
                { title: '序号', width: 50, render: (_v, _r, i) => i + 1 },
                { title: '品号', dataIndex: 'prd_no', width: 110 },
                { title: '品名', dataIndex: 'prd_name', width: 120, ellipsis: true },
                { title: '规格', dataIndex: 'spc', width: 100, ellipsis: true },
                {
                  title: '仓库',
                  dataIndex: 'wh',
                  width: 90,
                  render: (v, _r, i) => (
                    <Select
                      size="small"
                      style={{ width: '100%' }}
                      value={v || undefined}
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      options={whs.map((w) => ({ value: w.wh, label: w.wh }))}
                      onChange={(val) => updateLine(i, { wh: val })}
                    />
                  ),
                },
                {
                  title: '数量',
                  dataIndex: 'qty',
                  width: 90,
                  render: (v, _r, i) => (
                    <InputNumber size="small" value={v} min={0} onChange={(val) => updateLine(i, { qty: val ?? 0 })} />
                  ),
                },
                { title: '单位', dataIndex: 'ut', width: 60 },
                {
                  title: '单价',
                  dataIndex: 'up',
                  width: 90,
                  render: (v, _r, i) => (
                    <InputNumber size="small" value={v} min={0} step={0.01} onChange={(val) => updateLine(i, { up: val ?? 0 })} />
                  ),
                },
                { title: '未税', dataIndex: 'amtn_net', width: 80 },
                { title: '税额', dataIndex: 'tax', width: 70 },
                { title: '来源销货单', dataIndex: 'os_no', width: 100 },
              ]}
            />

            <Row gutter={16} style={{ marginTop: 12 }}>
              <Col span={8}>未税本币：{totals.amtn_net}</Col>
              <Col span={8}>税额：{totals.tax}</Col>
              <Col span={8}>合计：{totals.total}</Col>
            </Row>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="销货退回列表">
            <Table
              rowKey="ps_no"
              size="small"
              dataSource={returns}
              pagination={{ pageSize: 10 }}
              onRow={(r) => ({ onDoubleClick: () => openReturn(r.ps_no) })}
              columns={[
                { title: '单号', dataIndex: 'ps_no', width: 110 },
                { title: '日期', dataIndex: 'ps_dd', width: 90 },
                { title: '客户', dataIndex: 'cus_name', ellipsis: true },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <LookupModal
        open={custPicker}
        title="选择客户"
        rowKey="cus_no"
        dataSource={custs}
        searchKeys={['cus_no', 'name', 'snm']}
        onCancel={() => setCustPicker(false)}
        onSelect={(r) => {
          applyCust(r);
          setCustPicker(false);
        }}
        columns={[
          { title: '代号', dataIndex: 'cus_no', width: 90 },
          { title: '全称', dataIndex: 'name', ellipsis: true },
        ]}
      />

      <LookupModal
        open={salPicker}
        title="选择业务员"
        rowKey="sal_no"
        dataSource={salms}
        searchKeys={['sal_no', 'name']}
        onCancel={() => setSalPicker(false)}
        onSelect={(r) => {
          form.setFieldValue('sal_no', r.sal_no);
          setSalPicker(false);
        }}
        columns={[
          { title: '代号', dataIndex: 'sal_no', width: 90 },
          { title: '姓名', dataIndex: 'name' },
        ]}
      />

      <LookupModal
        open={saPicker}
        title="选择销货单（可退回）"
        rowKey="ps_no"
        dataSource={openShipments}
        searchKeys={['ps_no', 'cus_os_no']}
        onCancel={() => setSaPicker(false)}
        onSelect={(r) => transferFromSa(r.ps_no)}
        columns={[
          { title: '销货单号', dataIndex: 'ps_no', width: 120 },
          { title: '日期', dataIndex: 'ps_dd', width: 100 },
          { title: '客户单号', dataIndex: 'cus_os_no', ellipsis: true },
        ]}
      />
    </div>
  );
}
