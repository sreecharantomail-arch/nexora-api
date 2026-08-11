import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token as string, process.env.JWT_SECRET || '') as unknown as { id: string };
      const user = await User.findById(decoded.id).select('-passwordHash');

      if (!user) {
        res.status(401).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'Not authorized, user not found' } });
        return;
      }

      if (user.status !== 'active') {
         res.status(403).json({ success: false, error: { code: 'ACCOUNT_INACTIVE', message: 'Account is suspended or deleted' } });
         return;
      }

      req.user = user;
      next();
    } catch (error) {
      res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Not authorized, token failed' } });
    }
  } else {
    res.status(401).json({ success: false, error: { code: 'NO_TOKEN', message: 'Not authorized, no token' } });
  }
};
