import mongoose, { Document } from 'mongoose';
export interface ISavedVideo extends Document {
    userId: mongoose.Types.ObjectId;
    videoId: mongoose.Types.ObjectId;
}
export declare const SavedVideo: mongoose.Model<ISavedVideo, {}, {}, {}, Document<unknown, {}, ISavedVideo, {}, mongoose.DefaultSchemaOptions> & ISavedVideo & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ISavedVideo>;
//# sourceMappingURL=SavedVideo.d.ts.map