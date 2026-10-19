const GENERIC_IMAGE_HOSTS = [
  'images.unsplash.com',
  'images.pexels.com',
  'placehold.co',
];

const imageCache = new Map();
const IMAGE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function isGenericImageUrl(url = '') {
  return GENERIC_IMAGE_HOSTS.some((host) => url.includes(host));
}

function isUsableImageUrl(url = '') {
  return /^https?:\/\//i.test(url) && !/\.svg(?:$|\?)/i.test(url);
}

async function searchGoogleImages(query) {
  const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const engineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;
  if (!apiKey || !engineId) return [];

  try {
    const params = new URLSearchParams({
      key: apiKey,
      cx: engineId,
      q: query,
      searchType: 'image',
      num: '3',
      safe: 'active',
      imgSize: 'large',
    });
    const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);
    if (!response.ok) return [];
    const data = await response.json();
    return (data.items || [])
      .map((item) => ({
        imageUrl: item.link,
        title: item.title || query,
        source: 'Google Programmable Search',
        contextUrl: item.image?.contextLink || item.image?.thumbnailLink || null,
      }))
      .filter((item) => isUsableImageUrl(item.imageUrl));
  } catch {
    return [];
  }
}

async function searchWikimediaImages(query) {
  try {
    const params = new URLSearchParams({
      action: 'query',
      generator: 'search',
      gsrsearch: query,
      gsrnamespace: '6',
      gsrlimit: '5',
      prop: 'imageinfo',
      iiprop: 'url',
      iiurlwidth: '1000',
      format: 'json',
      origin: '*',
    });
    const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
      headers: { 'User-Agent': 'PandalGo/1.0 (pandal image resolver)' },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return Object.values(data?.query?.pages || {})
      .map((page) => {
        const info = page.imageinfo?.[0];
        return {
          imageUrl: info?.thumburl || info?.url,
          title: page.title?.replace(/^File:/, '') || query,
          source: 'Wikimedia Commons',
          contextUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title || '')}`,
        };
      })
      .filter((item) => isUsableImageUrl(item.imageUrl));
  } catch {
    return [];
  }
}

export function hasGenericPujaImage(images = []) {
  return !images.length || images.some(isGenericImageUrl);
}

export async function findPujaImage({ name, locality }) {
  const query = `${name} ${locality || ''} Kolkata Durga Puja pandal`.trim();
  const cached = imageCache.get(query);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const googleResults = await searchGoogleImages(query);
  if (googleResults[0]) {
    imageCache.set(query, { value: googleResults[0], expiresAt: Date.now() + IMAGE_CACHE_TTL_MS });
    return googleResults[0];
  }

  const wikiResults = await searchWikimediaImages(query);
  const result = wikiResults[0] || null;
  imageCache.set(query, { value: result, expiresAt: Date.now() + IMAGE_CACHE_TTL_MS });
  return result;
}

