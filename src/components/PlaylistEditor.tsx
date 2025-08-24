import { useState, useMemo, useCallback } from 'react';
import { DndContext, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { PlaylistData, Group, Channel } from '@/types/playlist';
import { GroupSection } from './GroupSection';
import { ChannelItem } from './ChannelItem';
import { SearchBar } from './SearchBar';
import { ControlPanel } from './ControlPanel';
import { GroupsSidebar } from './GroupsSidebar';
import { PerformanceMonitor } from './PerformanceMonitor';
import { GripVertical } from 'lucide-react';

interface PlaylistEditorProps {
  data: PlaylistData;
  onDataChange: (data: PlaylistData) => void;
}

export const PlaylistEditor = ({ data, onDataChange }: PlaylistEditorProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Memoize filtered data to prevent recalculation on every render
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;

    const filteredGroups = data.groups.map(group => ({
      ...group,
      channels: group.channels.filter(channel =>
        channel.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })).filter(group => group.channels.length > 0);

    return { groups: filteredGroups };
  }, [data, searchTerm]);

  // Memoize selected channels calculation
  const selectedChannels = useMemo(() => {
    return data.groups.flatMap(group => group.channels.filter(channel => channel.selected));
  }, [data]);

  // Memoize channel lookup map for O(1) access
  const channelMap = useMemo(() => {
    const map = new Map<string, Channel>();
    data.groups.forEach(group => {
      group.channels.forEach(channel => {
        map.set(channel.id, channel);
      });
    });
    return map;
  }, [data]);

  // Memoize group lookup map for O(1) access
  const groupMap = useMemo(() => {
    const map = new Map<string, Group>();
    data.groups.forEach(group => {
      map.set(group.id, group);
    });
    return map;
  }, [data]);

  // Optimized channel finder using memoized map
  const findChannelById = useCallback((id: string): Channel | null => {
    return channelMap.get(id) || null;
  }, [channelMap]);

  // Optimized group finder using memoized map
  const findGroupByChannelId = useCallback((channelId: string): Group | null => {
    for (const group of data.groups) {
      if (group.channels.some(ch => ch.id === channelId)) return group;
    }
    return null;
  }, [data]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // If dragging a group, don't need to find channel
    if (activeId.startsWith('group-')) {
      return;
    }

    // Find the active channel
    const activeChannel = findChannelById(activeId);
    if (!activeChannel) return;

    // If dragging over a group header, highlight it
    const overGroup = groupMap.get(overId);
    if (overGroup) {
      // Visual feedback is handled by CSS classes
    }
  }, [findChannelById, groupMap]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if we're dragging a group (from sidebar)
    if (activeId.startsWith('group-')) {
      const sourceGroupId = activeId.replace('group-', '');
      
      // If dropping on another group in sidebar, reorder groups
      if (overId.startsWith('group-')) {
        const targetGroupId = overId.replace('group-', '');
        if (sourceGroupId !== targetGroupId) {
          reorderGroups(sourceGroupId, targetGroupId);
        }
        return;
      }
    }

    const activeChannel = findChannelById(activeId);
    if (!activeChannel) return;

    const selectedIds = getSelectedChannelIds();
    const isMultiDrag = activeChannel.selected && selectedIds.length > 1;

    // Dropped over groups sidebar item: move to end of that group
    if (overId.startsWith('group-')) {
      const targetGroupId = overId.replace('group-', '');
      const targetGroup = groupMap.get(targetGroupId);
      if (!targetGroup) return;
      const endIndex = targetGroup.channels.filter(ch => !selectedIds.includes(ch.id)).length;
      if (isMultiDrag) {
        moveSelectedChannelsToGroupAtIndex(selectedIds, targetGroupId, endIndex);
      } else {
        moveChannelToGroupAtIndex(activeChannel, targetGroupId, endIndex);
      }
      return;
    }

    // Dropped over a channel: reorder within group or move to that group's index
    const targetChannel = findChannelById(overId);
    if (targetChannel) {
      // If target is inside current selection during multi-drag, do nothing
      if (isMultiDrag && targetChannel.selected) return;

      const sourceGroup = findGroupByChannelId(activeId);
      const targetGroup = findGroupByChannelId(targetChannel.id);
      if (!sourceGroup || !targetGroup) return;

      if (isMultiDrag) {
        const targetIndex = targetGroup.channels.findIndex(ch => ch.id === targetChannel.id);
        moveSelectedChannelsToGroupAtIndex(selectedIds, targetGroup.id, targetIndex);
      } else {
        if (sourceGroup.id === targetGroup.id) {
          reorderChannelWithinGroup(sourceGroup.id, activeId, targetChannel.id);
        } else {
          const targetIndex = targetGroup.channels.findIndex(ch => ch.id === targetChannel.id);
          moveChannelToGroupAtIndex(activeChannel, targetGroup.id, targetIndex);
        }
      }
      return;
    }

    // Dropped over a group header: move to the end of that group
    const targetGroup = groupMap.get(overId);
    if (!targetGroup) return;
    if (isMultiDrag) {
      moveSelectedChannelsToGroupAtIndex(selectedIds, targetGroup.id, targetGroup.channels.filter(ch => !selectedIds.includes(ch.id)).length);
    } else {
      moveChannelToGroup(activeChannel, targetGroup.id);
    }
  }, [findChannelById, findGroupByChannelId, groupMap]);

  const moveChannelToGroup = useCallback((channel: Channel, targetGroupId: string) => {
    const newGroups = data.groups.map(group => {
      // Remove channel from current group (not used for copy behavior)
      const filteredChannels = group.channels.filter(ch => ch.id !== channel.id);
      if (group.id === targetGroupId) {
        return {
          ...group,
          channels: [...filteredChannels, { ...channel, group: group.name, selected: false }]
        };
      }
      return { ...group, channels: filteredChannels };
    });

    onDataChange({ groups: newGroups });
  }, [data, onDataChange]);

  const getSelectedChannelIds = useCallback((): string[] => {
    const ids: string[] = [];
    data.groups.forEach(group => {
      group.channels.forEach(channel => {
        if (channel.selected) ids.push(channel.id);
      });
    });
    return ids;
  }, [data]);

  const reorderChannelWithinGroup = useCallback((groupId: string, fromChannelId: string, toChannelId: string) => {
    const newGroups = data.groups.map(group => {
      if (group.id !== groupId) return group;
      const channels = [...group.channels];
      const fromIndex = channels.findIndex(ch => ch.id === fromChannelId);
      const toIndex = channels.findIndex(ch => ch.id === toChannelId);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return group;
      const [moved] = channels.splice(fromIndex, 1);
      const insertIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
      channels.splice(insertIndex, 0, moved);
      return { ...group, channels };
    });
    onDataChange({ groups: newGroups });
  }, [data, onDataChange]);

  const moveChannelToGroupAtIndex = useCallback((channel: Channel, targetGroupId: string, targetIndex: number) => {
    const newGroups = data.groups.map(group => {
      const withoutChannel = group.channels.filter(ch => ch.id !== channel.id);
      if (group.id === targetGroupId) {
        const channels = [...withoutChannel];
        const insertIndex = Math.max(0, Math.min(targetIndex, channels.length));
        channels.splice(insertIndex, 0, { ...channel, group: group.name, selected: false });
        return { ...group, channels };
      }
      return { ...group, channels: withoutChannel };
    });
    onDataChange({ groups: newGroups });
  }, [data, onDataChange]);

  const moveSelectedChannelsToGroupAtIndex = useCallback((selectedIds: string[], targetGroupId: string, targetIndex: number) => {
    const targetGroup = data.groups.find(g => g.id === targetGroupId);
    if (!targetGroup) return;

    // Preserve the original order of selected channels as they appear in the data
    const selectedChannelsInOrder: Channel[] = [];
    data.groups.forEach(group => {
      group.channels.forEach(channel => {
        if (selectedIds.includes(channel.id)) selectedChannelsInOrder.push(channel);
      });
    });

    const newGroups = data.groups.map(group => {
      const remaining = group.channels.filter(ch => !selectedIds.includes(ch.id));
      if (group.id === targetGroupId) {
        const channels = [...remaining];
        const insertIndex = Math.max(0, Math.min(targetIndex, channels.length));
        const toInsert = selectedChannelsInOrder.map(ch => ({ ...ch, group: group.name, selected: false }));
        channels.splice(insertIndex, 0, ...toInsert);
        return { ...group, channels };
      }
      return { ...group, channels: remaining };
    });

    onDataChange({ groups: newGroups });
  }, [data, onDataChange]);

  const addNewGroup = useCallback((name: string) => {
    const newGroup: Group = {
      id: crypto.randomUUID(),
      name,
      channels: []
    };

    onDataChange({
      groups: [...data.groups, newGroup]
    });
  }, [data, onDataChange]);

  const deleteGroup = useCallback((groupId: string) => {
    onDataChange({
      groups: data.groups.filter(group => group.id !== groupId)
    });
  }, [data, onDataChange]);

  const deleteChannel = useCallback((channelId: string) => {
    const newGroups = data.groups.map(group => ({
      ...group,
      channels: group.channels.filter(ch => ch.id !== channelId)
    }));

    onDataChange({ groups: newGroups });
  }, [data, onDataChange]);

  const toggleChannelSelection = useCallback((channelId: string) => {
    const newGroups = data.groups.map(group => ({
      ...group,
      channels: group.channels.map(channel =>
        channel.id === channelId
          ? { ...channel, selected: !channel.selected }
          : channel
      )
    }));

    onDataChange({ groups: newGroups });
  }, [data, onDataChange]);

  const selectAllSearchResults = useCallback(() => {
    const newGroups = data.groups.map(group => ({
      ...group,
      channels: group.channels.map(channel =>
        channel.name.toLowerCase().includes(searchTerm.toLowerCase())
          ? { ...channel, selected: true }
          : channel
      )
    }));

    onDataChange({ groups: newGroups });
  }, [data, searchTerm, onDataChange]);

  const deleteSelectedChannels = useCallback(() => {
    const newGroups = data.groups.map(group => ({
      ...group,
      channels: group.channels.filter(channel => !channel.selected)
    }));

    onDataChange({ groups: newGroups });
  }, [data, onDataChange]);

  const clearSelectedChannels = useCallback(() => {
    const newGroups = data.groups.map(group => ({
      ...group,
      channels: group.channels.map(channel => ({ ...channel, selected: false }))
    }));
    onDataChange({ groups: newGroups });
  }, [data, onDataChange]);

  const sortGroupChannels = useCallback((groupId: string) => {
    const newGroups = data.groups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          channels: [...group.channels].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
        };
      }
      return group;
    });

    onDataChange({ groups: newGroups });
  }, [data, onDataChange]);

  const toggleGroupCollapsed = useCallback((groupId: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  }, []);

  const reorderGroups = useCallback((fromGroupId: string, toGroupId: string) => {
    const fromIndex = data.groups.findIndex(group => group.id === fromGroupId);
    const toIndex = data.groups.findIndex(group => group.id === toGroupId);
    
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
    
    const newGroups = [...data.groups];
    const [moved] = newGroups.splice(fromIndex, 1);
    const insertIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
    newGroups.splice(insertIndex, 0, moved);
    
    onDataChange({ groups: newGroups });
  }, [data, onDataChange]);

  const hasSearchResults = useMemo(() => 
    filteredData.groups.some(group => group.channels.length > 0), 
    [filteredData]
  );

  return (
    <>
      <DndContext onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        {/* Centered Search Bar */}
        <div className="flex justify-center mb-8">
          <div className="w-full max-w-md">
            <SearchBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onSelectAll={selectAllSearchResults}
              hasResults={hasSearchResults}
            />
          </div>
        </div>

        <div className="space-y-6 lg:flex lg:items-start lg:gap-6">
          <div className="flex-1 space-y-6">
            <ControlPanel
              onAddGroup={addNewGroup}
              selectedCount={selectedChannels.length}
              onDeleteSelected={deleteSelectedChannels}
              onClearSelection={clearSelectedChannels}
            />

            <div className="space-y-4">
              {filteredData.groups.map(group => (
                <GroupSection
                  key={group.id}
                  group={group}
                  onDeleteGroup={deleteGroup}
                  onDeleteChannel={deleteChannel}
                  onToggleSelection={toggleChannelSelection}
                  onSortChannels={sortGroupChannels}
                  collapsed={!!collapsedGroups[group.id]}
                  onToggleCollapsed={toggleGroupCollapsed}
                />
              ))}
            </div>
          </div>

          <GroupsSidebar
            groups={data.groups}
            onSelect={(groupId) => {
              const el = document.getElementById(`group-${groupId}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />
        </div>

        <DragOverlay>
          {activeId ? (
            activeId.startsWith('group-') ? (
              <div className="bg-card border rounded-lg p-3 shadow-lg">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">
                    {data.groups.find(g => g.id === activeId.replace('group-', ''))?.name}
                  </span>
                </div>
              </div>
            ) : (
              <ChannelItem
                channel={findChannelById(activeId)!}
                onDelete={() => {}}
                onToggleSelection={() => {}}
                isDragging
              />
            )
          ) : null}
        </DragOverlay>
      </DndContext>

      <PerformanceMonitor componentName="PlaylistEditor" />
    </>
  );
};