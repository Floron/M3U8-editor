/**
 * Icon lookup backed by a build-time manifest (`public/icons-manifest.json`).
 *
 * Previously `findChannelIcon` returned a guessed path for every channel name,
 * so each unknown icon triggered an HTTP request that ended in 404 (hundreds
 * of them on first render). Now we only render `<img>` when the file is known
 * to exist.
 *
 * The manifest maps lowercased basenames (and a normalized variant with
 * underscores) to real filenames, which covers both naming conventions used by
 * the icon set (original names with spaces and lowercase_underscore ones).
 */

const BASE_URL = import.meta.env.BASE_URL;
const ICON_DIR = `${BASE_URL}epgone_dark_logo/`;
const MANIFEST_URL = `${BASE_URL}icons-manifest.json`;

type Manifest = Record<string, string>; // key -> filename inside epgone_dark_logo/

// ---------------------------------------------------------------------------
// External store (subscribable via useSyncExternalStore)
// ---------------------------------------------------------------------------

let iconsState: { ready: boolean; version: number } = { ready: false, version: 0 };
const iconListeners = new Set<() => void>();

function setIconsReady(ready: boolean): void {
  iconsState = { ready, version: iconsState.version + 1 };
  iconListeners.forEach(listener => listener());
}

export function subscribeIcons(listener: () => void): () => void {
  iconListeners.add(listener);
  return () => iconListeners.delete(listener);
}

/** Stable reference until the manifest state changes. */
export function getIconsSnapshot(): { ready: boolean; version: number } {
  return iconsState;
}

// ---------------------------------------------------------------------------
// Manifest + lookup with per-name memoization (module level, shared by all items)
// ---------------------------------------------------------------------------

let manifest: Manifest | null = null;
let manifestPromise: Promise<Manifest> | null = null;
const nameCache = new Map<string, string>(); // channel name -> resolved src ('' = not found)

function resolveIconFile(channelName: string): string | undefined {
  if (!manifest || !channelName) return undefined;

  const lower = channelName.trim().toLowerCase();
  let file = manifest[lower];
  if (!file) {
    // Normalized convention from the icon set docs: spaces -> underscores.
    file = manifest[lower.replace(/[\s\u00A0]+/g, '_')];
  }
  return file;
}

/** Returns a ready-to-use `<img>` src or undefined (caller shows fallback icon). */
export function findChannelIcon(channelName: string): string | undefined {
  if (!channelName) return undefined;

  const cached = nameCache.get(channelName);
  if (cached !== undefined) return cached || undefined;

  const file = resolveIconFile(channelName);
  const src = file ? ICON_DIR + file : '';
  // Only remember once the manifest has arrived, otherwise retry after load.
  if (manifest) nameCache.set(channelName, src);
  return src || undefined;
}

/** Load the icon manifest exactly once for the whole app. */
export function loadIconManifest(): Promise<boolean> {
  if (!manifestPromise) {
    manifestPromise = fetch(MANIFEST_URL)
      .then(response => (response.ok ? (response.json() as Promise<Manifest>) : null))
      .catch(() => null)
      .then(data => {
        manifest = data ?? {};
        setIconsReady(true);
        return manifest;
      });
  }
  return manifestPromise.then(() => true).catch(() => false);
}
