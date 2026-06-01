import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Upload,
  message,
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { api, type Indx, type Prdt, type Warehouse } from '../api';

export default function PrdtPage() {
  const [form] = Form.useForm<Prdt>();
  const [indxList, setIndxList] = useState<Indx[]>([]);
  const [whList, setWhList] = useState<Warehouse[]>([]);
  const [items, setItems] = useState<Prdt[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const loadBase = async () => {
    const [i, w, p] = await Promise.all([
      api.indxList(),
      api.warehouses(),
      api.prdtList({ limit: 100 }),
    ]);
    setIndxList(i.data.filter((x) => x.idx_no !== '0000000000'));
    setWhList(w.data);
    setItems(p.data);
  };

  useEffect(() => {
    loadBase().catch(() => message.error('加载失败'));
  }, []);

  const indxOptions = indxList.map((r) => ({
    value: r.idx_no,
    label: `${r.idx_no} ${r.name || ''}`,
  }));

  const onIdx1Change = async (idx1: string) => {
    form.setFieldValue('idx1', idx1);
    if (!editing) {
      try {
        const { data } = await api.nextPrdNo(idx1, form.getFieldValue('idx2'));
        form.setFieldValue('prd_no', data.prd_no);
      } catch {
        message.warning('无法生成流水号');
      }
    }
    const { data } = await api.prdtList({ idx1, limit: 50 });
    setItems(data);
  };

  const onSave = async () => {
    const v = await form.validateFields();
    try {
      if (editing) {
        await api.updatePrdt(editing, v);
        message.success('更新成功');
      } else {
        await api.createPrdt(v);
        message.success('存盘成功，品号已建立');
        form.resetFields();
        setEditing(null);
      }
      loadBase();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      message.error(err.response?.data?.error || '存盘失败');
    }
  };

  const openEdit = async (prdNo: string) => {
    const { data } = await api.getPrdt(prdNo);
    form.setFieldsValue(data);
    setEditing(prdNo);
  };

  const uploadPic = async (file: File) => {
    const { data } = await api.upload(file);
    form.setFieldValue('pic_path', data.path);
    return false;
  };

  const uploadDoc = async (file: File) => {
    const { data } = await api.upload(file);
    form.setFieldValue('doc_path', data.path);
    message.success(`已上传: ${data.filename}`);
    return false;
  };

  const picPath = Form.useWatch('pic_path', form);

  return (
    <div style={{ padding: 16 }}>
      <Row gutter={16}>
        <Col span={10}>
          <Card title="货品代号设定" extra={<Button onClick={() => { form.resetFields(); setEditing(null); }}>清空</Button>}>
            <Form form={form} layout="vertical">
              <Tabs
                items={[
                  {
                    key: 'main',
                    label: '基本',
                    children: (
                      <>
                        <Form.Item name="idx1" label="中类" rules={[{ required: true }]}>
                          <Space.Compact style={{ width: '100%' }}>
                            <Select
                              style={{ width: '100%' }}
                              options={indxOptions}
                              placeholder="选择中类"
                              onChange={onIdx1Change}
                              showSearch
                              optionFilterProp="label"
                            />
                            <Button onClick={() => setPickerOpen(true)}>开窗</Button>
                          </Space.Compact>
                        </Form.Item>
                        <Row gutter={8}>
                          <Col span={14}>
                            <Form.Item name="prd_no" label="货品代号">
                              <Input readOnly={!editing} placeholder="依中类自动流水" />
                            </Form.Item>
                          </Col>
                          <Col span={10}>
                            <Form.Item name="idx2" label="品号后缀" tooltip="新中类默认 03，如 35 类用 00">
                              <Input maxLength={4} placeholder="03" onBlur={() => {
                                const idx1 = form.getFieldValue('idx1');
                                if (idx1 && !editing) onIdx1Change(idx1);
                              }} />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Form.Item name="name" label="品名" rules={[{ required: true }]}>
                          <Input maxLength={100} />
                        </Form.Item>
                        <Form.Item name="spc" label="规格">
                          <Input.TextArea rows={2} />
                        </Form.Item>
                        <Form.Item name="ut" label="单位">
                          <Input maxLength={8} placeholder="如 KG、PCS" />
                        </Form.Item>
                        <Form.Item name="snm" label="简称">
                          <Input maxLength={20} />
                        </Form.Item>
                      </>
                    ),
                  },
                  {
                    key: 'other',
                    label: '其他',
                    children: (
                      <>
                        <Form.Item name="wh" label="预设仓库">
                          <Select
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            options={whList.map((w) => ({ value: w.wh, label: `${w.wh} ${w.name || ''}` }))}
                          />
                        </Form.Item>
                        <Form.Item name="valid_days" label="有效天数">
                          <InputNumber style={{ width: '100%' }} min={0} />
                        </Form.Item>
                        <Form.Item name="qty_min1" label="安全存量">
                          <InputNumber style={{ width: '100%' }} min={0} />
                        </Form.Item>
                        <Form.Item name="qty_max" label="库存上限">
                          <InputNumber style={{ width: '100%' }} min={0} />
                        </Form.Item>
                        <Form.Item name="rem" label="摘要">
                          <Input.TextArea rows={2} />
                        </Form.Item>
                      </>
                    ),
                  },
                  {
                    key: 'attach',
                    label: '图片/文档',
                    children: (
                      <>
                        <Form.Item name="pic_path" label="图片" tooltip="双击图片区上传">
                          <div
                            onDoubleClick={() => document.getElementById('pic-upload')?.click()}
                            style={{
                              border: '1px dashed #ccc',
                              height: 120,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              background: '#fafafa',
                            }}
                          >
                            {picPath ? (
                              <img src={picPath} alt="货品图" style={{ maxHeight: 110, maxWidth: '100%' }} />
                            ) : (
                              <span style={{ color: '#999' }}>双击上传图片</span>
                            )}
                          </div>
                          <input
                            id="pic-upload"
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) uploadPic(f);
                            }}
                          />
                        </Form.Item>
                        <Form.Item name="doc_path" label="文档">
                          <Upload beforeUpload={uploadDoc} maxCount={1} showUploadList={false}>
                            <Button icon={<UploadOutlined />}>上传文档</Button>
                          </Upload>
                          <Form.Item noStyle shouldUpdate>
                            {() =>
                              form.getFieldValue('doc_path') ? (
                                <div style={{ marginTop: 8 }}>
                                  <a href={form.getFieldValue('doc_path')} target="_blank" rel="noreferrer">
                                    已上传文档
                                  </a>
                                </div>
                              ) : null
                            }
                          </Form.Item>
                        </Form.Item>
                      </>
                    ),
                  },
                ]}
              />
              <Button type="primary" block onClick={onSave} style={{ marginTop: 12 }}>
                存盘
              </Button>
            </Form>
          </Card>
        </Col>
        <Col span={14}>
          <Card title="货品列表（最近）">
            <Table
              rowKey="prd_no"
              size="small"
              dataSource={items}
              pagination={{ pageSize: 15 }}
              onRow={(r) => ({ onDoubleClick: () => openEdit(r.prd_no) })}
              columns={[
                { title: '货品代号', dataIndex: 'prd_no', width: 130 },
                { title: '中类', dataIndex: 'idx1', width: 70 },
                { title: '品名', dataIndex: 'name', ellipsis: true },
                { title: '单位', dataIndex: 'ut', width: 60 },
                { title: '仓库', dataIndex: 'wh', width: 70 },
              ]}
            />
            <div style={{ color: '#888', marginTop: 8 }}>双击行可编辑</div>
          </Card>
        </Col>
      </Row>

      <Modal
        title="选择中类"
        open={pickerOpen}
        onCancel={() => setPickerOpen(false)}
        footer={null}
        width={480}
      >
        <Table
          rowKey="idx_no"
          size="small"
          dataSource={indxList}
          pagination={false}
          onRow={(r) => ({
            onClick: () => {
              onIdx1Change(r.idx_no);
              setPickerOpen(false);
            },
          })}
          columns={[
            { title: '代号', dataIndex: 'idx_no', width: 100 },
            { title: '名称', dataIndex: 'name' },
          ]}
        />
      </Modal>
    </div>
  );
}
