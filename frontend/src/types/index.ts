// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 分析请求类型
export interface TextAnalysisRequest {
  text: string;
  sessionId?: string;
  scenario?: string;
  useCache?: boolean;
}

export interface ImageAnalysisRequest {
  text?: string;
  image: File;
}

// 分析结果类型
export interface AnalysisIssue {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestions: string[];
  text?: string;
  reason?: string;
}

export interface TextAnalysisResponse {
  id?: string;
  status: 'compliant' | 'warning' | 'violation';
  score: number;
  errors: AnalysisIssue[];
  suggestions: Array<{
    original: string;
    improved: string;
    reason: string;
  }>;
  compliance: {
    score: number;
    issues: string[];
  };
  resources: string[];
  sentiment?: {
    polarity: number;
    subjectivity: number;
  };
}

export interface ImageAnalysisResponse {
  id?: string;
  imageAnalysis: {
    objects: string[];
    inappropriate: boolean;
    confidence: number;
  };
  textAnalysis?: TextAnalysisResponse;
  overallAssessment: {
    status: 'compliant' | 'warning' | 'violation';
    recommendations: string[];
  };
}

// 组件Props类型
export interface AnalysisResultProps {
  result: TextAnalysisResponse | ImageAnalysisResponse;
  loading?: boolean;
  onRetry?: () => void;
}

export interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
  disabled?: boolean;
}

// 用户状态类型
export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

export interface HistoryMeta {
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  loading: boolean;
}

export interface UserStats {
  totalAnalyses: number;
  completedAnalyses: number;
  pendingAnalyses: number;
}

// 状态管理类型
export interface AppState {
  // 用户认证状态
  auth: AuthState;
  // 分析状态
  textAnalysis: {
    loading: boolean;
    result: TextAnalysisResponse | null;
    error: string | null;
  };
  imageAnalysis: {
    loading: boolean;
    result: ImageAnalysisResponse | null;
    error: string | null;
  };
  // 历史记录
  history: AnalysisHistoryItem[];
  historyMeta: HistoryMeta;
  userStats: UserStats | null;
  // UI状态
  ui: {
    activeTab: 'text' | 'image';
    sidebarCollapsed: boolean;
  };
}

export interface AnalysisHistoryItem {
  id: string;
  type: 'text' | 'image';
  content: string;
  result: TextAnalysisResponse | ImageAnalysisResponse;
  timestamp: string;
}

// 主题类型
export interface ThemeConfig {
  primaryColor: string;
  borderRadius: number;
  colorBgContainer: string;
}

// 路由类型
export interface RouteConfig {
  path: string;
  element: React.ComponentType;
  title: string;
  icon?: React.ReactNode;
}