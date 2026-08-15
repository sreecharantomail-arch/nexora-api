import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { User } from '../models/User';
import { Video } from '../models/Video';
import { Follow } from '../models/Follow';
import { Report } from '../models/Report';
import { Notification } from '../models/Notification';
import cloudinary from '../config/cloudinary';
import streamifier from 'streamifier';

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { displayName, bio } = req.body;
    let profileImage = req.user!.profileImage;

    if (req.file) {
      // Upload new profile image to Cloudinary
      const uploadPromise = new Promise<string>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'nexora/profiles', resource_type: 'image' },
          (error, result) => {
            if (error || !result) reject(error || new Error('Upload failed'));
            else resolve(result.secure_url);
          }
        );
        streamifier.createReadStream(req.file!.buffer).pipe(uploadStream);
      });
      
      try {
        profileImage = await uploadPromise;
      } catch (err) {
        console.error('Cloudinary Profile Image Upload Error:', err);
        res.status(500).json({ success: false, error: { code: 'UPLOAD_FAILED', message: 'Failed to upload image' } });
        return;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user!._id,
      { displayName, bio, profileImage },
      { new: true }
    ).select('-password');

    res.json({ success: true, data: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};

export const getUserProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username } as any).select('-password');
    
    if (!user) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    const followersCount = await Follow.countDocuments({ followingId: user._id });
    const followingCount = await Follow.countDocuments({ followerId: user._id });
    
    let isFollowing = false;
    if (req.user) {
      const follow = await Follow.findOne({ followerId: req.user._id, followingId: user._id } as any);
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
    const user = await User.findOne({ username } as any);
    
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

    const existingFollow = await Follow.findOne({ followerId, followingId } as any);
    if (!existingFollow) {
      await Follow.create({ followerId, followingId } as any);
      
      await Notification.create({
        recipientId: followingId as any,
        senderId: followerId,
        type: 'follow'
      });
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

    await Follow.findOneAndDelete({ followerId, followingId } as any);

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
    } as any);

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

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notifications = await Notification.find({ recipientId: req.user!._id })
      .sort({ createdAt: -1 })
      .populate('senderId', 'username displayName profileImage')
      .populate({
        path: 'videoId',
        select: 'videoUrl thumbnailUrl caption'
      })
      .populate({
        path: 'commentId',
        select: 'text'
      })
      .limit(30);

    // Mark as read (optional, can be a separate route, but we'll do it on fetch for simplicity)
    await Notification.updateMany(
      { recipientId: req.user!._id, read: false },
      { $set: { read: true } }
    );

    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};

export const getCloseFriends = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!._id).populate('closeFriends', 'username displayName profileImage');
    if (!user) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }
    res.json({ success: true, data: user.closeFriends });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};

export const addCloseFriend = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const friendId = req.params.id;
    const currentUserId = req.user!._id;

    if (friendId === currentUserId.toString()) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'You cannot add yourself' } });
      return;
    }

    await User.findByIdAndUpdate(currentUserId, {
      $addToSet: { closeFriends: friendId }
    });

    res.json({ success: true, message: 'Successfully added to close friends' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};

export const removeCloseFriend = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const friendId = req.params.id;
    const currentUserId = req.user!._id;

    await User.findByIdAndUpdate(currentUserId, {
      $pull: { closeFriends: friendId }
    });

    res.json({ success: true, message: 'Successfully removed from close friends' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};
