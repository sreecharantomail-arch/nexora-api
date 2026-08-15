import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { Story } from '../models/Story';
import { Follow } from '../models/Follow';
import cloudinary from '../config/cloudinary';
import streamifier from 'streamifier';
import mongoose from 'mongoose';

export const uploadStory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'No media file provided' } });
      return;
    }

    const { audience = 'PUBLIC' } = req.body;
    const stories = [];

    for (const file of files) {
      const isVideo = file.mimetype.startsWith('video/');
      const resourceType = isVideo ? 'video' : 'image';

      const uploadPromise = new Promise<string>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'nexora/stories', resource_type: resourceType },
          (error, result) => {
            if (error || !result) reject(error || new Error('Upload failed'));
            else resolve(result.secure_url);
          }
        );
        streamifier.createReadStream(file.buffer).pipe(uploadStream);
      });

      const mediaUrl = await uploadPromise;

      const story = await Story.create({
        userId: req.user!._id,
        mediaUrl,
        mediaType: resourceType,
        audience
      });

      await story.populate('userId', 'username displayName profileImage');
      stories.push(story);
    }

    res.status(201).json({ success: true, data: stories });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};

export const getFeedStories = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;

    // Get list of users the current user follows
    const follows = await Follow.find({ followerId: userId }).select('followingId');
    const followingIds = follows.map(f => f.followingId);

    // Include the current user's own stories as well
    followingIds.push(userId as any);

    // Get stories from the last 24 hours (MongoDB TTL index will delete older ones anyway, but just to be safe)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Find which of the users I follow have me in their close friends list
    const User = mongoose.model('User');
    const closeFriendsUsers = await User.find({ _id: { $in: followingIds }, closeFriends: userId }).select('_id');
    const closeFriendOfIds = closeFriendsUsers.map(u => u._id);
    closeFriendOfIds.push(userId as any); // I can always see my own close friends stories

    const stories = await Story.find({
      $or: [
        { userId: { $in: followingIds }, audience: 'PUBLIC', createdAt: { $gte: twentyFourHoursAgo } },
        { userId: { $in: closeFriendOfIds }, audience: 'CLOSE_FRIENDS', createdAt: { $gte: twentyFourHoursAgo } }
      ]
    })
    .sort({ createdAt: 1 })
    .populate('userId', 'username displayName profileImage');

    // Group stories by user
    const groupedStories: any[] = [];
    const userMap = new Map();

    stories.forEach(story => {
      const uId = story.userId._id.toString();
      if (!userMap.has(uId)) {
        userMap.set(uId, {
          user: story.userId,
          stories: []
        });
      }
      userMap.get(uId).stories.push(story);
    });

    // Move current user to the front of the array if they have stories
    const myIdStr = userId.toString();
    if (userMap.has(myIdStr)) {
      groupedStories.push(userMap.get(myIdStr));
      userMap.delete(myIdStr);
    }

    userMap.forEach(group => groupedStories.push(group));

    res.json({ success: true, data: groupedStories });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};
