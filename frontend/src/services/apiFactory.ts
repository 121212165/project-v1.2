import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { MessageInstance } from 'antd/es/message/interface';
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
  email: string;
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

export interface HistoryResponse {
  data: AnalysisHistoryItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UserStats {
  totalAnalyses: number;
  todayAnalyses: number;
  weeklyAnalyses: number;
  monthlyAnalyses: number;
}

// 创建 API 服务工厂函数
export const createApiService = (messageApi: MessageInstance) => {
  // 创建 axios 实例
  const api: AxiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
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
        messageApi.error(data.error || '请求失败');
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
      
      messageApi.error(errorMessage);
      return Promise.reject(error);
    }
  );

  // API 服务对象
  return {
    // 用户认证
    async login(data: LoginRequest): Promise<AuthResponse> {
      const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', data);
      return response.data.data!;
    },

    async register(data: RegisterRequest): Promise<AuthResponse> {
      const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', data);
      return response.data.data!;
    },

    async logout(): Promise<void> {
      await api.post('/auth/logout');
    },

    // 文本分析
    async analyzeText(data: TextAnalysisRequest): Promise<TextAnalysisResponse> {
      const response = await api.post<ApiResponse<TextAnalysisResponse>>('/analysis/text', data);
      return response.data.data!;
    },

    // 图文分析
    async analyzeImageText(data: ImageAnalysisRequest): Promise<ImageAnalysisResponse> {
      const formData = new FormData();
      formData.append('image', data.image);
      formData.append('text', data.text);
      formData.append('analysisType', data.analysisType);
      formData.append('options', JSON.stringify(data.options));

      const response = await api.post<ApiResponse<ImageAnalysisResponse>>('/analysis/image-text', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.data!;
    },

    // 获取分析历史
    async getAnalysisHistory(page = 1, pageSize = 10): Promise<HistoryResponse> {
      const response = await api.get<ApiResponse<HistoryResponse>>('/analysis/history', {
        params: { page, pageSize }
      });
      return response.data.data!;
    },

    // 删除分析记录
    async deleteAnalysisRecord(id: string): Promise<void> {
      await api.delete(`/analysis/history/${id}`);
    },

    // 获取用户统计
    async getUserStats(): Promise<UserStats> {
      const response = await api.get<ApiResponse<UserStats>>('/user/stats');
      return response.data.data!;
    },

    // 健康检查
    async healthCheck(): Promise<{ status: string; timestamp: string }> {
      const response = await api.get<ApiResponse<{ status: string; timestamp: string }>>('/health');
      return response.data.data!;
    },

    // 获取系统配置
    async getSystemConfig(): Promise<any> {
      const response = await api.get<ApiResponse<any>>('/config');
      return response.data.data!;
    },

    // 更新用户信息
    async updateUserProfile(data: any): Promise<any> {
      const response = await api.put<ApiResponse<any>>('/user/profile', data);
      return response.data.data!;
    },

    // 修改密码
    async changePassword(data: { oldPassword: string; newPassword: string }): Promise<void> {
      await api.put('/user/password', data);
    },

    // 上传头像
    async uploadAvatar(file: File): Promise<{ url: string }> {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await api.post<ApiResponse<{ url: string }>>('/user/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.data!;
    },

    // 导出数据
    async exportUserData(): Promise<void> {
      await api.post('/user/export');
    },

    // 删除账户
    async deleteAccount(): Promise<void> {
      await api.delete('/user/account');
    }
  };
};