/**
 * API请求构建器组件
 * 提供完整的HTTP请求构建界面
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Tabs,
  Space,
  Row,
  Col,
  Typography,
  Divider,
  message,
  Spin,
} from 'antd';
import {
  PlayCircleOutlined,
  SaveOutlined,
  CopyOutlined,
  HistoryOutlined,
  CodeOutlined,
} from '@ant-design/icons';

import { HttpRequestModel, HttpResponseModel, HttpMethod, RequestBodyType } from '@/types/api';
import { HttpClient } from '@/core/request/HttpClient';
import { CodeGenerator } from '@/core/codegen/CodeGenerator';
import { generateId } from '@/utils/helpers';

import { HeadersEditor } from './HeadersEditor';
import { QueryParamsEditor } from './QueryParamsEditor';
import { RequestBodyEditor } from './RequestBodyEditor';
import { AuthEditor } from './AuthEditor';
import { ResponseViewer } from './ResponseViewer';
import { CodeGeneratorModal } from './CodeGeneratorModal';
import { RequestHistoryDrawer } from './RequestHistoryDrawer';

const { Title } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

interface RequestBuilderProps {
  initialRequest?: Partial<HttpRequestModel>;
  onRequestSave?: (request: HttpRequestModel) => void;
  onResponseReceived?: (response: HttpResponseModel) => void;
}

export const RequestBuilder: React.FC<RequestBuilderProps> = ({
  initialRequest,
  onRequestSave,
  onResponseReceived,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<HttpResponseModel | null>(null);
  const [showCodeGenerator, setShowCodeGenerator] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('params');

  // 请求状态
  const [request, setRequest] = useState<HttpRequestModel>(() => ({
    id: generateId(),
    name: 'New Request',
    method: HttpMethod.GET,
    url: '',
    headers: [],
    queryParams: [],
    body: {
      type: RequestBodyType.NONE,
      raw: '',
      formData: [],
      urlEncoded: [],
      binary: null,
      graphql: null,
    },
    auth: {
      type: 'none',
    },
    settings: {
      timeout: 30000,
      followRedirects: true,
      validateSSL: true,
    },
    ...initialRequest,
  }));

  // HTTP客户端和代码生成器实例
  const httpClient = useMemo(() => new HttpClient(), []);
  const codeGenerator = useMemo(() => new CodeGenerator(), []);

  /**
   * 执行HTTP请求
   */
  const handleSendRequest = useCallback(async () => {
    try {
      // 验证表单
      await form.validateFields(['url']);
      
      if (!request.url.trim()) {
        message.error('请输入请求URL');
        return;
      }

      setLoading(true);
      setResponse(null);

      // 执行请求
      const result = await httpClient.executeRequest(request);
      setResponse(result);
      
      // 通知父组件
      onResponseReceived?.(result);
      
      message.success('请求执行成功');
    } catch (error) {
      console.error('Request failed:', error);
      message.error('请求执行失败');
    } finally {
      setLoading(false);
    }
  }, [request, form, httpClient, onResponseReceived]);

  /**
   * 保存请求
   */
  const handleSaveRequest = useCallback(() => {
    if (!request.name.trim()) {
      message.error('请输入请求名称');
      return;
    }
    
    onRequestSave?.(request);
    message.success('请求已保存');
  }, [request, onRequestSave]);

  /**
   * 复制请求为cURL
   */
  const handleCopyAsCurl = useCallback(() => {
    try {
      const curlCode = codeGenerator.generateCode(request, 'curl');
      navigator.clipboard.writeText(curlCode.code);
      message.success('cURL命令已复制到剪贴板');
    } catch (error) {
      message.error('复制失败');
    }
  }, [request, codeGenerator]);

  /**
   * 更新请求字段
   */
  const updateRequest = useCallback((updates: Partial<HttpRequestModel>) => {
    setRequest(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * 更新URL
   */
  const handleUrlChange = useCallback((url: string) => {
    updateRequest({ url });
  }, [updateRequest]);

  /**
   * 更新请求方法
   */
  const handleMethodChange = useCallback((method: HttpMethod) => {
    updateRequest({ method });
  }, [updateRequest]);

  /**
   * 更新请求名称
   */
  const handleNameChange = useCallback((name: string) => {
    updateRequest({ name });
  }, [updateRequest]);

  return (
    <div className="request-builder">
      <Card>
        {/* 请求基本信息 */}
        <div className="request-header">
          <Row gutter={16} align="middle">
            <Col span={4}>
              <Title level={4} style={{ margin: 0 }}>
                请求构建器
              </Title>
            </Col>
            <Col span={12}>
              <Input
                placeholder="请求名称"
                value={request.name}
                onChange={(e) => handleNameChange(e.target.value)}
                style={{ marginBottom: 16 }}
              />
            </Col>
            <Col span={8}>
              <Space>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  loading={loading}
                  onClick={handleSendRequest}
                >
                  发送
                </Button>
                <Button
                  icon={<SaveOutlined />}
                  onClick={handleSaveRequest}
                >
                  保存
                </Button>
                <Button
                  icon={<CopyOutlined />}
                  onClick={handleCopyAsCurl}
                >
                  复制cURL
                </Button>
                <Button
                  icon={<CodeOutlined />}
                  onClick={() => setShowCodeGenerator(true)}
                >
                  生成代码
                </Button>
                <Button
                  icon={<HistoryOutlined />}
                  onClick={() => setShowHistory(true)}
                >
                  历史
                </Button>
              </Space>
            </Col>
          </Row>

          {/* URL输入区域 */}
          <Form form={form} layout="vertical">
            <Row gutter={16}>
              <Col span={4}>
                <Form.Item>
                  <Select
                    value={request.method}
                    onChange={handleMethodChange}
                    style={{ width: '100%' }}
                  >
                    {Object.values(HttpMethod).map(method => (
                      <Option key={method} value={method}>
                        {method}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={20}>
                <Form.Item
                  name="url"
                  rules={[
                    { required: true, message: '请输入请求URL' },
                    { type: 'url', message: '请输入有效的URL' },
                  ]}
                >
                  <Input
                    placeholder="https://api.example.com/endpoint"
                    value={request.url}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    onPressEnter={handleSendRequest}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </div>

        <Divider />

        {/* 请求配置选项卡 */}
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="查询参数" key="params">
            <QueryParamsEditor
              params={request.queryParams}
              onChange={(queryParams) => updateRequest({ queryParams })}
            />
          </TabPane>
          
          <TabPane tab="请求头" key="headers">
            <HeadersEditor
              headers={request.headers}
              onChange={(headers) => updateRequest({ headers })}
            />
          </TabPane>
          
          <TabPane tab="请求体" key="body">
            <RequestBodyEditor
              body={request.body}
              method={request.method}
              onChange={(body) => updateRequest({ body })}
            />
          </TabPane>
          
          <TabPane tab="认证" key="auth">
            <AuthEditor
              auth={request.auth}
              onChange={(auth) => updateRequest({ auth })}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* 响应区域 */}
      {(response || loading) && (
        <Card title="响应" style={{ marginTop: 16 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>正在发送请求...</div>
            </div>
          ) : (
            response && <ResponseViewer response={response} />
          )}
        </Card>
      )}

      {/* 代码生成器模态框 */}
      <CodeGeneratorModal
        visible={showCodeGenerator}
        request={request}
        onClose={() => setShowCodeGenerator(false)}
      />

      {/* 请求历史抽屉 */}
      <RequestHistoryDrawer
        visible={showHistory}
        onClose={() => setShowHistory(false)}
        onRequestSelect={(selectedRequest) => {
          setRequest(selectedRequest);
          setShowHistory(false);
        }}
      />
    </div>
  );
};

export default RequestBuilder;