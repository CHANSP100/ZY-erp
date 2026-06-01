import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  message,
} from 'antd';
import dayjs from 'dayjs';
import LookupField from '../components/LookupField';
import LookupModal from '../components/LookupModal';
import { api, type Cust, type Salm } from '../api';

const OBJ_OPTIONS = [
  { value: '1', label: '1 客户' },
  { value: '2', label: '2 厂商' },
  { value: '3', label: '3 客户与厂商' },
];

const TAX_OPTIONS = [
  { value: '1', label: '1 不计税' },
  { value: '2', label: '2 应税内含' },
  { value: '3', label: '3 应税外加' },
];

export default function CustPage() {
  const [form] = Form.useForm<Cust>();
  const [items, setItems] = useState<Cust[]>([]);
  const [salms, setSalms] = useState<Salm[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [salPicker, setSalPicker] = useState(false);

  const load = async () => {
    const [c, s] = await Promise.all([api.custList({ limit: 200 }), api.salmList()]);
    setItems(c.data);
    setSalms(s.data);
  };

  useEffect(() => {
    load().catch(() => message.error('加载客户失败'));
  }, []);

  const onNew = () => {
    form.resetFields();
    form.setFieldsValue({ obj_id: '1', id1_tax: '2' });
    setEditing(null);
  };

  const onSave = async () => {
    const v = await form.validateFields();
    const payload = {
      ...v,
      end_dd: v.end_dd ? (v.end_dd as unknown as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
    };
    try {
      if (editing) {
        await api.updateCust(editing, payload);
        message.success('更新成功');
      } else {
        await api.createCust(payload);
        message.success('存盘成功');
        onNew();
      }
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      message.error(err.response?.data?.error || '存盘失败');
    }
  };

  const onRow = (r: Cust) => {
    setEditing(r.cus_no);
    form.setFieldsValue({
      ...r,
      end_dd: r.end_dd ? dayjs(r.end_dd) : undefined,
    } as unknown as Cust);
  };

  const salDisplay = (no?: string) => salms.find((s) => s.sal_no === no)?.name || no || '';

  return (
    <div style={{ padding: 16 }}>
      <Row gutter={16}>
        <Col span={14}>
          <Card title="客户厂商资料" extra={<Button onClick={onNew}>新增</Button>}>
            <Form form={form} layout="vertical" onFinish={onSave}>
              <Tabs
                items={[
                  {
                    key: 'base',
                    label: '基本',
                    children: (
                      <>
                        <Row gutter={8}>
                          <Col span={8}>
                            <Form.Item name="obj_id" label="客户类别" rules={[{ required: true }]}>
                              <Select options={OBJ_OPTIONS} />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item name="cus_no" label="编码" rules={[{ required: true }]}>
                              <Input disabled={!!editing} maxLength={12} />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item name="end_dd" label="停用日期">
                              <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Form.Item name="name" label="全称" rules={[{ required: true }]}>
                          <Input
                            maxLength={100}
                            onBlur={() => {
                              if (!form.getFieldValue('snm')) {
                                form.setFieldValue('snm', form.getFieldValue('name')?.slice(0, 30));
                              }
                            }}
                          />
                        </Form.Item>
                        <Form.Item name="snm" label="简称">
                          <Input maxLength={30} />
                        </Form.Item>
                        <Row gutter={8}>
                          <Col span={12}>
                            <Form.Item name="cus_are" label="区域">
                              <Input maxLength={20} />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item name="uni_no" label="纳税人识别号">
                              <Input maxLength={20} />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={8}>
                          <Col span={12}>
                            <Form.Item name="cnt_man1" label="联络人1">
                              <Input />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item name="cnt_man2" label="联络人2">
                              <Input />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={8}>
                          <Col span={12}>
                            <Form.Item name="tel1" label="电话1">
                              <Input />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item name="tel2" label="电话2">
                              <Input />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Form.Item name="adr2" label="公司地址">
                          <Input.TextArea rows={2} />
                        </Form.Item>
                        <Form.Item name="biz_dsc" label="行业别">
                          <Input maxLength={10} />
                        </Form.Item>
                      </>
                    ),
                  },
                  {
                    key: 'trade',
                    label: '交易',
                    children: (
                      <>
                        <Row gutter={8}>
                          <Col span={12}>
                            <Form.Item name="cur_id" label="使用币别">
                              <Input placeholder="如 RMB" maxLength={4} />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item name="id1_tax" label="扣税类别">
                              <Select options={TAX_OPTIONS} />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Form.Item name="sal_no" label="责任业务">
                          <LookupField
                            value={form.getFieldValue('sal_no')}
                            display={salDisplay(form.getFieldValue('sal_no'))}
                            onOpen={() => setSalPicker(true)}
                          />
                        </Form.Item>
                        <Form.Item name="bnk_name" label="开户银行">
                          <Input />
                        </Form.Item>
                        <Form.Item name="id_code" label="银行账号">
                          <Input />
                        </Form.Item>
                        <Form.Item name="rem" label="摘要">
                          <Input.TextArea rows={2} />
                        </Form.Item>
                      </>
                    ),
                  },
                ]}
              />
              <Space style={{ marginTop: 12 }}>
                <Button type="primary" htmlType="submit">
                  存盘
                </Button>
                {editing && <span style={{ color: '#1677ff' }}>编辑中: {editing}</span>}
              </Space>
            </Form>
          </Card>
        </Col>
        <Col span={10}>
          <Card title="列表">
            <Table
              rowKey="cus_no"
              size="small"
              dataSource={items}
              pagination={{ pageSize: 12 }}
              onRow={(r) => ({ onDoubleClick: () => onRow(r) })}
              columns={[
                { title: '代号', dataIndex: 'cus_no', width: 90 },
                { title: '简称', dataIndex: 'snm', ellipsis: true },
                { title: '类别', dataIndex: 'obj_id', width: 50 },
              ]}
            />
            <div style={{ color: '#888', marginTop: 8 }}>双击行可编辑</div>
          </Card>
        </Col>
      </Row>

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
          { title: '代号', dataIndex: 'sal_no', width: 100 },
          { title: '姓名', dataIndex: 'name' },
          { title: '部门', dataIndex: 'dep', width: 80 },
        ]}
      />
    </div>
  );
}
