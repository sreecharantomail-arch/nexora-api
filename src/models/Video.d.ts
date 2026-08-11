import mongoose, { Document } from 'mongoose';
export interface IVideo extends Document {
    userId: mongoose.Types.ObjectId;
    videoUrl: string;
    thumbnailUrl: string;
    caption?: string;
    duration: number;
    width: number;
    height: number;
    fileSize: number;
    viewsCount: number;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    status: 'processing' | 'published' | 'blocked' | 'removed';
}
export declare const Video: mongoose.Model<IVideo, {}, {}, {}, Document<unknown, {}, IVideo, {}, mongoose.DefaultSchemaOptions> & IVideo & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IVideo>;
//# sourceMappingURL=Video.d.ts.map