import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  componentName: string;
  renderTime: number;
  mountTime: number;
  updateCount: number;
}

interface UsePerformanceMonitorOptions {
  enabled?: boolean;
  logToConsole?: boolean;
  threshold?: number; // Log only if render time exceeds threshold (ms)
}

export function usePerformanceMonitor(
  componentName: string,
  options: UsePerformanceMonitorOptions = {}
) {
  const {
    enabled = process.env.NODE_ENV === 'development',
    logToConsole = true,
    threshold = 16 // 16ms = 60fps threshold
  } = options;

  const mountTimeRef = useRef<number>(0);
  const renderStartRef = useRef<number>(0);
  const updateCountRef = useRef<number>(0);
  const metricsRef = useRef<PerformanceMetrics>({
    componentName,
    renderTime: 0,
    mountTime: 0,
    updateCount: 0
  });

  // Track component mount time
  useEffect(() => {
    if (!enabled) return;

    mountTimeRef.current = performance.now();
    
    return () => {
      // Component unmount
      const unmountTime = performance.now();
      const totalMountTime = unmountTime - mountTimeRef.current;
      
      if (logToConsole) {
        console.log(`🏁 Component ${componentName} unmounted after ${totalMountTime.toFixed(2)}ms`);
      }
    };
  }, [componentName, enabled, logToConsole]);

  // Track render performance
  useEffect(() => {
    if (!enabled) return;

    const renderEndTime = performance.now();
    const renderTime = renderEndTime - renderStartRef.current;
    updateCountRef.current += 1;

    metricsRef.current = {
      componentName,
      renderTime,
      mountTime: renderEndTime - mountTimeRef.current,
      updateCount: updateCountRef.current
    };

    // Log performance if it exceeds threshold
    if (renderTime > threshold && logToConsole) {
      console.warn(`⚠️ Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms (threshold: ${threshold}ms)`);
    }

    // Log periodic performance summary
    if (updateCountRef.current % 10 === 0 && logToConsole) {
      console.log(`📊 Performance summary for ${componentName}:`, {
        averageRenderTime: renderTime.toFixed(2) + 'ms',
        totalUpdates: updateCountRef.current,
        totalMountTime: metricsRef.current.mountTime.toFixed(2) + 'ms'
      });
    }
  });

  // Mark render start
  if (enabled) {
    renderStartRef.current = performance.now();
  }

  return {
    metrics: metricsRef.current,
    markRenderStart: () => {
      if (enabled) {
        renderStartRef.current = performance.now();
      }
    },
    logMetrics: () => {
      if (enabled && logToConsole) {
        console.log(`📈 Current metrics for ${componentName}:`, metricsRef.current);
      }
    }
  };
}

// Hook for measuring API call performance
export function useApiPerformance() {
  const measureApiCall = async <T>(
    apiName: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await apiCall();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`🚀 API Call ${apiName}: ${duration.toFixed(2)}ms`);
      
      // Warn about slow API calls
      if (duration > 1000) {
        console.warn(`⚠️ Slow API call detected: ${apiName} took ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.error(`❌ API Call ${apiName} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  };

  return { measureApiCall };
}

// Hook for measuring component load time
export function useLoadTime(componentName: string) {
  const startTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    const loadTime = performance.now() - startTimeRef.current;
    console.log(`⏱️ ${componentName} loaded in ${loadTime.toFixed(2)}ms`);
  }, [componentName]);
}

export default usePerformanceMonitor;
