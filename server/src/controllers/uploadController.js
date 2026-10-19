import { processAndStoreFile } from '../services/storageService.js';

export async function uploadImages(req, res, next) {
  try {
    if (!req.files || req.files.length === 0) {
      // Check if single file
      if (req.file) {
        const url = await processAndStoreFile(req.file);
        return res.json({
          success: true,
          urls: [url],
          url,
        });
      }
      return res.status(400).json({
        success: false,
        message: 'No image files provided for upload.',
      });
    }

    const urls = await Promise.all(req.files.map((file) => processAndStoreFile(file)));

    res.json({
      success: true,
      count: urls.length,
      urls,
    });
  } catch (err) {
    next(err);
  }
}
