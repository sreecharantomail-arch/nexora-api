import mongoose, { Document } from 'mongoose';
export interface IComment extends Document {
    userId: mongoose.Types.ObjectId;
    videoId: mongoose.Types.ObjectId;
    text: string;
}
export declare const Comment: mongoose.Model<IComment, {}, {}, {}, Document<unknown, {}, IComment, {}, mongoose.DefaultSchemaOptions> & IComment & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IComment>;
//# sourceMappingURL=Comment.d.ts.map