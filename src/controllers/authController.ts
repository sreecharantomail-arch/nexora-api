import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { User } from '../models/User';

const generateTokens = (id: string) => {
  const accessToken = jwt.sign({ id }, process.env.JWT_SECRET as string, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id }, process.env.JWT_REFRESH_SECRET as string, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, displayName, email, password } = req.body;

    if (typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string' || typeof displayName !== 'string' ||
        username.trim() === '' || email.trim() === '' || password.trim() === '') {
      res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'Username, email, display name, and password are required strings' } });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    const userExists = await User.findOne({ 
      $or: [
        { email: new RegExp(`^${normalizedEmail}$`, 'i') }, 
        { username: new RegExp(`^${username.trim()}$`, 'i') }
      ] 
    });
    if (userExists) {
      res.status(400).json({ success: false, error: { code: 'USER_EXISTS', message: 'User with this email or username already exists' } });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      username: username.trim(),
      displayName: displayName.trim(),
      email: normalizedEmail,
      passwordHash,
    });

    if (user) {
      const { accessToken, refreshToken } = generateTokens((user._id as unknown as string).toString());
      res.status(201).json({
        success: true,
        data: {
          _id: user._id,
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          accessToken,
          refreshToken,
        },
      });
    } else {
      res.status(400).json({ success: false, error: { code: 'INVALID_USER_DATA', message: 'Invalid user data' } });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { emailOrUsername, password } = req.body;

    if (typeof emailOrUsername !== 'string' || typeof password !== 'string' || emailOrUsername.trim() === '' || password.trim() === '') {
      res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'Email/username and password are required strings' } });
      return;
    }

    const normalizedInput = emailOrUsername.trim();

    const user = await User.findOne({
      $or: [
        { email: new RegExp(`^${normalizedInput}$`, 'i') }, 
        { username: new RegExp(`^${normalizedInput}$`, 'i') }
      ],
    });

    if (user && (await user.matchPassword(password))) {
      const { accessToken, refreshToken } = generateTokens((user._id as unknown as string).toString());
      res.json({
        success: true,
        data: {
          _id: user._id,
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          profileImage: user.profileImage,
          accessToken,
          refreshToken,
        },
      });
    } else {
      res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.body;
  if (!token) {
    res.status(401).json({ success: false, error: { code: 'NO_TOKEN', message: 'Not authorized, no refresh token' } });
    return;
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as { id: string };
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.id);
    res.json({ success: true, data: { accessToken, refreshToken: newRefreshToken } });
  } catch (error) {
    res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Not authorized, invalid refresh token' } });
  }
};

export const logoutUser = async (_req: Request, res: Response): Promise<void> => {
  // In a real app, you might want to blacklist the token or remove it from the database if you store them.
  res.json({ success: true, data: { message: 'Logged out successfully' } });
};
