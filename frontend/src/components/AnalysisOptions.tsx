import React from 'react';
import {
  Space,
  Select,
  Switch,
  Input
} from 'antd';
import {
  HistoryOutlined
} from '@ant-design/icons';

// 常量定义
const SCENARIO_OPTIONS = [
  { value: 'general', label: '通用' },
  { value: 'social', label: '社交媒体' },
  { value: 'news', label: '新闻资讯' },
  { value: 'education', label: '教育内容' },
  { value: 'business', label: '商业文档' }
];

interface AnalysisOptionsProps {
  scenario: string;
  useCache: boolean;
  sessionId: string;
  onScenarioChange: (value: string) => void;
  onUseCacheChange: (checked: boolean) => void;
  onSessionIdChange: (value: string) => void;
}

const AnalysisOptions: React.FC<AnalysisOptionsProps> = ({
  scenario,
  useCache,
  sessionId,
  onScenarioChange,
  onUseCacheChange,
  onSessionIdChange
}) => {
  const analysisOptionsConfig = [
    {
      key: 'scenario',
      label: '分析场景：',
      component: (
        <Select
          value={scenario}
          onChange={onScenarioChange}
          style={{ width: 120 }}
          size="small"
          options={SCENARIO_OPTIONS}
        />
      )
    },
    {
      key: 'useCache',
      label: '使用缓存：',
      component: (
        <Switch
          checked={useCache}
          onChange={onUseCacheChange}
          size="small"
          checkedChildren="开"
          unCheckedChildren="关"
        />
      )
    },
    {
      key: 'sessionId',
      label: '会话ID：',
      component: (
        <Input
          value={sessionId}
          onChange={(e) => onSessionIdChange(e.target.value)}
          placeholder="可选，用于多轮对话"
          size="small"
          style={{ width: 150 }}
          prefix={<HistoryOutlined />}
        />
      )
    }
  ];

  return (
    <Space wrap>
      {analysisOptionsConfig.map(({ key, label, component }) => (
        <Space key={key} size="small">
          <span>{label}</span>
          {component}
        </Space>
      ))}
    </Space>
  );
};

export default AnalysisOptions;