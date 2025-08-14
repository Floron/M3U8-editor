import { useState, useMemo } from 'react';
import { DndContext, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { PlaylistData, Group, Channel } from '@/types/playlist';
import { GroupSection } from './GroupSection';
import { ChannelItem } from './ChannelItem';
import { SearchBar } from './SearchBar';
import { ControlPanel } from './ControlPanel';
// GroupsFooter removed
import { GroupsSidebar } from './GroupsSidebar';
import { GripVertical } from 'lucide-react';

interface PlaylistEditorProps {
  data: PlaylistData;
  onDataChange: (data: PlaylistData) => void;
}

export const PlaylistEditor = ({ data, onDataChange }: PlaylistEditorProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

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

  const selectedChannels = useMemo(() => {
    return data.groups.flatMap(group => group.channels.filter(channel => channel.selected));
  }, [data]);

  const handleDragStart = (event: DragStartEvent) => {
    console.log('Drag start event:', event.active.id, event.active.data);
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
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
    const overGroup = data.groups.find(group => group.id === overId);
    if (overGroup) {
      // Visual feedback is handled by CSS classes
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if we're dragging a group (from sidebar)
    if (activeId.startsWith('group-')) {
      console.log('Dragging group detected:', activeId);
      const sourceGroupId = activeId.replace('group-', '');
      
      // If dropping on another group in sidebar, reorder groups
      if (overId.startsWith('group-')) {
        console.log('Dropping group on group:', overId);
        const targetGroupId = overId.replace('group-', '');
        if (sourceGroupId !== targetGroupId) {
          console.log('Calling reorderGroups:', sourceGroupId, '->', targetGroupId);
          reorderGroups(sourceGroupId, targetGroupId);
        } else {
          console.log('Same group, no reordering needed');
        }
        return;
      }
      
      console.log('Group dropped on non-group target:', overId);
      // If dropping on sidebar item (for channels), don't handle here
      // Let the existing sidebar logic handle it
    }

    const activeChannel = findChannelById(activeId);
    if (!activeChannel) return;

    const selectedIds = getSelectedChannelIds();
    const isMultiDrag = activeChannel.selected && selectedIds.length > 1;

    // Dropped over groups sidebar item: move to end of that group
    if (overId.startsWith('group-')) {
      const targetGroupId = overId.replace('group-', '');
      const targetGroup = data.groups.find(g => g.id === targetGroupId);
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
    const targetGroup = data.groups.find(group => group.id === overId);
    if (!targetGroup) return;
    if (isMultiDrag) {
      moveSelectedChannelsToGroupAtIndex(selectedIds, targetGroup.id, targetGroup.channels.filter(ch => !selectedIds.includes(ch.id)).length);
    } else {
      moveChannelToGroup(activeChannel, targetGroup.id);
    }
  };

  const findChannelById = (id: string): Channel | null => {
    for (const group of data.groups) {
      const channel = group.channels.find(ch => ch.id === id);
      if (channel) return channel;
    }
    return null;
  };

  const moveChannelToGroup = (channel: Channel, targetGroupId: string) => {
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
  };

  const getSelectedChannelIds = (): string[] => {
    const ids: string[] = [];
    data.groups.forEach(group => {
      group.channels.forEach(channel => {
        if (channel.selected) ids.push(channel.id);
      });
    });
    return ids;
  };

  const findGroupByChannelId = (channelId: string): Group | null => {
    for (const group of data.groups) {
      if (group.channels.some(ch => ch.id === channelId)) return group;
    }
    return null;
  };

  const reorderChannelWithinGroup = (groupId: string, fromChannelId: string, toChannelId: string) => {
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
  };

  const moveChannelToGroupAtIndex = (channel: Channel, targetGroupId: string, targetIndex: number) => {
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
  };

  const moveSelectedChannelsToGroupAtIndex = (selectedIds: string[], targetGroupId: string, targetIndex: number) => {
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
  };

  // (copy helpers removed; behavior is move)

  const addNewGroup = (name: string) => {
    const newGroup: Group = {
      id: crypto.randomUUID(),
      name,
      channels: []
    };

    onDataChange({
      groups: [...data.groups, newGroup]
    });
  };

  const deleteGroup = (groupId: string) => {
    onDataChange({
      groups: data.groups.filter(group => group.id !== groupId)
    });
  };

  const deleteChannel = (channelId: string) => {
    const newGroups = data.groups.map(group => ({
      ...group,
      channels: group.channels.filter(ch => ch.id !== channelId)
    }));

    onDataChange({ groups: newGroups });
  };

  const toggleChannelSelection = (channelId: string) => {
    const newGroups = data.groups.map(group => ({
      ...group,
      channels: group.channels.map(channel =>
        channel.id === channelId
          ? { ...channel, selected: !channel.selected }
          : channel
      )
    }));

    onDataChange({ groups: newGroups });
  };

  const selectAllSearchResults = () => {
    const newGroups = data.groups.map(group => ({
      ...group,
      channels: group.channels.map(channel =>
        channel.name.toLowerCase().includes(searchTerm.toLowerCase())
          ? { ...channel, selected: true }
          : channel
      )
    }));

    onDataChange({ groups: newGroups });
  };

  const deleteSelectedChannels = () => {
    const newGroups = data.groups.map(group => ({
      ...group,
      channels: group.channels.filter(channel => !channel.selected)
    }));

    onDataChange({ groups: newGroups });
  };

  const clearSelectedChannels = () => {
    const newGroups = data.groups.map(group => ({
      ...group,
      channels: group.channels.map(channel => ({ ...channel, selected: false }))
    }));
    onDataChange({ groups: newGroups });
  };

  const sortGroupChannels = (groupId: string) => {
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
  };

  const toggleGroupCollapsed = (groupId: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const reorderGroups = (fromGroupId: string, toGroupId: string) => {
    console.log('reorderGroups called with:', fromGroupId, '->', toGroupId);
    const fromIndex = data.groups.findIndex(group => group.id === fromGroupId);
    const toIndex = data.groups.findIndex(group => group.id === toGroupId);
    
    console.log('Current groups:', data.groups.map(g => ({ id: g.id, name: g.name })));
    console.log('Indices:', fromIndex, '->', toIndex);
    
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      console.log('Invalid indices, returning');
      return;
    }
    
    const newGroups = [...data.groups];
    const [moved] = newGroups.splice(fromIndex, 1);
    const insertIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
    newGroups.splice(insertIndex, 0, moved);
    
    console.log('New groups order:', newGroups.map(g => ({ id: g.id, name: g.name })));
    console.log('Calling onDataChange...');
    onDataChange({ groups: newGroups });
    console.log('onDataChange called');
  };

  const hasSearchResults = filteredData.groups.some(group => group.channels.length > 0);

  return (
    <DndContext onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="space-y-6 lg:flex lg:items-start lg:gap-6">
        <SearchBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSelectAll={selectAllSearchResults}
          hasResults={hasSearchResults}
        />

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
        
        {/* Test button for debugging */}
        <button 
          onClick={() => {
            if (data.groups.length >= 2) {
              console.log('Test reorder - swapping first two groups');
              reorderGroups(data.groups[0].id, data.groups[1].id);
            }
          }}
          className="fixed bottom-4 right-4 bg-blue-500 text-white p-2 rounded"
        >
          Test Reorder
        </button>

        {/* GroupsFooter removed */}
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
  );
};