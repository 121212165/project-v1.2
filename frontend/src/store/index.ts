import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  AppState,
  TextAnalysisResponse,
  ImageAnalysisResponse,
  AnalysisHistoryItem,
  User,
  AuthState,
  HistoryMeta,
  UserStats
} from '@/types';
import { apiService, AuthResponse, HistoryResponse } from '@/services/api';



interface AppActions {
  // 用户认证相关
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  initAuth: () => void;
  
  // 文本分析相关
  analyzeText: (text: string, options?: { sessionId?: string; scenario?: string; useCache?: boolean }) => Promise<void>;
  clearTextAnalysis: () => void;
  
  // 图文分析相关
  analyzeImageText: (text: string, image: File) => Promise<void>;
  clearImageAnalysis: () => void;
  
  // 历史记录相关
  loadHistory: (page?: number, limit?: number, type?: 'text' | 'image') => Promise<void>;
  loadUserStats: () => Promise<void>;
  deleteHistoryItem: (taskId: string) => Promise<void>;
  addToHistory: (item: Omit<AnalysisHistoryItem, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;
  removeFromHistory: (id: string) => void;
  
  // UI状态相关
  setActiveTab: (tab: 'text' | 'image') => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

type AppStore = ExtendedAppState & AppActions;

// 扩展AppState类型
interface ExtendedAppState extends AppState {
  auth: AuthState;
  historyMeta: {
    loading: boolean;
    total: number;
    page: number;
    limit: number;
  };
  userStats: {
    loading: boolean;
    data: UserStats | null;
  };
}

const initialState: ExtendedAppState = {
  auth: {
    isAuthenticated: false,
    user: null,
    token: localStorage.getItem('auth_token')
  },
  textAnalysis: {
    loading: false,
    result: null,
    error: null
  },
  imageAnalysis: {
    loading: false,
    result: null,
    error: null
  },
  history: [],
  historyMeta: {
    loading: false,
    total: 0,
    page: 1,
    limit: 20
  },
  userStats: {
    loading: false,
    data: null
  },
  ui: {
    activeTab: 'text',
    sidebarCollapsed: false
  }
};

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // 用户认证
        initAuth: () => {
          const token = localStorage.getItem('auth_token');
          if (token) {
            set((state) => {
              state.auth.token = token;
              state.auth.isAuthenticated = true;
              // 这里可以添加验证token有效性的逻辑
            });
          }
        },

        login: async (username: string, password: string) => {
          try {
            const response = await apiService.login({ email: username, password });
            localStorage.setItem('auth_token', response.token);
            
            set((state) => {
              state.auth.isAuthenticated = true;
              state.auth.user = response.user;
              state.auth.token = response.token;
            });
          } catch (error) {
            throw error;
          }
        },

        register: async (username: string, email: string, password: string) => {
          try {
            const response = await apiService.register({ username, email, password });
            localStorage.setItem('auth_token', response.token);
            
            set((state) => {
              state.auth.isAuthenticated = true;
              state.auth.user = response.user;
              state.auth.token = response.token;
            });
          } catch (error) {
            throw error;
          }
        },

        logout: () => {
          localStorage.removeItem('auth_token');
          apiService.logout().catch(() => {});
          
          set((state) => {
            state.auth.isAuthenticated = false;
            state.auth.user = null;
            state.auth.token = null;
            state.history = [];
            state.userStats.data = null;
          });
        },

        // 文本分析
        analyzeText: async (text: string, options?: { sessionId?: string; scenario?: string; useCache?: boolean }) => {
          set((state) => {
            state.textAnalysis.loading = true;
            state.textAnalysis.error = null;
          });

          try {
            const result = await apiService.analyzeText({ 
              text, 
              sessionId: options?.sessionId,
              scenario: options?.scenario,
              useCache: options?.useCache
            });
            
            set((state) => {
              state.textAnalysis.loading = false;
              state.textAnalysis.result = result;
            });

            // 添加到历史记录
            get().addToHistory({
              type: 'text',
              content: text,
              result
            });
          } catch (error) {
            set((state) => {
              state.textAnalysis.loading = false;
              state.textAnalysis.error = error instanceof Error ? error.message : '分析失败';
            });
          }
        },

        clearTextAnalysis: () => {
          set((state) => {
            state.textAnalysis.result = null;
            state.textAnalysis.error = null;
          });
        },

        // 图文分析
        analyzeImageText: async (text: string, image: File, options?: any) => {
          set((state) => {
            state.imageAnalysis.loading = true;
            state.imageAnalysis.error = null;
          });

          try {
            const result = await apiService.analyzeImageText({ 
              text, 
              image,
              sessionId: options?.sessionId,
              scenario: options?.scenario || 'general',
              useCache: options?.useCache !== false
            });
            
            set((state) => {
              state.imageAnalysis.loading = false;
              state.imageAnalysis.result = result;
            });

            // 添加到历史记录
            get().addToHistory({
              type: 'image',
              content: text || image.name,
              result
            });
          } catch (error) {
            set((state) => {
              state.imageAnalysis.loading = false;
              state.imageAnalysis.error = error instanceof Error ? error.message : '分析失败';
            });
          }
        },

        clearImageAnalysis: () => {
          set((state) => {
            state.imageAnalysis.result = null;
            state.imageAnalysis.error = null;
          });
        },

        // 历史记录
        loadHistory: async (page: number = 1, limit: number = 20, type?: 'text' | 'image') => {
          if (!get().auth.isAuthenticated) return;
          
          set((state) => {
            state.historyMeta.loading = true;
          });

          try {
            const response = await apiService.getHistory(page, limit, type);
            
            set((state) => {
              state.history = response.tasks;
              state.historyMeta.loading = false;
              state.historyMeta.total = response.total;
              state.historyMeta.page = response.page;
              state.historyMeta.limit = response.limit;
            });
          } catch (error) {
            set((state) => {
              state.historyMeta.loading = false;
            });
            throw error;
          }
        },

        loadUserStats: async () => {
          if (!get().auth.isAuthenticated) return;
          
          set((state) => {
            state.userStats.loading = true;
          });

          try {
            const stats = await apiService.getUserStats();
            
            set((state) => {
              state.userStats.loading = false;
              state.userStats.data = stats;
            });
          } catch (error) {
            set((state) => {
              state.userStats.loading = false;
            });
            throw error;
          }
        },

        deleteHistoryItem: async (taskId: string) => {
          try {
            await apiService.deleteTask(taskId);
            
            set((state) => {
              state.history = state.history.filter(item => item.id !== taskId);
              if (state.userStats.data) {
                state.userStats.data.totalTasks -= 1;
              }
            });
          } catch (error) {
            throw error;
          }
        },

        addToHistory: (item: Omit<AnalysisHistoryItem, 'id' | 'timestamp'>) => {
          // 如果用户已登录，历史记录会通过API自动同步，这里只用于本地临时存储
          if (!get().auth.isAuthenticated) {
            set((state) => {
              const newItem: AnalysisHistoryItem = {
                ...item,
                id: Date.now().toString(),
                timestamp: new Date().toISOString()
              };
              
              // 限制历史记录数量，最多保留50条
              state.history.unshift(newItem);
              if (state.history.length > 50) {
                state.history = state.history.slice(0, 50);
              }
            });
          }
        },

        clearHistory: () => {
          set((state) => {
            state.history = [];
          });
        },

        removeFromHistory: (id: string) => {
          set((state) => {
            state.history = state.history.filter(item => item.id !== id);
          });
        },

        // UI状态
        setActiveTab: (tab: 'text' | 'image') => {
          set((state) => {
            state.ui.activeTab = tab;
          });
        },

        toggleSidebar: () => {
          set((state) => {
            state.ui.sidebarCollapsed = !state.ui.sidebarCollapsed;
          });
        },

        setSidebarCollapsed: (collapsed: boolean) => {
          set((state) => {
            state.ui.sidebarCollapsed = collapsed;
          });
        }
      })),
      {
        name: 'beauty-ai-app-store',
        partialize: (state) => ({
          history: state.history,
          ui: {
            activeTab: state.ui.activeTab,
            sidebarCollapsed: state.ui.sidebarCollapsed
          }
        })
      }
    ),
    {
      name: 'beauty-ai-app'
    }
  )
);

// 选择器hooks
export const useAuth = () => useAppStore((state) => state.auth);
export const useTextAnalysis = () => useAppStore((state) => state.textAnalysis);
export const useImageAnalysis = () => useAppStore((state) => state.imageAnalysis);
export const useHistory = () => useAppStore((state) => state.history);
export const useHistoryMeta = () => useAppStore((state) => state.historyMeta);
export const useUserStats = () => useAppStore((state) => state.userStats);
export const useUI = () => useAppStore((state) => state.ui);