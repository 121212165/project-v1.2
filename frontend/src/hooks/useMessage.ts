import { App } from 'antd';
import { MessageInstance } from 'antd/es/message/interface';
import { createContext, useContext, useMemo } from 'react';
import { createApiService } from '../services/apiFactory';

// 创建 Message Context
export const MessageContext = createContext<MessageInstance | null>(null);

// 自定义 Hook 来使用 Message
export const useMessage = (): MessageInstance => {
  const messageApi = useContext(MessageContext);
  if (!messageApi) {
    throw new Error('useMessage must be used within MessageProvider');
  }
  return messageApi;
};

// 自定义 Hook 来使用 API Service with Message
export const useApiService = () => {
  const messageApi = useMessage();
  
  const apiService = useMemo(() => {
    return createApiService(messageApi);
  }, [messageApi]);
  
  return apiService;
};

// 获取 App 实例的 Hook
export const useAppInstance = () => {
  const { message, modal, notification } = App.useApp();
  return { message, modal, notification };
};