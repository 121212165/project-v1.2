import React, { useState } from 'react';
import {
  Avatar,
  Dropdown,
  Button,
  Space,
  Typography,
  Modal,
  message
} from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  LoginOutlined
} from '@ant-design/icons';
import { useAuth, useAppStore } from '@/store';
import LoginModal from './LoginModal';

const { Text } = Typography;

const UserInfo: React.FC = () => {
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const auth = useAuth();
  const { logout } = useAppStore();

  const handleLogout = () => {
    Modal.confirm({
      title: '确认登出',
      content: '您确定要登出吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await logout();
          message.success('已成功登出');
        } catch (error: any) {
          message.error(error.message || '登出失败');
        }
      },
    });
  };

  const menuItems = [
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
      disabled: true, // 暂时禁用
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '登出',
      onClick: handleLogout,
    },
  ];

  if (!auth.isAuthenticated) {
    return (
      <>
        <Button
          type="primary"
          icon={<LoginOutlined />}
          onClick={() => setLoginModalVisible(true)}
          size="small"
        >
          登录
        </Button>
        
        <LoginModal
          visible={loginModalVisible}
          onCancel={() => setLoginModalVisible(false)}
        />
      </>
    );
  }

  return (
    <>
      <Dropdown
        menu={{ items: menuItems }}
        placement="bottomRight"
        trigger={['click']}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 8px',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Avatar
            size="small"
            icon={<UserOutlined />}
            style={{
              backgroundColor: '#1890ff',
            }}
          />
          <Space direction="vertical" size={0}>
            <Text
              style={{
                fontSize: '14px',
                fontWeight: 500,
                lineHeight: 1,
                margin: 0,
              }}
            >
              {auth.user?.username}
            </Text>
            <Text
              type="secondary"
              style={{
                fontSize: '12px',
                lineHeight: 1,
                margin: 0,
              }}
            >
              {auth.user?.role === 'ADMIN' ? '管理员' : 
               auth.user?.role === 'MODERATOR' ? '版主' : '用户'}
            </Text>
          </Space>
        </div>
      </Dropdown>
      
      <LoginModal
        visible={loginModalVisible}
        onCancel={() => setLoginModalVisible(false)}
      />
    </>
  );
};

export default UserInfo;