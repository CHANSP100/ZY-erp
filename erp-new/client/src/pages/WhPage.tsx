import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Row,
  Space,
  Table,
  message,
} from 'antd';
import dayjs from 'dayjs';
import LookupField from '../components/LookupField';
import LookupModal from '../components/LookupModal';
import { api, type Dept, type WarehouseFull } from '../api';

export default function WhPage() {
  const [form] = Form.useForm<WarehouseFull>();
  const [items, setItems] = useState<WarehouseFull[]>([]);
  const [depts, setDepts] = useState<Dept[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [deptPicker, setDeptPicker] = useState(false);
  const [whPicker, setWhPicker] = useState(false);
  const depVal = Form.useWatch('dep', form);
  const upWhVal = Form.useWatch('up_wh', form);

  const load = async () => {
    const [w, d] = await Promise.all([api.whList(), api.deptList()]);
    setItems(w.data);
    setDepts(d.data);
  };

  useEffect(() => {
    load().catch(() => message.error('加载仓库失败'));
  }, []);

  const onNew = () => {
    form.resetFields();
    setEditing(null);
  };

  const onSave = async () => {
    const v = await form.validateFields();
    const payload = {
      ...v,
      stop_dd: v.stop_dd ? (v.stop_dd as unknown as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
    };
    try {
      if (editing) {
        await api.updateWh(editing, payload);
        message.success('更新成功');
      } else {
        await api.createWh(payload);
        message.success('存盘成功');
        onNew();
      }
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      message.error(err.response?.data?.error || '存盘失败');
    }
  };

  const onRow = (r: WarehouseFull) => {
    setEditing(r.wh);
    form.setFieldsValue({
      ...r,
      stop_dd: r.stop_dd ? dayjs(r.stop_dd) : undefined,
    } as unknown as WarehouseFull);
  };

  const deptLabel = (dep?: string) => {
    const d = depts.find((x) => x.dep === dep);
    return d ? `${d.dep} ${d.name || ''}` : dep || '';
  };

  const whLabel = (wh?: string) => {
    const w = items.find((x) => x.wh === wh);
    return w ? `${w.wh} ${w.name || ''}` : wh || '';
  };

  return (
    <div style={{ padding: 16 }}>
      <Row gutter={16}>
        <Col span={14}>
          <Card
            title="仓库资料"
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
                  <Form.Item name="wh" label="仓库代号" rules={[{ required: true }]}>
                    <Input maxLength={12} disabled={!!editing} />
                  </Form.Item>
                </Col>
                <Col span={16}>
                  <Form.Item name="name" label="名称">
                    <Input maxLength={100} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item name="dep" label="部门">
                    <LookupField
                      display={deptLabel(depVal)}
                      onOpen={() => setDeptPicker(true)}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="up_wh" label="上层仓库">
                    <LookupField
                      display={whLabel(upWhVal)}
                      onOpen={() => setWhPicker(true)}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="adr" label="地址">
                <Input.TextArea rows={2} />
              </Form.Item>
              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item name="tel_no" label="电话">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="stop_dd" label="停用日期">
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="rem" label="备注">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Form>
          </Card>
        </Col>
        <Col span={10}>
          <Card title="仓库列表">
            <Table
              rowKey="wh"
              size="small"
              dataSource={items}
              pagination={{ pageSize: 12 }}
              onRow={(r) => ({ onDoubleClick: () => onRow(r) })}
              columns={[
                { title: '代号', dataIndex: 'wh', width: 70 },
                { title: '名称', dataIndex: 'name', ellipsis: true },
                { title: '部门', dataIndex: 'dep', width: 70 },
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
        open={whPicker}
        title="选择上层仓库"
        rowKey="wh"
        dataSource={items.filter((w) => w.wh !== editing)}
        searchKeys={['wh', 'name']}
        onCancel={() => setWhPicker(false)}
        onSelect={(r) => {
          form.setFieldValue('up_wh', r.wh);
          setWhPicker(false);
        }}
        columns={[
          { title: '代号', dataIndex: 'wh', width: 90 },
          { title: '名称', dataIndex: 'name' },
        ]}
      />
    </div>
  );
}
