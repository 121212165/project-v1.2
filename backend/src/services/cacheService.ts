interface CacheItem<T> { data: T; timestamp: number; ttl: number; }

export class CacheService {
  private static cache = new Map<string, CacheItem<any>>();
  private static readonly DEFAULT_TTL = 30 * 60 * 1000;
  private static readonly MAX_SIZE = 1000;

  static generateKey(prefix: string, data: any): string {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash &= hash; }
    return `${prefix}:${Math.abs(hash).toString(36)}`;
  }

  static set<T>(key: string, data: T, ttl = this.DEFAULT_TTL): void {
    if (this.cache.size >= this.MAX_SIZE && !this.cache.has(key)) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  static get<T>(key: string): T | null {
    const item = this.cache.get(key) as CacheItem<T> | undefined;
    if (!item) return null;
    if (Date.now() - item.timestamp > item.ttl) { this.cache.delete(key); return null; }
    return item.data;
  }

  static delete(key: string): boolean { return this.cache.delete(key); }
  static clear(): void { this.cache.clear(); }
  static getStats() { return { size: this.cache.size }; }
}
