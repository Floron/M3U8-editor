import { useDroppable } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, Trash2, Plus, ChevronDown } from 'lucide-react';
import { Group } from '@/types/playlist';
import { ChannelItem } from './ChannelItem';
import { VirtualizedChannelList } from './VirtualizedChannelList';
import { cn } from '@/lib/utils';
import React, { useCallback } from 'react';

interface GroupSectionProps {
  group: Group;
  onDeleteGroup: (id: string) => void;
  onDeleteChannel: (id: string) => void;
  onToggleSelection: (id: string) => void;
  onSortChannels: (groupId: string) => void;
  collapsed?: boolean;
  onToggleCollapsed?: (groupId: string) => void;
}

export const GroupSection = React.memo(({
  group,
  onDeleteGroup,
  onDeleteChannel,
  onToggleSelection,
  onSortChannels,
  collapsed = false,
  onToggleCollapsed,
}: GroupSectionProps) => {
  const { isOver, setNodeRef } = useDroppable({ id: group.id });

  // Use virtualized list for groups with more than 30 channels (lowered threshold for better UX)
  const useVirtualization = group.channels.length > 30;

  // Memoize event handlers
  const handleToggleCollapsed = useCallback(() => {
    onToggleCollapsed?.(group.id);
  }, [onToggleCollapsed, group.id]);

  const handleSortChannels = useCallback(() => {
    onSortChannels(group.id);
  }, [onSortChannels, group.id]);

  const handleDeleteGroup = useCallback(() => {
    onDeleteGroup(group.id);
  }, [onDeleteGroup, group.id]);

  return (
    <div className="space-y-2" id={`group-${group.id}`}>
      <div
        ref={setNodeRef}
        className={cn('group-header p-4 rounded-lg', isOver && 'drag-over')}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className={cn('h-8 w-8 transition-transform', collapsed && 'rotate-[-90deg]')}
              onClick={handleToggleCollapsed}
              aria-label={collapsed ? 'Развернуть группу' : 'Свернуть группу'}
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
            <h3 className="font-semibold text-lg">{group.name}</h3>
            <span className="text-sm text-muted-foreground">({group.channels.length} каналов)</span>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleSortChannels} className="h-8">
              <ArrowUpDown className="w-4 h-4 mr-1" />
              Сортировать
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={handleDeleteGroup}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {!collapsed && (
        <div className="pl-4">
          {group.channels.length > 0 ? (
            useVirtualization ? (
              <VirtualizedChannelList
                channels={group.channels}
                onDelete={onDeleteChannel}
                onToggleSelection={onToggleSelection}
                containerHeight={600} // Reduced for better fit
                itemHeight={80}
                overscan={20} // Reduced overscan for better performance
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {group.channels.map((channel) => (
                  <ChannelItem
                    key={channel.id}
                    channel={channel}
                    onDelete={onDeleteChannel}
                    onToggleSelection={onToggleSelection}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Plus className="w-8 h-8 mx-auto mb-2" />
              <p>Перетащите каналы сюда</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

GroupSection.displayName = 'GroupSection';

 


