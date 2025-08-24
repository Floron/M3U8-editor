import { useState, useEffect, useMemo, useCallback } from 'react';
import { epgService, EPGData } from '@/services/epgService';
import { iconsService } from '@/services/iconsService';

export const useEPG = () => {
  const [epgData, setEpgData] = useState<EPGData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [cacheInfo, setCacheInfo] = useState(epgService.getCacheInfo());

  // Memoize channel lookup map for O(1) access
  const channelMap = useMemo(() => {
    if (!epgData) return new Map();
    
    const map = new Map<string, any>();
    epgData.channels.forEach(channel => {
      // Store by exact name
      map.set(channel.name, channel);
      
      // Also store by lowercase for case-insensitive lookup
      //map.set(channel.name.toLowerCase(), channel);
    });
    return map;
  }, [epgData]);

  // Memoize icon cache
  const iconCache = useMemo(() => {
    const cache = new Map<string, string>();
    return cache;
  }, []);

  const loadEPG = async (forceRefresh: boolean = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await epgService.loadEPG(forceRefresh);
      setEpgData(data);
      setIsDownloaded(true);
      setCacheInfo(epgService.getCacheInfo());
      
      // Show success alert only for fresh loads
      if (forceRefresh || !cacheInfo.hasCache) {
        alert('TV программа успешно загружена!');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load TV guide';
      setError(errorMessage);
      console.error('EPG loading error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const forceRefresh = () => loadEPG(true);
  const clearCache = () => {
    epgService.clearCache();
    setCacheInfo(epgService.getCacheInfo());
    setEpgData(null);
    setIsDownloaded(false);
  };

  // Optimized icon lookup with caching
  const findChannelIcon = useCallback((channelName: string): string | undefined => {
    if (!channelName) return undefined;
    
    // Check cache first
    if (iconCache.has(channelName)) {
      return iconCache.get(channelName);
    }
    
    // Get icon path
    const iconPath = iconsService.findChannelIcon(channelName);
    
    // Cache the result
    iconCache.set(channelName, iconPath);
    
    return iconPath;
  }, [iconCache]);

  // Optimized EPG lookup with memoized map
  const getChannelEPGByName = useCallback((channelName: string) => {
    if (!channelName || !channelMap.size) return null;
    
    // Try exact match first
    let found = channelMap.get(channelName);
    
    // If not found, try case-insensitive match
   // if (!found) {
   //   found = channelMap.get(channelName.toLowerCase());
   // }
    
    // If still not found, try partial match (fallback)
    if (!found) {
      for (const [key, channel] of channelMap.entries()) {
        if (channel.name.includes(channelName) || channelName.includes(channel.name)) {
          found = channel;
          break;
        }
      }
    }
    
    return found || null;
  }, [channelMap]);

  useEffect(() => {
    // Auto-load EPG when the hook is first used
    if (!epgData && !isLoading && !isDownloaded) {
      loadEPG();
    }
  }, []);

  return {
    epgData,
    isLoading,
    error,
    isDownloaded,
    cacheInfo,
    loadEPG,
    forceRefresh,
    clearCache,
    findChannelIcon,
    getChannelEPGByName
  };
};
