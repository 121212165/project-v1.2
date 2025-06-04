/**
 * 请求历史抽屉组件
 * 用于显示和管理API请求历史记录
 */

import React, { useState, useMemo } from 'react';
import {
  Drawer,
  List,
  Card,
  Typography,
  Tag,
  Space,
  Button,
  Input,
  Select,
  DatePicker,
  Popconfirm,
  Empty,
  Tooltip,
  Row,
  Col,
  Statistic,
  message,
} from 'antd';
import {
  SearchOutlined,
  DeleteOutlined,
  ReloadOutlined,
  FilterOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';

import { RequestHistory, HttpMethod } from '@/types/api';
import { formatDuration, formatBytes } from '@/utils/helpers';

const { Text, Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface RequestHistoryDrawerProps {
  visible: boolean;
  onClose: () => void;
  history: RequestHistory[];
  onLoadRequest: (history: RequestHistory) => void;
  onDeleteHistory: (id: string) => void;
  onClearHistory: () => void;
}

interface FilterOptions {
  searchText: string;
  method: HttpMethod | 'all';
  status: 'all' | 'success' | 'error' | 'timeout';
  dateRange: [Dayjs, Dayjs] | null;
}

export const RequestHistoryDrawer: React.FC<RequestHistoryDrawerProps> = ({
  visible,
  onClose,
  history,
  onLoadRequest,
  onDeleteHistory,
  onClearHistory,
}) => {
  const [filters, setFilters] = useState<FilterOptions>({
    searchText: '',
    method: 'all',
    status: 'all',
    dateRange: null,
  });
  const [sortBy, setSortBy] = useState<'timestamp' | 'duration' | 'status'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  /**
   * 获取状态颜色
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
   * 获取方法颜色
   */
  const getMethodColor = (method: HttpMethod): string => {
    const colors = {
      GET: 'blue',
      POST: 'green',
      PUT: 'orange',
      DELETE: 'red',
      PATCH: 'purple',
      HEAD: 'cyan',
      OPTIONS: 'magenta',
    };
    return colors[method] || 'default';
  };

  /**
   * 过滤和排序历史记录
   */
  const filteredAndSortedHistory = useMemo(() => {
    let filtered = history.filter((item) => {
      // 搜索文本过滤
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const matchesSearch = 
          item.request.name?.toLowerCase().includes(searchLower) ||
          item.request.url.toLowerCase().includes(searchLower) ||
          item.response?.statusText?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // 方法过滤
      if (filters.method !== 'all' && item.request.method !== filters.method) {
        return false;
      }

      // 状态过滤
      if (filters.status !== 'all') {
        const status = item.response?.status;
        if (!status) return filters.status === 'error';
        
        switch (filters.status) {
          case 'success':
            return status >= 200 && status < 300;
          case 'error':
            return status >= 400;
          case 'timeout':
            return item.error?.includes('timeout') || false;
          default:
            return true;
        }
      }

      // 日期范围过滤
      if (filters.dateRange) {
        const itemDate = dayjs(item.timestamp);
        const [start, end] = filters.dateRange;
        if (!itemDate.isBetween(start, end, 'day', '[]')) {
          return false;
        }
      }

      return true;
    });

    // 排序
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'timestamp':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'duration':
          comparison = (a.response?.time || 0) - (b.response?.time || 0);
          break;
        case 'status':
          comparison = (a.response?.status || 0) - (b.response?.status || 0);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [history, filters, sortBy, sortOrder]);

  /**
   * 统计信息
   */
  const statistics = useMemo(() => {
    const total = filteredAndSortedHistory.length;
    const successful = filteredAndSortedHistory.filter(
      (item) => item.response && item.response.status >= 200 && item.response.status < 300
    ).length;
    const failed = filteredAndSortedHistory.filter(
      (item) => !item.response || item.response.status >= 400
    ).length;
    const avgDuration = total > 0 
      ? filteredAndSortedHistory.reduce((sum, item) => sum + (item.response?.time || 0), 0) / total
      : 0;

    return { total, successful, failed, avgDuration };
  }, [filteredAndSortedHistory]);

  /**
   * 复制请求为cURL
   */
  const handleCopyAsCurl = (item: RequestHistory) => {
    const { request } = item;
    let curl = `curl -X ${request.method} "${request.url}"`;
    
    // 添加请求头
    Object.entries(request.headers || {}).forEach(([key, value]) => {
      curl += ` -H "${key}: ${value}"`;
    });
    
    // 添加请求体
    if (request.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      curl += ` -d '${request.body}'`;
    }
    
    navigator.clipboard.writeText(curl);
    message.success('cURL 命令已复制到剪贴板');
  };

  /**
   * 重置过滤器
   */
  const resetFilters = () => {
    setFilters({
      searchText: '',
      method: 'all',
      status: 'all',
      dateRange: null,
    });
  };

  return (
    <Drawer
      title={
        <Space>
          <ClockCircleOutlined />
          请求历史
          <Tag color="blue">{statistics.total} 条记录</Tag>
        </Space>
      }
      placement="right"
      width={600}
      open={visible}
      onClose={onClose}
      extra={
        <Space>
          <Popconfirm
            title="确定要清空所有历史记录吗？"
            onConfirm={onClearHistory}
            okText="确定"
            cancelText="取消"
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              清空历史
            </Button>
          </Popconfirm>
        </Space>
      }
    >
      {/* 统计信息 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic title="总计" value={statistics.total} />
          </Col>
          <Col span={6}>
            <Statistic 
              title="成功" 
              value={statistics.successful} 
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="失败" 
              value={statistics.failed} 
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="平均耗时" 
              value={formatDuration(statistics.avgDuration)}
              suffix="ms"
            />
          </Col>
        </Row>
      </Card>

      {/* 过滤器 */}
      <Card size="small" style={{ marginBottom: 16 }} title="过滤器">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input
            placeholder="搜索请求名称、URL或状态..."
            prefix={<SearchOutlined />}
            value={filters.searchText}
            onChange={(e) => setFilters({ ...filters, searchText: e.target.value })}
          />
          
          <Row gutter={8}>
            <Col span={8}>
              <Select
                value={filters.method}
                onChange={(value) => setFilters({ ...filters, method: value })}
                style={{ width: '100%' }}
                placeholder="方法"
              >
                <Option value="all">所有方法</Option>
                <Option value="GET">GET</Option>
                <Option value="POST">POST</Option>
                <Option value="PUT">PUT</Option>
                <Option value="DELETE">DELETE</Option>
                <Option value="PATCH">PATCH</Option>
                <Option value="HEAD">HEAD</Option>
                <Option value="OPTIONS">OPTIONS</Option>
              </Select>
            </Col>
            <Col span={8}>
              <Select
                value={filters.status}
                onChange={(value) => setFilters({ ...filters, status: value })}
                style={{ width: '100%' }}
                placeholder="状态"
              >
                <Option value="all">所有状态</Option>
                <Option value="success">成功 (2xx)</Option>
                <Option value="error">错误 (4xx/5xx)</Option>
                <Option value="timeout">超时</Option>
              </Select>
            </Col>
            <Col span={8}>
              <Select
                value={`${sortBy}-${sortOrder}`}
                onChange={(value) => {
                  const [by, order] = value.split('-');
                  setSortBy(by as typeof sortBy);
                  setSortOrder(order as typeof sortOrder);
                }}
                style={{ width: '100%' }}
                placeholder="排序"
              >
                <Option value="timestamp-desc">时间 ↓</Option>
                <Option value="timestamp-asc">时间 ↑</Option>
                <Option value="duration-desc">耗时 ↓</Option>
                <Option value="duration-asc">耗时 ↑</Option>
                <Option value="status-desc">状态 ↓</Option>
                <Option value="status-asc">状态 ↑</Option>
              </Select>
            </Col>
          </Row>
          
          <Row gutter={8}>
            <Col span={16}>
              <RangePicker
                value={filters.dateRange}
                onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
                style={{ width: '100%' }}
                placeholder={['开始日期', '结束日期']}
              />
            </Col>
            <Col span={8}>
              <Button onClick={resetFilters} icon={<FilterOutlined />}>
                重置过滤器
              </Button>
            </Col>
          </Row>
        </Space>
      </Card>

      {/* 历史记录列表 */}
      {filteredAndSortedHistory.length > 0 ? (
        <List
          dataSource={filteredAndSortedHistory}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Tooltip title="加载请求">
                  <Button
                    size="small"
                    type="link"
                    icon={<ReloadOutlined />}
                    onClick={() => onLoadRequest(item)}
                  />
                </Tooltip>,
                <Tooltip title="复制为 cURL">
                  <Button
                    size="small"
                    type="link"
                    icon={<CopyOutlined />}
                    onClick={() => handleCopyAsCurl(item)}
                  />
                </Tooltip>,
                <Popconfirm
                  title="确定要删除这条记录吗？"
                  onConfirm={() => onDeleteHistory(item.id)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button
                    size="small"
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                  />
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Tag color={getMethodColor(item.request.method)}>
                      {item.request.method}
                    </Tag>
                    <Text strong>{item.request.name || '未命名请求'}</Text>
                    {item.response && (
                      <Tag color={getStatusColor(item.response.status)} icon={getStatusIcon(item.response.status)}>
                        {item.response.status}
                      </Tag>
                    )}
                  </Space>
                }
                description={
                  <div>
                    <Text copyable={{ text: item.request.url }}>
                      {item.request.url.length > 60 
                        ? `${item.request.url.substring(0, 60)}...` 
                        : item.request.url
                      }
                    </Text>
                    <br />
                    <Space size="small">
                      <Text type="secondary">
                        {dayjs(item.timestamp).format('YYYY-MM-DD HH:mm:ss')}
                      </Text>
                      {item.response && (
                        <Text type="secondary">
                          {formatDuration(item.response.time)} • {formatBytes(item.response.size)}
                        </Text>
                      )}
                      {item.error && (
                        <Text type="danger">{item.error}</Text>
                      )}
                    </Space>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      ) : (
        <Empty
          description="没有找到匹配的历史记录"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}
    </Drawer>
  );
};

export default RequestHistoryDrawer;