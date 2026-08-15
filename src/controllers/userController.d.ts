import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
export declare const getUserProfile: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getUserVideos: (req: AuthRequest, res: Response) => Promise<void>;
export declare const followUser: (req: AuthRequest, res: Response) => Promise<void>;
export declare const unfollowUser: (req: AuthRequest, res: Response) => Promise<void>;
export declare const searchUsers: (req: AuthRequest, res: Response) => Promise<void>;
export declare const blockUser: (req: AuthRequest, res: Response) => Promise<void>;
export declare const unblockUser: (req: AuthRequest, res: Response) => Promise<void>;
export declare const reportContent: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=userController.d.ts.map