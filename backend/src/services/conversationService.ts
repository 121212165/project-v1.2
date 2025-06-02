import { logInfo, logError } from '../utils/logger.js';
import { PromptService } from './promptService.js';

/**
 * 对话消息接口
 */
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    analysisType?: 'text' | 'image';
    contentLength?: number;
    processingTime?: number;
  };
}

/**
 * 对话会话接口
 */
export interface ConversationSession {
  id: string;
  userId?: number;
  messages: ConversationMessage[];
  context: {
    topic: string;
    userProfile?: {
      industry_focus?: string;
      brand_style?: string;
      target_audience?: string;
      content_type?: string;
    };
    preferences?: {
      analysis_depth: 'basic' | 'detailed' | 'expert';
      focus_areas: string[];
      language_style: 'formal' | 'casual' | 'professional';
    };
  };
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

/**
 * 对话上下文管理服务
 */
export class ConversationService {
  private static sessions = new Map<string, ConversationSession>();
  private static readonly SESSION_TIMEOUT = 2 * 60 * 60 * 1000; // 2小时
  private static readonly MAX_MESSAGES_PER_SESSION = 50;
  private static readonly MAX_CONTEXT_LENGTH = 8000; // 字符数限制

  /**
   * 创建新的对话会话
   */
  static createSession(userId?: number, initialContext?: Partial<ConversationSession['context']>): string {
    const sessionId = this.generateSessionId();
    const now = new Date();
    
    const session: ConversationSession = {
      id: sessionId,
      userId,
      messages: [],
      context: {
        topic: 'beauty_content_analysis',
        ...initialContext
      },
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + this.SESSION_TIMEOUT)
    };

    this.sessions.set(sessionId, session);
    this.cleanExpiredSessions();
    
    logInfo('创建新对话会话', { sessionId, userId });
    return sessionId;
  }

  /**
   * 获取对话会话
   */
  static getSession(sessionId: string): ConversationSession | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    // 检查会话是否过期
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  /**
   * 添加消息到会话
   */
  static addMessage(
    sessionId: string, 
    role: ConversationMessage['role'], 
    content: string,
    metadata?: ConversationMessage['metadata']
  ): ConversationMessage | null {
    const session = this.getSession(sessionId);
    
    if (!session) {
      logError('会话不存在或已过期', { sessionId });
      return null;
    }

    const message: ConversationMessage = {
      id: this.generateMessageId(),
      role,
      content,
      timestamp: new Date(),
      metadata
    };

    session.messages.push(message);
    session.updatedAt = new Date();
    
    // 限制消息数量，保留最近的消息
    if (session.messages.length > this.MAX_MESSAGES_PER_SESSION) {
      const messagesToRemove = session.messages.length - this.MAX_MESSAGES_PER_SESSION;
      session.messages.splice(0, messagesToRemove);
      logInfo('清理旧消息', { sessionId, removedCount: messagesToRemove });
    }

    this.sessions.set(sessionId, session);
    
    logInfo('添加消息到会话', { 
      sessionId, 
      role, 
      contentLength: content.length,
      totalMessages: session.messages.length 
    });
    
    return message;
  }

  /**
   * 获取对话历史（用于AI上下文）
   */
  static getConversationHistory(sessionId: string, maxMessages: number = 10): ConversationMessage[] {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return [];
    }

    // 获取最近的消息，但排除系统消息
    const userAndAssistantMessages = session.messages
      .filter(msg => msg.role !== 'system')
      .slice(-maxMessages);

    return userAndAssistantMessages;
  }

  /**
   * 生成上下文感知的提示词
   */
  static generateContextAwarePrompt(sessionId: string, currentInput: string): string {
    const session = this.getSession(sessionId);
    
    if (!session || session.messages.length === 0) {
      // 新会话，使用基础提示词
      return PromptService.getTextAnalysisPrompt();
    }

    const conversationHistory = this.getConversationHistory(sessionId, 5);
    
    // 检查上下文长度，如果太长则生成摘要
    const totalLength = conversationHistory.reduce((sum, msg) => sum + msg.content.length, 0);
    
    if (totalLength > this.MAX_CONTEXT_LENGTH) {
      const summary = PromptService.generateContextSummary(
        conversationHistory.map(msg => ({ role: msg.role, content: msg.content }))
      );
      return PromptService.getConversationPrompt([{ role: 'system', content: summary }]);
    }

    // 生成个性化提示词
    let prompt = PromptService.getConversationPrompt(
      conversationHistory.map(msg => ({ role: msg.role, content: msg.content }))
    );

    // 如果有用户画像，添加个性化内容
    if (session.context.userProfile) {
      prompt = PromptService.generatePersonalizedPrompt(session.context.userProfile);
    }

    return prompt;
  }

  /**
   * 更新会话上下文
   */
  static updateSessionContext(
    sessionId: string, 
    contextUpdate: Partial<ConversationSession['context']>
  ): boolean {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return false;
    }

    session.context = { ...session.context, ...contextUpdate };
    session.updatedAt = new Date();
    this.sessions.set(sessionId, session);
    
    logInfo('更新会话上下文', { sessionId, contextUpdate });
    return true;
  }

  /**
   * 分析用户意图并更新上下文
   */
  static analyzeUserIntent(sessionId: string, userInput: string): {
    intent: string;
    entities: string[];
    confidence: number;
  } {
    // 简单的意图识别逻辑
    const intents = {
      'content_analysis': ['分析', '检查', '审核', '评估'],
      'optimization': ['优化', '改进', '修改', '建议'],
      'compliance_check': ['合规', '违规', '法规', '风险'],
      'comparison': ['对比', '比较', '哪个更好'],
      'tutorial': ['怎么', '如何', '教程', '步骤']
    };

    let bestIntent = 'content_analysis';
    let maxScore = 0;
    const entities: string[] = [];

    for (const [intent, keywords] of Object.entries(intents)) {
      const score = keywords.reduce((sum, keyword) => {
        return sum + (userInput.includes(keyword) ? 1 : 0);
      }, 0);
      
      if (score > maxScore) {
        maxScore = score;
        bestIntent = intent;
      }
    }

    // 提取实体（简单的关键词提取）
    const entityPatterns = {
      'product_type': ['口红', '粉底', '眼影', '面膜', '精华', '乳液'],
      'brand': ['兰蔻', '雅诗兰黛', '迪奥', '香奈儿', '欧莱雅'],
      'skin_type': ['干性', '油性', '混合性', '敏感性'],
      'age_group': ['年轻', '成熟', '中年', '老年']
    };

    for (const [entityType, patterns] of Object.entries(entityPatterns)) {
      for (const pattern of patterns) {
        if (userInput.includes(pattern)) {
          entities.push(`${entityType}:${pattern}`);
        }
      }
    }

    const confidence = maxScore > 0 ? Math.min(maxScore / 3, 1) : 0.5;

    // 更新会话上下文
    this.updateSessionContext(sessionId, {
      preferences: {
        analysis_depth: confidence > 0.8 ? 'expert' : confidence > 0.5 ? 'detailed' : 'basic',
        focus_areas: entities,
        language_style: userInput.length > 100 ? 'professional' : 'casual'
      }
    });

    return { intent: bestIntent, entities, confidence };
  }

  /**
   * 获取会话统计信息
   */
  static getSessionStats(sessionId: string): {
    messageCount: number;
    duration: number;
    averageResponseTime: number;
    topicFocus: string[];
  } | null {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return null;
    }

    const messageCount = session.messages.length;
    const duration = session.updatedAt.getTime() - session.createdAt.getTime();
    
    // 计算平均响应时间
    const responseTimes = session.messages
      .filter(msg => msg.metadata?.processingTime)
      .map(msg => msg.metadata!.processingTime!);
    
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    // 分析话题焦点
    const topicFocus = session.context.preferences?.focus_areas || [];

    return {
      messageCount,
      duration,
      averageResponseTime,
      topicFocus
    };
  }

  /**
   * 清理过期会话
   */
  private static cleanExpiredSessions(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logInfo('清理过期会话', { cleanedCount, remainingSessions: this.sessions.size });
    }
  }

  /**
   * 生成会话ID
   */
  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成消息ID
   */
  private static generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 删除会话
   */
  static deleteSession(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      logInfo('删除会话', { sessionId });
    }
    return deleted;
  }

  /**
   * 获取用户的所有活跃会话
   */
  static getUserSessions(userId: number): ConversationSession[] {
    const userSessions: ConversationSession[] = [];
    
    for (const session of this.sessions.values()) {
      if (session.userId === userId && new Date() <= session.expiresAt) {
        userSessions.push(session);
      }
    }

    return userSessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * 导出会话数据（用于分析或备份）
   */
  static exportSession(sessionId: string): ConversationSession | null {
    const session = this.getSession(sessionId);
    return session ? JSON.parse(JSON.stringify(session)) : null;
  }
}