// core/geoWarm.js
const _jsonCache = new Map();

/** Start fetching now (and reuse later). */
export function warmJSON(url) {
  if (!_jsonCache.has(url)) {
    _jsonCache.set(url, fetch(url, { mode: 'cors', credentials: 'omit' }).then(r => r.json()));
  }
  return _jsonCache.get(url); // Promise reused by everyone
}

/** Warm a list. */
export function warmJsons(urls = []) {
  urls.forEach(u => {
    // Hint to browser to fetch during idle (no console warnings like preload)
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = u;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);

    // Also kick off an actual fetch so D3 charts hit memory cache
    warmJSON(u).catch(() => {});
  });
}

/** Later, just call useJSON(url) in your chart instead of fetch(url). */
export const useJSON = warmJSON;