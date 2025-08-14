export interface Channel {
  id: string;
  name: string;
  group: string;
  url: string;
  tvgRec?: string;
  selected?: boolean;
  icon?: string;
}

export interface Group {
  id: string;
  name: string;
  channels: Channel[];
}

export interface PlaylistData {
  groups: Group[];
}