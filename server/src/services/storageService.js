import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export async function processAndStoreFile(file) {
  if (!file) {
    throw new Error('No file provided for upload');
  }

  // If Cloudinary is configured, upload to Cloudinary
  if (isCloudinaryConfigured) {
    try {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'pujomap',
            resource_type: 'image',
            transformation: [{ quality: 'auto:good', fetch_format: 'auto' }],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(file.buffer);
      });
      return uploadResult.secure_url;
    } catch (err) {
      console.error('[StorageService] Cloudinary upload error:', err);
      if (/invalid signature/i.test(err.message || '')) {
        throw new Error(
          'Cloudinary authentication failed. Update CLOUDINARY_API_SECRET in the deployed backend with the current secret from the matching Cloudinary account, then redeploy.'
        );
      }
      throw new Error(`Cloud storage upload failed: ${err.message}`);
    }
  }

  // Fallback to local disk storage
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const cleanBaseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${cleanBaseName}${ext}`;
  const targetPath = path.join(UPLOAD_DIR, uniqueName);

  await fs.promises.writeFile(targetPath, file.buffer);
  // Return relative URL that will be served by express static
  return `/uploads/${uniqueName}`;
}
