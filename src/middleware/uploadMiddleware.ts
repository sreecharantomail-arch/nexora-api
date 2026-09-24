import multer from 'multer';

// Use memory storage for buffer stream upload to Cloudinary
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/3gpp',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/octet-stream'
];

export const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB max per file
  },
  fileFilter: (_req, file, cb) => {
    const isMimeOk = ALLOWED_MIME_TYPES.includes(file.mimetype) || file.mimetype.startsWith('video/') || file.mimetype.startsWith('image/');
    const isExtOk = /\.(mp4|mov|webm|3gp|jpg|jpeg|png|webp|gif)$/i.test(file.originalname);
    if (isMimeOk || isExtOk) {
      cb(null, true);
    } else {
      cb(new Error('UNSUPPORTED_MEDIA: Only valid video and image files are allowed'));
    }
  },
});
