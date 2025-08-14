import { Button } from '@/components/ui/button';
import { Group } from '@/types/playlist';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';

interface GroupsSidebarProps {
  groups: Group[];
  onSelect: (groupId: string) => void;
}

function SidebarGroupItem({ group, onSelect }: { group: Group; onSelect: (id: string) => void }) {
  const { isOver, setNodeRef: setDropRef } = useDroppable({ id: `group-${group.id}` });
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ 
    id: `group-${group.id}`,
    data: { type: 'group', group }
  });

  return (
    <div 
      ref={setDropRef}
      className={cn(
        'relative border rounded p-2',
        isOver && 'bg-accent/20 border-accent border-2 border-dashed'
      )}
    >
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-between h-9 pr-2",
          isDragging && "bg-transparent hover:bg-transparent"
        )}
        onClick={() => onSelect(group.id)}
      >
        <div className="flex items-center gap-2">
          <div
            ref={setDragRef}
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-3 h-3 text-muted-foreground" />
          </div>
          <span className="truncate text-left">{group.name}</span>
        </div>
        <span className="text-xs text-muted-foreground">{group.channels.length}</span>
      </Button>
    </div>
  );
}

export function GroupsSidebar({ groups, onSelect }: GroupsSidebarProps) {
  console.log('GroupsSidebar render with groups:', groups.map(g => ({ id: g.id, name: g.name })));
  
  return (
    <aside className="hidden lg:block w-64 shrink-0 sticky top-6 self-start">
      <div className="rounded-lg border bg-card p-3">
        <div className="px-2 pb-2 text-sm font-medium text-muted-foreground">
          Группы
        </div>
        <div className="space-y-1 h-[80vh] pr-1">
          {groups.map((group) => (
            <SidebarGroupItem key={group.id} group={group} onSelect={onSelect} />
          ))}
        </div>
      </div>
    </aside>
  );
}



