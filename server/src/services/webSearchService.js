/**
 * Lightweight indexed-web search adapter.
 *
 * It uses DuckDuckGo's public HTML endpoint so the deployed bot can search
 * beyond the PandalGo database without requiring a second paid API key. The
 * result text is treated as untrusted evidence and is never executed.
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

export function shouldUseWebSearch({ message = '', attachedPujas = [], isPlaceRequest = false, isRouteRequest = false, isCurrentRequest = false } = {}) {
  const text = message.toLowerCase();
  if (isPlaceRequest || isRouteRequest || isCurrentRequest) return false;
  if (/^(hi|hello|hey|ok|okay|thanks|thank you|namaskar|nomoshkar)\b/i.test(text)) return false;
  if (/\b(search|search online|search web|look online|google|internet|website|source|reference|latest|current|news|history|who is|what is|tell me about|information about)\b/i.test(text)) return true;
  return attachedPujas.length === 0 && text.length >= 12;
}

export async function searchIndexedWeb(query, { limit = 4 } = {}) {
  const cleanQuery = String(query || '').replace(/\s+/g, ' ').trim().slice(0, 240);
  if (!cleanQuery) return [];
  const cacheKey = cleanQuery.toLowerCase();
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.results.slice(0, limit);

  try {
    const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQuery)}`, {
      headers: { 'User-Agent': 'PandalGoDevBot/1.0 (+https://pandalgo.com)' },
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) return [];
    const results = parseResults(await response.text(), Math.min(limit, 6));
    searchCache.set(cacheKey, { results, expiresAt: Date.now() + CACHE_TTL_MS });
    return results;
  } catch {
    return [];
  }
}

