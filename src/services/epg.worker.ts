/// <reference lib="webworker" />
import { decompressToText, parseEpgText } from './epgParser';

/**
 * Runs the heavy EPG load/parse off the main thread:
 * fetch -> gunzip (385 MB of XML) -> linear scan.
 * The UI stays responsive while this runs.
 */
interface LoadRequest {
  type: 'load';
  url: string;
}

self.onmessage = async (event: MessageEvent<LoadRequest>) => {
  if (event.data?.type !== 'load') return;
  try {
    const response = await fetch(event.data.url, {
      method: 'GET',
      headers: { Accept: 'application/xml, application/gzip, */*' },
    });
    if (!response.ok) {
      throw new Error(`Failed to load EPG: ${response.status} ${response.statusText}`);
    }

    const compressedData = await response.arrayBuffer();
    const text = await decompressToText(compressedData);
    const parsed = parseEpgText(text, new Date());

    // postMessage uses structured clone — plain objects and Dates are fine.
    (self as unknown as Worker).postMessage({
      type: 'done',
      channels: parsed.channels,
      lastUpdated: parsed.lastUpdated,
    });
  } catch (err) {
    (self as unknown as Worker).postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : 'Failed to load TV guide',
    });
  }
};
