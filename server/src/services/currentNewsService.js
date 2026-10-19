/**
 * Keyless current-news adapter for questions that explicitly ask about recent
 * events. The model may summarize only the returned headlines and links.
 */
const newsCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function decodeXml(value = '') {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .trim();
}

function stripTags(value = '') {
  return decodeXml(value.replace(/<[^>]+>/g, ''));
}

function parseItems(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => {
    const item = match[1];
    const read = (tag) => {
      const found = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return found ? stripTags(found[1]) : '';
    };
    const title = read('title');
    const link = read('link');
    return title && link ? { title, link, publishedAt: read('pubDate') } : null;
  }).filter(Boolean).slice(0, 5);
}

export function isCurrentInfoRequest(message = '') {
  return /latest|recent|today|currently|current|news|incident|accident|death|died|dead|injur|stampede|tragedy|what happened|update|situation/i.test(message);
}

export async function searchCurrentNews(query, { limit = 5 } = {}) {
  const cleanQuery = String(query || '').trim();
  if (!cleanQuery) return [];
  const cacheKey = cleanQuery.toLowerCase();
  const cached = newsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.items.slice(0, limit);

  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(`${cleanQuery} Kolkata India`)}&hl=en-IN&gl=IN&ceid=IN:en`;
    const response = await fetch(rssUrl, {
      headers: { 'User-Agent': 'PandalGoDevBot/1.0' },
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) return [];
    const items = parseItems(await response.text());
    newsCache.set(cacheKey, { items, expiresAt: Date.now() + CACHE_TTL_MS });
    return items.slice(0, limit);
  } catch {
    return [];
  }
}
