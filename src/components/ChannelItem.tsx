import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, GripVertical, Tv, Clock } from 'lucide-react';
import { Channel } from '@/types/playlist';
import { cn } from '@/lib/utils';
import { useEPG } from '@/hooks/useEPG';
import React, { useMemo, useCallback } from 'react';

interface ChannelItemProps {
  channel: Channel;
  onDelete: (id: string) => void;
  onToggleSelection: (id: string) => void;
  isDragging?: boolean;
  className?: string;
}

export const ChannelItem = React.memo(({ channel, onDelete, onToggleSelection, isDragging, className }: ChannelItemProps) => {
  // Shared store: stable functions + version token instead of per-instance state.
  const { findChannelIcon, getChannelEPGByName, version } = useEPG();

  // O(1) lookups; recompute only when the name or the shared data changes.
  // (findChannelIcon/getChannelEPGByName are stable module-level functions;
  // `version` is the opaque shared-store change token — referenced so lint
  // keeps it in the dependency list.)
  const channelIcon = useMemo(() => {
    void version;
    return findChannelIcon(channel.name);
  }, [channel.name, version, findChannelIcon]);
  const epgData = useMemo(() => {
    void version;
    return getChannelEPGByName(channel.name);
  }, [channel.name, version, getChannelEPGByName]);

  // Memoize time formatting function
  const formatTime = useCallback((time: Date | string): string => {
    try {
      const date = time instanceof Date ? time : new Date(time);
      return date.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return '--:--';
    }
  }, []);
  
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableNodeRef,
    transform,
    isDragging: isDraggingActive
  } = useDraggable({
    id: channel.id,
  });

  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({ id: channel.id });

  const setNodeRef = useCallback((node: HTMLElement | null) => {
    setDraggableNodeRef(node);
    setDroppableNodeRef(node);
  }, [setDraggableNodeRef, setDroppableNodeRef]);

  // Memoize transform style
  const style = useMemo(() => {
    return transform ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;
  }, [transform]);

  // Memoize className
  const itemClassName = useMemo(() => {
    return cn(
      "channel-item flex items-center gap-3 p-3 rounded-lg border bg-card",
      isDragging && "opacity-50",
      isDraggingActive && "z-50 shadow-lg",
      isOver && "drag-over",
      channel.selected && "border-primary bg-primary/5",
      className
    );
  }, [isDragging, isDraggingActive, isOver, channel.selected, className]);

  // Memoize event handlers
  const handleToggleSelection = useCallback(() => {
    onToggleSelection(channel.id);
  }, [onToggleSelection, channel.id]);

  const handleDelete = useCallback(() => {
    onDelete(channel.id);
  }, [onDelete, channel.id]);

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    // Fallback to TV icon if image fails to load
    const target = e.target as HTMLImageElement;
    target.style.display = 'none';
    target.nextElementSibling?.classList.remove('hidden');
  }, []);

  const currentProgram = epgData?.currentProgram;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={itemClassName}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      <Checkbox
        checked={channel.selected}
        onCheckedChange={handleToggleSelection}
      />

      {/* Channel Image/Icon */}
      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-muted flex items-center justify-center overflow-hidden">
        {channelIcon ? (
          <>
            <img 
              src={channelIcon}
              alt={channel.name}
              className="w-full h-full object-cover"
              onError={handleImageError}
            />
            <Tv className="w-4 h-4 text-muted-foreground hidden" />
          </>
        ) : (
          <Tv className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{channel.name}</div>
        {currentProgram && (
          <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>
              {currentProgram.title + '   '} 
              ({formatTime(currentProgram.start)} - {formatTime(currentProgram.end)})
            </span>
          </div>
        )}
      </div>

      <Button
        size="sm"
        variant="ghost"
        onClick={handleDelete}
        className="text-destructive hover:text-destructive hover:bg-destructive/10 p-1 h-auto"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
});

ChannelItem.displayName = 'ChannelItem';