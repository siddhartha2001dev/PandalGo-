/**
 * Lightweight indexed-web search adapter.
 *
 * It uses Google Programmable Search when configured and Wikipedia as a
 * keyless factual fallback. Search result text is untrusted evidence and is
 * never executed.
 */
const searchCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

function decodeHtml(value = '') {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)));
}

function stripTags(value = '') {
  return decodeHtml(value.replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

function unwrapUrl(value = '') {
  const decoded = decodeHtml(value);
  const uddg = decoded.match(/[?&]uddg=([^&]+)/i)?.[1];
  if (uddg) {
    try { return decodeURIComponent(uddg); } catch { return uddg; }
  }
  return decoded.startsWith('//') ? `https:${decoded}` : decoded;
}

function parseResults(html, limit) {
  const results = [];
  const pattern = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(pattern)) {
    const url = unwrapUrl(match[1]);
    const title = stripTags(match[2]);
    if (!/^https?:\/\//i.test(url) || !title) continue;

    const start = match.index + match[0].length;
    const nearby = html.slice(start, start + 1800);
    const snippetMatch = nearby.match(/class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a?>/i);
    const snippet = snippetMatch ? stripTags(snippetMatch[1]) : '';
    if (!results.some((item) => item.url === url)) results.push({ title, url, snippet });
    if (results.length >= limit) break;
  }
  return results;
}

async function searchGoogle(query, limit) {
  const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const engineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;
  if (!apiKey || !engineId) return [];

  try {
    const params = new URLSearchParams({
      key: apiKey,
      cx: engineId,
      q: query,
      num: String(Math.min(limit, 10)),
      safe: 'active',
    });
    const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`, {
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.items || []).map((item) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet || '',
    })).filter((item) => item.title && /^https?:\/\//i.test(item.url));
  } catch {
    return [];
  }
}

async function searchWikipedia(query, limit) {
  try {
    const params = new URLSearchParams({
      action: 'query',
      list: 'search',
      srsearch: query,
      srlimit: String(Math.min(limit, 10)),
      utf8: '1',
      format: 'json',
      origin: '*',
    });
    const response = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
      headers: { 'User-Agent': 'PandalGoDevBot/1.0' },
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.query?.search || []).map((item) => ({
      title: item.title,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
      snippet: stripTags(item.snippet || ''),
    }));
  } catch {
    return [];
  }
}

export function shouldUseWebSearch({ message = '', attachedPujas = [], isPlaceRequest = false, isRouteRequest = false, isCurrentRequest = false } = {}) {
  const text = message.toLowerCase();
  if (isPlaceRequest || isRouteRequest || isCurrentRequest) return false;
  if (/^(hi|hello|hey|ok|okay|thanks|thank you|namaskar|nomoshkar)\b/i.test(text)) return false;
  if (/\b(search|search online|search web|look online|google|internet|website|source|reference|latest|current|news|history|who is|what is|tell me about|information about)\b/i.test(text)) return true;
  // General questions should be researched even when a matching directory
  // record exists; the record supplies identity/location while the web source
  // supplies history, context, and facts.
  return text.length >= 12 && !/\b(find|show|list|near|nearby|closest|route|directions?|map|address|crowd|queue|wait)\b/i.test(text);
}

export async function searchIndexedWeb(query, { limit = 4 } = {}) {
  const cleanQuery = String(query || '').replace(/\s+/g, ' ').trim().slice(0, 240);
  if (!cleanQuery) return [];
  const cacheKey = cleanQuery.toLowerCase();
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.results.slice(0, limit);

  try {
    let results = await searchGoogle(cleanQuery, limit);
    if (!results.length) results = await searchWikipedia(cleanQuery, limit);
    // Keep DuckDuckGo as a final fallback for environments where it is not
    // challenge-protected.
    if (!results.length) {
      const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQuery)}`, {
        headers: { 'User-Agent': 'PandalGoDevBot/1.0 (+https://pandalgo.com)' },
        signal: AbortSignal.timeout(7000),
      });
      if (response.ok) results = parseResults(await response.text(), Math.min(limit, 6));
    }
    searchCache.set(cacheKey, { results, expiresAt: Date.now() + CACHE_TTL_MS });
    return results;
  } catch {
    return [];
  }
}

