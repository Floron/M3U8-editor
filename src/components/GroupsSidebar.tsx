import { Button } from '@/components/ui/button';
import { Group } from '@/types/playlist';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface GroupsSidebarProps {
  groups: Group[];
  onSelect: (groupId: string) => void;
}

function SidebarGroupItem({ group, onSelect }: { group: Group; onSelect: (id: string) => void }) {
  const { isOver, setNodeRef } = useDroppable({ id: `sidebar-${group.id}` });
  return (
    <div ref={setNodeRef} className={cn(isOver && 'drag-over rounded-md')}>
      <Button
        key={group.id}
        variant="ghost"
        className="w-full justify-between h-9"
        onClick={() => onSelect(group.id)}
      >
        <span className="truncate text-left">{group.name}</span>
        <span className="text-xs text-muted-foreground">{group.channels.length}</span>
      </Button>
    </div>
  );
}

export function GroupsSidebar({ groups, onSelect }: GroupsSidebarProps) {
  return (
    <aside className="hidden lg:block w-64 shrink-0 sticky top-6 self-start">
      <div className="rounded-lg border bg-card p-3">
        <div className="px-2 pb-2 text-sm font-medium text-muted-foreground">
          Группы
        </div>
        <div className="space-y-1 max-h=[70vh] overflow-auto pr-1">
          {groups.map((group) => (
            <SidebarGroupItem key={group.id} group={group} onSelect={onSelect} />
          ))}
        </div>
      </div>
    </aside>
  );
}



