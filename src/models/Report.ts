import mongoose, { Document, Schema } from 'mongoose';

export interface IReport extends Document {
  reporterId: mongoose.Types.ObjectId;
  reportedId: mongoose.Types.ObjectId; // User, Video, or Comment ID
  targetType: 'user' | 'video' | 'comment';
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
}

const reportSchema = new Schema<IReport>(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reportedId: { type: Schema.Types.ObjectId, required: true },
    targetType: { type: String, enum: ['user', 'video', 'comment'], required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['pending', 'reviewed', 'resolved', 'dismissed'], default: 'pending' },
  },
  {
    timestamps: true,
  }
);

export const Report = mongoose.model<IReport>('Report', reportSchema);
