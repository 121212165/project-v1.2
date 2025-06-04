/**
 * 请求体编辑器组件
 * 用于编辑HTTP请求的请求体内容
 */

import React, { useState } from 'react';
import { Card, Select, Input, Typography, Space, Button, Upload, message } from 'antd';
import { UploadOutlined, CopyOutlined } from '@ant-design/icons';
import { Editor } from '@monaco-editor/react';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

export type RequestBodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'binary';

export interface FormDataItem {
  key: string;
  value: string;
  type: 'text' | 'file';
  enabled: boolean;
}

interface RequestBodyEditorProps {
  bodyType: RequestBodyType;
  body: string;
  formData?: FormDataItem[];
  onChange: (body: string, bodyType?: RequestBodyType, formData?: FormDataItem[]) => void;
  disabled?: boolean;
}

export const RequestBodyEditor: React.FC<RequestBodyEditorProps> = ({
  bodyType,
  body,
  formData = [],
  onChange,
  disabled = false,
}) => {
  const [currentBodyType, setCurrentBodyType] = useState<RequestBodyType>(bodyType);

  const handleBodyTypeChange = (type: RequestBodyType) => {
    setCurrentBodyType(type);
    onChange('', type, formData);
  };

  const handleBodyChange = (value: string) => {
    onChange(value, currentBodyType, formData);
  };

  const handleFormDataChange = (newFormData: FormDataItem[]) => {
    onChange(body, currentBodyType, newFormData);
  };

  const addFormDataItem = () => {
    const newFormData = [...formData, { key: '', value: '', type: 'text' as const, enabled: true }];
    handleFormDataChange(newFormData);
  };

  const removeFormDataItem = (index: number) => {
    const newFormData = formData.filter((_, i) => i !== index);
    handleFormDataChange(newFormData);
  };

  const updateFormDataItem = (index: number, field: keyof FormDataItem, value: string | boolean) => {
    const newFormData = [...formData];
    newFormData[index] = { ...newFormData[index], [field]: value };
    handleFormDataChange(newFormData);
  };

  const renderBodyEditor = () => {
    switch (currentBodyType) {
      case 'none':
        return (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            <Text type="secondary">此请求没有请求体</Text>
          </div>
        );

      case 'json':
        return (
          <div style={{ border: '1px solid #d9d9d9', borderRadius: 6 }}>
            <Editor
              height="300px"
              language="json"
              value={body}
              onChange={(value) => handleBodyChange(value || '')}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                readOnly: disabled,
              }}
            />
          </div>
        );

      case 'raw':
        return (
          <TextArea
            value={body}
            onChange={(e) => handleBodyChange(e.target.value)}
            placeholder="输入原始请求体内容"
            disabled={disabled}
            rows={10}
            style={{ fontFamily: 'monospace' }}
          />
        );

      case 'form-data':
      case 'x-www-form-urlencoded':
        return (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Button
                type="dashed"
                onClick={addFormDataItem}
                disabled={disabled}
                style={{ width: '100%' }}
              >
                添加字段
              </Button>
            </div>
            {formData.map((item, index) => (
              <div key={index} style={{ marginBottom: 8 }}>
                <Space.Compact style={{ display: 'flex', width: '100%' }}>
                  <Input
                    placeholder="字段名"
                    value={item.key}
                    onChange={(e) => updateFormDataItem(index, 'key', e.target.value)}
                    disabled={disabled}
                    style={{ flex: 1 }}
                  />
                  {currentBodyType === 'form-data' && (
                    <Select
                      value={item.type}
                      onChange={(value) => updateFormDataItem(index, 'type', value)}
                      disabled={disabled}
                      style={{ width: 80 }}
                    >
                      <Option value="text">文本</Option>
                      <Option value="file">文件</Option>
                    </Select>
                  )}
                  {item.type === 'file' ? (
                    <Upload
                      beforeUpload={() => false}
                      onChange={(info) => {
                        if (info.file) {
                          updateFormDataItem(index, 'value', info.file.name);
                        }
                      }}
                      disabled={disabled}
                    >
                      <Button icon={<UploadOutlined />} disabled={disabled}>
                        选择文件
                      </Button>
                    </Upload>
                  ) : (
                    <Input
                      placeholder="字段值"
                      value={item.value}
                      onChange={(e) => updateFormDataItem(index, 'value', e.target.value)}
                      disabled={disabled}
                      style={{ flex: 1 }}
                    />
                  )}
                  <Button
                    type="text"
                    danger
                    onClick={() => removeFormDataItem(index)}
                    disabled={disabled}
                  >
                    删除
                  </Button>
                </Space.Compact>
              </div>
            ))}
            {formData.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>
                <Text type="secondary">暂无表单字段，点击上方按钮添加</Text>
              </div>
            )}
          </div>
        );

      case 'binary':
        return (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Upload
              beforeUpload={() => false}
              onChange={(info) => {
                if (info.file) {
                  handleBodyChange(info.file.name);
                }
              }}
              disabled={disabled}
            >
              <Button icon={<UploadOutlined />} disabled={disabled}>
                选择二进制文件
              </Button>
            </Upload>
            {body && (
              <div style={{ marginTop: 16 }}>
                <Text>已选择文件: {body}</Text>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="request-body-editor">
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Text strong>请求体类型:</Text>
          <Select
            value={currentBodyType}
            onChange={handleBodyTypeChange}
            disabled={disabled}
            style={{ width: 200 }}
          >
            <Option value="none">无</Option>
            <Option value="json">JSON</Option>
            <Option value="form-data">form-data</Option>
            <Option value="x-www-form-urlencoded">x-www-form-urlencoded</Option>
            <Option value="raw">原始文本</Option>
            <Option value="binary">二进制</Option>
          </Select>
        </Space>
      </div>

      {renderBodyEditor()}
    </div>
  );
};

export default RequestBodyEditor;