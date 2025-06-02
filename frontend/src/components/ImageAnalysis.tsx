import React, { useState, useCallback } from 'react';
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
  Upload,
  Image,
  Progress,
  message,
  Switch,
  Select,
  Divider
} from 'antd';
import {
  SendOutlined,
  ClearOutlined,
  UploadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  HistoryOutlined,
  RobotOutlined
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { useAppStore, useImageAnalysis } from '@/store';
import { fileUtils, colorUtils } from '@/utils';
import type { ImageAnalysisResponse } from '@/types';

const { TextArea } = Input;
const { Title, Text } = Typography;
const { Panel } = Collapse;
const { Dragger } = Upload;

const ImageAnalysis: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [useCache, setUseCache] = useState(true);
  const [scenario, setScenario] = useState<string>('general');
  const [sessionId, setSessionId] = useState<string>('');
  
  const { analyzeImageText, clearImageAnalysis } = useAppStore();
  const { loading, result, error } = useImageAnalysis();

  const handleFileSelect = useCallback((file: File) => {
    const validation = fileUtils.validateImage(file);
    if (!validation.valid) {
      message.error(validation.error);
      return false;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return false;
  }, []);

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
  }, [previewUrl]);

  const uploadProps: UploadProps = {
    name: 'image',
    multiple: false,
    accept: 'image/*',
    beforeUpload: handleFileSelect,
    onRemove: handleRemoveFile,
    fileList: selectedFile ? [{
      uid: '1',
      name: selectedFile.name,
      status: 'done',
      size: selectedFile.size,
      type: selectedFile.type
    } as UploadFile] : []
  };

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) {
      message.error('请先选择图片文件');
      return;
    }
    await analyzeImageText(inputText, selectedFile, {
      sessionId: sessionId || undefined,
      scenario,
      useCache
    });
  }, [analyzeImageText, inputText, selectedFile, sessionId, scenario, useCache]);

  const handleClear = useCallback(() => {
    setInputText('');
    handleRemoveFile();
    clearImageAnalysis();
  }, [clearImageAnalysis, handleRemoveFile]);

  const getStatusIcon = useCallback((status: string) => {
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
  }, []);

  const renderImageAnalysis = useCallback((imageAnalysis: ImageAnalysisResponse['imageAnalysis']) => (
    <Card size="small" title="图片分析结果">
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <Text strong>检测到的对象：</Text>
          <div style={{ marginTop: '8px' }}>
            {imageAnalysis.objects.map((obj, index) => (
              <Tag key={index} color="blue">{obj}</Tag>
            ))}
          </div>
        </div>
        
        <div>
          <Text strong>内容适宜性：</Text>
          <Space>
            {imageAnalysis.inappropriate ? (
              <Tag color="red">不适宜</Tag>
            ) : (
              <Tag color="green">适宜</Tag>
            )}
            <Text type="secondary">
              置信度：{(imageAnalysis.confidence * 100).toFixed(1)}%
            </Text>
          </Space>
        </div>
        
        <Progress
          percent={imageAnalysis.confidence * 100}
          strokeColor={imageAnalysis.inappropriate ? '#ff4d4f' : '#52c41a'}
          format={(percent) => `${percent?.toFixed(1)}%`}
        />
      </Space>
    </Card>
  ), []);

  const renderTextAnalysis = useCallback((textAnalysis: ImageAnalysisResponse['textAnalysis']) => {
    if (!textAnalysis) return null;

    return (
      <Card size="small" title="文本分析结果">
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Space>
              {getStatusIcon(textAnalysis.status)}
              <Text strong>
                {textAnalysis.status === 'compliant' ? '文本合规' :
                 textAnalysis.status === 'warning' ? '文本存在风险' : '文本违规'}
              </Text>
              <Text type="secondary">评分：{textAnalysis.score}/100</Text>
            </Space>
          </div>
          
          <Progress
            percent={textAnalysis.score}
            strokeColor={colorUtils.getStatusColor(textAnalysis.status)}
          />
          
          {textAnalysis.errors.length > 0 && (
            <div>
              <Text strong>检测到的问题：</Text>
              <List
                size="small"
                dataSource={textAnalysis.errors}
                renderItem={(issue, index) => (
                  <List.Item key={index}>
                    <Space>
                      <Tag color={colorUtils.getSeverityColor(issue.severity)}>
                        {issue.severity === 'low' ? '低风险' : 
                         issue.severity === 'medium' ? '中风险' : '高风险'}
                      </Tag>
                      <Text>{issue.description}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            </div>
          )}
        </Space>
      </Card>
    );
  }, [getStatusIcon]);

  const renderOverallAssessment = useCallback((assessment: ImageAnalysisResponse['overallAssessment']) => (
    <Card size="small" title="综合评估">
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <Space>
            {getStatusIcon(assessment.status)}
            <Text strong>
              {assessment.status === 'compliant' ? '内容合规' :
               assessment.status === 'warning' ? '存在风险' : '违规内容'}
            </Text>
          </Space>
        </div>
        
        {assessment.recommendations.length > 0 && (
          <div>
            <Text strong>建议：</Text>
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              {assessment.recommendations.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </Space>
    </Card>
  ), [getStatusIcon]);

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>图文内容分析</Title>
      
      {/* 图片上传 */}
      <Card title="上传图片" style={{ marginBottom: '24px' }}>
        <Dragger {...uploadProps} style={{ marginBottom: '16px' }}>
          <p className="ant-upload-drag-icon">
            <UploadOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽图片到此区域上传</p>
          <p className="ant-upload-hint">
            支持 JPEG、PNG、GIF、WebP 格式，文件大小不超过 5MB
          </p>
        </Dragger>
        
        {previewUrl && (
          <div style={{ textAlign: 'center' }}>
            <Space>
              <Button
                icon={<EyeOutlined />}
                onClick={() => setPreviewVisible(true)}
              >
                预览图片
              </Button>
              <Text type="secondary">
                {selectedFile?.name} ({fileUtils.formatSize(selectedFile?.size || 0)})
              </Text>
            </Space>
          </div>
        )}
      </Card>

      {/* 分析选项 */}
      <Card title="分析选项" size="small" style={{ marginBottom: '16px' }}>
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
              <Select.Option value="ecommerce">电商图片</Select.Option>
              <Select.Option value="advertisement">广告内容</Select.Option>
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

      {/* 文本输入 */}
      <Card title="补充文本（可选）" style={{ marginBottom: '24px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <TextArea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="可以输入与图片相关的文本内容进行综合分析..."
            rows={4}
            showCount
            maxLength={5000}
          />
          
          <Space>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleAnalyze}
              loading={loading}
              disabled={!selectedFile}
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
              <Text>正在分析图片和文本内容，请稍候...</Text>
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
          style={{ marginBottom: '24px' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {renderOverallAssessment(result.overallAssessment)}
            
            <Collapse defaultActiveKey={['image', 'text']}>
              <Panel header="图片分析" key="image">
                {renderImageAnalysis(result.imageAnalysis)}
              </Panel>
              
              {result.textAnalysis && (
                <Panel header="文本分析" key="text">
                  {renderTextAnalysis(result.textAnalysis)}
                </Panel>
              )}
            </Collapse>
          </Space>
        </Card>
      )}

      <Image
        width={200}
        style={{ display: 'none' }}
        src={previewUrl}
        preview={{
          visible: previewVisible,
          src: previewUrl,
          onVisibleChange: (visible) => setPreviewVisible(visible)
        }}
      />
    </div>
  );
};
export default ImageAnalysis;