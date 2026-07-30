import type { MediaEntry } from './types';

export function scanPageMedia(): MediaEntry[] {
  const candidates: MediaEntry[] = [];

  document.querySelectorAll('img').forEach(img => {
    const entry = buildImageEntry(img);
    if (entry && passesBaseFilter(entry)) candidates.push(entry);
  });

  document.querySelectorAll('video').forEach(video => {
    const entry = buildVideoEntry(video);
    if (entry && passesBaseFilter(entry)) candidates.push(entry);
  });

  return dedupeByIdentity(candidates);
}

function buildImageEntry(img: HTMLImageElement): MediaEntry | null {
  const rect = img.getBoundingClientRect();
  const resolved = resolveBestSource(img);
  if (!resolved) return null;

  return {
    id: crypto.randomUUID(),
    kind: 'image',
    thumbSrc: img.currentSrc || img.src,
    bestSrc: resolved.url,
    resolutionKnown: resolved.knownDimensions || null,
    displaySize: { w: rect.width, h: rect.height },
    filename: extractFilename(resolved.url),
    domRef: new WeakRef(img),
    sourceContext: img.closest('a')?.href || null,
    duplicateCount: 0,
  };
}

function buildVideoEntry(video: HTMLVideoElement): MediaEntry | null {
  const sources = getVideoSources(video);
  if (!sources.length && !video.currentSrc) return null;

  const best = pickBestVideoSource(sources, video.currentSrc);
  if (!best) return null;
  
  const possibleGifSibling = tryDeriveGifUrl(best.url);
  const rect = video.getBoundingClientRect();
  
  const entry: MediaEntry = {
    id: crypto.randomUUID(),
    kind: 'video',
    thumbSrc: video.poster || best.url,
    bestSrc: best.url,
    altFormats: possibleGifSibling ? [{ kind: 'gif', url: possibleGifSibling }] : [],
    duration: video.duration && !isNaN(video.duration) ? video.duration : null,
    displaySize: { w: rect.width, h: rect.height },
    filename: extractFilename(best.url),
    domRef: new WeakRef(video),
    isStreamOnly: best.url.startsWith('blob:') || best.url.startsWith('mediasource:'),
    duplicateCount: 0,
  };

  if (entry.isStreamOnly) {
    const realSource = Array.from(video.querySelectorAll('source')).find(s => !s.src.startsWith('blob:'));
    if (realSource) {
      entry.bestSrc = realSource.src;
      entry.filename = extractFilename(realSource.src);
      entry.isStreamOnly = false;
    } else {
      entry.bestSrc = null;
      entry.unresolvable = true;
      entry.reason = 'stream-only (blob URL, no direct source found)';
    }
  }
  
  return entry;
}

function resolveBestSource(img: HTMLImageElement) {
  // Priority 1: srcset
  const fromSrcset = bestFromSrcset(img);
  if (fromSrcset) return { url: fromSrcset, knownDimensions: null };

  // Priority 2: nested link
  const parentLink = img.closest('a');
  if (parentLink && looksLikeImageUrl(parentLink.href)) {
    return { url: parentLink.href, knownDimensions: null };
  }

  // Priority 3: data attributes
  const dataAttrs = ['data-full', 'data-large', 'data-src', 'data-original', 'data-zoom-src'];
  for (const attr of dataAttrs) {
    const val = img.getAttribute(attr);
    if (val && looksLikeImageUrl(val)) return { url: val, knownDimensions: null };
  }

  // Priority 4: filename pattern upgrade
  const upgraded = tryUpgradeUrlPattern(img.currentSrc || img.src);
  if (upgraded && upgraded !== (img.currentSrc || img.src)) {
    return { url: upgraded, knownDimensions: null, needsVerification: true };
  }

  const url = img.currentSrc || img.src;
  return url ? { url, knownDimensions: null } : null;
}

function bestFromSrcset(img: HTMLImageElement): string | null {
  if (!img.srcset) return null;
  const sources = img.srcset.split(',').map(s => s.trim().split(' '));
  sources.sort((a, b) => {
    const widthA = parseInt(a[1]) || 0;
    const widthB = parseInt(b[1]) || 0;
    return widthB - widthA;
  });
  if (sources.length > 0 && sources[0][0]) {
    return sources[0][0];
  }
  return null;
}

function looksLikeImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|avif|jxl)(\?.*)?$/i.test(url);
}

function tryUpgradeUrlPattern(url: string): string {
  if (!url) return url;
  return url
    .replace(/\/(thumb|thumbs|thumbnail|small|preview)\//i, '/original/')
    .replace(/[-_](thumb|small|xs|sm|150x150|300x300)(\.\w+)$/i, '$2');
}

function getVideoSources(video: HTMLVideoElement): {url: string, type: string}[] {
  const sources: {url: string, type: string}[] = [];
  if (video.currentSrc) {
    sources.push({ url: video.currentSrc, type: video.currentSrc.split('.').pop() || 'unknown' });
  }
  video.querySelectorAll('source').forEach(s => {
    if (s.src) sources.push({ url: s.src, type: s.type || s.src.split('.').pop() || 'unknown' });
  });
  return sources.filter(s => !s.url.startsWith('data:'));
}

function pickBestVideoSource(sources: {url: string, type: string}[], fallbackUrl: string): {url: string, type: string} | null {
  if (!sources.length) {
    return fallbackUrl ? { url: fallbackUrl, type: fallbackUrl.split('.').pop() || 'unknown' } : null;
  }
  const priority: Record<string, number> = { webm: 2, mp4: 1 };
  return sources.sort((a, b) => (priority[b.type] || 0) - (priority[a.type] || 0))[0];
}

function tryDeriveGifUrl(url: string): string | null {
  if (!url) return null;
  if (url.includes('DASH_') && url.includes('.mp4')) {
    // Basic heuristics for reddit, can be expanded
    return url.replace(/DASH_.*\.mp4/, 'preview.redd.it/') + '.gif'; 
  }
  return null;
}

function passesBaseFilter(entry: MediaEntry): boolean {
  if (entry.kind === 'video') {
    return entry.displaySize.w >= 80 && entry.displaySize.h >= 80;
  }
  return entry.displaySize.w >= 150 && entry.displaySize.h >= 150;
}

export function extractFilename(url: string): string {
  try {
    const path = new URL(url).pathname;
    return path.split('/').pop()?.split('?')[0].toLowerCase() || url;
  } catch {
    return url;
  }
}

function dedupeByIdentity(entries: MediaEntry[]): MediaEntry[] {
  const seen = new Map<string, MediaEntry>();
  for (const entry of entries) {
    const key = entry.filename || entry.bestSrc;
    if (!key) continue;
    if (seen.has(key)) {
      seen.get(key)!.duplicateCount++;
    } else {
      seen.set(key, { ...entry, duplicateCount: 1 });
    }
  }
  return mergeGifVideoPairs(Array.from(seen.values()));
}

function mergeGifVideoPairs(entries: MediaEntry[]): MediaEntry[] {
  const byFilename = new Map(entries.map(e => [e.filename, e]));
  for (const entry of entries) {
    for (const alt of entry.altFormats || []) {
      const altFilename = extractFilename(alt.url);
      const match = byFilename.get(altFilename);
      if (match && match.id !== entry.id) {
        entry.pairedWith = match.id;
        match.isNonPrimaryDuplicate = true;
      }
    }
  }
  return entries;
}
