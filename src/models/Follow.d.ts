import mongoose, { Document } from 'mongoose';
export interface IFollow extends Document {
    followerId: mongoose.Types.ObjectId;
    followingId: mongoose.Types.ObjectId;
}
export declare const Follow: mongoose.Model<IFollow, {}, {}, {}, Document<unknown, {}, IFollow, {}, mongoose.DefaultSchemaOptions> & IFollow & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IFollow>;
//# sourceMappingURL=Follow.d.ts.map