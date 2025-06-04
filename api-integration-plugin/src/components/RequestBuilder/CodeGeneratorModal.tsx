/**
 * 代码生成器模态框组件
 * 用于生成和显示不同语言的API请求代码
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Select,
  Button,
  Space,
  message,
  Card,
  Typography,
  Tabs,
  Tooltip,
  Row,
  Col,
  Switch,
  InputNumber,
  Input,
} from 'antd';
import {
  CopyOutlined,
  DownloadOutlined,
  SettingOutlined,
  CodeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Editor } from '@monaco-editor/react';

import { CodeGenerator } from '@/core/codegen/CodeGenerator';
import {
  RequestModel,
  CodegenLanguage,
  CodegenConfig,
  CodeGeneratorResult,
} from '@/types/api';

const { Option } = Select;
const { Text, Title } = Typography;
const { TabPane } = Tabs;

interface CodeGeneratorModalProps {
  visible: boolean;
  onCancel: () => void;
  request: RequestModel;
}

// 支持的语言配置
const LANGUAGE_OPTIONS = [
  { value: CodegenLanguage.JAVASCRIPT_AXIOS, label: 'JavaScript (Axios)', icon: '🟨' },
  { value: CodegenLanguage.JAVASCRIPT_FETCH, label: 'JavaScript (Fetch)', icon: '🟨' },
  { value: CodegenLanguage.PYTHON_REQUESTS, label: 'Python (Requests)', icon: '🐍' },
  { value: CodegenLanguage.CURL, label: 'cURL', icon: '💻' },
  { value: CodegenLanguage.CURL_BASH, label: 'cURL (Bash)', icon: '🐚' },
  { value: CodegenLanguage.CURL_CMD, label: 'cURL (CMD)', icon: '⚫' },
  { value: CodegenLanguage.CURL_POWERSHELL, label: 'cURL (PowerShell)', icon: '🔵' },
];

// 默认代码生成配置
const DEFAULT_CONFIG: CodegenConfig = {
  includeComments: true,
  includeErrorHandling: true,
  asyncAwait: true,
  timeout: 30000,
  followRedirects: true,
  verifySsl: true,
  indentSize: 2,
  indentType: 'spaces',
  lineEnding: 'lf',
};

export const CodeGeneratorModal: React.FC<CodeGeneratorModalProps> = ({
  visible,
  onCancel,
  request,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<CodegenLanguage>(
    CodegenLanguage.JAVASCRIPT_AXIOS
  );
  const [config, setConfig] = useState<CodegenConfig>(DEFAULT_CONFIG);
  const [generatedCode, setGeneratedCode] = useState<CodeGeneratorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const codeGenerator = useMemo(() => new CodeGenerator(), []);

  /**
   * 生成代码
   */
  const generateCode = async () => {
    if (!request) return;

    setLoading(true);
    try {
      const result = await codeGenerator.generateCode(request, selectedLanguage, config);
      setGeneratedCode(result);
    } catch (error) {
      message.error('代码生成失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 复制代码
   */
  const handleCopyCode = () => {
    if (!generatedCode?.code) return;
    
    navigator.clipboard.writeText(generatedCode.code);
    message.success('代码已复制到剪贴板');
  };

  /**
   * 下载代码
   */
  const handleDownloadCode = () => {
    if (!generatedCode?.code) return;

    const blob = new Blob([generatedCode.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${request.name || 'request'}.${generatedCode.fileExtension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    message.success('代码已下载');
  };

  /**
   * 获取编辑器语言
   */
  const getEditorLanguage = (): string => {
    switch (selectedLanguage) {
      case CodegenLanguage.JAVASCRIPT_AXIOS:
      case CodegenLanguage.JAVASCRIPT_FETCH:
        return 'javascript';
      case CodegenLanguage.PYTHON_REQUESTS:
        return 'python';
      case CodegenLanguage.CURL:
      case CodegenLanguage.CURL_BASH:
      case CodegenLanguage.CURL_CMD:
      case CodegenLanguage.CURL_POWERSHELL:
        return 'shell';
      default:
        return 'text';
    }
  };

  /**
   * 重置配置
   */
  const resetConfig = () => {
    setConfig(DEFAULT_CONFIG);
    message.success('配置已重置');
  };

  // 当语言或配置变化时重新生成代码
  useEffect(() => {
    if (visible && request) {
      generateCode();
    }
  }, [visible, selectedLanguage, config, request]);

  return (
    <Modal
      title={
        <Space>
          <CodeOutlined />
          代码生成器
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={900}
      footer={[
        <Button key="settings" icon={<SettingOutlined />} onClick={() => setShowSettings(!showSettings)}>
          {showSettings ? '隐藏设置' : '显示设置'}
        </Button>,
        <Button key="regenerate" icon={<ReloadOutlined />} onClick={generateCode} loading={loading}>
          重新生成
        </Button>,
        <Button key="copy" type="primary" icon={<CopyOutlined />} onClick={handleCopyCode}>
          复制代码
        </Button>,
        <Button key="download" icon={<DownloadOutlined />} onClick={handleDownloadCode}>
          下载
        </Button>,
      ]}
    >
      <div style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Text strong>选择语言:</Text>
            <Select
              value={selectedLanguage}
              onChange={setSelectedLanguage}
              style={{ width: '100%', marginTop: 8 }}
              placeholder="选择代码语言"
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <Option key={option.value} value={option.value}>
                  <Space>
                    <span>{option.icon}</span>
                    {option.label}
                  </Space>
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={12}>
            {generatedCode && (
              <div>
                <Text strong>生成信息:</Text>
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">文件扩展名: .{generatedCode.fileExtension}</Text>
                  <br />
                  <Text type="secondary">代码行数: {generatedCode.code.split('\n').length}</Text>
                  <br />
                  <Text type="secondary">字符数: {generatedCode.code.length}</Text>
                </div>
              </div>
            )}
          </Col>
        </Row>
      </div>

      {showSettings && (
        <Card size="small" style={{ marginBottom: 16 }} title="生成设置">
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text>包含注释:</Text>
                  <Switch
                    checked={config.includeComments}
                    onChange={(checked) => setConfig({ ...config, includeComments: checked })}
                    style={{ marginLeft: 8 }}
                  />
                </div>
                <div>
                  <Text>包含错误处理:</Text>
                  <Switch
                    checked={config.includeErrorHandling}
                    onChange={(checked) => setConfig({ ...config, includeErrorHandling: checked })}
                    style={{ marginLeft: 8 }}
                  />
                </div>
                <div>
                  <Text>使用 async/await:</Text>
                  <Switch
                    checked={config.asyncAwait}
                    onChange={(checked) => setConfig({ ...config, asyncAwait: checked })}
                    style={{ marginLeft: 8 }}
                  />
                </div>
              </Space>
            </Col>
            <Col span={8}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text>跟随重定向:</Text>
                  <Switch
                    checked={config.followRedirects}
                    onChange={(checked) => setConfig({ ...config, followRedirects: checked })}
                    style={{ marginLeft: 8 }}
                  />
                </div>
                <div>
                  <Text>验证SSL:</Text>
                  <Switch
                    checked={config.verifySsl}
                    onChange={(checked) => setConfig({ ...config, verifySsl: checked })}
                    style={{ marginLeft: 8 }}
                  />
                </div>
                <div>
                  <Text>超时时间 (ms):</Text>
                  <InputNumber
                    value={config.timeout}
                    onChange={(value) => setConfig({ ...config, timeout: value || 30000 })}
                    min={1000}
                    max={300000}
                    step={1000}
                    style={{ width: '100%', marginTop: 4 }}
                  />
                </div>
              </Space>
            </Col>
            <Col span={8}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text>缩进大小:</Text>
                  <InputNumber
                    value={config.indentSize}
                    onChange={(value) => setConfig({ ...config, indentSize: value || 2 })}
                    min={1}
                    max={8}
                    style={{ width: '100%', marginTop: 4 }}
                  />
                </div>
                <div>
                  <Text>缩进类型:</Text>
                  <Select
                    value={config.indentType}
                    onChange={(value) => setConfig({ ...config, indentType: value })}
                    style={{ width: '100%', marginTop: 4 }}
                  >
                    <Option value="spaces">空格</Option>
                    <Option value="tabs">制表符</Option>
                  </Select>
                </div>
                <div>
                  <Button size="small" onClick={resetConfig}>
                    重置配置
                  </Button>
                </div>
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      <div style={{ border: '1px solid #d9d9d9', borderRadius: 4 }}>
        {generatedCode ? (
          <Editor
            height="500px"
            language={getEditorLanguage()}
            value={generatedCode.code}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              fontSize: 14,
              lineNumbers: 'on',
              folding: true,
            }}
            theme="vs-light"
            loading={loading}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '100px 0', color: '#999' }}>
            {loading ? '正在生成代码...' : '请选择语言生成代码'}
          </div>
        )}
      </div>

      {generatedCode?.warnings && generatedCode.warnings.length > 0 && (
        <Card size="small" style={{ marginTop: 16 }} title="警告">
          {generatedCode.warnings.map((warning, index) => (
            <div key={index} style={{ color: '#faad14', marginBottom: 4 }}>
              ⚠️ {warning}
            </div>
          ))}
        </Card>
      )}
    </Modal>
  );
};

export default CodeGeneratorModal;