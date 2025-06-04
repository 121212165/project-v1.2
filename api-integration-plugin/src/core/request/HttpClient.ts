/**
 * HTTP客户端 - 核心请求处理模块
 * 基于axios封装，提供统一的HTTP请求接口
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { HttpRequestModel, HttpResponseModel, AuthType, RequestBodyType } from '@/types/api';
import { formatBytes, generateId } from '@/utils/helpers';

export class HttpClient {
  private axiosInstance: AxiosInstance;
  private requestInterceptors: number[] = [];
  private responseInterceptors: number[] = [];

  constructor() {
    this.axiosInstance = axios.create({
      timeout: 30000,
      maxContentLength: 50 * 1024 * 1024, // 50MB
      maxBodyLength: 50 * 1024 * 1024, // 50MB
      validateStatus: () => true, // 不自动抛出错误，让我们手动处理
    });

    this.setupInterceptors();
  }

  /**
   * 设置请求和响应拦截器
   */
  private setupInterceptors(): void {
    // 请求拦截器
    const requestInterceptor = this.axiosInstance.interceptors.request.use(
      (config) => {
        // 添加请求时间戳
        config.metadata = { startTime: Date.now() };
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    const responseInterceptor = this.axiosInstance.interceptors.response.use(
      (response) => {
        // 计算请求耗时
        const endTime = Date.now();
        const startTime = response.config.metadata?.startTime || endTime;
        response.metadata = {
          duration: endTime - startTime,
          size: this.calculateResponseSize(response),
        };
        return response;
      },
      (error) => {
        // 处理网络错误
        if (error.config?.metadata?.startTime) {
          const endTime = Date.now();
          error.metadata = {
            duration: endTime - error.config.metadata.startTime,
            size: 0,
          };
        }
        return Promise.reject(error);
      }
    );

    this.requestInterceptors.push(requestInterceptor);
    this.responseInterceptors.push(responseInterceptor);
  }

  /**
   * 执行HTTP请求
   */
  async executeRequest(requestModel: HttpRequestModel): Promise<HttpResponseModel> {
    try {
      const config = this.buildAxiosConfig(requestModel);
      const response = await this.axiosInstance.request(config);
      return this.buildResponseModel(requestModel.id, response);
    } catch (error) {
      return this.buildErrorResponseModel(requestModel.id, error as AxiosError);
    }
  }

  /**
   * 构建Axios请求配置
   */
  private buildAxiosConfig(requestModel: HttpRequestModel): AxiosRequestConfig {
    const config: AxiosRequestConfig = {
      method: requestModel.method.toLowerCase() as any,
      url: this.buildUrl(requestModel.url, requestModel.queryParams),
      headers: this.buildHeaders(requestModel),
      timeout: requestModel.settings.timeout,
      maxRedirects: requestModel.settings.followRedirects ? 5 : 0,
      validateStatus: () => true,
    };

    // 设置请求体
    if (requestModel.body.type !== RequestBodyType.NONE) {
      config.data = this.buildRequestBody(requestModel);
    }

    // SSL验证设置
    if (!requestModel.settings.validateSSL) {
      config.httpsAgent = new (require('https').Agent)({
        rejectUnauthorized: false,
      });
    }

    return config;
  }

  /**
   * 构建完整URL（包含查询参数）
   */
  private buildUrl(baseUrl: string, queryParams: any[]): string {
    const enabledParams = queryParams.filter(param => param.enabled);
    if (enabledParams.length === 0) {
      return baseUrl;
    }

    const url = new URL(baseUrl);
    enabledParams.forEach(param => {
      url.searchParams.append(param.key, param.value);
    });

    return url.toString();
  }

  /**
   * 构建请求头
   */
  private buildHeaders(requestModel: HttpRequestModel): Record<string, string> {
    const headers: Record<string, string> = {};

    // 添加用户自定义头部
    requestModel.headers
      .filter(header => header.enabled && header.key)
      .forEach(header => {
        headers[header.key] = header.value;
      });

    // 添加认证头部
    const authHeaders = this.buildAuthHeaders(requestModel.auth);
    Object.assign(headers, authHeaders);

    // 根据请求体类型设置Content-Type
    if (requestModel.body.type !== RequestBodyType.NONE) {
      const contentType = this.getContentType(requestModel.body.type);
      if (contentType && !headers['Content-Type']) {
        headers['Content-Type'] = contentType;
      }
    }

    return headers;
  }

  /**
   * 构建认证头部
   */
  private buildAuthHeaders(auth: any): Record<string, string> {
    const headers: Record<string, string> = {};

    switch (auth.type) {
      case AuthType.BASIC:
        if (auth.basic?.username && auth.basic?.password) {
          const credentials = btoa(`${auth.basic.username}:${auth.basic.password}`);
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;

      case AuthType.BEARER:
        if (auth.bearer?.token) {
          headers['Authorization'] = `Bearer ${auth.bearer.token}`;
        }
        break;

      case AuthType.API_KEY:
        if (auth.apiKey?.key && auth.apiKey?.value) {
          if (auth.apiKey.addTo === 'header') {
            headers[auth.apiKey.key] = auth.apiKey.value;
          }
        }
        break;

      case AuthType.OAUTH2:
        if (auth.oauth2?.accessToken) {
          const tokenType = auth.oauth2.tokenType || 'Bearer';
          headers['Authorization'] = `${tokenType} ${auth.oauth2.accessToken}`;
        }
        break;
    }

    return headers;
  }

  /**
   * 构建请求体
   */
  private buildRequestBody(requestModel: HttpRequestModel): any {
    const { body } = requestModel;

    switch (body.type) {
      case RequestBodyType.JSON:
        try {
          return JSON.parse(body.raw || '{}');
        } catch {
          return body.raw;
        }

      case RequestBodyType.XML:
      case RequestBodyType.RAW:
        return body.raw;

      case RequestBodyType.FORM_DATA:
        const formData = new FormData();
        body.formData?.forEach(item => {
          if (item.enabled) {
            if (item.type === 'file' && item.file) {
              const blob = new Blob([item.file.content], { type: item.file.type });
              formData.append(item.key, blob, item.file.name);
            } else {
              formData.append(item.key, item.value);
            }
          }
        });
        return formData;

      case RequestBodyType.X_WWW_FORM_URLENCODED:
        const params = new URLSearchParams();
        body.urlEncoded?.forEach(item => {
          if (item.enabled) {
            params.append(item.key, item.value);
          }
        });
        return params;

      case RequestBodyType.BINARY:
        return body.binary?.content;

      case RequestBodyType.GRAPHQL:
        return {
          query: body.graphql?.query,
          variables: body.graphql?.variables ? JSON.parse(body.graphql.variables) : undefined,
        };

      default:
        return undefined;
    }
  }

  /**
   * 获取Content-Type
   */
  private getContentType(bodyType: RequestBodyType): string | undefined {
    switch (bodyType) {
      case RequestBodyType.JSON:
        return 'application/json';
      case RequestBodyType.XML:
        return 'application/xml';
      case RequestBodyType.X_WWW_FORM_URLENCODED:
        return 'application/x-www-form-urlencoded';
      case RequestBodyType.GRAPHQL:
        return 'application/json';
      default:
        return undefined;
    }
  }

  /**
   * 构建响应模型
   */
  private buildResponseModel(requestId: string, response: AxiosResponse): HttpResponseModel {
    return {
      id: generateId(),
      requestId,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers as Record<string, string>,
      body: this.formatResponseBody(response.data),
      size: response.metadata?.size || 0,
      time: response.metadata?.duration || 0,
      timestamp: new Date().toISOString(),
      redirects: this.extractRedirects(response),
    };
  }

  /**
   * 构建错误响应模型
   */
  private buildErrorResponseModel(requestId: string, error: AxiosError): HttpResponseModel {
    const response = error.response;
    
    return {
      id: generateId(),
      requestId,
      status: response?.status || 0,
      statusText: response?.statusText || 'Network Error',
      headers: (response?.headers as Record<string, string>) || {},
      body: response?.data ? this.formatResponseBody(response.data) : '',
      size: error.metadata?.size || 0,
      time: error.metadata?.duration || 0,
      timestamp: new Date().toISOString(),
      error: this.formatError(error),
    };
  }

  /**
   * 格式化响应体
   */
  private formatResponseBody(data: any): string {
    if (typeof data === 'string') {
      return data;
    }
    if (typeof data === 'object') {
      return JSON.stringify(data, null, 2);
    }
    return String(data);
  }

  /**
   * 计算响应大小
   */
  private calculateResponseSize(response: AxiosResponse): number {
    const headers = JSON.stringify(response.headers);
    const body = typeof response.data === 'string' 
      ? response.data 
      : JSON.stringify(response.data);
    
    return new Blob([headers + body]).size;
  }

  /**
   * 提取重定向信息
   */
  private extractRedirects(response: AxiosResponse): string[] {
    // 这里可以根据需要实现重定向历史的提取
    return [];
  }

  /**
   * 格式化错误信息
   */
  private formatError(error: AxiosError): string {
    if (error.code === 'ECONNABORTED') {
      return 'Request timeout';
    }
    if (error.code === 'ENOTFOUND') {
      return 'DNS resolution failed';
    }
    if (error.code === 'ECONNREFUSED') {
      return 'Connection refused';
    }
    if (error.message) {
      return error.message;
    }
    return 'Unknown error occurred';
  }

  /**
   * 取消请求
   */
  cancelRequest(requestId: string): void {
    // 实现请求取消逻辑
    // 可以使用AbortController或axios的CancelToken
  }

  /**
   * 清理资源
   */
  destroy(): void {
    // 移除拦截器
    this.requestInterceptors.forEach(id => {
      this.axiosInstance.interceptors.request.eject(id);
    });
    this.responseInterceptors.forEach(id => {
      this.axiosInstance.interceptors.response.eject(id);
    });
  }
}

// 扩展axios类型以支持metadata
declare module 'axios' {
  interface AxiosRequestConfig {
    metadata?: {
      startTime: number;
    };
  }

  interface AxiosResponse {
    metadata?: {
      duration: number;
      size: number;
    };
  }

  interface AxiosError {
    metadata?: {
      duration: number;
      size: number;
    };
  }
}

export default HttpClient;