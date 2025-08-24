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
  const renderStartTime = useRef<number>(0);
  const renderCountRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    renderStartTime.current = performance.now();
    renderCountRef.current += 1;

    return () => {
      const renderTime = performance.now() - renderStartTime.current;
      
      setMetrics(prev => {
        const newTotalTime = prev.totalRenderTime + renderTime;
        const newCount = renderCountRef.current;
        const newAverage = newTotalTime / newCount;
        
        return {
          renderCount: newCount,
          averageRenderTime: newAverage,
          lastRenderTime: renderTime,
          totalRenderTime: newTotalTime
        };
      });
    };
  });

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
