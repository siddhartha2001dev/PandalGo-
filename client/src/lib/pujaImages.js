const GENERIC_IMAGE_HOSTS = ['images.unsplash.com', 'images.pexels.com', 'placehold.co'];

export function isGenericPujaImage(url = '') {
  return GENERIC_IMAGE_HOSTS.some((host) => url.includes(host));
}

export function getContextualPujaImage(puja) {
  const images = Array.isArray(puja?.images) ? puja.images : [];
  return images.find((url) => url && !isGenericPujaImage(url)) || null;
}

export function getPujaInitials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'PG';
}
