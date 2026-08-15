import mongoose, { Document, Schema } from 'mongoose';

export interface IStory extends Document {
  userId: mongoose.Types.ObjectId;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  audience: 'PUBLIC' | 'CLOSE_FRIENDS';
  createdAt: Date;
  expiresAt: Date;
}

const storySchema = new Schema<IStory>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  mediaUrl: { type: String, required: true },
  mediaType: { type: String, enum: ['image', 'video'], required: true },
  audience: { type: String, enum: ['PUBLIC', 'CLOSE_FRIENDS'], default: 'PUBLIC' },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) } // 24 hours from now
});

// TTL index to automatically delete documents 24 hours after createdAt
storySchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

export const Story = mongoose.model<IStory>('Story', storySchema);
