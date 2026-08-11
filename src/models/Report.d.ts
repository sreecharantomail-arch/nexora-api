import mongoose, { Document } from 'mongoose';
export interface IReport extends Document {
    reporterId: mongoose.Types.ObjectId;
    reportedId: mongoose.Types.ObjectId;
    targetType: 'user' | 'video' | 'comment';
    reason: string;
    status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
}
export declare const Report: mongoose.Model<IReport, {}, {}, {}, Document<unknown, {}, IReport, {}, mongoose.DefaultSchemaOptions> & IReport & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IReport>;
//# sourceMappingURL=Report.d.ts.map