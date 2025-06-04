/**
 * 响应查看器组件
 * 用于显示HTTP响应的详细信息
 */

import React, { useState, useMemo } from 'react';
import {
  Tabs,
  Card,
  Typography,
  Tag,
  Space,
  Table,
  Button,
  message,
  Row,
  Col,
  Statistic,
  Descriptions,
  Input,
} from 'antd';
import {
  CopyOutlined,
  DownloadOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Editor } from '@monaco-editor/react';

import { HttpResponseModel } from '@/types/api';
import { formatBytes, formatDuration } from '@/utils/helpers';

const { TabPane } = Tabs;
const { Text, Title } = Typography;
const { TextArea } = Input;

interface ResponseViewerProps {
  response: HttpResponseModel;
}

export const ResponseViewer: React.FC<ResponseViewerProps> = ({ response }) => {
  const [activeTab, setActiveTab] = useState('body');
  const [searchText, setSearchText] = useState('');
  const [bodyFormat, setBodyFormat] = useState<'raw' | 'formatted'>('formatted');

  /**
   * 获取状态码颜色
   */
  const getStatusColor = (status: number): string => {
    if (status >= 200 && status < 300) return 'success';
    if (status >= 300 && status < 400) return 'warning';
    if (status >= 400 && status < 500) return 'error';
    if (status >= 500) return 'error';
    return 'default';
  };

  /**
   * 获取状态图标
   */
  const getStatusIcon = (status: number) => {
    if (status >= 200 && status < 300) return <CheckCircleOutlined />;
    if (status >= 300 && status < 400) return <WarningOutlined />;
    return <CloseCircleOutlined />;
  };

  /**
   * 格式化响应体
   */
  const formattedBody = useMemo(() => {
    if (!response.body) return '';
    
    try {
      // 尝试解析为JSON并格式化
      const parsed = JSON.parse(response.body);
      return JSON.stringify(parsed, null, 2);
    } catch {
      // 如果不是JSON，返回原始内容
      return response.body;
    }
  }, [response.body]);

  /**
   * 检测内容类型
   */
  const contentType = useMemo(() => {
    const ct = response.headers['content-type'] || response.headers['Content-Type'] || '';
    return ct.toLowerCase();
  }, [response.headers]);

  /**
   * 获取编辑器语言
   */
  const getEditorLanguage = (): string => {
    if (contentType.includes('json')) return 'json';
    if (contentType.includes('xml')) return 'xml';
    if (contentType.includes('html')) return 'html';
    if (contentType.includes('css')) return 'css';
    if (contentType.includes('javascript')) return 'javascript';
    return 'text';
  };

  /**
   * 复制响应体
   */
  const handleCopyBody = () => {
    navigator.clipboard.writeText(response.body);
    message.success('响应体已复制到剪贴板');
  };

  /**
   * 下载响应体
   */
  const handleDownloadBody = () => {
    const blob = new Blob([response.body], { type: contentType || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `response_${response.timestamp.replace(/[:.]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    message.success('响应体已下载');
  };

  /**
   * 准备响应头表格数据
   */
  const headerTableData = useMemo(() => {
    return Object.entries(response.headers)
      .filter(([key, value]) => {
        if (!searchText) return true;
        return key.toLowerCase().includes(searchText.toLowerCase()) ||
               value.toLowerCase().includes(searchText.toLowerCase());
      })
      .map(([key, value], index) => ({
        key: index,
        name: key,
        value: value,
      }));
  }, [response.headers, searchText]);

  /**
   * 响应头表格列定义
   */
  const headerColumns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: '30%',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '值',
      dataIndex: 'value',
      key: 'value',
      width: '70%',
      render: (text: string) => (
        <Text copyable={{ text }}>{text}</Text>
      ),
    },
  ];

  return (
    <div className="response-viewer">
      {/* 响应概览 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="状态码"
              value={response.status}
              prefix={getStatusIcon(response.status)}
              valueStyle={{ color: getStatusColor(response.status) === 'success' ? '#52c41a' : '#ff4d4f' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="响应时间"
              value={formatDuration(response.time)}
              suffix="ms"
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="响应大小"
              value={formatBytes(response.size)}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="状态文本"
              value={response.statusText}
              valueStyle={{ fontSize: '14px' }}
            />
          </Col>
        </Row>
      </Card>

      {/* 响应详情选项卡 */}
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        {/* 响应体 */}
        <TabPane tab="响应体" key="body">
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Button
                size="small"
                type={bodyFormat === 'formatted' ? 'primary' : 'default'}
                onClick={() => setBodyFormat('formatted')}
              >
                格式化
              </Button>
              <Button
                size="small"
                type={bodyFormat === 'raw' ? 'primary' : 'default'}
                onClick={() => setBodyFormat('raw')}
              >
                原始
              </Button>
              <Button
                size="small"
                icon={<CopyOutlined />}
                onClick={handleCopyBody}
              >
                复制
              </Button>
              <Button
                size="small"
                icon={<DownloadOutlined />}
                onClick={handleDownloadBody}
              >
                下载
              </Button>
              <Tag color={getStatusColor(response.status)}>
                {contentType || '未知类型'}
              </Tag>
            </Space>
          </div>

          {response.body ? (
            <div style={{ border: '1px solid #d9d9d9', borderRadius: 4 }}>
              {bodyFormat === 'formatted' && (contentType.includes('json') || contentType.includes('xml')) ? (
                <Editor
                  height="400px"
                  language={getEditorLanguage()}
                  value={formattedBody}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    fontSize: 14,
                  }}
                  theme="vs-light"
                />
              ) : (
                <TextArea
                  value={response.body}
                  readOnly
                  autoSize={{ minRows: 10, maxRows: 20 }}
                  style={{ border: 'none', resize: 'none' }}
                />
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
              无响应体内容
            </div>
          )}
        </TabPane>

        {/* 响应头 */}
        <TabPane tab={`响应头 (${Object.keys(response.headers).length})`} key="headers">
          <div style={{ marginBottom: 16 }}>
            <Input
              placeholder="搜索响应头..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
            />
          </div>
          
          <Table
            dataSource={headerTableData}
            columns={headerColumns}
            pagination={false}
            size="small"
            scroll={{ y: 400 }}
          />
        </TabPane>

        {/* 响应详情 */}
        <TabPane tab="详情" key="details">
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="请求ID">
              <Text copyable>{response.requestId}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="响应ID">
              <Text copyable>{response.id}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="时间戳">
              {new Date(response.timestamp).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="状态码">
              <Tag color={getStatusColor(response.status)}>
                {response.status} {response.statusText}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="响应时间">
              {formatDuration(response.time)}
            </Descriptions.Item>
            <Descriptions.Item label="响应大小">
              {formatBytes(response.size)}
            </Descriptions.Item>
            {response.redirects && response.redirects.length > 0 && (
              <Descriptions.Item label="重定向">
                {response.redirects.map((redirect, index) => (
                  <div key={index}>
                    <Text copyable>{redirect}</Text>
                  </div>
                ))}
              </Descriptions.Item>
            )}
            {response.error && (
              <Descriptions.Item label="错误信息">
                <Text type="danger">{response.error}</Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default ResponseViewer;