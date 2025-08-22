import { useState, useEffect } from 'react';
import { epgService, EPGData } from '@/services/epgService';
import { iconsService } from '@/services/iconsService';

export const useEPG = () => {
  const [epgData, setEpgData] = useState<EPGData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [cacheInfo, setCacheInfo] = useState(epgService.getCacheInfo());

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

  const findChannelIcon = (channelName: string): string | undefined => {
    return iconsService.findChannelIcon(channelName);
  };

  const getChannelEPG = (channelId: string) => {
    return epgService.getChannelEPG(channelId);
  };

  const getChannelEPGByName = (channelName: string) => {
    return epgService.getChannelEPGByName(channelName);
  };

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
    getChannelEPG,
    getChannelEPGByName
  };
};
