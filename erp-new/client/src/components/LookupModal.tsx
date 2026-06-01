import { useMemo, useState } from 'react';
import { Input, Modal, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';

type LookupModalProps<T extends object> = {
  open: boolean;
  title: string;
  width?: number;
  rowKey: keyof T | ((row: T) => string);
  columns: ColumnsType<T>;
  dataSource: T[];
  searchKeys: (keyof T)[];
  searchPlaceholder?: string;
  onCancel: () => void;
  onSelect: (row: T) => void;
};

export default function LookupModal<T extends object>({
  open,
  title,
  width = 640,
  rowKey,
  columns,
  dataSource,
  searchKeys,
  searchPlaceholder = '模糊查询…',
  onCancel,
  onSelect,
}: LookupModalProps<T>) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    if (!kw) return dataSource;
    return dataSource.filter((row) =>
      searchKeys.some((k) => String(row[k] ?? '').toLowerCase().includes(kw))
    );
  }, [dataSource, q, searchKeys]);

  return (
    <Modal
      title={title}
      open={open}
      onCancel={() => {
        setQ('');
        onCancel();
      }}
      footer={null}
      width={width}
      destroyOnClose
    >
      <Input.Search
        allowClear
        placeholder={searchPlaceholder}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ marginBottom: 12 }}
      />
      <Table
        rowKey={rowKey as string}
        size="small"
        columns={columns}
        dataSource={filtered}
        pagination={{ pageSize: 8, showSizeChanger: false }}
        scroll={{ y: 320 }}
        onRow={(row) => ({
          onClick: () => {
            onSelect(row);
            setQ('');
          },
        })}
      />
    </Modal>
  );
}
