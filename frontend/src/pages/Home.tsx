import React from 'react';
import {
  Layout,
  Card,
  Tabs,
  Menu,
  Dropdown,
  Avatar,
  Button,
  Row,
  Col,
  Statistic,
  Space,
  Typography,
  message,
  Badge
} from 'antd';
import {
  FileTextOutlined,
  PictureOutlined,
  UserOutlined,
  HistoryOutlined,
  SettingOutlined,
  LogoutOutlined,
  HomeOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BarChartOutlined,
  BellOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppStore, useUI, useHistory, useAuth } from '@/store';
import TextAnalysis from '@/components/TextAnalysis';
import ImageAnalysis from '@/components/ImageAnalysis';
import HistoryPanel from '@/components/HistoryPanel';
import UserInfo from '@/components/UserInfo';
import DataVisualization from '@/components/DataVisualization';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;
const { TabPane } = Tabs;

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { setActiveTab, toggleSidebar, initAuth, logout } = useAppStore();
  const { activeTab, sidebarCollapsed } = useUI();
  const history = useHistory();
  const auth = useAuth();

  // 初始化用户认证状态
  React.useEffect(() => {
    initAuth();
  }, []);

  // 统计数据
  const textAnalysisCount = history.filter(item => item.type === 'text').length;
  const imageAnalysisCount = history.filter(item => item.type === 'image').length;
  const totalCount = history.length;

  // 计算合规率
  const compliantCount = history.filter(item => {
    if ('status' in item.result) {
      return item.result.status === 'compliant';
    }
    return item.result.overallAssessment.status === 'compliant';
  }).length;
  const complianceRate = totalCount > 0 ? Math.round((compliantCount / totalCount) * 100) : 0;

  const handleTabChange = (key: string) => {
    setActiveTab(key as 'text' | 'image');
  };

  const handleUserMenuClick = ({ key }: { key: string }) => {
    switch (key) {
      case 'profile':
        navigate('/settings');
        break;
      case 'history':
        navigate('/history');
        break;
      case 'settings':
        navigate('/settings');
        break;
      case 'logout':
        logout();
        navigate('/login');
        break;
    }
  };

  const userMenu = (
    <Menu onClick={handleUserMenuClick}>
      <Menu.Item key="profile" icon={<UserOutlined />}>
        个人资料
      </Menu.Item>
      <Menu.Item key="history" icon={<HistoryOutlined />}>
        分析历史
      </Menu.Item>
      <Menu.Item key="settings" icon={<SettingOutlined />}>
        设置
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />} danger>
        退出登录
      </Menu.Item>
    </Menu>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 顶部导航 */}
      <Header style={{ 
        background: '#fff', 
        padding: '0 24px', 
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Button
            type="text"
            icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={toggleSidebar}
            style={{ marginRight: '16px' }}
          />
          <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
            美妆智能体交互平台
          </Title>
        </div>
        
        <Space size="large">
          {/* 快速统计 */}
          <Space size="large">
            <Statistic
              title="总分析次数"
              value={totalCount}
              prefix={<BarChartOutlined />}
              valueStyle={{ fontSize: '16px' }}
            />
            <Statistic
              title="合规率"
              value={complianceRate}
              suffix="%"
              valueStyle={{ 
                fontSize: '16px',
                color: complianceRate >= 80 ? '#52c41a' : complianceRate >= 60 ? '#faad14' : '#ff4d4f'
              }}
            />
          </Space>
          
          {/* 用户操作区 */}
          <Space size="middle">
            <Badge count={0} showZero={false}>
              <Button
                type="text"
                icon={<BellOutlined />}
                style={{ fontSize: '16px' }}
              />
            </Badge>
            
            {auth.isAuthenticated ? (
              <Dropdown overlay={userMenu} placement="bottomRight">
                <Space style={{ cursor: 'pointer' }}>
                  <Avatar
                    size="small"
                    icon={<UserOutlined />}
                    style={{ backgroundColor: '#1890ff' }}
                  />
                  <span>{auth.user?.username || '用户'}</span>
                </Space>
              </Dropdown>
            ) : (
              <Button
                type="primary"
                onClick={() => navigate('/login')}
              >
                登录
              </Button>
            )}
          </Space>
        </Space>
      </Header>

      <Layout>
        {/* 侧边栏 - 历史记录 */}
        <Sider
          width={320}
          collapsed={sidebarCollapsed}
          collapsedWidth={80}
          style={{
            background: '#fff',
            borderRight: '1px solid #f0f0f0'
          }}
        >
          <div style={{ padding: '16px' }}>
            {/* 快速导航 */}
            {!sidebarCollapsed && (
              <Card 
                size="small" 
                title="快速导航" 
                style={{ marginBottom: '16px' }}
                bodyStyle={{ padding: '8px' }}
              >
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <Button
                    type="text"
                    icon={<HomeOutlined />}
                    block
                    style={{ textAlign: 'left' }}
                    onClick={() => navigate('/')}
                  >
                    首页
                  </Button>
                  <Button
                    type="text"
                    icon={<HistoryOutlined />}
                    block
                    style={{ textAlign: 'left' }}
                    onClick={() => navigate('/history')}
                  >
                    分析历史
                  </Button>
                  <Button
                    type="text"
                    icon={<SettingOutlined />}
                    block
                    style={{ textAlign: 'left' }}
                    onClick={() => navigate('/settings')}
                  >
                    设置
                  </Button>
                </Space>
              </Card>
            )}
            
            {/* 历史记录面板 */}
             <HistoryPanel />
          </div>
        </Sider>

        {/* 主内容区 */}
        <Layout>
          <Content style={{ background: '#f5f5f5' }}>
            {/* 统计卡片 */}
            {!sidebarCollapsed && (
              <div style={{ padding: '24px 24px 0' }}>
                <Row gutter={16} style={{ marginBottom: '24px' }}>
                  <Col span={8}>
                    <Card>
                      <Statistic
                        title="文本分析"
                        value={textAnalysisCount}
                        prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
                      />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card>
                      <Statistic
                        title="图文分析"
                        value={imageAnalysisCount}
                        prefix={<PictureOutlined style={{ color: '#52c41a' }} />}
                      />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card>
                      <Statistic
                        title="历史记录"
                        value={totalCount}
                        prefix={<HistoryOutlined style={{ color: '#722ed1' }} />}
                      />
                    </Card>
                  </Col>
                </Row>
              </div>
            )}

            {/* 主要功能区 */}
            <div style={{ padding: sidebarCollapsed ? '24px' : '0 24px 24px' }}>
              <Card style={{ minHeight: 'calc(100vh - 200px)' }}>
                <Tabs 
                  activeKey={activeTab} 
                  onChange={handleTabChange} 
                  size="large"
                  items={[
                    {
                      key: 'text',
                      label: (
                        <span>
                          <FileTextOutlined />
                          文本分析
                        </span>
                      ),
                      children: <TextAnalysis />
                    },
                    {
                      key: 'image',
                      label: (
                        <span>
                          <PictureOutlined />
                          图文分析
                        </span>
                      ),
                      children: <ImageAnalysis />
                    },
                    {
                      key: 'dashboard',
                      label: (
                        <span>
                          <BarChartOutlined />
                          数据看板
                        </span>
                      ),
                      children: <DataVisualization />
                    }
                  ]}
                />
              </Card>
            </div>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default Home;