import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, GripVertical } from 'lucide-react';
import { Channel } from '@/types/playlist';
import { cn } from '@/lib/utils';

interface ChannelItemProps {
  channel: Channel;
  onDelete: (id: string) => void;
  onToggleSelection: (id: string) => void;
  isDragging?: boolean;
}

export const ChannelItem = ({ channel, onDelete, onToggleSelection, isDragging }: ChannelItemProps) => {
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

  const setNodeRef = (node: HTMLElement | null) => {
    setDraggableNodeRef(node);
    setDroppableNodeRef(node);
  };

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "channel-item flex items-center gap-3 p-3 rounded-lg border bg-card",
        isDragging && "opacity-50",
        isDraggingActive && "z-50 shadow-lg",
        isOver && "drag-over",
        channel.selected && "border-primary bg-primary/5"
      )}
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
        onCheckedChange={() => onToggleSelection(channel.id)}
      />

      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{channel.name}</div>
      </div>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => onDelete(channel.id)}
        className="text-destructive hover:text-destructive hover:bg-destructive/10 p-1 h-auto"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};