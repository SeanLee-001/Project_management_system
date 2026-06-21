type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

class MemoryCache {
  private store = new Map<string, CacheEntry<any>>();
  private defaultTTL = 30000; // 30 seconds

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.defaultTTL) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl?: number): void {
    this.store.set(key, { data, timestamp: Date.now() });
    if (ttl) {
      setTimeout(() => this.store.delete(key), ttl);
    }
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.store.clear();
      return;
    }
    for (const key of this.store.keys()) {
      if (key.includes(pattern)) {
        this.store.delete(key);
      }
    }
  }

  keys(): string[] {
    return Array.from(this.store.keys());
  }

  size(): number {
    return this.store.size;
  }
}

const globalCache = new MemoryCache();

export function getCached<T>(key: string): T | null {
  return globalCache.get<T>(key);
}

export function setCache<T>(key: string, data: T, ttl?: number): void {
  globalCache.set(key, data, ttl);
}

export function invalidateCache(pattern?: string): void {
  globalCache.invalidate(pattern);
}

export function cacheStats(): { size: number; keys: string[] } {
  return { size: globalCache.size(), keys: globalCache.keys() };
}
