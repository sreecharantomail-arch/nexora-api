import mongoose, { Document, Schema } from 'mongoose';

export interface ISavedVideo extends Document {
  userId: mongoose.Types.ObjectId;
  videoId: mongoose.Types.ObjectId;
}

const savedVideoSchema = new Schema<ISavedVideo>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    videoId: { type: Schema.Types.ObjectId, ref: 'Video', required: true },
  },
  {
    timestamps: true,
  }
);

savedVideoSchema.index({ userId: 1, videoId: 1 }, { unique: true });

export const SavedVideo = mongoose.model<ISavedVideo>('SavedVideo', savedVideoSchema);
