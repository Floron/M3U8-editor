import { useCallback, useEffect } from 'react';
import { useSyncExternalStore } from 'react';
import { epgService, getEpgSnapshot, subscribeEpg } from '@/services/epgService';
import type { EPGChannel, EPGData, CacheInfo } from '@/services/epgService';
import {
  findChannelIcon as lookupChannelIcon,
  loadIconManifest,
  getIconsSnapshot,
  subscribeIcons
} from '@/services/iconsService';

export interface UseEPGResult {
  epgData: EPGData | null;
  isLoading: boolean;
  error: string | null;
  isDownloaded: boolean;
  cacheInfo: CacheInfo;
  /** Bumped whenever EPG data or the icon manifest changes — use as memo dependency. */
  version: number;
  loadEPG: () => Promise<EPGData>;
  forceRefresh: () => void;
  clearCache: () => void;
  findChannelIcon: (channelName: string) => string | undefined;
  getChannelEPGByName: (channelName: string) => EPGChannel | null;
}

/**
 * Shared EPG/icon store hook.
 *
 * All components subscribe to the same module-level state, so there is exactly
 * one network load and one name map for the whole app instead of one per
 * component instance (the old behaviour re-downloaded/re-parsed a 42 MB file
 * whenever several items mounted in parallel).
 */
export const useEPG = (): UseEPGResult => {
  const epgState = useSyncExternalStore(subscribeEpg, getEpgSnapshot);
  const iconsState = useSyncExternalStore(subscribeIcons, getIconsSnapshot);

  // Auto-load once per app session (single-flight inside the service).
  useEffect(() => {
    epgService.autoLoadOnce();
    void loadIconManifest();
  }, []);

  // Errors are surfaced via store state; swallow the rejection to keep
  // manual refresh calls from producing unhandled-promise warnings.
  const forceRefresh = useCallback(() => {
    void epgService.forceRefresh().catch(() => undefined);
  }, []);

  const clearCache = useCallback(() => {
    epgService.clearCache();
  }, []);

  return {
    epgData: epgState.epgData,
    isLoading: epgState.isLoading,
    error: epgState.error,
    isDownloaded: epgState.isDownloaded,
    cacheInfo: epgState.cacheInfo,
    version: epgState.version + iconsState.version,
    loadEPG: () => epgService.loadEPG(),
    forceRefresh,
    clearCache,
    // Stable module-level functions — safe to use in memo dependencies.
    findChannelIcon: lookupChannelIcon,
    getChannelEPGByName: epgService.getChannelEPGByName
  };
};
