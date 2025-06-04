/**
 * API Integration Plugin - Core Type Definitions
 * 定义API请求、响应和相关数据结构的TypeScript类型
 */

// HTTP方法枚举
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
}

// 请求体类型
export enum RequestBodyType {
  NONE = 'none',
  JSON = 'json',
  XML = 'xml',
  FORM_DATA = 'form-data',
  X_WWW_FORM_URLENCODED = 'x-www-form-urlencoded',
  RAW = 'raw',
  BINARY = 'binary',
  GRAPHQL = 'graphql',
}

// 认证类型
export enum AuthType {
  NONE = 'none',
  BASIC = 'basic',
  BEARER = 'bearer',
  API_KEY = 'api-key',
  OAUTH1 = 'oauth1',
  OAUTH2 = 'oauth2',
  DIGEST = 'digest',
  HAWK = 'hawk',
  AWS_SIGNATURE = 'aws-signature',
}

// 键值对接口
export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  description?: string;
  enabled: boolean;
}

// 文件上传接口
export interface FileUpload {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string | ArrayBuffer;
  lastModified: number;
}

// 表单数据项
export interface FormDataItem {
  id: string;
  key: string;
  value: string;
  type: 'text' | 'file';
  file?: FileUpload;
  description?: string;
  enabled: boolean;
}

// 认证配置
export interface AuthConfig {
  type: AuthType;
  basic?: {
    username: string;
    password: string;
  };
  bearer?: {
    token: string;
  };
  apiKey?: {
    key: string;
    value: string;
    addTo: 'header' | 'query';
  };
  oauth1?: {
    consumerKey: string;
    consumerSecret: string;
    accessToken: string;
    tokenSecret: string;
    signatureMethod: string;
    timestamp?: string;
    nonce?: string;
  };
  oauth2?: {
    accessToken: string;
    tokenType?: string;
    addTokenTo: 'header' | 'query';
  };
}

// HTTP请求模型
export interface HttpRequestModel {
  id: string;
  name: string;
  description?: string;
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  queryParams: KeyValuePair[];
  auth: AuthConfig;
  body: {
    type: RequestBodyType;
    raw?: string;
    formData?: FormDataItem[];
    urlEncoded?: KeyValuePair[];
    binary?: FileUpload;
    graphql?: {
      query: string;
      variables?: string;
    };
  };
  settings: {
    timeout: number;
    followRedirects: boolean;
    validateSSL: boolean;
    encoding: string;
  };
  createdAt: string;
  updatedAt: string;
}

// HTTP响应模型
export interface HttpResponseModel {
  id: string;
  requestId: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  size: number;
  time: number;
  timestamp: string;
  error?: string;
  redirects?: string[];
}

// 请求集合
export interface RequestCollection {
  id: string;
  name: string;
  description?: string;
  requests: HttpRequestModel[];
  folders: RequestFolder[];
  variables: KeyValuePair[];
  auth?: AuthConfig;
  createdAt: string;
  updatedAt: string;
}

// 请求文件夹
export interface RequestFolder {
  id: string;
  name: string;
  description?: string;
  requests: HttpRequestModel[];
  folders: RequestFolder[];
  auth?: AuthConfig;
  createdAt: string;
  updatedAt: string;
}

// 环境配置
export interface Environment {
  id: string;
  name: string;
  variables: KeyValuePair[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 代码生成语言
export enum CodegenLanguage {
  CURL = 'curl',
  JAVASCRIPT_AXIOS = 'javascript-axios',
  JAVASCRIPT_FETCH = 'javascript-fetch',
  NODEJS_AXIOS = 'nodejs-axios',
  NODEJS_FETCH = 'nodejs-fetch',
  PYTHON_REQUESTS = 'python-requests',
  PYTHON_HTTP_CLIENT = 'python-http-client',
  JAVA_OKHTTP = 'java-okhttp',
  JAVA_HTTP_CLIENT = 'java-http-client',
  CSHARP_HTTP_CLIENT = 'csharp-http-client',
  CSHARP_RESTSHARP = 'csharp-restsharp',
  GO_HTTP = 'go-http',
  PHP_CURL = 'php-curl',
  PHP_GUZZLE = 'php-guzzle',
  RUST_REQWEST = 'rust-reqwest',
  RUST_HYPER = 'rust-hyper',
  SWIFT_URLSESSION = 'swift-urlsession',
  SWIFT_ALAMOFIRE = 'swift-alamofire',
  KOTLIN_OKHTTP = 'kotlin-okhttp',
  RUBY_FARADAY = 'ruby-faraday',
  RUBY_NET_HTTP = 'ruby-net-http',
}

// 代码生成配置
export interface CodegenConfig {
  language: CodegenLanguage;
  options: {
    includeComments: boolean;
    includeErrorHandling: boolean;
    useAsync: boolean;
    indentSize: number;
    indentType: 'spaces' | 'tabs';
  };
}

// 导入/导出格式
export enum ImportExportFormat {
  JSON = 'json',
  HAR = 'har',
  POSTMAN = 'postman',
  INSOMNIA = 'insomnia',
  OPENAPI = 'openapi',
  CURL = 'curl',
}

// 应用设置
export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  defaultTimeout: number;
  maxResponseSize: number;
  autoSave: boolean;
  showLineNumbers: boolean;
  wordWrap: boolean;
  fontSize: number;
  fontFamily: string;
  requestHistoryLimit: number;
  enableTelemetry: boolean;
}

// 请求历史
export interface RequestHistory {
  id: string;
  request: HttpRequestModel;
  response?: HttpResponseModel;
  timestamp: string;
  duration: number;
  success: boolean;
}

// 测试用例
export interface TestCase {
  id: string;
  name: string;
  description?: string;
  script: string;
  enabled: boolean;
}

// 测试结果
export interface TestResult {
  id: string;
  testCaseId: string;
  passed: boolean;
  message?: string;
  duration: number;
  timestamp: string;
}

// WebSocket消息
export interface WebSocketMessage {
  id: string;
  type: 'sent' | 'received';
  data: string;
  timestamp: string;
}

// GraphQL Schema
export interface GraphQLSchema {
  id: string;
  name: string;
  url: string;
  schema: string;
  introspectionResult?: any;
  createdAt: string;
  updatedAt: string;
}

// API文档
export interface ApiDocumentation {
  id: string;
  title: string;
  description?: string;
  version: string;
  baseUrl: string;
  endpoints: ApiEndpoint[];
  schemas: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// API端点
export interface ApiEndpoint {
  id: string;
  path: string;
  method: HttpMethod;
  summary?: string;
  description?: string;
  parameters: ApiParameter[];
  requestBody?: ApiRequestBody;
  responses: Record<string, ApiResponse>;
  tags: string[];
}

// API参数
export interface ApiParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required: boolean;
  schema: any;
  example?: any;
}

// API请求体
export interface ApiRequestBody {
  description?: string;
  required: boolean;
  content: Record<string, {
    schema: any;
    example?: any;
  }>;
}

// API响应
export interface ApiResponse {
  description: string;
  headers?: Record<string, any>;
  content?: Record<string, {
    schema: any;
    example?: any;
  }>;
}

// 错误类型
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// 插件配置
export interface PluginConfig {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  settings: Record<string, any>;
}

// 工作空间
export interface Workspace {
  id: string;
  name: string;
  description?: string;
  collections: RequestCollection[];
  environments: Environment[];
  settings: AppSettings;
  createdAt: string;
  updatedAt: string;
}