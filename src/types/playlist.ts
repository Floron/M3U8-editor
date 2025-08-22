export interface Channel {
  id: string;
  name: string;
  group: string;
  url: string;
  tvgRec?: string;
  selected?: boolean;
  icon?: string;
  epg?: {
    currentProgram?: {
      title: string;
      description?: string;
      category?: string;
      rating?: string;
      start: Date;
      end: Date;
    };
    nextProgram?: {
      title: string;
      description?: string;
      category?: string;
      rating?: string;
      start: Date;
      end: Date;
    };
  };
}

export interface Group {
  id: string;
  name: string;
  channels: Channel[];
}

export interface PlaylistData {
  groups: Group[];
}