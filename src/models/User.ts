import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUser extends Document {
  username: string;
  displayName: string;
  email: string;
  passwordHash: string;
  profileImage?: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
  videoCount: number;
  isPrivate: boolean;
  isVerified: boolean;
  role: 'user' | 'moderator' | 'admin';
  status: 'active' | 'suspended' | 'deleted';
  blockedUsers: mongoose.Types.ObjectId[];
  closeFriends: mongoose.Types.ObjectId[];
  matchPassword(enteredPassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    displayName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    profileImage: { type: String, default: '' },
    bio: { type: String, default: '' },
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    videoCount: { type: Number, default: 0 },
    isPrivate: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    role: { type: String, enum: ['user', 'moderator', 'admin'], default: 'user' },
    status: { type: String, enum: ['active', 'suspended', 'deleted'], default: 'active' },
    blockedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    closeFriends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  {
    timestamps: true,
  }
);

userSchema.methods.matchPassword = async function (enteredPassword: string) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

export const User = mongoose.model<IUser>('User', userSchema);
