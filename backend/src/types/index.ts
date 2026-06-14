export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface User {
  id: number;
  username: string;
  email?: string;
  phone?: string;
  nickname?: string;
  avatar?: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    email?: string;
    role: string;
    isActive: boolean;
  };
}

export interface TextAnalysisRequest {
  text: string;
  sessionId?: string;
  scenario?: string;
  useCache?: boolean;
}

export interface ImageAnalysisRequest {
  text?: string;
  image: File;
  sessionId?: string;
  scenario?: string;
  useCache?: boolean;
}

export interface TextAnalysisResponse {
  status: 'compliant' | 'warning' | 'violation';
  score: number;
  errors: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    suggestions: string[];
    text?: string;
  }>;
  suggestions: Array<{
    original: string;
    improved: string;
    reason: string;
  }>;
  compliance: { score: number; issues: string[] };
  resources: string[];
}

export interface ImageAnalysisResponse {
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

export interface SessionInfo {
  id: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  expiresAt: Date;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        email?: string;
        role: string;
        isActive: boolean;
      };
    }
  }
}
