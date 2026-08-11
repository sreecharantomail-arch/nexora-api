import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
export declare const uploadVideo: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getFeed: (req: AuthRequest, res: Response) => Promise<void>;
export declare const likeVideo: (req: AuthRequest, res: Response) => Promise<void>;
export declare const unlikeVideo: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getComments: (req: AuthRequest, res: Response) => Promise<void>;
export declare const addComment: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteComment: (req: AuthRequest, res: Response) => Promise<void>;
export declare const saveVideo: (req: AuthRequest, res: Response) => Promise<void>;
export declare const unsaveVideo: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=videoController.d.ts.map