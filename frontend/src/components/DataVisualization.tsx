import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Select,
  DatePicker,
  Space,
  Typography,
  Spin,
  Empty,
  Tag,
  Tooltip
} from 'antd';
import {
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  RiseOutlined,
  FallOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { useAppStore } from '../store';
import { useUserStats, useHistory } from '../hooks';
import { formatTime } from '../utils';
import type { AnalysisHistoryItem } from '../types';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface DataVisualizationProps {
  className?: string;
}

interface ChartData {
  date: string;
  total: number;
  compliant: number;
  warning: number;
  violation: number;
  textAnalysis: number;
  imageAnalysis: number;
}

interface ComplianceData {
  name: string;
  value: number;
  color: string;
}

const DataVisualization: React.FC<DataVisualizationProps> = ({ className }) => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('line');
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [complianceData, setComplianceData] = useState<ComplianceData[]>([]);
  
  const { loadHistory, loadUserStats } = useAppStore();
  const userStats = useUserStats();
  const history = useHistory();

  // 颜色配置
  const colors = {
    compliant: '#52c41a',
    warning: '#faad14',
    violation: '#ff4d4f',
    text: '#1890ff',
    image: '#722ed1',
    total: '#13c2c2'
  };

  // 生成图表数据
  const generateChartData = (historyItems: AnalysisHistoryItem[]): ChartData[] => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const data: ChartData[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayItems = historyItems.filter(item => {
        const itemDate = new Date(item.timestamp).toISOString().split('T')[0];
        return itemDate === dateStr;
      });
      
      const compliant = dayItems.filter(item => item.result?.overallAssessment?.status === 'compliant').length;
      const warning = dayItems.filter(item => item.result?.overallAssessment?.status === 'warning').length;
      const violation = dayItems.filter(item => item.result?.overallAssessment?.status === 'violation').length;
      const textAnalysis = dayItems.filter(item => item.type === 'text').length;
      const imageAnalysis = dayItems.filter(item => item.type === 'image').length;
      
      data.push({
        date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        total: dayItems.length,
        compliant,
        warning,
        violation,
        textAnalysis,
        imageAnalysis
      });
    }
    
    return data;
  };

  // 生成合规性饼图数据
  const generateComplianceData = (): ComplianceData[] => {
    if (!userStats.data) return [];
    
    return [
      {
        name: '合规',
        value: userStats.data.compliantTasks,
        color: colors.compliant
      },
      {
        name: '警告',
        value: userStats.data.warningTasks,
        color: colors.warning
      },
      {
        name: '违规',
        value: userStats.data.violationTasks,
        color: colors.violation
      }
    ].filter(item => item.value > 0);
  };

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          loadHistory(1, 1000), // 加载更多历史数据用于图表
          loadUserStats()
        ]);
      } catch (error) {
        console.error('加载数据失败:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [loadHistory, loadUserStats]);

  // 更新图表数据
  useEffect(() => {
    if (history.length > 0) {
      setChartData(generateChartData(history));
    }
  }, [history, timeRange]);

  // 更新合规性数据
  useEffect(() => {
    setComplianceData(generateComplianceData());
  }, [userStats.data]);

  // 计算趋势
  const calculateTrend = (data: ChartData[], field: keyof ChartData): { value: number; isUp: boolean } => {
    if (data.length < 2) return { value: 0, isUp: true };
    
    const recent = data.slice(-7); // 最近7天
    const previous = data.slice(-14, -7); // 前7天
    
    const recentAvg = recent.reduce((sum, item) => sum + (item[field] as number), 0) / recent.length;
    const previousAvg = previous.length > 0 
      ? previous.reduce((sum, item) => sum + (item[field] as number), 0) / previous.length
      : recentAvg;
    
    const change = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;
    
    return {
      value: Math.abs(change),
      isUp: change >= 0
    };
  };

  // 渲染图表
  const renderChart = () => {
    if (chartData.length === 0) {
      return <Empty description="暂无数据" />;
    }

    const commonProps = {
      width: '100%',
      height: 300,
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer {...commonProps}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Bar dataKey="compliant" fill={colors.compliant} name="合规" />
              <Bar dataKey="warning" fill={colors.warning} name="警告" />
              <Bar dataKey="violation" fill={colors.violation} name="违规" />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'area':
        return (
          <ResponsiveContainer {...commonProps}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="total" 
                stackId="1" 
                stroke={colors.total} 
                fill={colors.total} 
                name="总计"
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      
      default: // line
        return (
          <ResponsiveContainer {...commonProps}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke={colors.total} 
                strokeWidth={2}
                name="总分析量"
              />
              <Line 
                type="monotone" 
                dataKey="compliant" 
                stroke={colors.compliant} 
                strokeWidth={2}
                name="合规"
              />
              <Line 
                type="monotone" 
                dataKey="warning" 
                stroke={colors.warning} 
                strokeWidth={2}
                name="警告"
              />
              <Line 
                type="monotone" 
                dataKey="violation" 
                stroke={colors.violation} 
                strokeWidth={2}
                name="违规"
              />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  const totalTrend = calculateTrend(chartData, 'total');
  const complianceTrend = calculateTrend(chartData, 'compliant');

  if (loading) {
    return (
      <div className={className}>
        <Spin size="large" style={{ display: 'block', textAlign: 'center', padding: '50px' }} />
      </div>
    );
  }

  return (
    <div className={className}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 统计概览 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="总分析次数"
                value={userStats.data?.totalTasks || 0}
                prefix={<BarChartOutlined />}
                suffix={
                  <Tooltip title={`较上周${totalTrend.isUp ? '增长' : '下降'}${totalTrend.value.toFixed(1)}%`}>
                    {totalTrend.isUp ? (
                      <RiseOutlined style={{ color: colors.compliant }} />
                    ) : (
                      <FallOutlined style={{ color: colors.violation }} />
                    )}
                  </Tooltip>
                }
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="合规率"
                value={
                  userStats.data?.totalTasks 
                    ? ((userStats.data.compliantTasks / userStats.data.totalTasks) * 100).toFixed(1)
                    : 0
                }
                suffix="%"
                valueStyle={{
                  color: userStats.data?.totalTasks && (userStats.data.compliantTasks / userStats.data.totalTasks) >= 0.8
                    ? colors.compliant
                    : userStats.data?.totalTasks && (userStats.data.compliantTasks / userStats.data.totalTasks) >= 0.6
                    ? colors.warning
                    : colors.violation
                }}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="文本分析"
                value={userStats.data?.textTasks || 0}
                prefix={<LineChartOutlined />}
                valueStyle={{ color: colors.text }}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="图文分析"
                value={userStats.data?.imageTasks || 0}
                prefix={<PieChartOutlined />}
                valueStyle={{ color: colors.image }}
              />
            </Card>
          </Col>
        </Row>

        {/* 图表控制 */}
        <Card>
          <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
            <Col>
              <Title level={4} style={{ margin: 0 }}>分析趋势</Title>
            </Col>
            <Col>
              <Space>
                <Select
                  value={timeRange}
                  onChange={setTimeRange}
                  style={{ width: 100 }}
                >
                  <Option value="7d">7天</Option>
                  <Option value="30d">30天</Option>
                  <Option value="90d">90天</Option>
                </Select>
                
                <Select
                  value={chartType}
                  onChange={setChartType}
                  style={{ width: 100 }}
                >
                  <Option value="line">折线图</Option>
                  <Option value="bar">柱状图</Option>
                  <Option value="area">面积图</Option>
                </Select>
              </Space>
            </Col>
          </Row>
          
          {renderChart()}
        </Card>

        {/* 合规性分布 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="合规性分布">
              {complianceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={complianceData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {complianceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Empty description="暂无数据" />
              )}
            </Card>
          </Col>
          
          <Col xs={24} lg={12}>
            <Card title="分析类型分布">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text>文本分析</Text>
                    <Text strong>{userStats.data?.textTasks || 0}</Text>
                  </div>
                  <Progress
                    percent={
                      userStats.data?.totalTasks
                        ? (userStats.data.textTasks / userStats.data.totalTasks) * 100
                        : 0
                    }
                    strokeColor={colors.text}
                    showInfo={false}
                  />
                </div>
                
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text>图文分析</Text>
                    <Text strong>{userStats.data?.imageTasks || 0}</Text>
                  </div>
                  <Progress
                    percent={
                      userStats.data?.totalTasks
                        ? (userStats.data.imageTasks / userStats.data.totalTasks) * 100
                        : 0
                    }
                    strokeColor={colors.image}
                    showInfo={false}
                  />
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
};

export default DataVisualization;