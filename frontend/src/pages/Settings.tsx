import React, { useState, useEffect } from 'react';
import {
  Layout,
  Card,
  Form,
  Input,
  Button,
  Switch,
  Select,
  Typography,
  Space,
  Divider,
  message,
  Row,
  Col,
  Avatar,
  Upload,
  Tabs,
  Slider,
  Radio,
  Alert,
  Modal,
  List,
  Tag,
  Popconfirm
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  SettingOutlined,
  BellOutlined,
  SecurityScanOutlined,
  ExportOutlined,
  DeleteOutlined,
  CameraOutlined,
  SaveOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { useAppStore } from '@/store';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { TextArea } = Input;

interface UserProfile {
  username: string;
  email: string;
  avatar?: string;
  nickname?: string;
  bio?: string;
  phone?: string;
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: 'zh-CN' | 'en-US';
  notifications: {
    email: boolean;
    browser: boolean;
    analysis: boolean;
    security: boolean;
  };
  analysis: {
    autoSave: boolean;
    cacheResults: boolean;
    maxHistoryDays: number;
    defaultScenario: string;
  };
  privacy: {
    profileVisible: boolean;
    historyVisible: boolean;
    allowDataCollection: boolean;
  };
}

interface SecuritySettings {
  twoFactorEnabled: boolean;
  loginNotifications: boolean;
  sessionTimeout: number;
  trustedDevices: Array<{
    id: string;
    name: string;
    lastUsed: string;
    location: string;
  }>;
}

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const { auth, logout } = useAppStore();
  
  const [profileForm] = Form.useForm<UserProfile>();
  const [passwordForm] = Form.useForm();
  const [preferencesForm] = Form.useForm<UserPreferences>();
  const [securityForm] = Form.useForm<SecuritySettings>();

  // 初始化表单数据
  useEffect(() => {
    if (auth.user) {
      profileForm.setFieldsValue({
        username: auth.user.username,
        email: auth.user.email,
        nickname: auth.user.username,
        bio: '',
        phone: ''
      });
    }

    // 设置默认偏好
    preferencesForm.setFieldsValue({
      theme: 'light',
      language: 'zh-CN',
      notifications: {
        email: true,
        browser: true,
        analysis: true,
        security: true
      },
      analysis: {
        autoSave: true,
        cacheResults: true,
        maxHistoryDays: 30,
        defaultScenario: 'general'
      },
      privacy: {
        profileVisible: true,
        historyVisible: false,
        allowDataCollection: true
      }
    });

    // 设置默认安全设置
    securityForm.setFieldsValue({
      twoFactorEnabled: false,
      loginNotifications: true,
      sessionTimeout: 24,
      trustedDevices: [
        {
          id: '1',
          name: 'Chrome on Windows',
          lastUsed: '2024-01-15 10:30:00',
          location: '北京市'
        }
      ]
    });
  }, [auth.user]);

  const handleProfileSave = async (values: UserProfile) => {
    setLoading(true);
    try {
      // 这里应该调用API更新用户信息
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success('个人信息更新成功');
    } catch (error: any) {
      message.error(error.message || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (values: any) => {
    setLoading(true);
    try {
      // 这里应该调用API修改密码
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success('密码修改成功');
      passwordForm.resetFields();
    } catch (error: any) {
      message.error(error.message || '密码修改失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesSave = async (values: UserPreferences) => {
    setLoading(true);
    try {
      // 这里应该调用API保存偏好设置
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success('偏好设置保存成功');
    } catch (error: any) {
      message.error(error.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSecuritySave = async (values: SecuritySettings) => {
    setLoading(true);
    try {
      // 这里应该调用API保存安全设置
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success('安全设置保存成功');
    } catch (error: any) {
      message.error(error.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange: UploadProps['onChange'] = (info) => {
    if (info.file.status === 'uploading') {
      setLoading(true);
      return;
    }
    if (info.file.status === 'done') {
      // 获取上传结果
      setAvatarUrl(info.file.response?.url || '');
      setLoading(false);
      message.success('头像上传成功');
    }
    if (info.file.status === 'error') {
      setLoading(false);
      message.error('头像上传失败');
    }
  };

  const handleExportData = () => {
    Modal.confirm({
      title: '导出个人数据',
      content: '确定要导出您的所有个人数据吗？这可能需要一些时间。',
      onOk: async () => {
        try {
          // 这里应该调用API导出数据
          await new Promise(resolve => setTimeout(resolve, 2000));
          message.success('数据导出成功，请检查您的邮箱');
        } catch (error: any) {
          message.error('数据导出失败');
        }
      }
    });
  };

  const handleDeleteAccount = () => {
    Modal.confirm({
      title: '删除账户',
      content: (
        <div>
          <Alert
            message="警告"
            description="删除账户将永久删除您的所有数据，此操作不可恢复！"
            type="error"
            showIcon
            style={{ marginBottom: '16px' }}
          />
          <Text>请输入您的密码以确认删除：</Text>
          <Input.Password
            placeholder="请输入密码"
            style={{ marginTop: '8px' }}
          />
        </div>
      ),
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          // 这里应该调用API删除账户
          await new Promise(resolve => setTimeout(resolve, 1000));
          message.success('账户删除成功');
          logout();
        } catch (error: any) {
          message.error('账户删除失败');
        }
      }
    });
  };

  const handleRemoveTrustedDevice = (deviceId: string) => {
    const devices = securityForm.getFieldValue('trustedDevices') || [];
    const newDevices = devices.filter((device: any) => device.id !== deviceId);
    securityForm.setFieldsValue({ trustedDevices: newDevices });
    message.success('设备已移除');
  };

  const uploadButton = (
    <div>
      <CameraOutlined />
      <div style={{ marginTop: 8 }}>上传头像</div>
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Content style={{ padding: '24px' }}>
        <Card title="个人设置" style={{ borderRadius: '8px' }}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            tabPosition="left"
            style={{ minHeight: '600px' }}
          >
            {/* 个人信息 */}
            <TabPane
              tab={
                <Space>
                  <UserOutlined />
                  个人信息
                </Space>
              }
              key="profile"
            >
              <div style={{ maxWidth: '600px' }}>
                <Title level={4}>个人信息</Title>
                <Form
                  form={profileForm}
                  layout="vertical"
                  onFinish={handleProfileSave}
                  requiredMark={false}
                >
                  {/* 头像上传 */}
                  <Form.Item label="头像">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <Avatar
                        size={80}
                        src={avatarUrl}
                        icon={<UserOutlined />}
                      />
                      <Upload
                        name="avatar"
                        listType="picture-card"
                        className="avatar-uploader"
                        showUploadList={false}
                        action="/api/upload/avatar"
                        beforeUpload={(file) => {
                          const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
                          if (!isJpgOrPng) {
                            message.error('只能上传 JPG/PNG 格式的图片!');
                          }
                          const isLt2M = file.size / 1024 / 1024 < 2;
                          if (!isLt2M) {
                            message.error('图片大小不能超过 2MB!');
                          }
                          return isJpgOrPng && isLt2M;
                        }}
                        onChange={handleAvatarChange}
                      >
                        {uploadButton}
                      </Upload>
                    </div>
                  </Form.Item>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="username"
                        label="用户名"
                        rules={[
                          { required: true, message: '请输入用户名' },
                          { min: 3, message: '用户名至少3个字符' }
                        ]}
                      >
                        <Input prefix={<UserOutlined />} disabled />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="nickname"
                        label="昵称"
                      >
                        <Input placeholder="请输入昵称" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="email"
                        label="邮箱"
                        rules={[
                          { required: true, message: '请输入邮箱' },
                          { type: 'email', message: '请输入有效的邮箱地址' }
                        ]}
                      >
                        <Input prefix={<MailOutlined />} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="phone"
                        label="手机号"
                        rules={[
                          { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' }
                        ]}
                      >
                        <Input placeholder="请输入手机号" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    name="bio"
                    label="个人简介"
                  >
                    <TextArea
                      rows={4}
                      placeholder="介绍一下自己吧..."
                      maxLength={200}
                      showCount
                    />
                  </Form.Item>

                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      icon={<SaveOutlined />}
                    >
                      保存信息
                    </Button>
                  </Form.Item>
                </Form>
              </div>
            </TabPane>

            {/* 安全设置 */}
            <TabPane
              tab={
                <Space>
                  <SecurityScanOutlined />
                  安全设置
                </Space>
              }
              key="security"
            >
              <div style={{ maxWidth: '600px' }}>
                <Title level={4}>安全设置</Title>
                
                {/* 修改密码 */}
                <Card title="修改密码" style={{ marginBottom: '24px' }}>
                  <Form
                    form={passwordForm}
                    layout="vertical"
                    onFinish={handlePasswordChange}
                    requiredMark={false}
                  >
                    <Form.Item
                      name="currentPassword"
                      label="当前密码"
                      rules={[{ required: true, message: '请输入当前密码' }]}
                    >
                      <Input.Password
                        prefix={<LockOutlined />}
                        placeholder="请输入当前密码"
                      />
                    </Form.Item>

                    <Form.Item
                      name="newPassword"
                      label="新密码"
                      rules={[
                        { required: true, message: '请输入新密码' },
                        { min: 6, message: '密码至少6个字符' },
                        {
                          pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/,
                          message: '密码必须包含大小写字母和数字'
                        }
                      ]}
                    >
                      <Input.Password
                        prefix={<LockOutlined />}
                        placeholder="请输入新密码"
                        iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                      />
                    </Form.Item>

                    <Form.Item
                      name="confirmPassword"
                      label="确认新密码"
                      dependencies={['newPassword']}
                      rules={[
                        { required: true, message: '请确认新密码' },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!value || getFieldValue('newPassword') === value) {
                              return Promise.resolve();
                            }
                            return Promise.reject(new Error('两次输入的密码不一致'));
                          },
                        }),
                      ]}
                    >
                      <Input.Password
                        prefix={<LockOutlined />}
                        placeholder="请再次输入新密码"
                        iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                      />
                    </Form.Item>

                    <Form.Item>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                      >
                        修改密码
                      </Button>
                    </Form.Item>
                  </Form>
                </Card>

                {/* 安全选项 */}
                <Form
                  form={securityForm}
                  layout="vertical"
                  onFinish={handleSecuritySave}
                  requiredMark={false}
                >
                  <Card title="安全选项" style={{ marginBottom: '24px' }}>
                    <Form.Item
                      name="twoFactorEnabled"
                      label="双因素认证"
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>
                    <Text type="secondary">启用双因素认证可以提高账户安全性</Text>

                    <Divider />

                    <Form.Item
                      name="loginNotifications"
                      label="登录通知"
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>
                    <Text type="secondary">当有新设备登录时发送通知</Text>

                    <Divider />

                    <Form.Item
                      name="sessionTimeout"
                      label="会话超时时间（小时）"
                    >
                      <Slider
                        min={1}
                        max={72}
                        marks={{
                          1: '1h',
                          24: '24h',
                          72: '72h'
                        }}
                      />
                    </Form.Item>
                  </Card>

                  {/* 受信任设备 */}
                  <Card title="受信任设备" style={{ marginBottom: '24px' }}>
                    <Form.Item name="trustedDevices">
                      <List
                        dataSource={securityForm.getFieldValue('trustedDevices') || []}
                        renderItem={(device: any) => (
                          <List.Item
                            actions={[
                              <Popconfirm
                                title="确定要移除这个设备吗？"
                                onConfirm={() => handleRemoveTrustedDevice(device.id)}
                                okText="确定"
                                cancelText="取消"
                              >
                                <Button type="link" danger size="small">
                                  移除
                                </Button>
                              </Popconfirm>
                            ]}
                          >
                            <List.Item.Meta
                              title={device.name}
                              description={
                                <Space direction="vertical" size={0}>
                                  <Text type="secondary">最后使用: {device.lastUsed}</Text>
                                  <Text type="secondary">位置: {device.location}</Text>
                                </Space>
                              }
                            />
                          </List.Item>
                        )}
                      />
                    </Form.Item>
                  </Card>

                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      icon={<SaveOutlined />}
                    >
                      保存安全设置
                    </Button>
                  </Form.Item>
                </Form>
              </div>
            </TabPane>

            {/* 偏好设置 */}
            <TabPane
              tab={
                <Space>
                  <SettingOutlined />
                  偏好设置
                </Space>
              }
              key="preferences"
            >
              <div style={{ maxWidth: '600px' }}>
                <Title level={4}>偏好设置</Title>
                <Form
                  form={preferencesForm}
                  layout="vertical"
                  onFinish={handlePreferencesSave}
                  requiredMark={false}
                >
                  {/* 界面设置 */}
                  <Card title="界面设置" style={{ marginBottom: '24px' }}>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="theme" label="主题">
                          <Radio.Group>
                            <Radio.Button value="light">浅色</Radio.Button>
                            <Radio.Button value="dark">深色</Radio.Button>
                            <Radio.Button value="auto">自动</Radio.Button>
                          </Radio.Group>
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="language" label="语言">
                          <Select>
                            <Option value="zh-CN">简体中文</Option>
                            <Option value="en-US">English</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>

                  {/* 通知设置 */}
                  <Card title="通知设置" style={{ marginBottom: '24px' }}>
                    <Form.Item name={['notifications', 'email']} label="邮件通知" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name={['notifications', 'browser']} label="浏览器通知" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name={['notifications', 'analysis']} label="分析完成通知" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name={['notifications', 'security']} label="安全通知" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                  </Card>

                  {/* 分析设置 */}
                  <Card title="分析设置" style={{ marginBottom: '24px' }}>
                    <Form.Item name={['analysis', 'autoSave']} label="自动保存分析结果" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name={['analysis', 'cacheResults']} label="缓存分析结果" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name={['analysis', 'maxHistoryDays']} label="历史记录保留天数">
                      <Slider
                        min={7}
                        max={365}
                        marks={{
                          7: '7天',
                          30: '30天',
                          90: '90天',
                          365: '1年'
                        }}
                      />
                    </Form.Item>
                    <Form.Item name={['analysis', 'defaultScenario']} label="默认分析场景">
                      <Select>
                        <Option value="general">通用</Option>
                        <Option value="skincare">护肤</Option>
                        <Option value="makeup">彩妆</Option>
                        <Option value="fragrance">香水</Option>
                      </Select>
                    </Form.Item>
                  </Card>

                  {/* 隐私设置 */}
                  <Card title="隐私设置" style={{ marginBottom: '24px' }}>
                    <Form.Item name={['privacy', 'profileVisible']} label="公开个人资料" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name={['privacy', 'historyVisible']} label="公开分析历史" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name={['privacy', 'allowDataCollection']} label="允许数据收集用于改进服务" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                  </Card>

                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      icon={<SaveOutlined />}
                    >
                      保存偏好设置
                    </Button>
                  </Form.Item>
                </Form>
              </div>
            </TabPane>

            {/* 数据管理 */}
            <TabPane
              tab={
                <Space>
                  <ExportOutlined />
                  数据管理
                </Space>
              }
              key="data"
            >
              <div style={{ maxWidth: '600px' }}>
                <Title level={4}>数据管理</Title>
                
                <Card title="数据导出" style={{ marginBottom: '24px' }}>
                  <Paragraph>
                    您可以导出您的所有个人数据，包括个人信息、分析历史、设置等。
                  </Paragraph>
                  <Button
                    type="primary"
                    icon={<ExportOutlined />}
                    onClick={handleExportData}
                  >
                    导出个人数据
                  </Button>
                </Card>

                <Card title="账户删除" style={{ marginBottom: '24px' }}>
                  <Alert
                    message="危险操作"
                    description="删除账户将永久删除您的所有数据，此操作不可恢复！"
                    type="error"
                    showIcon
                    style={{ marginBottom: '16px' }}
                  />
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={handleDeleteAccount}
                  >
                    删除账户
                  </Button>
                </Card>
              </div>
            </TabPane>
          </Tabs>
        </Card>
      </Content>
    </Layout>
  );
};

export default Settings;