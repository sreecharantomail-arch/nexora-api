import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { User } from '../models/User';
import { Video } from '../models/Video';
import { Follow } from '../models/Follow';
import { Report } from '../models/Report';

export const getUserProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username }).select('-password');
    
    if (!user) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    const followersCount = await Follow.countDocuments({ followingId: user._id });
    const followingCount = await Follow.countDocuments({ followerId: user._id });
    
    let isFollowing = false;
    if (req.user) {
      const follow = await Follow.findOne({ followerId: req.user._id, followingId: user._id });
      isFollowing = !!follow;
    }

    res.json({
      success: true,
      data: {
        ...user.toObject(),
        followersCount,
        followingCount,
        isFollowing
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};

export const getUserVideos = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    
    if (!user) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    const videos = await Video.find({ userId: user._id, status: 'published' }).sort({ createdAt: -1 });
    
    res.json({ success: true, data: videos });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};

export const followUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const followingId = req.params.id; // ID of user to follow
    const followerId = req.user!._id; // Current user

    if (followingId === followerId.toString()) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'You cannot follow yourself' } });
      return;
    }

    const existingFollow = await Follow.findOne({ followerId, followingId });
    if (!existingFollow) {
      await Follow.create({ followerId, followingId });
    }

    res.json({ success: true, message: 'Successfully followed user' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};

export const unfollowUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const followingId = req.params.id;
    const followerId = req.user!._id;

    await Follow.findOneAndDelete({ followerId, followingId });

    res.json({ success: true, message: 'Successfully unfollowed user' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};

export const searchUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query = req.query.q as string;
    
    if (!query || query.trim() === '') {
      res.json({ success: true, data: [] });
      return;
    }

    const users = await User.find({
      username: { $regex: query, $options: 'i' }
    })
    .select('username displayName profileImage')
    .limit(20);

    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};

export const blockUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userIdToBlock = req.params.id;
    const currentUserId = req.user!._id;

    if (userIdToBlock === currentUserId.toString()) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'You cannot block yourself' } });
      return;
    }

    await User.findByIdAndUpdate(currentUserId, {
      $addToSet: { blockedUsers: userIdToBlock }
    });

    // Also remove any follow relationships
    await Follow.deleteMany({
      $or: [
        { followerId: currentUserId, followingId: userIdToBlock },
        { followerId: userIdToBlock, followingId: currentUserId }
      ]
    });

    res.json({ success: true, message: 'Successfully blocked user' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};

export const unblockUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userIdToUnblock = req.params.id;
    const currentUserId = req.user!._id;

    await User.findByIdAndUpdate(currentUserId, {
      $pull: { blockedUsers: userIdToUnblock }
    });

    res.json({ success: true, message: 'Successfully unblocked user' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};

export const reportContent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { targetId, targetType, reason } = req.body;
    const reporterId = req.user!._id;

    if (!targetId || !targetType || !reason) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Missing required fields' } });
      return;
    }

    const report = await Report.create({
      reporterId,
      reportedId: targetId,
      targetType,
      reason,
      status: 'pending'
    });

    res.status(201).json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};
