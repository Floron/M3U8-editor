import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Info, X } from 'lucide-react';

interface PerformanceMetrics {
  renderCount: number;
  averageRenderTime: number;
  lastRenderTime: number;
  totalRenderTime: number;
}

interface PerformanceMonitorProps {
  componentName: string;
  enabled?: boolean;
}

/**
 * Dev-only render profiler.
 *
 * The previous version called setState inside an effect cleanup without a
 * dependency array, which re-triggered the effect forever (an endless
 * self-re-render loop). Now timings are accumulated in refs during each
 * render and flushed to state at most once per second.
 */
export const PerformanceMonitor = React.memo(({ 
  componentName, 
  enabled = process.env.NODE_ENV === 'development' 
}: PerformanceMonitorProps) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderCount: 0,
    averageRenderTime: 0,
    lastRenderTime: 0,
    totalRenderTime: 0
  });

  const [isVisible, setIsVisible] = useState(false);
  const pendingRef = useRef<{ count: number; totalMs: number; lastMs: number }>({
    count: 0,
    totalMs: 0,
    lastMs: 0
  });
  const renderStartRef = useRef<number>(performance.now());

  // Runs after every render of this component — accumulate only (no setState).
  useEffect(() => {
    if (!enabled) return;
    const now = performance.now();
    const delta = Math.max(0, now - renderStartRef.current);
    renderStartRef.current = now;

    pendingRef.current.count += 1;
    pendingRef.current.totalMs += delta;
    pendingRef.current.lastMs = delta;
  });

  // Flush accumulated timings at most once per second.
  useEffect(() => {
    if (!enabled) return;

    const intervalId = setInterval(() => {
      const pending = pendingRef.current;
      if (pending.count === 0) return;
      pendingRef.current = { count: 0, totalMs: 0, lastMs: 0 };

      setMetrics(prev => ({
        renderCount: prev.renderCount + pending.count,
        averageRenderTime:
          (prev.totalRenderTime + pending.totalMs) / (prev.renderCount + pending.count),
        lastRenderTime: pending.lastMs,
        totalRenderTime: prev.totalRenderTime + pending.totalMs
      }));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 z-50 bg-background/80 backdrop-blur-sm border"
      >
        <Info className="w-4 h-4 mr-2" />
        {componentName}
      </Button>

      {isVisible && (
        <div className="fixed bottom-16 right-4 z-50 bg-background border rounded-lg p-4 shadow-lg max-w-xs">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm">{componentName}</h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsVisible(false)}
              className="h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>

          <div className="space-y-1 text-xs">
            <div>Рендеров: {metrics.renderCount}</div>
            <div>Последний: {metrics.lastRenderTime.toFixed(2)}ms</div>
            <div>Средний: {metrics.averageRenderTime.toFixed(2)}ms</div>
            <div>Общее время: {metrics.totalRenderTime.toFixed(2)}ms</div>
          </div>
        </div>
      )}
    </>
  );
});

PerformanceMonitor.displayName = 'PerformanceMonitor';
