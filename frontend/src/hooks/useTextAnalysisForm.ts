import { useState, useCallback, useMemo } from 'react';
import { message } from 'antd';
import { useAppStore, useTextAnalysis } from '@/store';
import { textUtils, copyToClipboard } from '@/utils';

interface UseTextAnalysisFormOptions {
  maxLength?: number;
  minLength?: number;
}

interface TextAnalysisFormState {
  inputText: string;
  useCache: boolean;
  scenario: string;
  sessionId: string;
}

export const useTextAnalysisForm = (options: UseTextAnalysisFormOptions = {}) => {
  const { maxLength = 10000, minLength = 1 } = options;
  
  const [formState, setFormState] = useState<TextAnalysisFormState>({
    inputText: '',
    useCache: true,
    scenario: 'general',
    sessionId: ''
  });

  const { analyzeText, clearTextAnalysis } = useAppStore();
  const { loading, result, error } = useTextAnalysis();

  // 更新表单状态的通用方法
  const updateFormState = useCallback(<K extends keyof TextAnalysisFormState>(
    key: K,
    value: TextAnalysisFormState[K]
  ) => {
    setFormState(prev => ({ ...prev, [key]: value }));
  }, []);

  // 具体的更新方法
  const setInputText = useCallback((value: string) => {
    updateFormState('inputText', value);
  }, [updateFormState]);

  const setUseCache = useCallback((value: boolean) => {
    updateFormState('useCache', value);
  }, [updateFormState]);

  const setScenario = useCallback((value: string) => {
    updateFormState('scenario', value);
  }, [updateFormState]);

  const setSessionId = useCallback((value: string) => {
    updateFormState('sessionId', value);
  }, [updateFormState]);

  // 分析文本
  const handleAnalyze = useCallback(async () => {
    const validation = textUtils.validateLength(
      formState.inputText,
      minLength,
      maxLength
    );
    
    if (!validation.valid) {
      message.error(validation.error);
      return;
    }

    try {
      await analyzeText(formState.inputText, {
        sessionId: formState.sessionId || undefined,
        scenario: formState.scenario,
        useCache: formState.useCache
      });
    } catch (err) {
      message.error('分析失败，请稍后重试');
    }
  }, [formState, minLength, maxLength, analyzeText]);

  // 清空表单和结果
  const handleClear = useCallback(() => {
    setFormState({
      inputText: '',
      useCache: true,
      scenario: 'general',
      sessionId: ''
    });
    clearTextAnalysis();
  }, [clearTextAnalysis]);

  // 复制文本
  const handleCopy = useCallback(async (text: string) => {
    try {
      const success = await copyToClipboard(text);
      if (success) {
        message.success('已复制到剪贴板');
      } else {
        message.error('复制失败');
      }
    } catch (err) {
      message.error('复制失败');
    }
  }, []);

  // 计算派生状态
  const isAnalyzeDisabled = useMemo(() => {
    return !formState.inputText.trim() || loading;
  }, [formState.inputText, loading]);

  const hasValidInput = useMemo(() => {
    return formState.inputText.trim().length >= minLength;
  }, [formState.inputText, minLength]);

  const inputLength = useMemo(() => {
    return formState.inputText.length;
  }, [formState.inputText]);

  return {
    // 状态
    formState,
    loading,
    result,
    error,
    
    // 派生状态
    isAnalyzeDisabled,
    hasValidInput,
    inputLength,
    
    // 更新方法
    setInputText,
    setUseCache,
    setScenario,
    setSessionId,
    updateFormState,
    
    // 操作方法
    handleAnalyze,
    handleClear,
    handleCopy
  };
};

export type UseTextAnalysisFormReturn = ReturnType<typeof useTextAnalysisForm>;