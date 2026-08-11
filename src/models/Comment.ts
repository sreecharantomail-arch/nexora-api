import mongoose, { Document, Schema } from 'mongoose';

export interface IComment extends Document {
  userId: mongoose.Types.ObjectId;
  videoId: mongoose.Types.ObjectId;
  text: string;
}

const commentSchema = new Schema<IComment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    videoId: { type: Schema.Types.ObjectId, ref: 'Video', required: true, index: true },
    text: { type: String, required: true, maxlength: 500 },
  },
  {
    timestamps: true,
  }
);

export const Comment = mongoose.model<IComment>('Comment', commentSchema);
