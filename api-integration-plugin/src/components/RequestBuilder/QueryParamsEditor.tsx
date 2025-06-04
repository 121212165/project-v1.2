/**
 * 查询参数编辑器组件
 * 用于编辑HTTP请求的查询参数
 */

import React from 'react';
import { Form, Input, Button, Space, Typography, Switch } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

const { Text } = Typography;

export interface KeyValuePair {
  key: string;
  value: string;
  enabled: boolean;
}

interface QueryParamsEditorProps {
  params: KeyValuePair[];
  onChange: (params: KeyValuePair[]) => void;
  disabled?: boolean;
}

export const QueryParamsEditor: React.FC<QueryParamsEditorProps> = ({
  params,
  onChange,
  disabled = false,
}) => {
  const handleAdd = () => {
    const newParams = [...params, { key: '', value: '', enabled: true }];
    onChange(newParams);
  };

  const handleRemove = (index: number) => {
    const newParams = params.filter((_, i) => i !== index);
    onChange(newParams);
  };

  const handleChange = (index: number, field: keyof KeyValuePair, value: string | boolean) => {
    const newParams = [...params];
    newParams[index] = { ...newParams[index], [field]: value };
    onChange(newParams);
  };

  return (
    <div className="query-params-editor">
      <div className="query-params-header" style={{ marginBottom: 16 }}>
        <Space>
          <Text strong>查询参数</Text>
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            disabled={disabled}
            size="small"
          >
            添加参数
          </Button>
        </Space>
      </div>

      <div className="query-params-list">
        {params.map((param, index) => (
          <div key={index} className="query-param-row" style={{ marginBottom: 8 }}>
            <Space.Compact style={{ display: 'flex', width: '100%' }}>
              <Switch
                checked={param.enabled}
                onChange={(checked) => handleChange(index, 'enabled', checked)}
                disabled={disabled}
                size="small"
                style={{ marginRight: 8, marginTop: 6 }}
              />
              <Input
                placeholder="参数名"
                value={param.key}
                onChange={(e) => handleChange(index, 'key', e.target.value)}
                disabled={disabled || !param.enabled}
                style={{ flex: 1 }}
              />
              <Input
                placeholder="参数值"
                value={param.value}
                onChange={(e) => handleChange(index, 'value', e.target.value)}
                disabled={disabled || !param.enabled}
                style={{ flex: 1 }}
              />
              <Button
                type="text"
                icon={<DeleteOutlined />}
                onClick={() => handleRemove(index)}
                disabled={disabled}
                danger
                style={{ flexShrink: 0 }}
              />
            </Space.Compact>
          </div>
        ))}
      </div>

      {params.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>
          <Text type="secondary">暂无查询参数，点击上方按钮添加</Text>
        </div>
      )}
    </div>
  );
};

export default QueryParamsEditor;