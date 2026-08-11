import mongoose, { Document, Schema } from 'mongoose';

export interface IVideo extends Document {
  userId: mongoose.Types.ObjectId;
  videoUrl: string;
  thumbnailUrl: string;
  caption?: string;
  duration: number; // in seconds
  width: number;
  height: number;
  fileSize: number; // in bytes
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  status: 'processing' | 'published' | 'blocked' | 'removed';
}

const videoSchema = new Schema<IVideo>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    videoUrl: { type: String, required: true },
    thumbnailUrl: { type: String, required: true },
    caption: { type: String, default: '', maxlength: 2000 },
    duration: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    fileSize: { type: Number, required: true },
    viewsCount: { type: Number, default: 0 },
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
    status: { type: String, enum: ['processing', 'published', 'blocked', 'removed'], default: 'processing', index: true },
  },
  {
    timestamps: true,
  }
);

export const Video = mongoose.model<IVideo>('Video', videoSchema);
