/**
 * Fast, dependency-free XMLTV parser.
 *
 * Replaces the old `DOMParser`-based approach which built a full DOM tree
 * (~1-3 GB of RAM) for files that can exceed 300 MB after decompression.
 * Here we only keep what the UI needs: channel display names and the
 * programme currently airing on each channel.
 *
 * The module is pure (no DOM/window access), so it runs both in a Web Worker
 * (epg.worker.ts) and inline as a fallback.
 */

export interface EPGProgram {
  title: string;
  start: Date;
  end: Date;
}

export interface EPGChannel {
  id: string;
  /** Primary display name (first `<display-name>`). */
  name: string;
  /** Alternative display names from the same channel block. */
  aliases?: string[];
  currentProgram?: EPGProgram;
}

export interface ParsedEpg {
  channels: EPGChannel[];
  lastUpdated: Date;
}

const CHANNEL_RE = /<channel\b([^>]*)>([\s\S]*?)<\/channel>/g;
const DISPLAY_NAME_RE = /<display-name\b[^>]*>([\s\S]*?)<\/display-name>/g;
const PROGRAMME_RE = /<programme\b([^>]*)>([\s\S]*?)<\/programme>/g;
const TITLE_RE = /<title\b[^>]*>([\s\S]*?)<\/title>/;

const ATTR_ID_RE = /\bid="([^"]+)"/;
const ATTR_START_RE = /\bstart="([^"]+)"/;
const ATTR_STOP_RE = /\bstop="([^"]+)"/;
const ATTR_CHANNEL_RE = /\bchannel="([^"]+)"/;

/** Decode the XML entities that can appear in names/titles. */
function decodeEntities(value: string): string {
  if (!value.includes('&')) return value;
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)));
}

/** Normalize whitespace inside names (display-name values can span lines). */
function cleanName(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** Parse EPG datetime format: "20250821031000 +0300" or plain local time. */
export function parseEpgDateTime(dateTimeStr: string): Date | null {
  if (dateTimeStr.length < 14) return null;
  try {
    const year = parseInt(dateTimeStr.substring(0, 4), 10);
    const month = parseInt(dateTimeStr.substring(4, 6), 10) - 1; // 0-indexed
    const day = parseInt(dateTimeStr.substring(6, 8), 10);
    const hour = parseInt(dateTimeStr.substring(8, 10), 10);
    const minute = parseInt(dateTimeStr.substring(10, 12), 10);
    const second = parseInt(dateTimeStr.substring(12, 14), 10);

    const timezoneOffset = dateTimeStr.substring(15).trim();
    if (timezoneOffset.length >= 5) {
      // Build the date in UTC, then shift by the explicit offset.
      const date = new Date(Date.UTC(year, month, day, hour, minute, second));
      const sign = timezoneOffset.charAt(0) === '-' ? -1 : 1;
      const offsetHours = parseInt(timezoneOffset.substring(1, 3), 10);
      const offsetMinutes = parseInt(timezoneOffset.substring(3, 5), 10);
      date.setTime(date.getTime() + sign * (offsetHours * 60 + offsetMinutes) * 60 * 1000);
      return date;
    }

    // No timezone offset: assume local time.
    return new Date(year, month, day, hour, minute, second);
  } catch {
    return null;
  }
}

/** Decompress a fetched file (gzip or plain text) into a UTF-8 string. */
export async function decompressToText(data: ArrayBuffer): Promise<string> {
  const head = new Uint8Array(data, 0, Math.min(2, data.byteLength));
  const isGzip = head.length === 2 && head[0] === 0x1f && head[1] === 0x8b;

  if (isGzip && typeof DecompressionStream !== 'undefined') {
    try {
      const stream = new Response(data).body?.pipeThrough(new DecompressionStream('gzip'));
      if (stream) return await new Response(stream).text();
    } catch {
      // Fall through to the plain-text fallback below.
    }
  }

  return new TextDecoder().decode(data);
}

/**
 * Parse XMLTV text and extract channels with their currently airing programme.
 * Complexity is linear in file size; channel lookups for programmes are O(1)
 * via a Map (the old code did a linear `channels.find()` per programme —
 * ~2 billion comparisons on the bundled 645k-programme feed).
 */
export function parseEpgText(text: string, now: Date = new Date()): ParsedEpg {
  const channels: EPGChannel[] = [];
  const channelById = new Map<string, EPGChannel>();

  // --- Pass 1: channels and their display names -------------------------
  CHANNEL_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = CHANNEL_RE.exec(text)) !== null) {
    if (match[1].endsWith('/')) continue; // self-closing tag

    const idMatch = ATTR_ID_RE.exec(match[1]);
    if (!idMatch) continue;
    const id = cleanName(decodeEntities(idMatch[1]));

    const lines: string[] = [];
    DISPLAY_NAME_RE.lastIndex = 0;
    let nameMatch: RegExpExecArray | null;
    while ((nameMatch = DISPLAY_NAME_RE.exec(match[2])) !== null) {
      const value = cleanName(decodeEntities(nameMatch[1]));
      if (value && !lines.includes(value)) lines.push(value);
    }

    const existing = channelById.get(id);
    if (existing) {
      // Duplicate <channel> block: merge the extra display names.
      for (const line of lines) {
        if (!existing.aliases?.includes(line)) {
          existing.aliases = [...(existing.aliases ?? []), line];
        }
      }
      continue;
    }

    const channel: EPGChannel = {
      id,
      name: lines[0] ?? id,
      aliases: lines.length > 1 ? lines.slice(1) : undefined,
    };
    channelById.set(id, channel);
    channels.push(channel);
  }

  // --- Pass 2: programmes (only the one currently airing is kept) --------
  // Cheap date-prefix prefilter so we avoid full Date parsing for the vast
  // majority of programmes that are outside today's window.
  const pad = (n: number) => String(n).padStart(2, '0');
  const toDayPrefix = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const tomorrow = new Date(now.getTime() + 86_400_000);
  const todayPrefix = toDayPrefix(now);
  const tomorrowPrefix = toDayPrefix(tomorrow);

  PROGRAMME_RE.lastIndex = 0;
  while ((match = PROGRAMME_RE.exec(text)) !== null) {
    if (match[1].endsWith('/')) continue; // self-closing tag

    const attrs = match[1];
    const startMatch = ATTR_START_RE.exec(attrs);
    const stopMatch = ATTR_STOP_RE.exec(attrs);
    const channelAttr = ATTR_CHANNEL_RE.exec(attrs);
    if (!startMatch || !stopMatch || !channelAttr) continue;

    // Skip programmes that cannot possibly be airing right now.
    if (stopMatch[1].substring(0, 8) < todayPrefix) continue;
    if (startMatch[1].substring(0, 8) > tomorrowPrefix) continue;

    const channel = channelById.get(channelAttr[1]);
    if (!channel) continue;

    const start = parseEpgDateTime(startMatch[1]);
    const end = parseEpgDateTime(stopMatch[1]);
    if (!start || !end) continue;
    if (!(start <= now && end > now)) continue;

    const titleMatch = TITLE_RE.exec(match[2]);
    if (!titleMatch) continue;
    const title = cleanName(decodeEntities(titleMatch[1]));
    if (title) {
      channel.currentProgram = { title, start, end };
    }
  }

  return { channels, lastUpdated: now };
}
