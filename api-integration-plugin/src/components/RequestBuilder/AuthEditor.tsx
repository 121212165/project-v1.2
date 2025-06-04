/**
 * 认证编辑器组件
 * 用于配置HTTP请求的认证信息
 */

import React, { useState } from 'react';
import { Card, Select, Input, Typography, Space, Switch, Divider } from 'antd';
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';

const { Option } = Select;
const { Text } = Typography;
const { Password } = Input;

export type AuthType = 'none' | 'basic' | 'bearer' | 'api-key' | 'oauth2';

export interface AuthConfig {
  type: AuthType;
  basic?: {
    username: string;
    password: string;
  };
  bearer?: {
    token: string;
  };
  apiKey?: {
    key: string;
    value: string;
    addTo: 'header' | 'query';
  };
  oauth2?: {
    accessToken: string;
    tokenType?: string;
  };
}

interface AuthEditorProps {
  auth: AuthConfig;
  onChange: (auth: AuthConfig) => void;
  disabled?: boolean;
}

export const AuthEditor: React.FC<AuthEditorProps> = ({
  auth,
  onChange,
  disabled = false,
}) => {
  const [currentAuthType, setCurrentAuthType] = useState<AuthType>(auth.type);

  const handleAuthTypeChange = (type: AuthType) => {
    setCurrentAuthType(type);
    const newAuth: AuthConfig = { type };
    
    // 初始化对应类型的默认值
    switch (type) {
      case 'basic':
        newAuth.basic = { username: '', password: '' };
        break;
      case 'bearer':
        newAuth.bearer = { token: '' };
        break;
      case 'api-key':
        newAuth.apiKey = { key: '', value: '', addTo: 'header' };
        break;
      case 'oauth2':
        newAuth.oauth2 = { accessToken: '', tokenType: 'Bearer' };
        break;
    }
    
    onChange(newAuth);
  };

  const updateAuthConfig = (updates: Partial<AuthConfig>) => {
    onChange({ ...auth, ...updates });
  };

  const renderAuthEditor = () => {
    switch (currentAuthType) {
      case 'none':
        return (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            <Text type="secondary">此请求不需要认证</Text>
          </div>
        );

      case 'basic':
        return (
          <div>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Text strong>用户名:</Text>
                <Input
                  value={auth.basic?.username || ''}
                  onChange={(e) => updateAuthConfig({
                    basic: { ...auth.basic, username: e.target.value, password: auth.basic?.password || '' }
                  })}
                  placeholder="输入用户名"
                  disabled={disabled}
                  style={{ marginTop: 8 }}
                />
              </div>
              <div>
                <Text strong>密码:</Text>
                <Password
                  value={auth.basic?.password || ''}
                  onChange={(e) => updateAuthConfig({
                    basic: { ...auth.basic, password: e.target.value, username: auth.basic?.username || '' }
                  })}
                  placeholder="输入密码"
                  disabled={disabled}
                  style={{ marginTop: 8 }}
                  iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                />
              </div>
            </Space>
          </div>
        );

      case 'bearer':
        return (
          <div>
            <Text strong>Bearer Token:</Text>
            <Password
              value={auth.bearer?.token || ''}
              onChange={(e) => updateAuthConfig({
                bearer: { token: e.target.value }
              })}
              placeholder="输入Bearer Token"
              disabled={disabled}
              style={{ marginTop: 8 }}
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            />
          </div>
        );

      case 'api-key':
        return (
          <div>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Text strong>API Key 名称:</Text>
                <Input
                  value={auth.apiKey?.key || ''}
                  onChange={(e) => updateAuthConfig({
                    apiKey: { 
                      ...auth.apiKey, 
                      key: e.target.value, 
                      value: auth.apiKey?.value || '',
                      addTo: auth.apiKey?.addTo || 'header'
                    }
                  })}
                  placeholder="例如: X-API-Key"
                  disabled={disabled}
                  style={{ marginTop: 8 }}
                />
              </div>
              <div>
                <Text strong>API Key 值:</Text>
                <Password
                  value={auth.apiKey?.value || ''}
                  onChange={(e) => updateAuthConfig({
                    apiKey: { 
                      ...auth.apiKey, 
                      value: e.target.value,
                      key: auth.apiKey?.key || '',
                      addTo: auth.apiKey?.addTo || 'header'
                    }
                  })}
                  placeholder="输入API Key值"
                  disabled={disabled}
                  style={{ marginTop: 8 }}
                  iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                />
              </div>
              <div>
                <Text strong>添加到:</Text>
                <Select
                  value={auth.apiKey?.addTo || 'header'}
                  onChange={(value) => updateAuthConfig({
                    apiKey: { 
                      ...auth.apiKey, 
                      addTo: value,
                      key: auth.apiKey?.key || '',
                      value: auth.apiKey?.value || ''
                    }
                  })}
                  disabled={disabled}
                  style={{ width: '100%', marginTop: 8 }}
                >
                  <Option value="header">请求头 (Header)</Option>
                  <Option value="query">查询参数 (Query Parameter)</Option>
                </Select>
              </div>
            </Space>
          </div>
        );

      case 'oauth2':
        return (
          <div>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Text strong>Access Token:</Text>
                <Password
                  value={auth.oauth2?.accessToken || ''}
                  onChange={(e) => updateAuthConfig({
                    oauth2: { 
                      ...auth.oauth2, 
                      accessToken: e.target.value,
                      tokenType: auth.oauth2?.tokenType || 'Bearer'
                    }
                  })}
                  placeholder="输入Access Token"
                  disabled={disabled}
                  style={{ marginTop: 8 }}
                  iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                />
              </div>
              <div>
                <Text strong>Token Type:</Text>
                <Input
                  value={auth.oauth2?.tokenType || 'Bearer'}
                  onChange={(e) => updateAuthConfig({
                    oauth2: { 
                      ...auth.oauth2, 
                      tokenType: e.target.value,
                      accessToken: auth.oauth2?.accessToken || ''
                    }
                  })}
                  placeholder="Token类型 (通常为Bearer)"
                  disabled={disabled}
                  style={{ marginTop: 8 }}
                />
              </div>
            </Space>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="auth-editor">
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Text strong>认证类型:</Text>
          <Select
            value={currentAuthType}
            onChange={handleAuthTypeChange}
            disabled={disabled}
            style={{ width: 200 }}
          >
            <Option value="none">无认证</Option>
            <Option value="basic">Basic Auth</Option>
            <Option value="bearer">Bearer Token</Option>
            <Option value="api-key">API Key</Option>
            <Option value="oauth2">OAuth 2.0</Option>
          </Select>
        </Space>
      </div>

      <Divider style={{ margin: '16px 0' }} />

      {renderAuthEditor()}
    </div>
  );
};

export default AuthEditor;