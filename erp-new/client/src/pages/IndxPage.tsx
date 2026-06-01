import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Layout,
  Modal,
  Row,
  Select,
  Table,
  Tree,
  message,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import dayjs from 'dayjs';
import { api, type Indx, type IndxTreeNode } from '../api';

function toDataNodes(nodes: IndxTreeNode[]): DataNode[] {
  return nodes.map((n) => ({
    key: n.idx_no,
    title: n.title || n.idx_no,
    children: n.children?.length ? toDataNodes(n.children) : undefined,
  }));
}

export default function IndxPage() {
  const [tree, setTree] = useState<IndxTreeNode[]>([]);
  const [list, setList] = useState<Indx[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<Indx>();

  const load = async () => {
    const [t, l] = await Promise.all([api.indxTree(), api.indxList()]);
    setTree(t.data);
    setList(l.data);
  };

  useEffect(() => {
    load().catch(() => message.error('加载中类失败'));
  }, []);

  const filtered = selected ? list.filter((r) => r.idx_up === selected || r.idx_no === selected) : list;

  const onSave = async () => {
    const v = await form.validateFields();
    const stop_dd = v.stop_dd ? (v.stop_dd as unknown as dayjs.Dayjs).format('YYYY-MM-DD') : undefined;
    try {
      await api.createIndx({ ...v, stop_dd } as Indx);
      message.success('存盘成功');
      setOpen(false);
      form.resetFields();
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      message.error(err.response?.data?.error || '保存失败');
    }
  };

  const parentOptions = list
    .filter((r) => r.idx_no !== '0000000000')
    .map((r) => ({ value: r.idx_no, label: `${r.idx_no} ${r.name || ''}` }));

  return (
    <Layout style={{ minHeight: 'calc(100vh - 64px)', background: '#f5f5f5' }}>
      <Layout.Sider width={280} theme="light" style={{ padding: 12, borderRight: '1px solid #eee' }}>
        <div style={{ marginBottom: 8, fontWeight: 600 }}>中类树</div>
        <Tree
          treeData={toDataNodes(tree)}
          onSelect={(keys) => setSelected((keys[0] as string) || null)}
          defaultExpandAll
        />
      </Layout.Sider>
      <Layout.Content style={{ padding: 16 }}>
        <Card
          title="中类列表"
          extra={
            <Button type="primary" onClick={() => setOpen(true)}>
              新增
            </Button>
          }
        >
          <Table
            rowKey="idx_no"
            size="small"
            dataSource={filtered}
            pagination={{ pageSize: 20 }}
            columns={[
              { title: '中类代号', dataIndex: 'idx_no', width: 120 },
              { title: '名称', dataIndex: 'name' },
              { title: '上层中类', dataIndex: 'idx_up', width: 120 },
              { title: '停用日期', dataIndex: 'stop_dd', width: 120 },
              { title: '备注', dataIndex: 'rem', ellipsis: true },
            ]}
          />
        </Card>
      </Layout.Content>

      <Modal title="新增中类" open={open} onCancel={() => setOpen(false)} onOk={onSave} okText="存盘">
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="idx_no" label="中类代号" rules={[{ required: true, message: '请输入代号' }]}>
                <Input placeholder="如 A01" maxLength={10} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="name" label="名称">
                <Input maxLength={50} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="idx_up" label="上层中类">
            <Select allowClear showSearch optionFilterProp="label" options={parentOptions} placeholder="开窗选择" />
          </Form.Item>
          <Form.Item name="stop_dd" label="停用日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="rem" label="备注">
            <Input.TextArea rows={2} maxLength={60} />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
