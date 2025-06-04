import React from 'react';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MessageContext } from '@/hooks/useMessage';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import History from '@/pages/History';
import Settings from '@/pages/Settings';
import DeepSeek from '@/pages/DeepSeek';
import '@/App.css';

// Ant Design 主题配置
const theme = {
  token: {
    colorPrimary: '#1890ff',
    borderRadius: 6,
    colorBgContainer: '#ffffff',
  },
  components: {
    Layout: {
      bodyBg: '#f5f5f5',
      headerBg: '#ffffff',
      siderBg: '#ffffff',
    },
    Card: {
      borderRadiusLG: 8,
    },
    Button: {
      borderRadius: 6,
    },
    Input: {
      borderRadius: 6,
    },
    Select: {
      borderRadius: 6,
    },
    Upload: {
      borderRadius: 6,
    },
  },
};

const AppContent: React.FC = () => {
  const { message } = AntdApp.useApp();
  
  return (
    <MessageContext.Provider value={message}>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <div className="App">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/deepseek" element={<DeepSeek />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </div>
      </Router>
    </MessageContext.Provider>
  );
};

const App: React.FC = () => {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={theme}
    >
      <AntdApp>
        <AppContent />
      </AntdApp>
    </ConfigProvider>
  );
};

export default App;