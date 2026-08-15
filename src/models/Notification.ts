import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  recipientId: mongoose.Types.ObjectId; // User receiving the notification
  senderId: mongoose.Types.ObjectId;    // User who triggered it
  type: 'like' | 'comment' | 'follow';
  videoId?: mongoose.Types.ObjectId;    // Associated video (if like/comment)
  commentId?: mongoose.Types.ObjectId;  // Associated comment (if comment)
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['like', 'comment', 'follow'], required: true },
    videoId: { type: Schema.Types.ObjectId, ref: 'Video' },
    commentId: { type: Schema.Types.ObjectId, ref: 'Comment' },
    read: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Index for fast querying of a user's notifications
NotificationSchema.index({ recipientId: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
