import { toast } from 'sonner';
import type { EPGChannel } from './epgParser';
import { decompressToText, parseEpgText } from './epgParser';

export type { EPGProgram, EPGChannel } from './epgParser';
export interface EPGData {
  channels: EPGChannel[];
  lastUpdated: Date;
}

export interface CacheInfo {
  hasCache: boolean;
  lastUpdated?: Date;
  expiresAt?: Date;
}

/**
 * Shared, app-wide EPG store.
 *
 * Previously every ChannelItem called its own `useEPG()` instance with its
 * own state — so N mounted items meant N parallel loads, N JSON.parse of the
 * localStorage cache and a "already in progress" race that left most items
 * without data on cold start. Now there is a single module-level store that
 * React components subscribe to via `useSyncExternalStore`.
 */
export interface EpgStoreState {
  /** Bumped on every change — used as a memoization dependency. */
  version: number;
  epgData: EPGData | null;
  isLoading: boolean;
  error: string | null;
  isDownloaded: boolean;
  cacheInfo: CacheInfo;
}

const CACHE_KEY = 'epg_data_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const EPG_URL = `${import.meta.env.BASE_URL}epg.xml.gz`;

// ---------------------------------------------------------------------------
// Store internals (module singletons)
// ---------------------------------------------------------------------------

let state: EpgStoreState = {
  version: 0,
  epgData: null,
  isLoading: false,
  error: null,
  isDownloaded: false,
  cacheInfo: readCacheInfo(),
};

const listeners = new Set<() => void>();

function setState(patch: Partial<Omit<EpgStoreState, 'version'>>) {
  state = { ...state, ...patch, version: state.version + 1 };
  listeners.forEach(listener => listener());
}

export function subscribeEpg(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Must return a stable reference until the next change (useSyncExternalStore). */
export function getEpgSnapshot(): EpgStoreState {
  return state;
}

// ---------------------------------------------------------------------------
// Name lookup: O(1) by any display-name line, partial match as fallback
// ---------------------------------------------------------------------------

const channelNameMap = new Map<string, EPGChannel>(); // lowercased line -> channel
let channelSearchStrings: string[] = []; // per-channel "all lines" haystack (lowercase)

function buildChannelNameMap(data: EPGData | null): void {
  channelNameMap.clear();
  channelSearchStrings = [];

  if (!data) return;

  for (const channel of data.channels) {
    const lines = [channel.name, ...(channel.aliases ?? [])];
    let haystack = '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (!channelNameMap.has(key)) channelNameMap.set(key, channel);
      haystack += (haystack ? ' | ' : '') + key;
    }
    channelSearchStrings.push(haystack);
  }
}

/** Exact match on any display-name line first, then a bounded partial match. */
export function getChannelEPGByName(channelName: string): EPGChannel | null {
  if (!channelName || !state.epgData) return null;

  const key = channelName.trim().toLowerCase();
  const found = channelNameMap.get(key);
  if (found) return found;

  // Fallback: partial match against all display lines of every channel.
  const channels = state.epgData.channels;
  for (let i = 0; i < channels.length; i++) {
    const haystack = channelSearchStrings[i];
    if (!haystack) continue;
    if (haystack.includes(key) || key.includes(haystack)) {
      return channels[i];
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// localStorage cache
// ---------------------------------------------------------------------------

function getCachedEPG(): EPGData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    const lastUpdated = new Date(parsed.lastUpdated);

    if (Date.now() - lastUpdated.getTime() > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    const channels: EPGChannel[] = parsed.channels.map((channel: Partial<EPGChannel>) => ({
      id: channel.id,
      name: channel.name,
      aliases: channel.aliases,
      currentProgram: channel.currentProgram
        ? {
            title: channel.currentProgram.title,
            start: new Date(channel.currentProgram.start),
            end: new Date(channel.currentProgram.end)
          }
        : undefined,
    }));

    return { channels, lastUpdated };
  } catch (error) {
    console.warn('Failed to parse cached EPG data:', error);
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

function cacheEPG(data: EPGData): void {
  try {
    const cacheData = { ...data, lastUpdated: data.lastUpdated.toISOString() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Failed to cache EPG data:', error);
  }
}

export function readCacheInfo(): CacheInfo {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return { hasCache: false };

    const parsed = JSON.parse(cached);
    const lastUpdated = new Date(parsed.lastUpdated);
    const expiresAt = new Date(lastUpdated.getTime() + CACHE_DURATION);

    return { hasCache: true, lastUpdated, expiresAt };
  } catch {
    return { hasCache: false };
  }
}

// ---------------------------------------------------------------------------
// Loading (single-flight; Web Worker with inline fallback)
// ---------------------------------------------------------------------------

let loadPromise: Promise<EPGData> | null = null;
let autoLoadTried = false;

function loadViaWorker(url: string): Promise<{ channels: EPGChannel[]; lastUpdated: Date }> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const worker = new Worker(new URL('./epg.worker.ts', import.meta.url), { type: 'module' });

    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      action();
      worker.terminate();
    };

    worker.onmessage = event => {
      const data = event.data as
        | { type: 'done'; channels: EPGChannel[]; lastUpdated: Date }
        | { type: 'error'; message: string };
      if (data.type === 'done') {
        finish(() => resolve({ channels: data.channels, lastUpdated: data.lastUpdated }));
      } else {
        finish(() => reject(new Error(data.message)));
      }
    };
    worker.onerror = err => finish(() => reject(err instanceof Error ? err : new Error('EPG worker failed')));
    worker.postMessage({ type: 'load', url });
  });
}

async function loadInline(): Promise<{ channels: EPGChannel[]; lastUpdated: Date }> {
  const response = await fetch(EPG_URL, {
    method: 'GET',
    headers: { Accept: 'application/xml, application/gzip, */*' },
  });
  if (!response.ok) {
    throw new Error(`Failed to load EPG: ${response.status} ${response.statusText}`);
  }
  const compressedData = await response.arrayBuffer();
  const text = await decompressToText(compressedData);
  return parseEpgText(text, new Date());
}

async function doLoad(): Promise<EPGData> {
  try {
    // Prefer the worker so the main thread stays responsive.
    return await loadViaWorker(EPG_URL).then(parsed => ({
      channels: parsed.channels,
      lastUpdated: parsed.lastUpdated,
    }));
  } catch (workerError) {
    console.warn('EPG worker failed, falling back to inline parse:', workerError);
    const parsed = await loadInline();
    return { channels: parsed.channels, lastUpdated: parsed.lastUpdated };
  }
}

function applyLoaded(data: EPGData, fromCache: boolean): void {
  buildChannelNameMap(data);
  setState({
    epgData: data,
    isLoading: false,
    isDownloaded: true,
    error: null,
    cacheInfo: readCacheInfo(),
  });

  if (!fromCache) {
    cacheEPG(data);
    // Replaced the old blocking alert() with a toast.
    toast.success('TV программа успешно загружена!');
  }
}

const service = {
  /** Single-flight: concurrent callers share one load (or the cache). */
  async loadEPG(forceRefresh = false): Promise<EPGData> {
    if (!forceRefresh) {
      const cached = getCachedEPG();
      if (cached) {
        applyLoaded(cached, true);
        return cached;
      }
    }

    if (loadPromise) return loadPromise;

    setState({ isLoading: true, error: null });
    loadPromise = doLoad()
      .then(data => {
        applyLoaded(data, false);
        return data;
      })
      .catch(err => {
        const message = err instanceof Error ? err.message : 'Failed to load TV guide';
        console.error('EPG loading error:', err);
        setState({ isLoading: false, error: message });
        throw new Error(message);
      })
      .finally(() => {
        loadPromise = null;
      });

    return loadPromise;
  },

  /** Auto-load once per app session (called from every hook instance, no-ops after the first). */
  autoLoadOnce(): void {
    if (autoLoadTried || state.epgData) return;
    autoLoadTried = true;
    void this.loadEPG().catch(() => { /* error surfaced via store state */ });
  },

  forceRefresh(): Promise<EPGData> {
    return this.loadEPG(true);
  },

  clearCache(): void {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.warn('Failed to clear EPG cache:', error);
    }
    buildChannelNameMap(null);
    setState({ epgData: null, isDownloaded: false, isLoading: false, error: null, cacheInfo: readCacheInfo() });
  },

  getEPGData(): EPGData | null {
    return state.epgData;
  },

  getChannelEPGByName,

  isDownloading(): boolean {
    return state.isLoading;
  },

  getCacheInfo(): CacheInfo {
    return readCacheInfo();
  },
};

export const epgService = Object.freeze(service);
