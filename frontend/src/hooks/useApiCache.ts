import { useState, useEffect, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

interface UseApiCacheOptions {
  cacheTime?: number; // Cache duration in milliseconds (default: 5 minutes)
  staleTime?: number; // Time before data is considered stale (default: 1 minute)
  enabled?: boolean; // Whether to enable the cache
}

interface UseApiCacheResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  invalidate: () => void;
}

const cache = new Map<string, CacheEntry<any>>();

export function useApiCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseApiCacheOptions = {}
): UseApiCacheResult<T> {
  const {
    cacheTime = 5 * 60 * 1000, // 5 minutes
    staleTime = 1 * 60 * 1000,  // 1 minute
    enabled = true
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const getCachedData = (): T | null => {
    if (!enabled) return null;
    
    const cached = cache.get(key);
    if (!cached) return null;
    
    const now = Date.now();
    if (now > cached.expiry) {
      cache.delete(key);
      return null;
    }
    
    return cached.data;
  };

  const setCachedData = (newData: T) => {
    if (!enabled) return;
    
    const now = Date.now();
    cache.set(key, {
      data: newData,
      timestamp: now,
      expiry: now + cacheTime
    });
  };

  const isStale = (): boolean => {
    if (!enabled) return true;
    
    const cached = cache.get(key);
    if (!cached) return true;
    
    const now = Date.now();
    return now > (cached.timestamp + staleTime);
  };

  const fetchData = async (force = false) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Check cache first
    const cachedData = getCachedData();
    if (cachedData && !force && !isStale()) {
      setData(cachedData);
      setError(null);
      return;
    }

    // If we have cached data but it's stale, show it while fetching new data
    if (cachedData && isStale()) {
      setData(cachedData);
    }

    setIsLoading(true);
    setError(null);

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const result = await fetcher();
      
      // Only update if this request wasn't aborted
      if (!abortControllerRef.current.signal.aborted) {
        setData(result);
        setCachedData(result);
        setError(null);
      }
    } catch (err) {
      // Only update error if this request wasn't aborted
      if (!abortControllerRef.current.signal.aborted) {
        const errorObj = err instanceof Error ? err : new Error('Unknown error');
        setError(errorObj);
        
        // If we have cached data, keep showing it on error
        if (!cachedData) {
          setData(null);
        }
      }
    } finally {
      if (!abortControllerRef.current.signal.aborted) {
        setIsLoading(false);
      }
    }
  };

  const refetch = async () => {
    await fetchData(true);
  };

  const invalidate = () => {
    cache.delete(key);
    setData(null);
    setError(null);
  };

  // Initial fetch
  useEffect(() => {
    fetchData();
    
    // Cleanup function to abort ongoing requests
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [key, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    isLoading,
    error,
    refetch,
    invalidate
  };
}

// Utility function to clear all cache
export const clearAllCache = () => {
  cache.clear();
};

// Utility function to clear specific cache entries
export const clearCacheByPattern = (pattern: string) => {
  const regex = new RegExp(pattern);
  for (const key of cache.keys()) {
    if (regex.test(key)) {
      cache.delete(key);
    }
  }
};

export default useApiCache;
