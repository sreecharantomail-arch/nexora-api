import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri && process.env.NODE_ENV === 'production') {
    logger.error('CRITICAL: MONGODB_URI environment variable is missing in production. Terminating process.');
    process.exit(1);
  }

  try {
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables.');
    }
    const conn = await mongoose.connect(mongoUri);
    logger.info(`MongoDB Connected (Atlas / Remote): ${conn.connection.host} [PERSISTENT DATABASE]`);
  } catch (error) {
    logger.error(`Error connecting to Primary MongoDB: ${(error as Error).message}`);
    
    if (process.env.NODE_ENV === 'production') {
      logger.error('CRITICAL: Database connection failed in production environment. Terminating process immediately.');
      process.exit(1);
    }
    
    logger.warn('⚠️ WARNING: Primary MongoDB unavailable. Falling back to MongoMemoryServer for local development.');
    logger.warn('⚠️ NOTICE: Data stored in MongoMemoryServer IS TEMPORARY AND WILL NOT PERSIST across server restarts!');
    
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      const conn = await mongoose.connect(uri);
      logger.info(`MongoDB Memory Server Connected: ${conn.connection.host} [TEMPORARY IN-MEMORY DB]`);
    } catch (fallbackError) {
      logger.error(`Error starting MongoMemoryServer fallback: ${(fallbackError as Error).message}`);
      process.exit(1);
    }
  }
};
