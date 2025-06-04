import { useCallback, useEffect, useState } from 'react';
import { message } from 'antd';
import { useAppStore } from '../store';
import { apiService } from '../services/api';
import type { TextAnalysisRequest, ImageAnalysisRequest } from '../types';

// 导出其他hooks
export { useTextAnalysisForm } from './useTextAnalysisForm';

// 文本分析hook
export const useTextAnalysis = () => {
  const { setTextAnalysisResult, setTextAnalysisLoading, textAnalysisLoading } = useAppStore();

  const analyze = useCallback(async (request: TextAnalysisRequest) => {
    try {
      setTextAnalysisLoading(true);
      const result = await apiService.analyzeText(request);
      setTextAnalysisResult(result);
      message.success('文本分析完成');
      return result;
    } catch (error) {
      console.error('文本分析失败:', error);
      message.error('文本分析失败，请重试');
      throw error;
    } finally {
      setTextAnalysisLoading(false);
    }
  }, [setTextAnalysisResult, setTextAnalysisLoading]);

  return {
    analyze,
    loading: textAnalysisLoading,
  };
};

// 图文分析hook
export const useImageAnalysis = () => {
  const { setImageAnalysisResult, setImageAnalysisLoading, imageAnalysisLoading } = useAppStore();

  const analyze = useCallback(async (request: ImageAnalysisRequest) => {
    try {
      setImageAnalysisLoading(true);
      const result = await apiService.analyzeImageText(request);
      setImageAnalysisResult(result);
      message.success('图文分析完成');
      return result;
    } catch (error) {
      console.error('图文分析失败:', error);
      message.error('图文分析失败，请重试');
      throw error;
    } finally {
      setImageAnalysisLoading(false);
    }
  }, [setImageAnalysisResult, setImageAnalysisLoading]);

  return {
    analyze,
    loading: imageAnalysisLoading,
  };
};

// 历史记录hook
export const useHistory = () => {
  const { 
    analysisHistory, 
    addToHistory, 
    removeFromHistory, 
    clearHistory 
  } = useAppStore();

  const getStats = useCallback(() => {
    const totalCount = analysisHistory.length;
    const complianceCount = analysisHistory.filter(
      item => item.result.overallStatus === 'compliant'
    ).length;
    const complianceRate = totalCount > 0 ? (complianceCount / totalCount * 100) : 0;

    return {
      totalCount,
      complianceRate: Math.round(complianceRate),
    };
  }, [analysisHistory]);

  return {
    history: analysisHistory,
    addToHistory,
    removeFromHistory,
    clearHistory,
    getStats,
  };
};

// UI状态hook
export const useUI = () => {
  const { 
    sidebarCollapsed, 
    setSidebarCollapsed, 
    activeTab, 
    setActiveTab 
  } = useAppStore();

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(!sidebarCollapsed);
  }, [sidebarCollapsed, setSidebarCollapsed]);

  return {
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebar,
    activeTab,
    setActiveTab,
  };
};

// 防抖hook
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// 本地存储hook
export const useLocalStorage = <T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
};

// 窗口大小hook
export const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};

// 复制到剪贴板hook
export const useCopyToClipboard = () => {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      message.success('已复制到剪贴板');
      setTimeout(() => setCopiedText(null), 2000);
      return true;
    } catch (error) {
      console.error('复制失败:', error);
      message.error('复制失败');
      return false;
    }
  }, []);

  return { copy, copiedText };
};

// 用户统计hook
export const useUserStats = () => {
  const { analysisHistory } = useAppStore();

  const getStats = useCallback(() => {
    const totalAnalyses = analysisHistory.length;
    const textAnalyses = analysisHistory.filter(item => item.type === 'text').length;
    const imageAnalyses = analysisHistory.filter(item => item.type === 'image').length;
    const compliantAnalyses = analysisHistory.filter(
      item => item.result.overallStatus === 'compliant'
    ).length;
    const complianceRate = totalAnalyses > 0 ? (compliantAnalyses / totalAnalyses * 100) : 0;

    // 按日期统计
    const dailyStats = analysisHistory.reduce((acc, item) => {
      const date = new Date(item.timestamp).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, count: 0, compliant: 0 };
      }
      acc[date].count++;
      if (item.result.overallStatus === 'compliant') {
        acc[date].compliant++;
      }
      return acc;
    }, {} as Record<string, { date: string; count: number; compliant: number }>);

    return {
      totalAnalyses,
      textAnalyses,
      imageAnalyses,
      complianceRate: Math.round(complianceRate * 100) / 100,
      dailyStats: Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date))
    };
  }, [analysisHistory]);

  return {
    stats: getStats()
  };
};