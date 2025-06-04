/**
 * 请求头编辑器组件
 * 用于编辑HTTP请求头
 */

import React from 'react';
import { Form, Input, Button, Space, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

const { Text } = Typography;

export interface KeyValuePair {
  key: string;
  value: string;
  enabled: boolean;
}

interface HeadersEditorProps {
  headers: KeyValuePair[];
  onChange: (headers: KeyValuePair[]) => void;
  disabled?: boolean;
}

export const HeadersEditor: React.FC<HeadersEditorProps> = ({
  headers,
  onChange,
  disabled = false,
}) => {
  const handleAdd = () => {
    const newHeaders = [...headers, { key: '', value: '', enabled: true }];
    onChange(newHeaders);
  };

  const handleRemove = (index: number) => {
    const newHeaders = headers.filter((_, i) => i !== index);
    onChange(newHeaders);
  };

  const handleChange = (index: number, field: keyof KeyValuePair, value: string | boolean) => {
    const newHeaders = headers.map((header, i) => {
      if (i === index) {
        return { ...header, [field]: value };
      }
      return header;
    });
    onChange(newHeaders);
  };

  return (
    <div className="headers-editor">
      <div className="headers-editor-header">
        <Text strong>请求头</Text>
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          disabled={disabled}
          size="small"
        >
          添加
        </Button>
      </div>
      
      <div className="headers-editor-list">
        {headers.map((header, index) => (
          <div key={index} className="header-item">
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder="键"
                value={header.key}
                onChange={(e) => handleChange(index, 'key', e.target.value)}
                disabled={disabled}
                style={{ width: '40%' }}
              />
              <Input
                placeholder="值"
                value={header.value}
                onChange={(e) => handleChange(index, 'value', e.target.value)}
                disabled={disabled}
                style={{ width: '50%' }}
              />
              <Button
                type="text"
                icon={<DeleteOutlined />}
                onClick={() => handleRemove(index)}
                disabled={disabled}
                danger
                style={{ width: '10%' }}
              />
            </Space.Compact>
          </div>
        ))}
      </div>
      
      {headers.length === 0 && (
        <div className="empty-state">
          <Text type="secondary">暂无请求头</Text>
        </div>
      )}
    </div>
  );
};

export default HeadersEditor;