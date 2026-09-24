import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Video } from '../models/Video';
import path from 'path';

interface MongoWinningPlan {
  stage?: string;
  indexName?: string;
  inputStage?: MongoWinningPlan;
}

interface MongoExplainResult {
  queryPlanner?: {
    winningPlan?: MongoWinningPlan;
  };
  executionStats?: {
    totalDocsExamined?: number;
    totalKeysExamined?: number;
    executionTimeMillis?: number;
  };
}

// Load .env from the server root
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function runExplain() {
  try {
    console.log('Connecting to MongoDB...');
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env');
    }
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected.\n');

    console.log('--- Explaining Global Feed Query (For You) ---');
    console.log('Query: Video.find({ status: "published" }).sort({ createdAt: -1 }).limit(10)');
    const globalFeedQuery = Video.find({ status: 'published' }).sort({ createdAt: -1 }).limit(10);
    
    const globalStats = (await globalFeedQuery.explain('executionStats')) as unknown as MongoExplainResult;
    
    // Safely extract index info depending on Mongo version shape
    const winningPlan1 = globalStats.queryPlanner?.winningPlan;
    const indexName1 = winningPlan1?.inputStage?.indexName || winningPlan1?.inputStage?.inputStage?.indexName || winningPlan1?.indexName || 'COLLSCAN (No Index)';
    
    console.log('Index used:', indexName1);
    console.log('Total docs examined:', globalStats.executionStats?.totalDocsExamined);
    console.log('Total keys examined:', globalStats.executionStats?.totalKeysExamined);
    console.log('Execution time (ms):', globalStats.executionStats?.executionTimeMillis);

    console.log('\n--- Explaining Following Feed Query ---');
    const dummyId = new mongoose.Types.ObjectId();
    console.log(`Query: Video.find({ userId: { $in: [${dummyId}] }, status: "published" }).sort({ _id: -1 }).limit(10)`);
    // Note: getFollowingFeed sorts by _id: -1, not createdAt
    const followingFeedQuery = Video.find({ userId: { $in: [dummyId] }, status: 'published' }).sort({ _id: -1 }).limit(10);
    
    const followingStats = (await followingFeedQuery.explain('executionStats')) as unknown as MongoExplainResult;
    
    const winningPlan2 = followingStats.queryPlanner?.winningPlan;
    const indexName2 = winningPlan2?.inputStage?.indexName || winningPlan2?.inputStage?.inputStage?.indexName || winningPlan2?.indexName || 'COLLSCAN (No Index)';

    console.log('Index used:', indexName2);
    console.log('Total docs examined:', followingStats.executionStats?.totalDocsExamined);
    console.log('Total keys examined:', followingStats.executionStats?.totalKeysExamined);
    console.log('Execution time (ms):', followingStats.executionStats?.executionTimeMillis);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected.');
  }
}

runExplain();
