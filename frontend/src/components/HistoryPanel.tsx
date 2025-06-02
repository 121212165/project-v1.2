import React, { useState } from 'react';
import {
  Card,
  List,
  Button,
  Typography,
  Space,
  Tag,
  Modal,
  Empty,
  Tooltip,
  Popconfirm,
  Input,
  Select,
  Spin,
  Pagination
} from 'antd';
import {
  DeleteOutlined,
  EyeOutlined,
  ClearOutlined,
  SearchOutlined,
  FileTextOutlined,
  PictureOutlined
} from '@ant-design/icons';
import { useAppStore, useHistory, useHistoryMeta, useAuth, useUserStats } from '@/store';
import { formatTime, textUtils, colorUtils } from '@/utils';
import type { AnalysisHistoryItem, TextAnalysisResponse, ImageAnalysisResponse } from '@/types';

const { Text, Title } = Typography;
const { Search } = Input;
const { Option } = Select;

interface HistoryPanelProps {
  collapsed?: boolean;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ collapsed = false }) => {
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'text' | 'image'>('all');
  const [selectedItem, setSelectedItem] = useState<AnalysisHistoryItem | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  
  const { loadHistory, deleteHistoryItem, loadUserStats, removeFromHistory, clearHistory } = useAppStore();
  const history = useHistory();
  const historyMeta = useHistoryMeta();
  const auth = useAuth();
  const userStats = useUserStats();

  // 初始化加载历史记录
  React.useEffect(() => {
    if (auth.isAuthenticated) {
      loadHistory(1, 20, filterType === 'all' ? undefined : filterType);
      loadUserStats();
    }
  }, [auth.isAuthenticated, filterType]);

  // 处理过滤类型变化
  React.useEffect(() => {
    if (auth.isAuthenticated) {
      loadHistory(1, 20, filterType === 'all' ? undefined : filterType);
    }
  }, [filterType]);

  // 过滤历史记录（仅在本地搜索时使用）
  const filteredHistory = history.filter(item => {
    const matchesSearch = searchText === '' || 
      item.content.toLowerCase().includes(searchText.toLowerCase());
    return matchesSearch;
  });

  const handleViewDetail = (item: AnalysisHistoryItem) => {
    setSelectedItem(item);
    setDetailVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      if (auth.isAuthenticated) {
        await deleteHistoryItem(id);
      } else {
        removeFromHistory(id);
      }
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const handleClearAll = () => {
    clearHistory();
  };

  const getStatusColor = (result: TextAnalysisResponse | ImageAnalysisResponse) => {
    if ('status' in result) {
      return colorUtils.getStatusColor(result.status);
    }
    return colorUtils.getStatusColor(result.overallAssessment.status);
  };

  const getStatusText = (result: TextAnalysisResponse | ImageAnalysisResponse) => {
    if ('status' in result) {
      return result.status === 'compliant' ? '合规' :
             result.status === 'warning' ? '风险' : '违规';
    }
    const status = result.overallAssessment.status;
    return status === 'compliant' ? '合规' :
           status === 'warning' ? '风险' : '违规';
  };

  const renderDetailModal = () => {
    if (!selectedItem) return null;

    const isTextAnalysis = selectedItem.type === 'text';
    const result = selectedItem.result as TextAnalysisResponse | ImageAnalysisResponse;

    return (
      <Modal
        title={`${isTextAnalysis ? '文本' : '图文'}分析详情`}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Card size="small" title="基本信息">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>分析时间：</Text>
                <Text>{formatTime.standard(selectedItem.timestamp)}</Text>
              </div>
              <div>
                <Text strong>内容：</Text>
                <Text>{textUtils.truncate(selectedItem.content, 100)}</Text>
              </div>
              <div>
                <Text strong>状态：</Text>
                <Tag color={getStatusColor(result)}>
                  {getStatusText(result)}
                </Tag>
              </div>
            </Space>
          </Card>

          {isTextAnalysis ? (
            <Card size="small" title="文本分析结果">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>评分：</Text>
                  <Text>{(result as TextAnalysisResponse).score}/100</Text>
                </div>
                
                {(result as TextAnalysisResponse).errors.length > 0 && (
                  <div>
                    <Text strong>检测到的问题：</Text>
                    <List
                      size="small"
                      dataSource={(result as TextAnalysisResponse).errors}
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
                
                {(result as TextAnalysisResponse).suggestions.length > 0 && (
                  <div>
                    <Text strong>优化建议：</Text>
                    <List
                      size="small"
                      dataSource={(result as TextAnalysisResponse).suggestions}
                      renderItem={(suggestion, index) => (
                        <List.Item key={index}>
                          <Space direction="vertical" style={{ width: '100%' }}>
                            <div>
                              <Text type="secondary">原文：</Text>
                              <Text delete>{suggestion.original}</Text>
                            </div>
                            <div>
                              <Text type="secondary">建议：</Text>
                              <Text mark>{suggestion.improved}</Text>
                            </div>
                          </Space>
                        </List.Item>
                      )}
                    />
                  </div>
                )}
              </Space>
            </Card>
          ) : (
            <Card size="small" title="图文分析结果">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>图片检测对象：</Text>
                  <div style={{ marginTop: '8px' }}>
                    {(result as ImageAnalysisResponse).imageAnalysis.objects.map((obj, index) => (
                      <Tag key={index} color="blue">{obj}</Tag>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Text strong>内容适宜性：</Text>
                  <Tag color={(result as ImageAnalysisResponse).imageAnalysis.inappropriate ? 'red' : 'green'}>
                    {(result as ImageAnalysisResponse).imageAnalysis.inappropriate ? '不适宜' : '适宜'}
                  </Tag>
                </div>
                
                <div>
                  <Text strong>综合评估：</Text>
                  <Tag color={getStatusColor(result)}>
                    {getStatusText(result)}
                  </Tag>
                </div>
                
                {(result as ImageAnalysisResponse).overallAssessment.recommendations.length > 0 && (
                  <div>
                    <Text strong>建议：</Text>
                    <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                      {(result as ImageAnalysisResponse).overallAssessment.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </Space>
            </Card>
          )}
        </Space>
      </Modal>
    );
  };

  if (collapsed) {
    return (
      <div style={{ padding: '16px' }}>
        <Title level={4}>历史</Title>
        <Text type="secondary">{history.length} 条记录</Text>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>分析历史</Title>
            {history.length > 0 && (
              <Popconfirm
                title="确定要清空所有历史记录吗？"
                onConfirm={handleClearAll}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  type="text"
                  size="small"
                  icon={<ClearOutlined />}
                  danger
                >
                  清空
                </Button>
              </Popconfirm>
            )}
          </div>
          
          {/* 用户统计信息 */}
          {auth.isAuthenticated && userStats && (
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f0f8ff', borderRadius: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>{userStats.totalTasks}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>总分析</div>
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#52c41a' }}>{userStats.completedTasks}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>已完成</div>
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fa8c16' }}>{userStats.pendingTasks}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>处理中</div>
                </div>
              </div>
            </div>
          )}
          
          <Search
            placeholder="搜索历史记录..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: '100%' }}
            allowClear
          />
          
          <Select
            value={filterType}
            onChange={setFilterType}
            style={{ width: '100%' }}
          >
            <Option value="all">全部类型</Option>
            <Option value="text">文本分析</Option>
            <Option value="image">图文分析</Option>
          </Select>
        </Space>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {historyMeta.loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Spin size="large" />
          </div>
        ) : filteredHistory.length === 0 ? (
          <Empty
            description={history.length === 0 ? "暂无分析历史" : "没有找到匹配的记录"}
            style={{ marginTop: '40px' }}
          />
        ) : (
          <>
            <List
              dataSource={filteredHistory}
              renderItem={(item) => (
                <List.Item
                  key={item.id}
                  style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}
                >
                  <div style={{ width: '100%' }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Space>
                          {item.type === 'text' ? (
                            <FileTextOutlined style={{ color: '#1890ff' }} />
                          ) : (
                            <PictureOutlined style={{ color: '#52c41a' }} />
                          )}
                          <Tag color={getStatusColor(item.result)}>
                            {getStatusText(item.result)}
                          </Tag>
                        </Space>
                        
                        <Space>
                          <Tooltip title="查看详情">
                            <Button
                              type="text"
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={() => handleViewDetail(item)}
                            />
                          </Tooltip>
                          
                          <Popconfirm
                            title="确定要删除这条记录吗？"
                            onConfirm={() => handleDelete(item.id)}
                            okText="确定"
                            cancelText="取消"
                          >
                            <Tooltip title="删除">
                              <Button
                                type="text"
                                size="small"
                                icon={<DeleteOutlined />}
                                danger
                              />
                            </Tooltip>
                          </Popconfirm>
                        </Space>
                      </div>
                      
                      <Text style={{ fontSize: '12px' }}>
                        {textUtils.truncate(item.content, 60)}
                      </Text>
                      
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        {formatTime.fromNow(item.timestamp)}
                      </Text>
                    </Space>
                  </div>
                </List.Item>
              )}
            />
            
            {/* 分页 */}
            {auth.isAuthenticated && historyMeta.total > historyMeta.limit && (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '16px' }}>
                <Pagination
                  current={historyMeta.page}
                  total={historyMeta.total}
                  pageSize={historyMeta.limit}
                  showSizeChanger={false}
                  showQuickJumper
                  showTotal={(total, range) => `${range[0]}-${range[1]} 共 ${total} 条`}
                  onChange={(page) => {
                    loadHistory(page, historyMeta.limit, filterType === 'all' ? undefined : filterType);
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>

      {renderDetailModal()}
    </div>
  );
};

export default HistoryPanel;