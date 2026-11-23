import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Channel } from '@/types/playlist';
import { ChannelItem } from './ChannelItem';
import { useDndContext } from '@dnd-kit/core';

interface VirtualizedChannelListProps {
  channels: Channel[];
  onDelete: (id: string) => void;
  onToggleSelection: (id: string) => void;
  itemHeight?: number;
  containerHeight?: number;
  overscan?: number;
}

/** Must match the grid `gap-2` (0.5rem = 8px) used below. */
const GRID_GAP = 8;

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
  const rafId = useRef(0);
  const { active } = useDndContext();

  // Check if we're dragging a channel from this list
  const isDraggingFromThisList = !!(active && channels.some(ch => ch.id === active.id));

  // Grid layout: 2 columns on md+, item rows have an 8px gap, so the real
  // row pitch is itemHeight + GRID_GAP (the old code ignored the gap and the
  // virtualization window drifted out of sync while scrolling).
  const gridConfig = useMemo(() => {
    const itemsPerRow = 2; // Fixed to 2 columns for consistency
    const rowPitch = itemHeight + GRID_GAP;
    const totalRows = Math.ceil(channels.length / itemsPerRow);

    return { itemsPerRow, rowPitch, totalRows };
  }, [channels.length, itemHeight]);

  // Calculate visible range based on rows, not individual items
  const visibleRange = useMemo(() => {
    const { rowPitch, itemsPerRow, totalRows } = gridConfig;

    // Increase overscan during drag for better UX
    const currentOverscan = isDraggingFromThisList ? overscan * 2 : overscan;

    const startRow = Math.max(0, Math.floor(scrollTop / rowPitch) - currentOverscan);
    const visibleRowCount = Math.ceil(containerHeight / rowPitch);
    const endRow = Math.min(Math.max(totalRows - 1, 0), startRow + visibleRowCount + currentOverscan * 2);

    const startIndex = startRow * itemsPerRow;
    const endIndex = Math.min(channels.length - 1, (endRow + 1) * itemsPerRow - 1);

    return { startIndex, endIndex, startRow };
  }, [scrollTop, containerHeight, gridConfig, overscan, channels.length, isDraggingFromThisList]);

  // Get visible channels
  const visibleChannels = useMemo(() => {
    if (channels.length === 0) return [];
    return channels.slice(visibleRange.startIndex, Math.max(visibleRange.endIndex + 1, visibleRange.startIndex));
  }, [channels, visibleRange]);

  // Total height: rows * pitch minus the trailing gap after the last row.
  const totalHeight = channels.length === 0
    ? 0
    : Math.max(gridConfig.totalRows * gridConfig.rowPitch - GRID_GAP, itemHeight);
  const offsetY = visibleRange.startRow * gridConfig.rowPitch;

  // rAF-throttled scroll updates: at most one state update per frame.
  const handleScroll = useCallback(() => {
    if (rafId.current) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = 0;
      if (containerRef.current) setScrollTop(containerRef.current.scrollTop);
    });
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafId.current), []);

  // Keep the scroll offset in sync when the channel list is replaced.
  useEffect(() => {
    if (containerRef.current) setScrollTop(containerRef.current.scrollTop);
  }, [channels]);

  return (
    <div
      ref={containerRef}
      style={{ height: containerHeight, overflow: 'auto', maxHeight: '85vh' }}
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
              // Fixed-height cell keeps every row the same size, which is a
              // requirement for index-based virtualization.
              <div key={channel.id} style={{ height: itemHeight }}>
                <ChannelItem
                  channel={channel}
                  onDelete={onDelete}
                  onToggleSelection={onToggleSelection}
                  isDragging={isDraggingFromThisList}
                  className="h-full"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

VirtualizedChannelList.displayName = 'VirtualizedChannelList';
