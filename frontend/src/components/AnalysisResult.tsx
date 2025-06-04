import React, { useCallback } from 'react';
import {
  Card,
  Alert,
  Spin,
  Typography,
  Space,
  Tag,
  Collapse,
  List,
  Progress,
  Tooltip,
  Button
} from 'antd';
import {
  CopyOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  RobotOutlined
} from '@ant-design/icons';
import { colorUtils } from '@/utils';
import type { TextAnalysisResponse, AnalysisIssue } from '@/types';

const { Text } = Typography;
const { Panel } = Collapse;

// 常量定义
const STATUS_CONFIG = {
  compliant: { icon: CheckCircleOutlined, color: '#52c41a', text: '内容合规' },
  warning: { icon: WarningOutlined, color: '#faad14', text: '存在风险' },
  violation: { icon: CloseCircleOutlined, color: '#ff4d4f', text: '违规内容' }
} as const;

const SEVERITY_LABELS = {
  low: '低风险',
  medium: '中风险',
  high: '高风险'
} as const;

interface AnalysisResultProps {
  loading: boolean;
  result: TextAnalysisResponse | null;
  error: string | null;
  onCopy: (text: string) => Promise<void>;
}

const AnalysisResult: React.FC<AnalysisResultProps> = ({
  loading,
  result,
  error,
  onCopy
}) => {
  const getStatusIcon = useCallback((status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
    if (!config) return null;
    
    const IconComponent = config.icon;
    return <IconComponent style={{ color: config.color }} />;
  }, []);

  const getSeverityColor = useCallback((severity: string) => {
    return colorUtils.getSeverityColor(severity as 'low' | 'medium' | 'high');
  }, []);

  const getSeverityLabel = useCallback((severity: string) => {
    return SEVERITY_LABELS[severity as keyof typeof SEVERITY_LABELS] || severity;
  }, []);

  const renderIssues = useCallback((issues: AnalysisIssue[]) => {
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
          <List.Item key={`issue-${index}`}>
            <Card size="small" style={{ width: '100%' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <Tag color={getSeverityColor(issue.severity)}>
                    {getSeverityLabel(issue.severity)}
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
                        <li key={`suggestion-${idx}`}>{suggestion}</li>
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
  }, [getSeverityColor, getSeverityLabel]);

  const renderSuggestions = useCallback((suggestions: TextAnalysisResponse['suggestions']) => {
    if (!suggestions.length) return null;

    return (
      <List
        dataSource={suggestions}
        renderItem={(suggestion, index) => (
          <List.Item key={`suggestion-${index}`}>
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
                      onClick={() => onCopy(suggestion.improved)}
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
  }, [onCopy]);

  // 错误状态
  if (error) {
    return (
      <Alert
        message="分析失败"
        description={error}
        type="error"
        showIcon
        closable
        style={{ marginBottom: '24px' }}
      />
    );
  }

  // 加载状态
  if (loading) {
    return (
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>
            <Text>正在分析中，请稍候...</Text>
          </div>
        </div>
      </Card>
    );
  }

  // 结果展示
  if (!result) {
    return null;
  }

  return (
    <Card
      title={
        <Space>
          <RobotOutlined />
          <span>分析结果</span>
          {result.cached && (
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
              {STATUS_CONFIG[result.status as keyof typeof STATUS_CONFIG]?.text || '未知状态'}
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
                      <li key={`compliance-issue-${index}`}>{issue}</li>
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
                  <List.Item key={`resource-${index}`}>
                    <Text>{resource}</Text>
                  </List.Item>
                )}
              />
            </Panel>
          )}
        </Collapse>
      </Space>
    </Card>
  );
};

export default AnalysisResult;