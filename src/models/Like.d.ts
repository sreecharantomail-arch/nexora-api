import mongoose, { Document } from 'mongoose';
export interface ILike extends Document {
    userId: mongoose.Types.ObjectId;
    videoId: mongoose.Types.ObjectId;
}
export declare const Like: mongoose.Model<ILike, {}, {}, {}, Document<unknown, {}, ILike, {}, mongoose.DefaultSchemaOptions> & ILike & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ILike>;
//# sourceMappingURL=Like.d.ts.map