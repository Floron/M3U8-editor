export interface EPGChannel {
  id: string;
  name: string;
  icon?: string;
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

  constructor() {
    // Try to load cached data on initialization
    this.epgData = this.getCachedEPG();
  }

  async downloadEPG(forceRefresh: boolean = false): Promise<EPGData> {
    if (this.isLoading) {
      throw new Error('EPG download already in progress');
    }

    // Check cache first if not forcing refresh
    if (!forceRefresh) {
      const cachedData = this.getCachedEPG();
      if (cachedData) {
        console.log('Using cached EPG data');
        this.epgData = cachedData;
        return cachedData;
      }
    }

    this.isLoading = true;

    try {
      console.log('Starting EPG download from https://epg.one/epg.xml.gz');
      
      // Download the gzipped EPG file
      const response = await fetch('https://epg.one/epg.xml.gz', {
        mode: 'cors',
        headers: {
          'Access-Control-Allow-Origin': 'https://epg.one, http://localhost',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Headers': 'X-Requested-With,content-type',
          'Accept': 'application/xml, application/gzip, */*',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to download EPG: ${response.status} ${response.statusText}`);
      }

      // Get the compressed data
      const compressedData = await response.arrayBuffer();
      
      // Decompress using pako (we'll need to install this)
      const decompressedData = await this.decompressGzip(compressedData);
      
      // Parse the XML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(decompressedData, 'text/xml');
      
      // Extract channel information
      const channels = this.extractChannelsFromXML(xmlDoc);
      
      this.epgData = {
        channels,
        lastUpdated: new Date()
      };

      // Cache the new data
      this.cacheEPG(this.epgData);

      console.log(`EPG download completed. Found ${channels.length} channels.`);
      return this.epgData;

    } catch (error) {
      console.error('EPG download failed:', error);
      
      // Handle CORS errors specifically
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('CORS error: Cannot download EPG from epg.one. This is likely due to browser security restrictions.');
      }
      
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  private async decompressGzip(compressedData: ArrayBuffer): Promise<string> {
    // For now, we'll use a simple approach
    // In a real implementation, you'd want to use pako or similar library
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
      console.warn('Gzip decompression failed, trying as plain text:', error);
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
        const name = element.getAttribute('display-name') || 
                    element.textContent?.trim();
        const icon = element.getAttribute('icon') || 
                    element.querySelector('icon')?.getAttribute('src') ||
                    element.querySelector('icon')?.textContent?.trim() ||
                    undefined;
        
        //console.log(`Found ${name} channel. Icon: ${icon}.`);

        if (name) {
          channels.push({
            id: `epg-${index}`,
            name: name.trim(),
            icon: icon || undefined
          });
        }
        
      });

      
/*
      // If no channels found with standard selectors, try alternative approaches
      if (channels.length === 0) {
        const allElements = xmlDoc.querySelectorAll('*');
        allElements.forEach((element, index) => {
          const name = element.getAttribute('name') || 
                      element.getAttribute('id') || 
                      element.textContent?.trim();
          
          if (name && name.length > 2 && name.length < 100) {
            channels.push({
              id: `epg-alt-${index}`,
              name: name.trim(),
              icon: undefined
            });
          }
        });
      }
      */

    } catch (error) {
      console.error('Error extracting channels from XML:', error);
    }

    /*
      channels.forEach(channel => {
        console.log(`Id: ${channel.id}. Channel: ${channel.name}. Icon: ${channel.icon}.`);
      });
    */
    return channels;
  }

  getEPGData(): EPGData | null {
    return this.epgData;
  }

  findChannelIcon(channelName: string): string | undefined {
    if (!this.epgData) return undefined;
    
    // Try to find a matching channel by name
    const channel = this.epgData.channels.find(ch => 
      ch.name.toLowerCase().includes(channelName.toLowerCase()) 
      //||
      //channelName.toLowerCase().includes(ch.name.toLowerCase())
    );
    
    return channel?.icon;
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
        console.log('EPG cache expired, removing old data');
        localStorage.removeItem(this.CACHE_KEY);
        return null;
      }

      console.log('Found valid cached EPG data');
      return {
        ...parsed,
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
      console.log('EPG data cached successfully');
    } catch (error) {
      console.warn('Failed to cache EPG data:', error);
    }
  }

  clearCache(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY);
      console.log('EPG cache cleared');
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
