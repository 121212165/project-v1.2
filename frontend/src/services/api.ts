import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { message } from 'antd';
import {
  ApiResponse,
  TextAnalysisRequest,
  TextAnalysisResponse,
  ImageAnalysisRequest,
  ImageAnalysisResponse,
  AnalysisHistoryItem
} from '../types';

// 用户认证相关类型
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
}

// 历史记录相关类型
export interface HistoryResponse {
  tasks: AnalysisHistoryItem[];
  total: number;
  page: number;
  limit: number;
}

export interface UserStats {
  totalTasks: number;
  textTasks: number;
  imageTasks: number;
  compliantTasks: number;
  warningTasks: number;
  violationTasks: number;
}

// 创建axios实例
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 添加认证token
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { data } = response;
    
    // 如果响应成功但业务失败
    if (!data.success) {
      message.error(data.error || '请求失败');
      return Promise.reject(new Error(data.error || '请求失败'));
    }
    
    return response;
  },
  (error) => {
    // 处理HTTP错误
    let errorMessage = '网络错误，请稍后重试';
    
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          errorMessage = data?.error || '请求参数错误';
          break;
        case 401:
          errorMessage = '未授权访问';
          break;
        case 403:
          errorMessage = '禁止访问';
          break;
        case 404:
          errorMessage = '请求的资源不存在';
          break;
        case 429:
          errorMessage = '请求过于频繁，请稍后重试';
          break;
        case 500:
          errorMessage = '服务器内部错误';
          break;
        case 503:
          errorMessage = data?.error || 'AI服务暂时不可用';
          break;
        default:
          errorMessage = data?.error || `请求失败 (${status})`;
      }
    } else if (error.request) {
      errorMessage = '网络连接失败，请检查网络设置';
    } else {
      errorMessage = error.message || '未知错误';
    }
    
    message.error(errorMessage);
    return Promise.reject(error);
  }
);

// API方法
export const apiService = {
  /**
   * 用户认证相关
   */
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', data);
    return response.data.data!;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', data);
    return response.data.data!;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
    localStorage.removeItem('auth_token');
  },

  /**
   * 文本分析
   */
  analyzeText: async (data: TextAnalysisRequest): Promise<TextAnalysisResponse> => {
    const response = await api.post<ApiResponse<TextAnalysisResponse>>('/analyze/text', data);
    return response.data.data!;
  },

  /**
   * 图文分析
   */
  analyzeImageText: async (data: ImageAnalysisRequest): Promise<ImageAnalysisResponse> => {
    const formData = new FormData();
    formData.append('image', data.image);
    if (data.text) {
      formData.append('text', data.text);
    }
    if (data.sessionId) {
      formData.append('sessionId', data.sessionId);
    }
    if (data.scenario) {
      formData.append('scenario', data.scenario);
    }
    if (data.useCache !== undefined) {
      formData.append('useCache', data.useCache.toString());
    }

    const response = await api.post<ApiResponse<ImageAnalysisResponse>>(
      '/analyze/image-text',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data.data!;
  },

  /**
   * 历史记录相关
   */
  getHistory: async (page: number = 1, limit: number = 20, type?: 'text' | 'image'): Promise<HistoryResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    if (type) {
      params.append('type', type);
    }
    const response = await api.get<ApiResponse<HistoryResponse>>(`/history?${params}`);
    return response.data.data!;
  },

  getTaskDetail: async (taskId: string): Promise<AnalysisHistoryItem> => {
    const response = await api.get<ApiResponse<AnalysisHistoryItem>>(`/history/${taskId}`);
    return response.data.data!;
  },

  deleteTask: async (taskId: string): Promise<void> => {
    await api.delete(`/history/${taskId}`);
  },

  getUserStats: async (): Promise<UserStats> => {
    const response = await api.get<ApiResponse<UserStats>>('/history/stats');
    return response.data.data!;
  },

  /**
   * 健康检查
   */
  healthCheck: async (): Promise<any> => {
    const response = await api.get<ApiResponse>('/analyze/health');
    return response.data.data;
  }
};

// 导出axios实例供其他地方使用
export default api;