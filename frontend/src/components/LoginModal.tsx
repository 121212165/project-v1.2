import React, { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Tabs,
  message,
  Typography
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined
} from '@ant-design/icons';
import { useAppStore } from '@/store';

const { Title, Text } = Typography;
// TabPane已在Ant Design 5.x中废弃，使用items属性

interface LoginModalProps {
  visible: boolean;
  onCancel: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ visible, onCancel }) => {
  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAppStore();
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();

  const handleLogin = async (values: any) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      message.success('登录成功！');
      onCancel();
      loginForm.resetFields();
    } catch (error: any) {
      message.error(error.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values: any) => {
    setLoading(true);
    try {
      await register(values.username, values.email, values.password);
      message.success('注册成功！请登录');
      setActiveTab('login');
      registerForm.resetFields();
    } catch (error: any) {
      message.error(error.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    loginForm.resetFields();
    registerForm.resetFields();
    setActiveTab('login');
    onCancel();
  };

  return (
    <Modal
      title={null}
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={400}
      centered
    >
      <div style={{ padding: '20px 0' }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: '30px' }}>
          欢迎使用文本分析系统
        </Title>
        
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          centered
          items={[
            {
              key: 'login',
              label: '登录',
              children: (
                <Form
                  form={loginForm}
                  onFinish={handleLogin}
                  layout="vertical"
                  size="large"
                >
                  <Form.Item
                    name="username"
                    rules={[
                      { required: true, message: '请输入邮箱' },
                      { type: 'email', message: '请输入有效的邮箱地址' }
                    ]}
                  >
                    <Input
                      prefix={<UserOutlined />}
                      placeholder="邮箱"
                    />
                  </Form.Item>
                  
                  <Form.Item
                    name="password"
                    rules={[
                      { required: true, message: '请输入密码' },
                      { min: 6, message: '密码至少6个字符' }
                    ]}
                  >
                    <Input.Password
                      prefix={<LockOutlined />}
                      placeholder="密码"
                    />
                  </Form.Item>
                  
                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      block
                    >
                      登录
                    </Button>
                  </Form.Item>
                </Form>
              )
            },
            {
              key: 'register',
              label: '注册',
              children: (
            <Form
              form={registerForm}
              onFinish={handleRegister}
              layout="vertical"
              size="large"
            >
              <Form.Item
                name="username"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 3, message: '用户名至少3个字符' },
                  { max: 20, message: '用户名最多20个字符' },
                  { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' }
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="用户名"
                />
              </Form.Item>
              
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="邮箱"
                />
              </Form.Item>
              
              <Form.Item
                name="password"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '密码至少6个字符' },
                  { max: 50, message: '密码最多50个字符' }
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="密码"
                />
              </Form.Item>
              
              <Form.Item
                name="confirmPassword"
                dependencies={['password']}
                rules={[
                  { required: true, message: '请确认密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'));
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="确认密码"
                />
              </Form.Item>
              
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                >
                  注册
                </Button>
              </Form.Item>
                </Form>
              )
            }
          ]}
        />
        
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            注册即表示您同意我们的服务条款和隐私政策
          </Text>
        </div>
      </div>
    </Modal>
  );
};

export default LoginModal;