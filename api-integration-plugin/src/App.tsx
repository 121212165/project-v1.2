/**
 * 主应用组件
 * API集成插件的根组件
 */

import React, { useState, useEffect } from 'react';
import {
  Layout,
  Menu,
  Button,
  Space,
  Typography,
  Dropdown,
  Avatar,
  Badge,
  Tooltip,
  message,
  ConfigProvider,
  theme,
} from 'antd';
import {
  ApiOutlined,
  HistoryOutlined,
  SettingOutlined,
  BulbOutlined,
  UserOutlined,
  GithubOutlined,
  QuestionCircleOutlined,
  SunOutlined,
  MoonOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import zhCN from 'antd/locale/zh_CN';

import { RequestBuilder } from '@/components/RequestBuilder/RequestBuilder';
import {
  RequestModel,
  RequestHistory,
  AppSettings,
  ThemeMode,
} from '@/types/api';
import { storage } from '@/utils/helpers';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

// 存储键名
const STORAGE_KEYS = {
  SETTINGS: 'api-integration-settings',
  HISTORY: 'api-integration-history',
  THEME: 'api-integration-theme',
};

// 默认设置
const DEFAULT_SETTINGS: AppSettings = {
  theme: ThemeMode.LIGHT,
  autoSave: true,
  historyLimit: 100,
  timeout: 30000,
  followRedirects: true,
  verifySsl: true,
  proxyEnabled: false,
  proxyUrl: '',
  defaultHeaders: {},
  codegenConfig: {
    includeComments: true,
    includeErrorHandling: true,
    asyncAwait: true,
    timeout: 30000,
    followRedirects: true,
    verifySsl: true,
    indentSize: 2,
    indentType: 'spaces',
    lineEnding: 'lf',
  },
};

type MenuItem = Required<MenuProps>['items'][number];

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: MenuItem[],
  type?: 'group'
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
    type,
  } as MenuItem;
}

const App: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKey, setSelectedKey] = useState('request-builder');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<RequestHistory[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 菜单项
  const menuItems: MenuItem[] = [
    getItem('请求构建器', 'request-builder', <ApiOutlined />),
    getItem('请求历史', 'history', <HistoryOutlined />),
    getItem('设置', 'settings', <SettingOutlined />),
  ];

  // 用户菜单
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: '个人资料',
      icon: <UserOutlined />,
    },
    {
      key: 'settings',
      label: '设置',
      icon: <SettingOutlined />,
    },
    {
      type: 'divider',
    },
    {
      key: 'help',
      label: '帮助文档',
      icon: <QuestionCircleOutlined />,
    },
    {
      key: 'github',
      label: 'GitHub',
      icon: <GithubOutlined />,
    },
  ];

  /**
   * 初始化应用
   */
  useEffect(() => {
    // 加载设置
    const savedSettings = storage.get<AppSettings>(STORAGE_KEYS.SETTINGS);
    if (savedSettings) {
      setSettings({ ...DEFAULT_SETTINGS, ...savedSettings });
      setIsDarkMode(savedSettings.theme === ThemeMode.DARK);
    }

    // 加载历史记录
    const savedHistory = storage.get<RequestHistory[]>(STORAGE_KEYS.HISTORY, []);
    if (savedHistory) {
      setHistory(savedHistory);
    }

    // 加载主题
    const savedTheme = storage.get<ThemeMode>(STORAGE_KEYS.THEME);
    if (savedTheme) {
      setIsDarkMode(savedTheme === ThemeMode.DARK);
    }
  }, []);

  /**
   * 保存设置
   */
  const saveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    storage.set(STORAGE_KEYS.SETTINGS, newSettings);
  };

  /**
   * 保存历史记录
   */
  const saveHistory = (newHistory: RequestHistory[]) => {
    // 限制历史记录数量
    const limitedHistory = newHistory.slice(0, settings.historyLimit);
    setHistory(limitedHistory);
    storage.set(STORAGE_KEYS.HISTORY, limitedHistory);
  };

  /**
   * 添加历史记录
   */
  const addHistory = (historyItem: RequestHistory) => {
    const newHistory = [historyItem, ...history];
    saveHistory(newHistory);
  };

  /**
   * 删除历史记录
   */
  const deleteHistory = (id: string) => {
    const newHistory = history.filter((item) => item.id !== id);
    saveHistory(newHistory);
    message.success('历史记录已删除');
  };

  /**
   * 清空历史记录
   */
  const clearHistory = () => {
    setHistory([]);
    storage.remove(STORAGE_KEYS.HISTORY);
    message.success('历史记录已清空');
  };

  /**
   * 切换主题
   */
  const toggleTheme = () => {
    const newTheme = isDarkMode ? ThemeMode.LIGHT : ThemeMode.DARK;
    const newSettings = { ...settings, theme: newTheme };
    
    setIsDarkMode(!isDarkMode);
    saveSettings(newSettings);
    storage.set(STORAGE_KEYS.THEME, newTheme);
    
    message.success(`已切换到${isDarkMode ? '浅色' : '深色'}主题`);
  };

  /**
   * 处理菜单点击
   */
  const handleMenuClick = ({ key }: { key: string }) => {
    setSelectedKey(key);
  };

  /**
   * 处理用户菜单点击
   */
  const handleUserMenuClick = ({ key }: { key: string }) => {
    switch (key) {
      case 'profile':
        message.info('个人资料功能开发中...');
        break;
      case 'settings':
        setSelectedKey('settings');
        break;
      case 'help':
        window.open('https://github.com/your-repo/api-integration-plugin#readme', '_blank');
        break;
      case 'github':
        window.open('https://github.com/your-repo/api-integration-plugin', '_blank');
        break;
    }
  };

  /**
   * 渲染内容区域
   */
  const renderContent = () => {
    switch (selectedKey) {
      case 'request-builder':
        return (
          <RequestBuilder
            settings={settings}
            onAddHistory={addHistory}
          />
        );
      case 'history':
        return (
          <div style={{ padding: 24 }}>
            <Title level={3}>请求历史</Title>
            <Text>历史记录功能开发中...</Text>
          </div>
        );
      case 'settings':
        return (
          <div style={{ padding: 24 }}>
            <Title level={3}>设置</Title>
            <Text>设置功能开发中...</Text>
          </div>
        );
      default:
        return (
          <RequestBuilder
            settings={settings}
            onAddHistory={addHistory}
          />
        );
    }
  };

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        {/* 侧边栏 */}
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          theme={isDarkMode ? 'dark' : 'light'}
          style={{
            boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div
            style={{
              height: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`,
            }}
          >
            {!collapsed ? (
              <Space>
                <ApiOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                <Title level={4} style={{ margin: 0, color: isDarkMode ? '#fff' : '#000' }}>
                  API集成
                </Title>
              </Space>
            ) : (
              <ApiOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            )}
          </div>
          
          <Menu
            theme={isDarkMode ? 'dark' : 'light'}
            selectedKeys={[selectedKey]}
            mode="inline"
            items={menuItems}
            onClick={handleMenuClick}
            style={{ borderRight: 0 }}
          />
        </Sider>

        <Layout>
          {/* 顶部导航 */}
          <Header
            style={{
              padding: '0 24px',
              background: isDarkMode ? '#001529' : '#fff',
              borderBottom: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <Title
                level={4}
                style={{
                  margin: 0,
                  color: isDarkMode ? '#fff' : '#000',
                }}
              >
                {selectedKey === 'request-builder' && '请求构建器'}
                {selectedKey === 'history' && '请求历史'}
                {selectedKey === 'settings' && '设置'}
              </Title>
            </div>

            <Space size="middle">
              {/* 主题切换 */}
              <Tooltip title={isDarkMode ? '切换到浅色主题' : '切换到深色主题'}>
                <Button
                  type="text"
                  icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />}
                  onClick={toggleTheme}
                  style={{ color: isDarkMode ? '#fff' : '#000' }}
                />
              </Tooltip>

              {/* 历史记录数量 */}
              <Tooltip title="请求历史">
                <Badge count={history.length} size="small">
                  <Button
                    type="text"
                    icon={<HistoryOutlined />}
                    onClick={() => setSelectedKey('history')}
                    style={{ color: isDarkMode ? '#fff' : '#000' }}
                  />
                </Badge>
              </Tooltip>

              {/* 帮助 */}
              <Tooltip title="帮助文档">
                <Button
                  type="text"
                  icon={<QuestionCircleOutlined />}
                  onClick={() => window.open('https://github.com/your-repo/api-integration-plugin#readme', '_blank')}
                  style={{ color: isDarkMode ? '#fff' : '#000' }}
                />
              </Tooltip>

              {/* 用户菜单 */}
              <Dropdown
                menu={{
                  items: userMenuItems,
                  onClick: handleUserMenuClick,
                }}
                placement="bottomRight"
                arrow
              >
                <Button type="text" style={{ padding: 0 }}>
                  <Space>
                    <Avatar size="small" icon={<UserOutlined />} />
                    <Text style={{ color: isDarkMode ? '#fff' : '#000' }}>用户</Text>
                  </Space>
                </Button>
              </Dropdown>
            </Space>
          </Header>

          {/* 主内容区域 */}
          <Content
            style={{
              background: isDarkMode ? '#000' : '#f5f5f5',
              minHeight: 'calc(100vh - 64px)',
            }}
          >
            {renderContent()}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

export default App;