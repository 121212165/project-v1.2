import React, { useState, useEffect } from 'react';
import {
  Layout,
  Card,
  Form,
  Input,
  Button,
  Tabs,
  Typography,
  Space,
  Divider,
  message,
  Row,
  Col,
  Checkbox
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';

const { Content } = Layout;
const { Title, Text, Link } = Typography;
// TabPane已在Ant Design 5.x中废弃，使用items属性

interface LoginFormData {
  username: string;
  password: string;
  remember?: boolean;
}

interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreement: boolean;
}

const Login: React.FC = () => {
  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, register, auth } = useAppStore();
  const [loginForm] = Form.useForm<LoginFormData>();
  const [registerForm] = Form.useForm<RegisterFormData>();

  // 如果已登录，重定向到首页
  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate('/');
    }
  }, [auth.isAuthenticated, navigate]);

  const handleLogin = async (values: LoginFormData) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      message.success('登录成功！');
      navigate('/');
    } catch (error: any) {
      message.error(error.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values: RegisterFormData) => {
    setLoading(true);
    try {
      await register(values.username, values.email, values.password);
      message.success('注册成功！请登录');
      setActiveTab('login');
      registerForm.resetFields();
    } catch (error: any) {
      message.error(error.message || '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    // 清除表单错误
    loginForm.resetFields();
    registerForm.resetFields();
  };

  return (
    <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
        <Row justify="center" style={{ width: '100%', maxWidth: '1200px' }}>
          <Col xs={24} sm={20} md={16} lg={12} xl={10}>
            <Card
              style={{
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                border: 'none'
              }}
              styles={{ body: { padding: '40px' } }}
            >
              {/* 头部标题 */}
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <Title level={2} style={{ color: '#1890ff', marginBottom: '8px' }}>
                  美妆智能体交互平台
                </Title>
                <Text type="secondary" style={{ fontSize: '16px' }}>
                  智能内容分析，助力合规运营
                </Text>
              </div>

              {/* 登录/注册表单 */}
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                centered
                size="large"
                style={{ marginBottom: '24px' }}
                items={[
                  {
                    key: 'login',
                    label: '登录',
                    children: (
                  <Form
                    form={loginForm}
                    name="login"
                    onFinish={handleLogin}
                    layout="vertical"
                    size="large"
                    requiredMark={false}
                  >
                    <Form.Item
                      name="username"
                      label="邮箱"
                      rules={[
                        { required: true, message: '请输入邮箱' },
                        { type: 'email', message: '请输入有效的邮箱地址' }
                      ]}
                    >
                      <Input
                        prefix={<UserOutlined />}
                        placeholder="请输入邮箱"
                        autoComplete="email"
                      />
                    </Form.Item>

                    <Form.Item
                      name="password"
                      label="密码"
                      rules={[
                        { required: true, message: '请输入密码' },
                        { min: 6, message: '密码至少6个字符' }
                      ]}
                    >
                      <Input.Password
                        prefix={<LockOutlined />}
                        placeholder="请输入密码"
                        autoComplete="current-password"
                        iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                      />
                    </Form.Item>

                    <Form.Item>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Form.Item name="remember" valuePropName="checked" noStyle>
                          <Checkbox>记住我</Checkbox>
                        </Form.Item>
                        <Link href="#" style={{ color: '#1890ff' }}>
                          忘记密码？
                        </Link>
                      </div>
                    </Form.Item>

                    <Form.Item>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        block
                        style={{ height: '48px', fontSize: '16px' }}
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
                    name="register"
                    onFinish={handleRegister}
                    layout="vertical"
                    size="large"
                    requiredMark={false}
                  >
                    <Form.Item
                      name="username"
                      label="用户名"
                      rules={[
                        { required: true, message: '请输入用户名' },
                        { min: 3, message: '用户名至少3个字符' },
                        { max: 20, message: '用户名最多20个字符' },
                        { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' }
                      ]}
                    >
                      <Input
                        prefix={<UserOutlined />}
                        placeholder="请输入用户名"
                        autoComplete="username"
                      />
                    </Form.Item>

                    <Form.Item
                      name="email"
                      label="邮箱"
                      rules={[
                        { required: true, message: '请输入邮箱' },
                        { type: 'email', message: '请输入有效的邮箱地址' }
                      ]}
                    >
                      <Input
                        prefix={<MailOutlined />}
                        placeholder="请输入邮箱"
                        autoComplete="email"
                      />
                    </Form.Item>

                    <Form.Item
                      name="password"
                      label="密码"
                      rules={[
                        { required: true, message: '请输入密码' },
                        { min: 6, message: '密码至少6个字符' },
                        { max: 20, message: '密码最多20个字符' },
                        {
                          pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/,
                          message: '密码必须包含大小写字母和数字'
                        }
                      ]}
                    >
                      <Input.Password
                        prefix={<LockOutlined />}
                        placeholder="请输入密码"
                        autoComplete="new-password"
                        iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                      />
                    </Form.Item>

                    <Form.Item
                      name="confirmPassword"
                      label="确认密码"
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
                        placeholder="请再次输入密码"
                        autoComplete="new-password"
                        iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                      />
                    </Form.Item>

                    <Form.Item
                      name="agreement"
                      valuePropName="checked"
                      rules={[
                        {
                          validator: (_, value) =>
                            value ? Promise.resolve() : Promise.reject(new Error('请同意用户协议')),
                        },
                      ]}
                    >
                      <Checkbox>
                        我已阅读并同意 <Link href="#">用户协议</Link> 和 <Link href="#">隐私政策</Link>
                      </Checkbox>
                    </Form.Item>

                    <Form.Item>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        block
                        style={{ height: '48px', fontSize: '16px' }}
                      >
                        注册
                      </Button>
                    </Form.Item>
                  </Form>
                    )
                  }
                ]}
              />

              <Divider style={{ margin: '24px 0' }}>
                <Text type="secondary">其他登录方式</Text>
              </Divider>

              {/* 第三方登录 */}
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Button
                  block
                  size="large"
                  style={{
                    height: '48px',
                    border: '1px solid #d9d9d9',
                    color: '#666'
                  }}
                  disabled
                >
                  微信登录 (即将开放)
                </Button>
                <Button
                  block
                  size="large"
                  style={{
                    height: '48px',
                    border: '1px solid #d9d9d9',
                    color: '#666'
                  }}
                  disabled
                >
                  QQ登录 (即将开放)
                </Button>
              </Space>

              {/* 底部信息 */}
              <div style={{ textAlign: 'center', marginTop: '32px' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  © 2024 美妆智能体交互平台. All rights reserved.
                </Text>
              </div>
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
};

export default Login;