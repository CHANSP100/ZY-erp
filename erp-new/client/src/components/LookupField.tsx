import { Button, Input, Space } from 'antd';
import { EllipsisOutlined } from '@ant-design/icons';

type LookupFieldProps = {
  value?: string;
  display?: string;
  placeholder?: string;
  readOnly?: boolean;
  onOpen: () => void;
  onChange?: (value: string) => void;
};

/** 输入框 + 开窗按钮（统一风格） */
export default function LookupField({
  value,
  display,
  placeholder,
  readOnly = true,
  onOpen,
  onChange,
}: LookupFieldProps) {
  return (
    <Space.Compact style={{ width: '100%' }}>
      <Input
        value={display ?? value ?? ''}
        placeholder={placeholder}
        readOnly={readOnly}
        onChange={readOnly ? undefined : (e) => onChange?.(e.target.value)}
      />
      <Button icon={<EllipsisOutlined />} onClick={onOpen} title="开窗" />
    </Space.Compact>
  );
}
