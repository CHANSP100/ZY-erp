import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Layout,
  Modal,
  Select,
  Table,
  Tree,
  message,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import dayjs from 'dayjs';
import { api, type Dept, type DeptTreeNode } from '../api';

function toDataNodes(nodes: DeptTreeNode[]): DataNode[] {
  return nodes.map((n) => ({
    key: n.dep,
    title: n.title || n.dep,
    children: n.children?.length ? toDataNodes(n.children) : undefined,
  }));
}

export default function DeptPage() {
  const [tree, setTree] = useState<DeptTreeNode[]>([]);
  const [list, setList] = useState<Dept[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form] = Form.useForm<Dept>();

  const load = async () => {
    const [t, l] = await Promise.all([api.deptTree(), api.deptList()]);
    setTree(t.data);
    setList(l.data);
  };

  useEffect(() => {
    load().catch(() => message.error('加载部门失败'));
  }, []);

  const filtered = selected
    ? list.filter((r) => r.up === selected || r.dep === selected)
    : list;

  const parentOptions = list.map((r) => ({ value: r.dep, label: `${r.dep} ${r.name || ''}` }));

  const onNew = () => {
    form.resetFields();
    setEditing(null);
    setOpen(true);
  };

  const onEdit = (r: Dept) => {
    setEditing(r.dep);
    form.setFieldsValue({
      ...r,
      stop_dd: r.stop_dd ? dayjs(r.stop_dd) : undefined,
    } as unknown as Dept);
    setOpen(true);
  };

  const onSave = async () => {
    const v = await form.validateFields();
    const payload = {
      ...v,
      stop_dd: v.stop_dd ? (v.stop_dd as unknown as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
    };
    try {
      if (editing) {
        await api.updateDept(editing, payload);
        message.success('更新成功');
      } else {
        await api.createDept(payload);
        message.success('存盘成功');
      }
      setOpen(false);
      form.resetFields();
      setEditing(null);
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      message.error(err.response?.data?.error || '保存失败');
    }
  };

  return (
    <Layout style={{ minHeight: 'calc(100vh - 64px)', background: '#f5f5f5' }}>
      <Layout.Sider width={280} theme="light" style={{ padding: 12, borderRight: '1px solid #eee' }}>
        <div style={{ marginBottom: 8, fontWeight: 600 }}>部门树</div>
        <Tree
          treeData={toDataNodes(tree)}
          onSelect={(keys) => setSelected((keys[0] as string) || null)}
          defaultExpandAll
        />
      </Layout.Sider>
      <Layout.Content style={{ padding: 16 }}>
        <Card
          title="部门列表"
          extra={
            <Button type="primary" onClick={onNew}>
              新增
            </Button>
          }
        >
          <Table
            rowKey="dep"
            size="small"
            dataSource={filtered}
            pagination={{ pageSize: 20 }}
            onRow={(r) => ({ onDoubleClick: () => onEdit(r) })}
            columns={[
              { title: '部门代号', dataIndex: 'dep', width: 100 },
              { title: '名称', dataIndex: 'name' },
              { title: '英文名称', dataIndex: 'eng_name', width: 120, ellipsis: true },
              { title: '上层部门', dataIndex: 'up', width: 100 },
              { title: '停用日期', dataIndex: 'stop_dd', width: 110 },
            ]}
          />
          <div style={{ color: '#888', marginTop: 8 }}>双击行可编辑</div>
        </Card>
      </Layout.Content>

      <Modal
        title={editing ? '修改部门' : '新增部门'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onSave}
        okText="存盘"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="dep" label="部门代号" rules={[{ required: true }]}>
            <Input maxLength={8} disabled={!!editing} />
          </Form.Item>
          <Form.Item name="name" label="名称">
            <Input maxLength={30} />
          </Form.Item>
          <Form.Item name="eng_name" label="英文名称">
            <Input maxLength={30} />
          </Form.Item>
          <Form.Item name="up" label="上层部门">
            <Select allowClear showSearch optionFilterProp="label" options={parentOptions} />
          </Form.Item>
          <Form.Item name="stop_dd" label="停用日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="rem" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
