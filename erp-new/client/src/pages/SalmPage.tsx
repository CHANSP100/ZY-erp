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
import { api, type Dept, type Salm } from '../api';

const SEX_OPTIONS = [
  { value: 'T', label: '男' },
  { value: 'F', label: '女' },
];

export default function SalmPage() {
  const [form] = Form.useForm<Salm>();
  const [items, setItems] = useState<Salm[]>([]);
  const [depts, setDepts] = useState<Dept[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [deptPicker, setDeptPicker] = useState(false);
  const [upSalPicker, setUpSalPicker] = useState(false);

  const depVal = Form.useWatch('dep', form);
  const upSalVal = Form.useWatch('up_sal_no', form);

  const load = async () => {
    const [s, d] = await Promise.all([api.salmList({ limit: 200 }), api.deptList()]);
    setItems(s.data);
    setDepts(d.data);
  };

  useEffect(() => {
    load().catch(() => message.error('加载员工失败'));
  }, []);

  const onNew = () => {
    form.resetFields();
    setEditing(null);
  };

  const onSave = async () => {
    const v = await form.validateFields();
    const payload = {
      ...v,
      bth: v.bth ? (v.bth as unknown as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
      dut_in_d: v.dut_in_d ? (v.dut_in_d as unknown as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
      dut_ot_d: v.dut_ot_d ? (v.dut_ot_d as unknown as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
    };
    try {
      if (editing) {
        await api.updateSalm(editing, payload);
        message.success('更新成功');
      } else {
        await api.createSalm(payload);
        message.success('存盘成功');
        onNew();
      }
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      message.error(err.response?.data?.error || '存盘失败');
    }
  };

  const onRow = (r: Salm) => {
    setEditing(r.sal_no);
    form.setFieldsValue({
      ...r,
      bth: r.bth ? dayjs(r.bth) : undefined,
      dut_in_d: r.dut_in_d ? dayjs(r.dut_in_d) : undefined,
      dut_ot_d: r.dut_ot_d ? dayjs(r.dut_ot_d) : undefined,
    } as unknown as Salm);
  };

  const deptLabel = (dep?: string) => {
    const d = depts.find((x) => x.dep === dep);
    return d ? `${d.dep} ${d.name || ''}` : dep || '';
  };

  const salLabel = (sal?: string) => {
    const s = items.find((x) => x.sal_no === sal);
    return s ? `${s.sal_no} ${s.name || ''}` : sal || '';
  };

  return (
    <div style={{ padding: 16 }}>
      <Row gutter={16}>
        <Col span={14}>
          <Card
            title="员工资料"
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
              <Tabs
                items={[
                  {
                    key: 'base',
                    label: '基本',
                    children: (
                      <>
                        <Row gutter={8}>
                          <Col span={8}>
                            <Form.Item name="sal_no" label="员工代号" rules={[{ required: true }]}>
                              <Input maxLength={12} disabled={!!editing} />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item name="name" label="名称" rules={[{ required: true }]}>
                              <Input maxLength={50} />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item name="sex" label="性别">
                              <Select allowClear options={SEX_OPTIONS} />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={8}>
                          <Col span={8}>
                            <Form.Item name="eng_name" label="英文名称">
                              <Input maxLength={40} />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item name="name_py" label="助记码">
                              <Input maxLength={50} />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item name="pos" label="职称">
                              <Input maxLength={20} />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={8}>
                          <Col span={12}>
                            <Form.Item name="dep" label="部门">
                              <LookupField display={deptLabel(depVal)} onOpen={() => setDeptPicker(true)} />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item name="up_sal_no" label="上级业务">
                              <LookupField
                                display={salLabel(upSalVal)}
                                onOpen={() => setUpSalPicker(true)}
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                      </>
                    ),
                  },
                  {
                    key: 'contact',
                    label: '联络',
                    children: (
                      <>
                        <Row gutter={8}>
                          <Col span={12}>
                            <Form.Item name="tel1" label="电话">
                              <Input maxLength={20} />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item name="tel2" label="手机">
                              <Input maxLength={20} />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Form.Item name="e_mail" label="电子邮件">
                          <Input maxLength={50} />
                        </Form.Item>
                        <Form.Item name="con_adr" label="联络地址">
                          <Input maxLength={120} />
                        </Form.Item>
                      </>
                    ),
                  },
                  {
                    key: 'job',
                    label: '任职',
                    children: (
                      <>
                        <Form.Item name="id_num" label="身份证号">
                          <Input maxLength={20} />
                        </Form.Item>
                        <Row gutter={8}>
                          <Col span={8}>
                            <Form.Item name="bth" label="生日">
                              <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item name="dut_in_d" label="到职日">
                              <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item name="dut_ot_d" label="离职日">
                              <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Form.Item name="rem" label="摘要">
                          <Input.TextArea rows={2} />
                        </Form.Item>
                      </>
                    ),
                  },
                ]}
              />
            </Form>
          </Card>
        </Col>
        <Col span={10}>
          <Card title="员工列表">
            <Table
              rowKey="sal_no"
              size="small"
              dataSource={items}
              pagination={{ pageSize: 12 }}
              onRow={(r) => ({ onDoubleClick: () => onRow(r) })}
              columns={[
                { title: '代号', dataIndex: 'sal_no', width: 80 },
                { title: '名称', dataIndex: 'name', ellipsis: true },
                { title: '部门', dataIndex: 'dep', width: 70 },
                { title: '职称', dataIndex: 'pos', width: 80, ellipsis: true },
                { title: '电话', dataIndex: 'tel1', width: 100 },
              ]}
            />
            <div style={{ color: '#888', marginTop: 8 }}>双击行可编辑</div>
          </Card>
        </Col>
      </Row>

      <LookupModal
        open={deptPicker}
        title="选择部门"
        rowKey="dep"
        dataSource={depts}
        searchKeys={['dep', 'name']}
        onCancel={() => setDeptPicker(false)}
        onSelect={(r) => {
          form.setFieldValue('dep', r.dep);
          setDeptPicker(false);
        }}
        columns={[
          { title: '代号', dataIndex: 'dep', width: 90 },
          { title: '名称', dataIndex: 'name' },
        ]}
      />

      <LookupModal
        open={upSalPicker}
        title="选择上级业务"
        rowKey="sal_no"
        dataSource={items.filter((s) => s.sal_no !== editing)}
        searchKeys={['sal_no', 'name']}
        onCancel={() => setUpSalPicker(false)}
        onSelect={(r) => {
          form.setFieldValue('up_sal_no', r.sal_no);
          setUpSalPicker(false);
        }}
        columns={[
          { title: '代号', dataIndex: 'sal_no', width: 90 },
          { title: '姓名', dataIndex: 'name' },
        ]}
      />
    </div>
  );
}
