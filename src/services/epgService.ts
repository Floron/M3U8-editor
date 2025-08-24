export interface EPGProgram {
  title: string;
  start: Date;
  end: Date;
}

export interface EPGChannel {
  id: string;
  name: string;
  currentProgram?: EPGProgram;
}

export interface EPGData {
  channels: EPGChannel[];
  lastUpdated: Date;
}

class EPGService {
  private epgData: EPGData | null = null;
  private isLoading = false;
  private readonly CACHE_KEY = 'epg_data_cache';
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private channelNameMap: Map<string, EPGChannel> = new Map();

  constructor() {
    // Try to load cached data on initialization
    this.epgData = this.getCachedEPG();
    this.buildChannelNameMap();
  }

  private buildChannelNameMap(): void {
    if (!this.epgData) return;
    
    this.channelNameMap.clear();
    this.epgData.channels.forEach(channel => {
      // Store by exact name
      this.channelNameMap.set(channel.name, channel);
      
      // Store by lowercase for case-insensitive lookup
      //this.channelNameMap.set(channel.name.toLowerCase(), channel);
    });
  }

  async loadEPG(forceRefresh: boolean = false): Promise<EPGData> {
    if (this.isLoading) {
      throw new Error('EPG loading already in progress');
    }

    // Check cache first if not forcing refresh
    if (!forceRefresh) {
      const cachedData = this.getCachedEPG();
      if (cachedData) {
        this.epgData = cachedData;
        this.buildChannelNameMap();
        return cachedData;
      }
    }

    this.isLoading = true;

    try {
      // Load the local gzipped EPG file
      const response = await fetch(`./epg.xml.gz`, {
        method: 'GET',
        headers: {
          'Accept': 'application/xml, application/gzip, */*',
          'Origin': 'null'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load EPG: ${response.status} ${response.statusText}`);
      }

      // Get the compressed data
      const compressedData = await response.arrayBuffer();
      
      // Decompress the gzipped data
      const decompressedData = await this.decompressGzip(compressedData);
      
      // Parse the XML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(decompressedData, 'text/xml');
      
      // Extract channel information
      const channels = this.extractChannelsFromXML(xmlDoc);
      
      // Extract and assign program information to channels
      this.assignProgramsToChannels(xmlDoc, channels);
      
      this.epgData = {
        channels,
        lastUpdated: new Date()
      };

      // Build the channel name map for fast lookups
      this.buildChannelNameMap();

      // Cache the new data
      this.cacheEPG(this.epgData);

      return this.epgData;

    } catch (error) {
      console.error('EPG loading failed:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  private async decompressGzip(compressedData: ArrayBuffer): Promise<string> {
    try {
      // Try to use the Compression API if available
      if ('CompressionStream' in window) {
        const stream = new Response(compressedData).body?.pipeThrough(new DecompressionStream('gzip'));
        if (stream) {
          const decompressed = await new Response(stream).text();
          return decompressed;
        }
      }
      
      // Fallback: try to parse as text (in case it's not actually compressed)
      const decoder = new TextDecoder();
      return decoder.decode(compressedData);
      
    } catch (error) {
      const decoder = new TextDecoder();
      return decoder.decode(compressedData);
    }
  }

  private extractChannelsFromXML(xmlDoc: Document): EPGChannel[] {
    const channels: EPGChannel[] = [];
    
    try {
      // Look for channel elements in the XML
      const channelElements = xmlDoc.querySelectorAll('channel');

      channelElements.forEach((element, index) => {
        const channelId = element.getAttribute('id');
        const name = element.getAttribute('display-name') || 
                    element.textContent?.trim();

        const currChannel = channels.find(c => c.id === channelId);
        if (currChannel) {
          currChannel.name = currChannel.name + `\n` + name;
        } else {
          channels.push({
            id: channelId,
            name: name.trim()
          });
        }
      });

    } catch (error) {
      console.error('Error extracting channels from XML:', error);
    }

    return channels;
  }

  private assignProgramsToChannels(xmlDoc: Document, channels: EPGChannel[]): void {
    try {
      const now = new Date();
      const programmeElements = xmlDoc.querySelectorAll('programme');
      
      programmeElements.forEach((element) => {
        const channelId = element.getAttribute('channel');
        if (!channelId) return;
        
        const channel = channels.find(c => c.id === channelId);
        if (!channel) return;
        
        const startStr = element.getAttribute('start');
        const stopStr = element.getAttribute('stop');
        
        if (!startStr || !stopStr) return;
        
        const start = this.parseEPGDateTime(startStr);
        const end = this.parseEPGDateTime(stopStr);
        
        if (!start || !end) return;
        
        // Assign current program based on time
        if (start <= now && end > now) {
          const title = element.querySelector('title')?.textContent?.trim();
        
          if (!title) return;
          
          const program: EPGProgram = {
            title,
            start,
            end
          };

          channel.currentProgram = program;
        }
      });
      
    } catch (error) {
      console.error('Error assigning programs to channels:', error);
    }
  }

  private parseEPGDateTime(dateTimeStr: string): Date | null {
    try {
      // Parse EPG datetime format: "20250821031000 +0300"
      const year = parseInt(dateTimeStr.substring(0, 4));
      const month = parseInt(dateTimeStr.substring(4, 6)) - 1; // Month is 0-indexed
      const day = parseInt(dateTimeStr.substring(6, 8));
      const hour = parseInt(dateTimeStr.substring(8, 10));
      const minute = parseInt(dateTimeStr.substring(10, 12));
      const second = parseInt(dateTimeStr.substring(12, 14));
      
      // Extract timezone offset if present
      const timezoneOffset = dateTimeStr.substring(15);
      let date: Date;
      
      if (timezoneOffset) {
        // Create date with timezone offset
        const offsetHours = parseInt(timezoneOffset.substring(1, 3));
        const offsetMinutes = parseInt(timezoneOffset.substring(3, 5));
        const offsetSign = timezoneOffset.charAt(0);
        
        // Create date in UTC
        date = new Date(Date.UTC(year, month, day, hour, minute, second));
        
        // Adjust for timezone offset
        const offsetMs = (offsetHours * 60 + offsetMinutes) * 60 * 1000;
        if (offsetSign === '+') {
          date.setTime(date.getTime() - offsetMs);
        } else {
          date.setTime(date.getTime() + offsetMs);
        }
      } else {
        // No timezone offset, assume local time
        date = new Date(year, month, day, hour, minute, second);
      }
      
      return date;
    } catch (error) {
      console.error('Error parsing EPG datetime:', dateTimeStr, error);
      return null;
    }
  }

  getEPGData(): EPGData | null {
    return this.epgData;
  }

  getChannelEPGByName(channelName: string): EPGChannel | null {
    if (!this.epgData || !channelName) return null;
    
    // Try exact match first using the optimized map
    let found = this.channelNameMap.get(channelName);
    
    // If not found, try case-insensitive match
   // if (!found) {
   //   found = this.channelNameMap.get(channelName.toLowerCase());
   // }
    
    // If still not found, try partial match (fallback)
    if (!found) {
      for (const [key, channel] of this.channelNameMap.entries()) {
        if (channel.name.includes(channelName) || channelName.includes(channel.name)) {
          found = channel;
          break;
        }
      }
    }
    
    return found || null;
  }

  isDownloading(): boolean {
    return this.isLoading;
  }

  private getCachedEPG(): EPGData | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      const lastUpdated = new Date(parsed.lastUpdated);
      
      // Check if cache is still valid
      if (Date.now() - lastUpdated.getTime() > this.CACHE_DURATION) {
        localStorage.removeItem(this.CACHE_KEY);
        return null;
      }

      // Restore Date objects for program data
      const channels = parsed.channels.map((channel: any) => ({
        ...channel,
        currentProgram: channel.currentProgram ? {
          ...channel.currentProgram,
          start: new Date(channel.currentProgram.start),
          end: new Date(channel.currentProgram.end)
        } : undefined,
        nextProgram: channel.nextProgram ? {
          ...channel.nextProgram,
          start: new Date(channel.nextProgram.start),
          end: new Date(channel.nextProgram.end)
        } : undefined
      }));

      return {
        channels,
        lastUpdated
      };
    } catch (error) {
      console.warn('Failed to parse cached EPG data:', error);
      localStorage.removeItem(this.CACHE_KEY);
      return null;
    }
  }

  private cacheEPG(data: EPGData): void {
    try {
      const cacheData = {
        ...data,
        lastUpdated: data.lastUpdated.toISOString()
      };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to cache EPG data:', error);
    }
  }

  clearCache(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY);
      this.channelNameMap.clear();
    } catch (error) {
      console.warn('Failed to clear EPG cache:', error);
    }
  }

  getCacheInfo(): { hasCache: boolean; lastUpdated?: Date; expiresAt?: Date } {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return { hasCache: false };

      const parsed = JSON.parse(cached);
      const lastUpdated = new Date(parsed.lastUpdated);
      const expiresAt = new Date(lastUpdated.getTime() + this.CACHE_DURATION);

      return {
        hasCache: true,
        lastUpdated,
        expiresAt
      };
    } catch (error) {
      return { hasCache: false };
    }
  }
}

export const epgService = new EPGService();
