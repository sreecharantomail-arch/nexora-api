import mongoose, { Document } from 'mongoose';
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
    matchPassword(enteredPassword: string): Promise<boolean>;
}
export declare const User: mongoose.Model<IUser, {}, {}, {}, Document<unknown, {}, IUser, {}, mongoose.DefaultSchemaOptions> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IUser>;
//# sourceMappingURL=User.d.ts.map