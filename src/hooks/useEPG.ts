import { useState, useEffect } from 'react';
import { epgService, EPGData } from '@/services/epgService';

export const useEPG = () => {
  const [epgData, setEpgData] = useState<EPGData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [cacheInfo, setCacheInfo] = useState(epgService.getCacheInfo());

  const downloadEPG = async (forceRefresh: boolean = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await epgService.downloadEPG(forceRefresh);
      setEpgData(data);
      setIsDownloaded(true);
      setCacheInfo(epgService.getCacheInfo());
      
      // Show success alert only for fresh downloads
      if (forceRefresh || !cacheInfo.hasCache) {
        alert('TV программа успешно загружена!');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download TV guide';
      setError(errorMessage);
      console.error('EPG download error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const forceRefresh = () => downloadEPG(true);
  const clearCache = () => {
    epgService.clearCache();
    setCacheInfo(epgService.getCacheInfo());
    setEpgData(null);
    setIsDownloaded(false);
  };

  const findChannelIcon = (channelName: string): string | undefined => {
    return epgService.findChannelIcon(channelName);
  };

  useEffect(() => {
    // Auto-download EPG when the hook is first used
    if (!epgData && !isLoading && !isDownloaded) {
      downloadEPG();
    }
  }, []);

  return {
    epgData,
    isLoading,
    error,
    isDownloaded,
    cacheInfo,
    downloadEPG,
    forceRefresh,
    clearCache,
    findChannelIcon
  };
};
