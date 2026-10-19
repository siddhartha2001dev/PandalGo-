import multer from 'multer';

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const maxFileSize = 25 * 1024 * 1024; // 25 MB per image

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file format. Please upload JPEG, PNG, or WEBP images only.'), false);
  }
};

export const uploadSingleImage = multer({
  storage,
  limits: { fileSize: maxFileSize },
  fileFilter,
}).single('image');

export const uploadMultipleImages = multer({
  storage,
  limits: { fileSize: maxFileSize, files: 6 },
  fileFilter,
}).array('images', 6);
