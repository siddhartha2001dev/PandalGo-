import { v2 as cloudinary } from 'cloudinary';
import crypto from 'crypto';
import { env } from './env.js';

// Environment values are commonly pasted into Render with an accidental
// leading/trailing space. Cloudinary signs the exact secret, so normalize the
// values once at startup before configuring the SDK.
const cloudName = env.CLOUDINARY_CLOUD_NAME.trim();
const apiKey = env.CLOUDINARY_API_KEY.trim();
const apiSecret = env.CLOUDINARY_API_SECRET.trim();

export const isCloudinaryConfigured = Boolean(cloudName && apiKey && apiSecret);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  const secretFingerprint = crypto.createHash('sha256').update(apiSecret).digest('hex').slice(0, 12);
  console.log(`[Storage] Cloudinary configured for ${cloudName} (key suffix ****${apiKey.slice(-4)}, secret fingerprint ${secretFingerprint}).`);
} else {
  console.log('[Storage] Cloudinary credentials not detected. Falling back to local disk storage adapter (/uploads).');
}

export { cloudinary };
