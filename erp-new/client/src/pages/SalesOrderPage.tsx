import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Checkbox,
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
import { api, type Cust, type Prdt, type SalesOrderHead, type SalesOrderLine, type Salm, type Warehouse } from '../api';

type LineRow = SalesOrderLine & { key: string };

const TAX_OPTIONS = [
  { value: '1', label: '不计税' },
  { value: '2', label: '应税内含' },
  { value: '3', label: '应税外加' },
];

function newLine(key: string): LineRow {
  return {
    key,
    itm: 0,
    prd_no: '',
    prd_name: '',
    wh: '',
    qty: 0,
    ut: '',
    up: 0,
    amtn: 0,
    tax_rto: 13,
    tax: 0,
    est_dd: '',
    sup_prd_no: '',
    rem: '',
    qty_ps: 0,
  };
}

export default function SalesOrderPage() {
  const [form] = Form.useForm<SalesOrderHead>();
  const [lines, setLines] = useState<LineRow[]>([newLine('1')]);
  const [orders, setOrders] = useState<SalesOrderHead[]>([]);
  const [custs, setCusts] = useState<Cust[]>([]);
  const [prdts, setPrdts] = useState<Prdt[]>([]);
  const [whs, setWhs] = useState<Warehouse[]>([]);
  const [salms, setSalms] = useState<Salm[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [custPicker, setCustPicker] = useState(false);
  const [salPicker, setSalPicker] = useState(false);
  const [prdPicker, setPrdPicker] = useState(false);
  const [linePickIdx, setLinePickIdx] = useState<number | null>(null);

  const taxId = Form.useWatch('tax_id', form) || '2';

  const totals = useMemo(() => {
    let amtn = 0;
    let tax = 0;
    for (const ln of lines) {
      amtn += Number(ln.amtn) || 0;
      tax += Number(ln.tax) || 0;
    }
    return { amtn_net: Math.round(amtn * 100) / 100, tax: Math.round(tax * 100) / 100, total: Math.round((amtn + tax) * 100) / 100 };
  }, [lines]);

  const load = async () => {
    const [o, c, p, w, s] = await Promise.all([
      api.salesOrderList({ limit: 100 }),
      api.custList({ limit: 500 }),
      api.prdtList({ limit: 200 }),
      api.warehouses(),
      api.salmList(),
    ]);
    setOrders(o.data);
    setCusts(c.data);
    setPrdts(p.data);
    setWhs(w.data);
    setSalms(s.data);
  };

  useEffect(() => {
    load().catch(() => message.error('加载受订单失败'));
  }, []);

  const recalcLine = (ln: LineRow, nextTax = taxId): LineRow => {
    const qty = Number(ln.qty) || 0;
    const up = Number(ln.up) || 0;
    const rto = Number(ln.tax_rto) || 0;
    const gross = Math.round(qty * up * 100) / 100;
    let amtn = gross;
    let tax = 0;
    if (nextTax === '2') {
      tax = Math.round((gross * rto) / (100 + rto) * 100) / 100;
      amtn = Math.round((gross - tax) * 100) / 100;
    } else if (nextTax === '3') {
      amtn = gross;
      tax = Math.round((amtn * rto) / 100 * 100) / 100;
    }
    return { ...ln, amtn, tax };
  };

  const onNew = async () => {
    form.resetFields();
    const { data } = await api.nextSalesOrderNo();
    form.setFieldsValue({
      os_no: data.os_no,
      os_dd: dayjs(),
      est_dd: dayjs(),
      tax_id: '2',
      dis_cnt: 0,
    } as unknown as SalesOrderHead);
    setLines([recalcLine(newLine(String(Date.now())))]);
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

  const onSave = async () => {
    const head = await form.validateFields();
    const payload = {
      head: {
        ...head,
        os_dd: head.os_dd ? (head.os_dd as unknown as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
        est_dd: head.est_dd ? (head.est_dd as unknown as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
        cls_mp_id: head.cls_mp_id ? 'T' : undefined,
        cls_id: head.cls_id ? 'T' : undefined,
      },
      lines: lines.filter((l) => l.prd_no).map(({ key: _k, ...rest }) => rest),
    };
    if (!payload.lines.length) return message.warning('请录入表身品号');
    try {
      if (editing) {
        await api.updateSalesOrder(editing, payload);
        message.success('更新成功');
      } else {
        await api.createSalesOrder(payload);
        message.success('存盘成功');
        onNew();
      }
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      message.error(err.response?.data?.error || '存盘失败');
    }
  };

  const openOrder = async (osNo: string) => {
    const { data } = await api.getSalesOrder(osNo);
    setEditing(osNo);
    form.setFieldsValue({
      ...data.head,
      os_dd: data.head.os_dd ? dayjs(data.head.os_dd) : undefined,
      est_dd: data.head.est_dd ? dayjs(data.head.est_dd) : undefined,
      cls_mp_id: data.head.cls_mp_id === 'T',
      cls_id: data.head.cls_id === 'T',
    } as unknown as SalesOrderHead);
    setLines(
      data.lines.map((l, i) => recalcLine({ ...l, key: String(i + 1) }))
    );
  };

  const updateLine = (idx: number, patch: Partial<LineRow>) => {
    setLines((prev) => {
      const next = [...prev];
      next[idx] = recalcLine({ ...next[idx], ...patch });
      return next;
    });
  };

  const addLine = () => setLines((prev) => [...prev, recalcLine(newLine(String(Date.now())))]);

  const pickProduct = (p: Prdt) => {
    if (linePickIdx === null) return;
    updateLine(linePickIdx, {
      prd_no: p.prd_no,
      prd_name: p.name,
      ut: p.ut,
      wh: p.wh,
      spc: p.spc,
    });
    setPrdPicker(false);
    setLinePickIdx(null);
  };

  return (
    <div style={{ padding: 16 }}>
      <Row gutter={16}>
        <Col span={16}>
          <Card
            title="受订单（客户订单）"
            extra={
              <Space>
                <Button onClick={onNew}>新增</Button>
                <Button type="primary" onClick={onSave}>
                  存盘
                </Button>
              </Space>
            }
          >
            <Form form={form} layout="vertical">
              <Row gutter={8}>
                <Col span={8}>
                  <Form.Item name="os_no" label="预定单号">
                    <Input readOnly />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="os_dd" label="预定日期" rules={[{ required: true }]}>
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="est_dd" label="预交日">
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item name="cus_no" label="客户" rules={[{ required: true }]}>
                    <LookupField
                      display={custName(form.getFieldValue('cus_no'))}
                      onOpen={() => setCustPicker(true)}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="cus_os_no" label="客户订单">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="bil_type" label="单据类型">
                    <Input placeholder="销售单" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={8}>
                <Col span={8}>
                  <Form.Item name="use_dep" label="部门">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="sal_no" label="业务人员">
                    <LookupField display={salName(form.getFieldValue('sal_no'))} onOpen={() => setSalPicker(true)} />
                  </Form.Item>
                </Col>
                <Col span={4}>
                  <Form.Item name="cur_id" label="币别">
                    <Input placeholder="RMB" />
                  </Form.Item>
                </Col>
                <Col span={4}>
                  <Form.Item name="tax_id" label="扣税类别">
                    <Select
                      options={TAX_OPTIONS}
                      onChange={() => setLines((prev) => prev.map((l) => recalcLine(l, form.getFieldValue('tax_id'))))}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={8}>
                <Col span={16}>
                  <Form.Item name="rem" label="备注">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={4}>
                  <Form.Item name="cls_mp_id" valuePropName="checked" label="已分析登记">
                    <Checkbox />
                  </Form.Item>
                </Col>
                <Col span={4}>
                  <Form.Item name="cls_id" valuePropName="checked" label="结案">
                    <Checkbox />
                  </Form.Item>
                </Col>
              </Row>
            </Form>

            <Table
              size="small"
              rowKey="key"
              dataSource={lines}
              pagination={false}
              scroll={{ x: 1200 }}
              footer={() => (
                <Button type="dashed" onClick={addLine} block>
                  + 增加行
                </Button>
              )}
              columns={[
                { title: '序号', width: 50, render: (_v, _r, i) => i + 1 },
                {
                  title: '品号',
                  dataIndex: 'prd_no',
                  width: 120,
                  render: (v, _r, i) => (
                    <LookupField
                      value={v}
                      onOpen={() => {
                        setLinePickIdx(i);
                        setPrdPicker(true);
                      }}
                    />
                  ),
                },
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
                      options={whs.map((w) => ({ value: w.wh, label: `${w.wh} ${w.name || ''}` }))}
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
                { title: '单位', dataIndex: 'ut', width: 70 },
                {
                  title: '单价',
                  dataIndex: 'up',
                  width: 90,
                  render: (v, _r, i) => (
                    <InputNumber size="small" value={v} min={0} step={0.01} onChange={(val) => updateLine(i, { up: val ?? 0 })} />
                  ),
                },
                { title: '未税', dataIndex: 'amtn', width: 80 },
                { title: '税额', dataIndex: 'tax', width: 70 },
                {
                  title: '预交日',
                  dataIndex: 'est_dd',
                  width: 110,
                  render: (v, _r, i) => (
                    <DatePicker
                      size="small"
                      value={v ? dayjs(v) : undefined}
                      onChange={(d) => updateLine(i, { est_dd: d?.format('YYYY-MM-DD') })}
                    />
                  ),
                },
                {
                  title: '对方货号',
                  dataIndex: 'sup_prd_no',
                  width: 100,
                  render: (v, _r, i) => (
                    <Input size="small" value={v} onChange={(e) => updateLine(i, { sup_prd_no: e.target.value })} />
                  ),
                },
              ]}
            />

            <Row gutter={16} style={{ marginTop: 12 }}>
              <Col span={6}>未税本币：{totals.amtn_net}</Col>
              <Col span={6}>税额：{totals.tax}</Col>
              <Col span={6}>合计：{totals.total}</Col>
              <Col span={6}>
                <Form form={form} component={false}>
                  <Form.Item name="dis_cnt" label="折扣%" style={{ marginBottom: 0 }}>
                    <InputNumber min={0} max={100} style={{ width: '100%' }} />
                  </Form.Item>
                </Form>
              </Col>
            </Row>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="受订单列表">
            <Table
              rowKey="os_no"
              size="small"
              dataSource={orders}
              pagination={{ pageSize: 10 }}
              onRow={(r) => ({ onDoubleClick: () => openOrder(r.os_no) })}
              columns={[
                { title: '单号', dataIndex: 'os_no', width: 110 },
                { title: '日期', dataIndex: 'os_dd', width: 90 },
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
          { title: '简称', dataIndex: 'snm', width: 100 },
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
        open={prdPicker}
        title="选择品号"
        rowKey="prd_no"
        dataSource={prdts}
        searchKeys={['prd_no', 'name', 'spc']}
        width={720}
        onCancel={() => {
          setPrdPicker(false);
          setLinePickIdx(null);
        }}
        onSelect={pickProduct}
        columns={[
          { title: '品号', dataIndex: 'prd_no', width: 110 },
          { title: '品名', dataIndex: 'name', ellipsis: true },
          { title: '规格', dataIndex: 'spc', ellipsis: true },
        ]}
      />
    </div>
  );
}
