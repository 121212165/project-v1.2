import React, { useMemo } from 'react';
import {
  Card,
  Input,
  Button,
  Typography,
  Space,
  Select,
  Switch
} from 'antd';
import {
  SendOutlined,
  ClearOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import { useTextAnalysisForm } from '@/hooks';
import AnalysisResult from './AnalysisResult';
import AnalysisOptions from './AnalysisOptions';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

// 常量定义
const MAX_TEXT_LENGTH = 10000;

const TextAnalysis: React.FC = () => {
  const {
    formState,
    loading,
    result,
    error,
    isAnalyzeDisabled,
    setInputText,
    setUseCache,
    setScenario,
    setSessionId,
    handleAnalyze,
    handleClear,
    handleCopy
  } = useTextAnalysisForm({
    maxLength: MAX_TEXT_LENGTH,
    minLength: 10
  });

  const { inputText, useCache, scenario, sessionId } = formState;





  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>文本内容分析</Title>
      
      <Card title="输入文本" style={{ marginBottom: '24px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <TextArea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="请输入需要分析的文本内容..."
            rows={6}
            maxLength={MAX_TEXT_LENGTH}
            showCount
            style={{ marginBottom: '16px' }}
          />

          {/* 分析选项 */}
          <div style={{ marginBottom: '16px' }}>
            <AnalysisOptions
              scenario={scenario}
              useCache={useCache}
              sessionId={sessionId}
              onScenarioChange={setScenario}
              onUseCacheChange={setUseCache}
              onSessionIdChange={setSessionId}
            />
          </div>
          
          <Space>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleAnalyze}
              disabled={isAnalyzeDisabled}
              loading={loading}
            >
              开始分析
            </Button>
            
            <Button
              icon={<ClearOutlined />}
              onClick={handleClear}
              disabled={loading}
            >
              清空内容
            </Button>
          </Space>
        </Space>
      </Card>

      <AnalysisResult
        loading={loading}
        result={result}
        error={error}
        onCopy={handleCopy}
      />
    </div>
  );
};

export default TextAnalysis;