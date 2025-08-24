import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { Channel } from '@/types/playlist';
import { ChannelItem } from './ChannelItem';

interface VirtualizedChannelListProps {
  channels: Channel[];
  onDelete: (id: string) => void;
  onToggleSelection: (id: string) => void;
  itemHeight?: number;
  containerHeight?: number;
  overscan?: number;
}

export const VirtualizedChannelList = React.memo(({
  channels,
  onDelete,
  onToggleSelection,
  itemHeight = 80,
  containerHeight = 600,
  overscan = 10
}: VirtualizedChannelListProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate grid layout - 2 columns on medium+ screens, 1 on small
  const gridConfig = useMemo(() => {
    const itemsPerRow = 2; // Fixed to 2 columns for consistency
    const rowHeight = itemHeight;
    const totalRows = Math.ceil(channels.length / itemsPerRow);
    
    return {
      itemsPerRow,
      rowHeight,
      totalRows
    };
  }, [channels.length, itemHeight]);

  // Calculate visible range based on rows, not individual items
  const visibleRange = useMemo(() => {
    const { rowHeight, itemsPerRow, totalRows } = gridConfig;
    
    // Calculate which rows are visible
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visibleRowCount = Math.ceil(containerHeight / rowHeight);
    const endRow = Math.min(totalRows - 1, startRow + visibleRowCount + overscan * 2);
    
    // Convert row indices to item indices
    const startIndex = startRow * itemsPerRow;
    const endIndex = Math.min(channels.length - 1, (endRow + 1) * itemsPerRow - 1);
    
    return { startIndex, endIndex, startRow, endRow };
  }, [scrollTop, containerHeight, gridConfig, overscan, channels.length]);

  // Get visible channels
  const visibleChannels = useMemo(() => {
    return channels.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [channels, visibleRange]);

  // Calculate total height and offset based on rows
  const totalHeight = gridConfig.totalRows * gridConfig.rowHeight;
  const offsetY = visibleRange.startRow * gridConfig.rowHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Update scroll position when channels change
  useEffect(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, [channels]);

  return (
    <div
      ref={containerRef}
      style={{ 
        height: containerHeight, 
        overflow: 'auto',
        maxHeight: '85vh'
      }}
      onScroll={handleScroll}
      className="virtualized-container"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: offsetY,
            left: 0,
            right: 0
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {visibleChannels.map((channel) => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                onDelete={onDelete}
                onToggleSelection={onToggleSelection}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

VirtualizedChannelList.displayName = 'VirtualizedChannelList';
