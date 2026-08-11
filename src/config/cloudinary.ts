import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.STORAGE_BUCKET || 'demo',
  api_key: process.env.STORAGE_API_KEY || '1234567890',
  api_secret: process.env.STORAGE_API_SECRET || 'secret',
});

export default cloudinary;
