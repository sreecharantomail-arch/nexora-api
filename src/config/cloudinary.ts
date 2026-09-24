import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const cloudName = process.env.STORAGE_BUCKET;
const apiKey = process.env.STORAGE_API_KEY;
const apiSecret = process.env.STORAGE_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  throw new Error('Missing required Cloudinary environment variables (STORAGE_BUCKET, STORAGE_API_KEY, STORAGE_API_SECRET)');
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

export default cloudinary;
