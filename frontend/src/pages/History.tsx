import React, { useState, useEffect } from 'react';
import {
  Layout,
  Card,
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Input,
  Select,
  DatePicker,
  Popconfirm,
  message,
  Row,
  Col,
  Statistic,
  Empty,
  Tooltip,
  Modal,
  Descriptions,
  Image,
  Collapse
} from 'antd';
import {
  SearchOutlined,
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined,
  FilterOutlined,
  ReloadOutlined,
  FileTextOutlined,
  PictureOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { FilterValue, SorterResult } from 'antd/es/table/interface';
import dayjs from 'dayjs';
import { useAppStore } from '@/store';
import type { AnalysisHistoryItem, TextAnalysisResponse, ImageAnalysisResponse } from '@/types';

const { Content } = Layout;
const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Panel } = Collapse;

interface TableParams {
  pagination?: TablePaginationConfig;
  sortField?: string;
  sortOrder?: string;
  filters?: Record<string, FilterValue | null>;
}

const History: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'text' | 'image'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'compliant' | 'warning' | 'violation'>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AnalysisHistoryItem | null>(null);
  const [tableParams, setTableParams] = useState<TableParams>({
    pagination: {
      current: 1,
      pageSize: 20,
      showSizeChanger: true,
      showQuickJumper: true,
      showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
    }
  });

  const {
    history,
    historyMeta,
    userStats,
    loadHistory,
    loadUserStats,
    deleteHistoryItem
  } = useAppStore();

  // 加载数据
  useEffect(() => {
    loadHistory(1, 20);
    loadUserStats();
  }, []);

  // 过滤数据
  const filteredData = history.filter(item => {
    // 文本搜索
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      const matchContent = item.content.toLowerCase().includes(searchLower);
      const matchTaskId = item.taskId.toLowerCase().includes(searchLower);
      if (!matchContent && !matchTaskId) return false;
    }

    // 类型过滤
    if (selectedType !== 'all' && item.type !== selectedType) return false;

    // 状态过滤
    if (selectedStatus !== 'all') {
      const status = 'status' in item.result ? item.result.status : item.result.overallAssessment.status;
      if (status !== selectedStatus) return false;
    }

    // 日期过滤
    if (dateRange) {
      const itemDate = dayjs(item.timestamp);
      if (!itemDate.isBetween(dateRange[0], dateRange[1], 'day', '[]')) return false;
    }

    return true;
  });

  const getStatusTag = (status: string) => {
    const configs = {
      compliant: { color: 'success', icon: <CheckCircleOutlined />, text: '合规' },
      warning: { color: 'warning', icon: <WarningOutlined />, text: '警告' },
      violation: { color: 'error', icon: <CloseCircleOutlined />, text: '违规' }
    };
    const config = configs[status as keyof typeof configs];
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  const getTypeTag = (type: string) => {
    return type === 'text' ? (
      <Tag color="blue" icon={<FileTextOutlined />}>文本分析</Tag>
    ) : (
      <Tag color="purple" icon={<PictureOutlined />}>图文分析</Tag>
    );
  };

  const handleTableChange = (
    pagination: TablePaginationConfig,
    filters: Record<string, FilterValue | null>,
    sorter: SorterResult<AnalysisHistoryItem> | SorterResult<AnalysisHistoryItem>[]
  ) => {
    setTableParams({
      pagination,
      filters,
      ...Array.isArray(sorter) ? {} : {
        sortField: sorter.field as string,
        sortOrder: sorter.order as string,
      },
    });

    // 如果分页改变，重新加载数据
    if (pagination?.current !== tableParams.pagination?.current ||
        pagination?.pageSize !== tableParams.pagination?.pageSize) {
      loadHistory(pagination?.current, pagination?.pageSize);
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await deleteHistoryItem(taskId);
      message.success('删除成功');
      // 重新加载当前页数据
      loadHistory(tableParams.pagination?.current, tableParams.pagination?.pageSize);
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  const handleViewDetail = (record: AnalysisHistoryItem) => {
    setSelectedRecord(record);
    setDetailVisible(true);
  };

  const handleExport = () => {
    // 导出功能实现
    const dataStr = JSON.stringify(filteredData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analysis_history_${dayjs().format('YYYY-MM-DD')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    message.success('导出成功');
  };

  const handleRefresh = () => {
    loadHistory(tableParams.pagination?.current, tableParams.pagination?.pageSize);
    loadUserStats();
    message.success('刷新成功');
  };

  const columns: ColumnsType<AnalysisHistoryItem> = [
    {
      title: '任务ID',
      dataIndex: 'taskId',
      key: 'taskId',
      width: 120,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text code style={{ fontSize: '12px' }}>
            {text.slice(0, 8)}...
          </Text>
        </Tooltip>
      )
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      filters: [
        { text: '文本分析', value: 'text' },
        { text: '图文分析', value: 'image' }
      ],
      render: (type: string) => getTypeTag(type)
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text style={{ maxWidth: '200px' }}>
            {text.length > 50 ? `${text.slice(0, 50)}...` : text}
          </Text>
        </Tooltip>
      )
    },
    {
      title: '状态',
      dataIndex: 'result',
      key: 'status',
      width: 100,
      filters: [
        { text: '合规', value: 'compliant' },
        { text: '警告', value: 'warning' },
        { text: '违规', value: 'violation' }
      ],
      render: (result: TextAnalysisResponse | ImageAnalysisResponse) => {
        const status = 'status' in result ? result.status : result.overallAssessment.status;
        return getStatusTag(status);
      }
    },
    {
      title: '分析时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 160,
      sorter: true,
      render: (timestamp: string) => (
        <Space direction="vertical" size={0}>
          <Text>{dayjs(timestamp).format('YYYY-MM-DD')}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {dayjs(timestamp).format('HH:mm:ss')}
          </Text>
        </Space>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这条记录吗？"
            onConfirm={() => handleDelete(record.taskId)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const renderDetailModal = () => {
    if (!selectedRecord) return null;

    const isTextAnalysis = selectedRecord.type === 'text';
    const result = selectedRecord.result as TextAnalysisResponse | ImageAnalysisResponse;

    return (
      <Modal
        title="分析详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
        style={{ top: 20 }}
      >
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="任务ID" span={2}>
            <Text code>{selectedRecord.taskId}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="分析类型">
            {getTypeTag(selectedRecord.type)}
          </Descriptions.Item>
          <Descriptions.Item label="分析状态">
            {'status' in result ? getStatusTag(result.status) : getStatusTag(result.overallAssessment.status)}
          </Descriptions.Item>
          <Descriptions.Item label="分析时间" span={2}>
            {dayjs(selectedRecord.timestamp).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="内容" span={2}>
            <Text>{selectedRecord.content}</Text>
          </Descriptions.Item>
          {!isTextAnalysis && selectedRecord.imageUrl && (
            <Descriptions.Item label="图片" span={2}>
              <Image
                src={selectedRecord.imageUrl}
                alt="分析图片"
                style={{ maxWidth: '200px', maxHeight: '200px' }}
              />
            </Descriptions.Item>
          )}
        </Descriptions>

        <div style={{ marginTop: '16px' }}>
          <Title level={5}>分析结果</Title>
          {isTextAnalysis ? (
            <Collapse>
              <Panel header="详细分析" key="1">
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                  {JSON.stringify(result, null, 2)}
                </pre>
              </Panel>
            </Collapse>
          ) : (
            <Collapse>
              <Panel header="详细分析" key="1">
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                  {JSON.stringify(result, null, 2)}
                </pre>
              </Panel>
            </Collapse>
          )}
        </div>
      </Modal>
    );
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Content style={{ padding: '24px' }}>
        {/* 统计卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="总分析次数"
                value={userStats.data?.totalTasks || 0}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="文本分析"
                value={userStats.data?.textTasks || 0}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="图文分析"
                value={userStats.data?.imageTasks || 0}
                prefix={<PictureOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="合规率"
                value={userStats.data?.totalTasks ? 
                  Math.round((userStats.data.compliantTasks / userStats.data.totalTasks) * 100) : 0}
                suffix="%"
                prefix={<CheckCircleOutlined />}
                valueStyle={{ 
                  color: userStats.data?.totalTasks && 
                    (userStats.data.compliantTasks / userStats.data.totalTasks) >= 0.8 ? 
                    '#52c41a' : '#faad14' 
                }}
              />
            </Card>
          </Col>
        </Row>

        {/* 主要内容 */}
        <Card title="分析历史" style={{ borderRadius: '8px' }}>
          {/* 搜索和过滤 */}
          <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
            <Col xs={24} sm={12} md={8}>
              <Search
                placeholder="搜索任务ID或内容"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                prefix={<SearchOutlined />}
                allowClear
              />
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Select
                value={selectedType}
                onChange={setSelectedType}
                style={{ width: '100%' }}
                placeholder="选择类型"
              >
                <Option value="all">全部类型</Option>
                <Option value="text">文本分析</Option>
                <Option value="image">图文分析</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Select
                value={selectedStatus}
                onChange={setSelectedStatus}
                style={{ width: '100%' }}
                placeholder="选择状态"
              >
                <Option value="all">全部状态</Option>
                <Option value="compliant">合规</Option>
                <Option value="warning">警告</Option>
                <Option value="violation">违规</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                style={{ width: '100%' }}
                placeholder={['开始日期', '结束日期']}
              />
            </Col>
          </Row>

          {/* 操作按钮 */}
          <Row justify="space-between" style={{ marginBottom: '16px' }}>
            <Col>
              <Space>
                <Button
                  icon={<FilterOutlined />}
                  onClick={() => {
                    setSearchText('');
                    setSelectedType('all');
                    setSelectedStatus('all');
                    setDateRange(null);
                  }}
                >
                  清除筛选
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleRefresh}
                  loading={historyMeta.loading}
                >
                  刷新
                </Button>
              </Space>
            </Col>
            <Col>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleExport}
                disabled={filteredData.length === 0}
              >
                导出数据
              </Button>
            </Col>
          </Row>

          {/* 数据表格 */}
          <Table
            columns={columns}
            dataSource={filteredData}
            rowKey="taskId"
            loading={historyMeta.loading}
            pagination={{
              ...tableParams.pagination,
              total: historyMeta.total,
            }}
            onChange={handleTableChange}
            scroll={{ x: 800 }}
            locale={{
              emptyText: (
                <Empty
                  description="暂无分析记录"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )
            }}
          />
        </Card>

        {/* 详情弹窗 */}
        {renderDetailModal()}
      </Content>
    </Layout>
  );
};

export default History;