import mongoose, { Document, Schema } from 'mongoose';

export interface ILike extends Document {
  userId: mongoose.Types.ObjectId;
  videoId: mongoose.Types.ObjectId;
}

const likeSchema = new Schema<ILike>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    videoId: { type: Schema.Types.ObjectId, ref: 'Video', required: true },
  },
  {
    timestamps: true,
  }
);

// Enforce unique likes
likeSchema.index({ userId: 1, videoId: 1 }, { unique: true });

export const Like = mongoose.model<ILike>('Like', likeSchema);
