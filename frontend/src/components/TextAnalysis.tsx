import React, { useState } from 'react';
import {
  Card,
  Input,
  Button,
  Alert,
  Spin,
  Typography,
  Space,
  Tag,
  Collapse,
  List,
  Progress,
  Tooltip,
  message,
  Switch,
  Select,
  Divider
} from 'antd';
import {
  SendOutlined,
  ClearOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  HistoryOutlined,
  RobotOutlined
} from '@ant-design/icons';
import { useAppStore, useTextAnalysis } from '@/store';
import { textUtils, colorUtils, copyToClipboard } from '@/utils';
import type { TextAnalysisResponse, AnalysisIssue } from '@/types';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

const TextAnalysis: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [useCache, setUseCache] = useState(true);
  const [scenario, setScenario] = useState<string>('general');
  const [sessionId, setSessionId] = useState<string>('');
  const { analyzeText, clearTextAnalysis } = useAppStore();
  const { loading, result, error } = useTextAnalysis();

  const handleAnalyze = async () => {
    const validation = textUtils.validateLength(inputText, 1, 10000);
    if (!validation.valid) {
      message.error(validation.error);
      return;
    }

    await analyzeText(inputText, {
      sessionId: sessionId || undefined,
      scenario,
      useCache
    });
  };

  const handleClear = () => {
    setInputText('');
    clearTextAnalysis();
  };

  const handleCopy = async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      message.success('已复制到剪贴板');
    } else {
      message.error('复制失败');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'warning':
        return <WarningOutlined style={{ color: '#faad14' }} />;
      case 'violation':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return null;
    }
  };

  const getSeverityColor = (severity: string) => {
    return colorUtils.getSeverityColor(severity as 'low' | 'medium' | 'high');
  };

  const renderIssues = (issues: AnalysisIssue[]) => {
    if (!issues.length) {
      return (
        <Alert
          message="未发现问题"
          description="您的内容符合规范要求"
          type="success"
          showIcon
        />
      );
    }

    return (
      <List
        dataSource={issues}
        renderItem={(issue, index) => (
          <List.Item key={index}>
            <Card size="small" style={{ width: '100%' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <Tag color={getSeverityColor(issue.severity)}>
                    {issue.severity === 'low' ? '低风险' : 
                     issue.severity === 'medium' ? '中风险' : '高风险'}
                  </Tag>
                  <Text strong>{issue.type}</Text>
                </Space>
                
                <Text>{issue.description}</Text>
                
                {issue.text && (
                  <Alert
                    message="问题文本"
                    description={issue.text}
                    type="warning"
                    size="small"
                  />
                )}
                
                {issue.suggestions.length > 0 && (
                  <div>
                    <Text strong>建议：</Text>
                    <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                      {issue.suggestions.map((suggestion, idx) => (
                        <li key={idx}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </Space>
            </Card>
          </List.Item>
        )}
      />
    );
  };

  const renderSuggestions = (suggestions: TextAnalysisResponse['suggestions']) => {
    if (!suggestions.length) return null;

    return (
      <List
        dataSource={suggestions}
        renderItem={(suggestion, index) => (
          <List.Item key={index}>
            <Card size="small" style={{ width: '100%' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text type="secondary">原文：</Text>
                  <Text delete>{suggestion.original}</Text>
                </div>
                <div>
                  <Text type="secondary">建议：</Text>
                  <Text mark>{suggestion.improved}</Text>
                  <Tooltip title="复制建议文本">
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => handleCopy(suggestion.improved)}
                    />
                  </Tooltip>
                </div>
                <Text type="secondary">{suggestion.reason}</Text>
              </Space>
            </Card>
          </List.Item>
        )}
      />
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>文本内容分析</Title>
      
      <Card title="输入文本" style={{ marginBottom: '24px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          {/* 分析选项 */}
          <Card size="small" style={{ marginBottom: 16 }} bodyStyle={{ padding: '12px 16px' }}>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>分析场景：</span>
                <Select
                  value={scenario}
                  onChange={setScenario}
                  style={{ width: 120 }}
                  size="small"
                >
                  <Select.Option value="general">通用</Select.Option>
                  <Select.Option value="social">社交媒体</Select.Option>
                  <Select.Option value="news">新闻资讯</Select.Option>
                  <Select.Option value="comment">用户评论</Select.Option>
                  <Select.Option value="product">产品描述</Select.Option>
                </Select>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>使用缓存：</span>
                <Switch
                  checked={useCache}
                  onChange={setUseCache}
                  size="small"
                  checkedChildren="开"
                  unCheckedChildren="关"
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>会话ID：</span>
                <Input
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="可选，用于多轮对话"
                  size="small"
                  style={{ width: 150 }}
                  prefix={<HistoryOutlined />}
                />
              </div>
            </Space>
          </Card>
          <TextArea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="请输入需要分析的文本内容..."
            rows={6}
            showCount
            maxLength={10000}
          />
          
          <Space>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleAnalyze}
              loading={loading}
              disabled={!inputText.trim()}
            >
              {loading ? '分析中...' : '开始分析'}
            </Button>
            
            <Button
              icon={<ClearOutlined />}
              onClick={handleClear}
              disabled={loading}
            >
              清空
            </Button>
          </Space>
        </Space>
      </Card>

      {error && (
        <Alert
          message="分析失败"
          description={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: '24px' }}
        />
      )}

      {loading && (
        <Card style={{ marginBottom: '24px' }}>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
            <div style={{ marginTop: '16px' }}>
              <Text>正在分析中，请稍候...</Text>
            </div>
          </div>
        </Card>
      )}

      {result && !loading && (
        <Card
          title={
            <Space>
              <RobotOutlined />
              <span>分析结果</span>
              {result?.cached && (
                <Tag color="blue" size="small">
                  缓存结果
                </Tag>
              )}
            </Space>
          }
          style={{ marginBottom: '24px' }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {/* 总体状态 */}
            <Card size="small">
              <Space>
                {getStatusIcon(result.status)}
                <Text strong>
                  {result.status === 'compliant' ? '内容合规' :
                   result.status === 'warning' ? '存在风险' : '违规内容'}
                </Text>
                <Text type="secondary">评分：{result.score}/100</Text>
              </Space>
              <Progress
                percent={result.score}
                strokeColor={colorUtils.getStatusColor(result.status)}
                style={{ marginTop: '8px' }}
              />
            </Card>

            {/* 详细结果 */}
            <Collapse defaultActiveKey={['issues']}>
              <Panel header={`问题检测 (${result.errors.length})`} key="issues">
                {renderIssues(result.errors)}
              </Panel>
              
              {result.suggestions.length > 0 && (
                <Panel header={`优化建议 (${result.suggestions.length})`} key="suggestions">
                  {renderSuggestions(result.suggestions)}
                </Panel>
              )}
              
              <Panel header="合规性评估" key="compliance">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text strong>合规评分：</Text>
                    <Text>{result.compliance.score}/100</Text>
                  </div>
                  
                  {result.compliance.issues.length > 0 && (
                    <div>
                      <Text strong>合规问题：</Text>
                      <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                        {result.compliance.issues.map((issue, index) => (
                          <li key={index}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Space>
              </Panel>
              
              {result.resources.length > 0 && (
                <Panel header="相关资源" key="resources">
                  <List
                    dataSource={result.resources}
                    renderItem={(resource, index) => (
                      <List.Item key={index}>
                        <Text>{resource}</Text>
                      </List.Item>
                    )}
                  />
                </Panel>
              )}
            </Collapse>
          </Space>
        </Card>
      )}
    </div>
  );
};

export default TextAnalysis;