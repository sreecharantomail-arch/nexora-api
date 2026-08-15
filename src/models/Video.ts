import mongoose, { Document, Schema } from 'mongoose';

export interface IVideo extends Document {
  userId: mongoose.Types.ObjectId;
  videoUrl?: string;
  thumbnailUrl?: string;
  mediaType?: 'video' | 'image';
  media?: {
    url: string;
    thumbnailUrl: string;
    type: 'video' | 'image';
    duration?: number;
    width?: number;
    height?: number;
  }[];
  caption?: string;
  hashtags?: string[];
  duration?: number; // legacy
  width?: number; // legacy
  height?: number; // legacy
  fileSize?: number; // in bytes
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  status: 'processing' | 'published' | 'blocked' | 'removed';
}

const videoSchema = new Schema<IVideo>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    videoUrl: { type: String },
    thumbnailUrl: { type: String },
    mediaType: { type: String, enum: ['video', 'image'] },
    media: [{
      url: { type: String, required: true },
      thumbnailUrl: { type: String, required: true },
      type: { type: String, enum: ['video', 'image'], required: true },
      duration: { type: Number },
      width: { type: Number },
      height: { type: Number }
    }],
    caption: { type: String, default: '', maxlength: 2000 },
    hashtags: [{ type: String }],
    duration: { type: Number },
    width: { type: Number },
    height: { type: Number },
    fileSize: { type: Number },
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
