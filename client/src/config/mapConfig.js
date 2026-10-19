// High-performance OpenStreetMap with multi-host subdomains for fast parallel tile loading on mobile
export const DEFAULT_TILE_URL = 
  import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

export const DEFAULT_ATTRIBUTION =
  import.meta.env.VITE_MAP_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

export const MAP_SUBDOMAINS = ['a', 'b', 'c'];
export const MAP_MAX_ZOOM = 19;
export const MAP_DEFAULT_CENTER = [22.5726, 88.3639]; // Kolkata Center

