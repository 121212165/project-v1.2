import React, { useState } from 'react';
import {
  Layout,
  Card,
  Button,
  Input,
  Typography,
  Space,
  Spin,
  message,
  Row,
  Col,
  Divider
} from 'antd';
import {
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  ClearOutlined
} from '@ant-design/icons';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const DeepSeek: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '你好！我是DeepSeek R1，一个AI助手。我可以帮助你回答问题、进行对话和提供各种信息。请问有什么我可以帮助你的吗？',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('你好，你是谁');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!inputValue.trim()) {
      message.warning('请输入消息内容');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      // 模拟API调用DeepSeek R1
      const response = await fetch('/api/deepseek/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputValue,
          model: 'deepseek-r1'
        })
      });

      if (!response.ok) {
        throw new Error('API调用失败');
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || '抱歉，我现在无法回应。请稍后再试。',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('DeepSeek API调用错误:', error);
      
      // 模拟回复，因为实际API可能还没有配置
      const mockResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '你好！我是DeepSeek R1，一个由深度求索开发的大型语言模型。我具备强大的推理能力和广泛的知识储备，可以帮助你解答各种问题、进行创作、分析问题等。我的特点包括：\n\n1. 强大的逻辑推理能力\n2. 丰富的知识储备\n3. 多语言支持\n4. 代码编程能力\n5. 创意写作能力\n\n有什么我可以帮助你的吗？',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, mockResponse]);
      message.info('当前使用模拟回复，实际API接口需要配置');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: '你好！我是DeepSeek R1，一个AI助手。我可以帮助你回答问题、进行对话和提供各种信息。请问有什么我可以帮助你的吗？',
        timestamp: new Date()
      }
    ]);
    setInputValue('你好，你是谁');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Header style={{ 
        background: '#fff', 
        padding: '0 24px', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center'
      }}>
        <RobotOutlined style={{ fontSize: '24px', color: '#1890ff', marginRight: '12px' }} />
        <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
          DeepSeek R1 对话
        </Title>
      </Header>
      
      <Content style={{ padding: '24px' }}>
        <Row gutter={24} justify="center">
          <Col xs={24} sm={20} md={16} lg={14} xl={12}>
            <Card 
              style={{ 
                height: 'calc(100vh - 200px)',
                display: 'flex',
                flexDirection: 'column'
              }}
              styles={{ body: { 
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                padding: 0
              } }}
            >
              {/* 消息列表 */}
              <div style={{ 
                flex: 1, 
                padding: '16px',
                overflowY: 'auto',
                background: '#fafafa'
              }}>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                  {messages.map((msg) => (
                    <div key={msg.id} style={{ 
                      display: 'flex',
                      justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                    }}>
                      <div style={{
                        maxWidth: '80%',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
                      }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: msg.role === 'user' ? '#1890ff' : '#52c41a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          flexShrink: 0
                        }}>
                          {msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                        </div>
                        <div style={{
                          background: msg.role === 'user' ? '#1890ff' : '#fff',
                          color: msg.role === 'user' ? 'white' : '#333',
                          padding: '12px 16px',
                          borderRadius: '12px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          border: msg.role === 'assistant' ? '1px solid #e8e8e8' : 'none'
                        }}>
                          <Paragraph 
                            style={{ 
                              margin: 0, 
                              color: msg.role === 'user' ? 'white' : '#333',
                              whiteSpace: 'pre-wrap'
                            }}
                          >
                            {msg.content}
                          </Paragraph>
                          <Text 
                            style={{ 
                              fontSize: '12px', 
                              opacity: 0.7,
                              color: msg.role === 'user' ? 'white' : '#666',
                              marginTop: '4px',
                              display: 'block'
                            }}
                          >
                            {msg.timestamp.toLocaleTimeString()}
                          </Text>
                        </div>
                      </div>
                    </div>
                  ))
                  }
                  {loading && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: '#52c41a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white'
                        }}>
                          <RobotOutlined />
                        </div>
                        <div style={{
                          background: '#fff',
                          padding: '12px 16px',
                          borderRadius: '12px',
                          border: '1px solid #e8e8e8'
                        }}>
                          <Spin size="small" />
                          <Text style={{ marginLeft: '8px' }}>正在思考...</Text>
                        </div>
                      </div>
                    </div>
                  )}
                </Space>
              </div>
              
              <Divider style={{ margin: 0 }} />
              
              {/* 输入区域 */}
              <div style={{ padding: '16px' }}>
                <Space.Compact style={{ width: '100%' }}>
                  <TextArea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="输入你的消息... (按Enter发送，Shift+Enter换行)"
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    style={{ resize: 'none' }}
                  />
                  <Button 
                    type="primary" 
                    icon={<SendOutlined />}
                    onClick={handleSend}
                    loading={loading}
                    style={{ height: 'auto' }}
                  >
                    发送
                  </Button>
                </Space.Compact>
                <div style={{ marginTop: '8px', textAlign: 'center' }}>
                  <Button 
                    type="text" 
                    icon={<ClearOutlined />}
                    onClick={handleClear}
                    size="small"
                  >
                    清空对话
                  </Button>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
};

export default DeepSeek;