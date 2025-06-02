import { logInfo, logError } from '../utils/logger.js';

/**
 * 缓存项接口
 */
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // 生存时间（毫秒）
  accessCount: number;
  lastAccessed: number;
}

/**
 * 缓存统计信息
 */
interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
  hitRate: number;
}

/**
 * 内存缓存服务（生产环境建议使用Redis）
 */
export class CacheService {
  private static cache = new Map<string, CacheItem<any>>();
  private static stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    size: 0,
    hitRate: 0
  };
  
  private static readonly DEFAULT_TTL = 30 * 60 * 1000; // 30分钟
  private static readonly MAX_CACHE_SIZE = 1000; // 最大缓存项数
  private static readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5分钟清理一次
  
  // 启动定期清理
  static {
    setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * 生成缓存键
   */
  static generateKey(prefix: string, data: any): string {
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
    const hash = this.simpleHash(dataStr);
    return `${prefix}:${hash}`;
  }

  /**
   * 设置缓存
   */
  static set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    try {
      // 检查缓存大小限制
      if (this.cache.size >= this.MAX_CACHE_SIZE && !this.cache.has(key)) {
        this.evictLRU();
      }

      const now = Date.now();
      const item: CacheItem<T> = {
        data,
        timestamp: now,
        ttl,
        accessCount: 0,
        lastAccessed: now
      };

      this.cache.set(key, item);
      this.stats.sets++;
      this.stats.size = this.cache.size;
      
      logInfo('缓存设置', { key, ttl, cacheSize: this.cache.size });
    } catch (error) {
      logError('缓存设置失败', { key, error });
    }
  }

  /**
   * 获取缓存
   */
  static get<T>(key: string): T | null {
    try {
      const item = this.cache.get(key) as CacheItem<T> | undefined;
      
      if (!item) {
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      const now = Date.now();
      
      // 检查是否过期
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        this.stats.misses++;
        this.stats.deletes++;
        this.stats.size = this.cache.size;
        this.updateHitRate();
        return null;
      }

      // 更新访问信息
      item.accessCount++;
      item.lastAccessed = now;
      
      this.stats.hits++;
      this.updateHitRate();
      
      logInfo('缓存命中', { key, accessCount: item.accessCount });
      return item.data;
    } catch (error) {
      logError('缓存获取失败', { key, error });
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
  }

  /**
   * 删除缓存
   */
  static delete(key: string): boolean {
    try {
      const deleted = this.cache.delete(key);
      if (deleted) {
        this.stats.deletes++;
        this.stats.size = this.cache.size;
        logInfo('缓存删除', { key });
      }
      return deleted;
    } catch (error) {
      logError('缓存删除失败', { key, error });
      return false;
    }
  }

  /**
   * 检查缓存是否存在
   */
  static has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    // 检查是否过期
    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.stats.deletes++;
      this.stats.size = this.cache.size;
      return false;
    }
    
    return true;
  }

  /**
   * 清空所有缓存
   */
  static clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.deletes += size;
    this.stats.size = 0;
    logInfo('清空所有缓存', { deletedCount: size });
  }

  /**
   * 获取缓存统计信息
   */
  static getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * 获取缓存大小
   */
  static size(): number {
    return this.cache.size;
  }

  /**
   * 获取所有缓存键
   */
  static keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 清理过期缓存
   */
  private static cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      this.stats.deletes += cleanedCount;
      this.stats.size = this.cache.size;
      logInfo('清理过期缓存', { cleanedCount, remainingSize: this.cache.size });
    }
  }

  /**
   * LRU淘汰策略
   */
  private static evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.deletes++;
      logInfo('LRU淘汰缓存', { evictedKey: oldestKey });
    }
  }

  /**
   * 更新命中率
   */
  private static updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * 简单哈希函数
   */
  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 获取缓存项详细信息（调试用）
   */
  static getItemInfo(key: string): {
    exists: boolean;
    data?: any;
    timestamp?: number;
    ttl?: number;
    accessCount?: number;
    lastAccessed?: number;
    remainingTTL?: number;
  } {
    const item = this.cache.get(key);
    
    if (!item) {
      return { exists: false };
    }
    
    const now = Date.now();
    const remainingTTL = Math.max(0, item.ttl - (now - item.timestamp));
    
    return {
      exists: true,
      data: item.data,
      timestamp: item.timestamp,
      ttl: item.ttl,
      accessCount: item.accessCount,
      lastAccessed: item.lastAccessed,
      remainingTTL
    };
  }

  /**
   * 批量设置缓存
   */
  static setMultiple<T>(items: Array<{ key: string; data: T; ttl?: number }>): void {
    for (const item of items) {
      this.set(item.key, item.data, item.ttl);
    }
  }

  /**
   * 批量获取缓存
   */
  static getMultiple<T>(keys: string[]): Map<string, T | null> {
    const result = new Map<string, T | null>();
    
    for (const key of keys) {
      result.set(key, this.get<T>(key));
    }
    
    return result;
  }

  /**
   * 按前缀删除缓存
   */
  static deleteByPrefix(prefix: string): number {
    let deletedCount = 0;
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      this.stats.deletes += deletedCount;
      this.stats.size = this.cache.size;
      logInfo('按前缀删除缓存', { prefix, deletedCount });
    }
    
    return deletedCount;
  }
}

/**
 * AI分析结果专用缓存服务
 */
export class AIAnalysisCacheService {
  private static readonly TEXT_ANALYSIS_TTL = 60 * 60 * 1000; // 1小时
  private static readonly IMAGE_ANALYSIS_TTL = 2 * 60 * 60 * 1000; // 2小时
  
  /**
   * 缓存文本分析结果
   */
  static cacheTextAnalysis(content: string, result: TextAnalysisResponse): void {
    const key = CacheService.generateKey('text_analysis', content);
    CacheService.set(key, result, this.TEXT_ANALYSIS_TTL);
  }
  
  /**
   * 获取文本分析缓存
   */
  static getTextAnalysis(content: string): TextAnalysisResponse | null {
    const key = CacheService.generateKey('text_analysis', content);
    return CacheService.get<TextAnalysisResponse>(key);
  }
  
  /**
   * 缓存图文分析结果
   */
  static cacheImageAnalysis(imageHash: string, text: string | undefined, result: ImageAnalysisResponse): void {
    const cacheData = { imageHash, text };
    const key = CacheService.generateKey('image_analysis', cacheData);
    CacheService.set(key, result, this.IMAGE_ANALYSIS_TTL);
  }
  
  /**
   * 获取图文分析缓存
   */
  static getImageAnalysis(imageHash: string, text: string | undefined): ImageAnalysisResponse | null {
    const cacheData = { imageHash, text };
    const key = CacheService.generateKey('image_analysis', cacheData);
    return CacheService.get<ImageAnalysisResponse>(key);
  }
  
  /**
   * 清理AI分析缓存
   */
  static clearAnalysisCache(): void {
    const textDeleted = CacheService.deleteByPrefix('text_analysis:');
    const imageDeleted = CacheService.deleteByPrefix('image_analysis:');
    
    logInfo('清理AI分析缓存', { 
      textAnalysisDeleted: textDeleted, 
      imageAnalysisDeleted: imageDeleted 
    });
  }
}