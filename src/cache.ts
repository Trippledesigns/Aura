// IGDB Metadata Cache for Performance
interface CacheEntry {
  cover: string;
  genre: string;
  timestamp: number;
}

class MetadataCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

  get(gameName: string): CacheEntry | null {
    const entry = this.cache.get(gameName.toLowerCase());
    if (!entry) return null;
    
    // Check if cache entry is still valid
    if (Date.now() - entry.timestamp > this.CACHE_DURATION) {
      this.cache.delete(gameName.toLowerCase());
      return null;
    }
    
    return entry;
  }

  set(gameName: string, cover: string, genre: string): void {
    this.cache.set(gameName.toLowerCase(), {
      cover,
      genre,
      timestamp: Date.now()
    });
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }
}

export const metadataCache = new MetadataCache();
