import { Channel, Group, PlaylistData } from '@/types/playlist';

export class M3U8Parser {
  static parse(content: string): PlaylistData {
    const lines = content.split('\n').filter(line => line.trim());
    const channels: Channel[] = [];
    let currentChannel: Partial<Channel> = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#EXTINF:')) {
        // Parse EXTINF line
        const match = line.match(/#EXTINF:([^,]*),(.+)/);
        if (match) {
          const info = match[1];
          const name = match[2];

          // Extract tvg-rec if present
          const tvgRecMatch = info.match(/tvg-rec="([^"]+)"/);
          currentChannel = {
            id: crypto.randomUUID(),
            name,
            tvgRec: tvgRecMatch ? tvgRecMatch[1] : undefined,
            selected: false
          };
        }
      } else if (line.startsWith('#EXTGRP:')) {
        // Parse EXTGRP line
        const group = line.replace('#EXTGRP:', '').trim();
        currentChannel.group = group;
      } else if (line.startsWith('http')) {
        // URL line
        currentChannel.url = line;
        if (currentChannel.name && currentChannel.url) {
          channels.push(currentChannel as Channel);
          currentChannel = {};
        }
      }
    }

    // Group channels by group name
    const groupMap = new Map<string, Channel[]>();
    
    channels.forEach(channel => {
      const groupName = channel.group || 'Без группы';
      if (!groupMap.has(groupName)) {
        groupMap.set(groupName, []);
      }
      groupMap.get(groupName)!.push(channel);
    });

    // Convert to groups array
    const groups: Group[] = Array.from(groupMap.entries()).map(([name, channels]) => ({
      id: crypto.randomUUID(),
      name,
      channels
    }));

    return { groups };
  }

  static generate(data: PlaylistData): string {
    let content = '#EXTM3U\n';

    data.groups.forEach(group => {
      group.channels.forEach(channel => {
        content += `#EXTINF:0${channel.tvgRec ? ` tvg-rec="${channel.tvgRec}"` : ''},${channel.name}\n`;
        content += `#EXTGRP:${group.name}\n`;
        content += `${channel.url}\n`;
      });
    });

    return content;
  }
}