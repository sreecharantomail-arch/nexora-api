import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { User } from '../models/User';
import { Video } from '../models/Video';
import { Follow } from '../models/Follow';
import { Report } from '../models/Report';
import { Notification } from '../models/Notification';
import { Story } from '../models/Story';
import { Like } from '../models/Like';
import { SavedVideo } from '../models/SavedVideo';
import { Comment } from '../models/Comment';
import { Message } from '../models/Message';
import cloudinary from '../config/cloudinary';
import streamifier from 'streamifier';

export const getCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!._id).select('-passwordHash');
    if (!user) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    const followersCount = await Follow.countDocuments({ followingId: user._id });
    const followingCount = await Follow.countDocuments({ followerId: user._id });

    res.json({
      success: true,
      data: {
        ...user.toObject(),
        followersCount,
        followingCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};

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
    ).select('-passwordHash');

    res.json({ success: true, data: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};

export const getUserProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username } as any).select('-passwordHash');
    
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
    const targetUser = await User.findOne({ username } as any);
    
    if (!targetUser) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    const currentUserId = req.user?._id;

    if (currentUserId) {
      const currentUserIdStr = currentUserId.toString();
      const targetUserIdStr = targetUser._id.toString();

      // BUG-04: Bidirectional Block Check
      const isBlockedByTarget = targetUser.blockedUsers && targetUser.blockedUsers.some((id: any) => id.toString() === currentUserIdStr);
      const isTargetBlockedByCurrent = req.user?.blockedUsers && req.user.blockedUsers.some((id: any) => id.toString() === targetUserIdStr);

      if (isBlockedByTarget || isTargetBlockedByCurrent) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied: user is blocked' } });
        return;
      }

      // BUG-03: Private Account Authorization Check
      if (targetUser.isPrivate && currentUserIdStr !== targetUserIdStr) {
        const isFollower = await Follow.findOne({ followerId: currentUserId, followingId: targetUser._id } as any);
        if (!isFollower) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'This account is private' } });
          return;
        }
      }
    } else if (targetUser.isPrivate) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'This account is private' } });
      return;
    }

    const videos = await Video.find({ userId: targetUser._id, status: 'published' }).sort({ createdAt: -1 });
    
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
      
      await User.findByIdAndUpdate(followerId, { $inc: { followingCount: 1 } });
      await User.findByIdAndUpdate(followingId, { $inc: { followersCount: 1 } });

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

    const deleted = await Follow.findOneAndDelete({ followerId, followingId } as any);
    if (deleted) {
      await User.findByIdAndUpdate(followerId, { $inc: { followingCount: -1 } });
      await User.findByIdAndUpdate(followingId, { $inc: { followersCount: -1 } });
    }

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

    if (typeof targetId !== 'string' || typeof targetType !== 'string' || typeof reason !== 'string' || 
        targetId.trim() === '' || targetType.trim() === '' || reason.trim() === '') {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'targetId, targetType, and reason must be valid non-empty strings' } });
      return;
    }

    if (!['video', 'comment', 'user'].includes(targetType)) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'targetType must be video, comment, or user' } });
      return;
    }

    const report = await Report.create({
      reporterId,
      reportedId: targetId,
      targetType: targetType as 'video' | 'comment' | 'user',
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

    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};

export const markNotificationRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notificationId = req.params.id;
    await Notification.findOneAndUpdate(
      { _id: notificationId, recipientId: req.user!._id } as any,
      { $set: { read: true } }
    );
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};

export const markAllNotificationsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Notification.updateMany(
      { recipientId: req.user!._id, read: false },
      { $set: { read: true } }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
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

const getCloudinaryPublicId = (url: string) => {
  try {
    if (!url || typeof url !== 'string') return null;
    const parts = url.split('/upload/');
    if (parts.length < 2 || !parts[1]) return null;
    const pathPart = parts[1].replace(/^v\d+\//, '');
    const lastDotIndex = pathPart.lastIndexOf('.');
    return lastDotIndex !== -1 ? pathPart.substring(0, lastDotIndex) : pathPart;
  } catch {
    return null;
  }
};

export const deleteAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;

    // 1. Delete user profile image from Cloudinary
    if (req.user?.profileImage && req.user.profileImage.includes('cloudinary.com')) {
      const publicId = getCloudinaryPublicId(req.user.profileImage);
      if (publicId) {
        try { await cloudinary.uploader.destroy(publicId); } catch (e) { console.error('Cloudinary profile image delete error:', e); }
      }
    }

    // 2. Find and delete user videos and their Cloudinary media
    const userVideos = await Video.find({ userId });
    for (const video of userVideos) {
      const itemsToDelete: { url: string; type: string }[] = [];
      if (video.media && video.media.length > 0) {
        for (const m of video.media) {
          if (m && m.url) itemsToDelete.push({ url: m.url, type: m.type });
        }
      } else if (video.videoUrl) {
        itemsToDelete.push({ url: video.videoUrl, type: video.mediaType || 'video' });
      }

      for (const item of itemsToDelete) {
        const publicId = getCloudinaryPublicId(item.url);
        if (publicId) {
          try {
            await cloudinary.uploader.destroy(publicId, { resource_type: item.type === 'image' ? 'image' : 'video' });
          } catch (e) {
            console.error('Cloudinary video asset delete error:', e);
          }
        }
      }
    }
    await Video.deleteMany({ userId });

    // 3. Find and delete user stories and their Cloudinary media
    const userStories = await Story.find({ userId });
    for (const story of userStories) {
      if (story.mediaUrl) {
        const publicId = getCloudinaryPublicId(story.mediaUrl);
        if (publicId) {
          try {
            await cloudinary.uploader.destroy(publicId, { resource_type: story.mediaType === 'image' ? 'image' : 'video' });
          } catch (e) {
            console.error('Cloudinary story asset delete error:', e);
          }
        }
      }
    }
    await Story.deleteMany({ userId });

    // 4. Delete associated data records across all collections
    await Like.deleteMany({ userId });
    await SavedVideo.deleteMany({ userId });
    await Follow.deleteMany({ $or: [{ followerId: userId }, { followingId: userId }] } as any);
    await Comment.deleteMany({ userId });
    await Notification.deleteMany({ $or: [{ recipientId: userId }, { senderId: userId }] } as any);
    await Message.deleteMany({ senderId: userId });
    await Report.deleteMany({ reporterId: userId });

    // 5. Delete User document
    await User.findByIdAndDelete(userId);

    res.json({ success: true, message: 'Account and associated data deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};

