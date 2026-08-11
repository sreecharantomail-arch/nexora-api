import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { Video } from '../models/Video';
import cloudinary from '../config/cloudinary';
import streamifier from 'streamifier';
import { Like } from '../models/Like';
import { Comment } from '../models/Comment';
import { SavedVideo } from '../models/SavedVideo';
import { Follow } from '../models/Follow';

export const uploadVideo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { caption, duration, width, height } = req.body;
    
    if (!req.file) {
      res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'No video file provided' } });
      return;
    }

    const durationNum = Number(duration);
    if (durationNum < 30 || durationNum > 59) {
      res.status(400).json({ success: false, error: { code: 'INVALID_DURATION', message: 'Video must be between 30 and 59 seconds.' } });
      return;
    }

    const fileSize = req.file.size;

    // Upload to Cloudinary using stream
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        folder: 'nexora/videos',
      },
      async (error, result) => {
        if (error || !result) {
          res.status(500).json({ success: false, error: { code: 'UPLOAD_FAILED', message: 'Failed to upload video' } });
          return;
        }

        // Create thumbnail URL (Cloudinary auto-generates .jpg from video)
        const thumbnailUrl = result.secure_url.replace('.mp4', '.jpg');

        const video = await Video.create({
          userId: req.user!._id,
          videoUrl: result.secure_url,
          thumbnailUrl,
          caption: caption || '',
          duration: durationNum,
          width: Number(width) || result.width,
          height: Number(height) || result.height,
          fileSize,
          status: 'published'
        });

        res.status(201).json({ success: true, data: video });
      }
    );

    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);

  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};

export const getFeed = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const cursor = req.query.cursor as string;
    
    let query = {};
    if (cursor) {
      query = { _id: { $lt: cursor } }; // Simple cursor pagination using ObjectId
    }

    const videos = await Video.find(query)
      .sort({ _id: -1 }) // newest first
      .limit(limit)
      .populate('userId', 'username displayName profileImage');

    const videoIds = videos.map(v => v._id);
    let userLikedVideoIds = new Set<string>();
    let userSavedVideoIds = new Set<string>();
    
    if (req.user) {
      const likes = await Like.find({
        userId: req.user._id,
        videoId: { $in: videoIds }
      });
      userLikedVideoIds = new Set(likes.map(l => l.videoId.toString()));

      const saves = await SavedVideo.find({
        userId: req.user._id,
        videoId: { $in: videoIds }
      });
      userSavedVideoIds = new Set(saves.map(s => s.videoId.toString()));
    }

    const videosWithLikeStatus = videos.map(v => {
      const videoObj = v.toObject();
      return {
        ...videoObj,
        isLiked: userLikedVideoIds.has(v._id.toString()),
        isSaved: userSavedVideoIds.has(v._id.toString())
      };
    });

    const nextCursor = videos.length === limit ? videos[videos.length - 1]?._id : null;

    res.json({
      success: true,
      data: {
        videos: videosWithLikeStatus,
        nextCursor
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};

export const getFollowingFeed = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const cursor = req.query.cursor as string;
    const userId = req.user!._id;
    
    // Get list of user IDs the current user is following
    const following = await Follow.find({ followerId: userId });
    const followingIds = following.map(f => f.followingId);
    
    if (followingIds.length === 0) {
      res.json({ success: true, data: { videos: [], nextCursor: null } });
      return;
    }

    let query: any = { userId: { $in: followingIds }, status: 'published' };
    if (cursor) {
      query._id = { $lt: cursor };
    }

    const videos = await Video.find(query)
      .sort({ _id: -1 })
      .limit(limit)
      .populate('userId', 'username displayName profileImage');

    const videoIds = videos.map(v => v._id);
    const likes = await Like.find({ userId, videoId: { $in: videoIds } });
    const userLikedVideoIds = new Set(likes.map(l => l.videoId.toString()));

    const saves = await SavedVideo.find({ userId, videoId: { $in: videoIds } });
    const userSavedVideoIds = new Set(saves.map(s => s.videoId.toString()));

    const videosWithLikeStatus = videos.map(v => {
      const videoObj = v.toObject();
      return {
        ...videoObj,
        isLiked: userLikedVideoIds.has(v._id.toString()),
        isSaved: userSavedVideoIds.has(v._id.toString())
      };
    });

    const nextCursor = videos.length === limit ? videos[videos.length - 1]?._id : null;

    res.json({
      success: true,
      data: {
        videos: videosWithLikeStatus,
        nextCursor
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};

export const likeVideo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const videoId = req.params.id;
    const userId = req.user!._id;

    const existingLike = await Like.findOne({ videoId, userId } as any);
    
    if (!existingLike) {
      await Like.create({ videoId, userId } as any);
      await Video.findByIdAndUpdate(videoId, { $inc: { likesCount: 1 } });
    }

    res.json({ success: true, message: 'Video liked' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};

export const unlikeVideo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const videoId = req.params.id;
    const userId = req.user!._id;

    const deletedLike = await Like.findOneAndDelete({ videoId, userId } as any);
    
    if (deletedLike) {
      await Video.findByIdAndUpdate(videoId, { $inc: { likesCount: -1 } });
    }

    res.json({ success: true, message: 'Video unliked' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};

export const getComments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const videoId = req.params.id;
    const comments = await Comment.find({ videoId } as any)
      .sort({ createdAt: -1 })
      .populate('userId', 'username displayName profileImage');
    res.json({ success: true, data: comments });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};

export const addComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const videoId = req.params.id;
    const userId = req.user!._id;
    const { text } = req.body;

    if (!text || text.trim() === '') {
      res.status(400).json({ success: false, error: { code: 'INVALID_COMMENT', message: 'Comment cannot be empty' } });
      return;
    }

    const comment = await Comment.create({ videoId, userId, text } as any);
    await Video.findByIdAndUpdate(videoId, { $inc: { commentsCount: 1 } });
    
    await comment.populate('userId', 'username displayName profileImage');

    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};

export const deleteComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const commentId = req.params.id;
    const userId = req.user!._id;

    const comment = await Comment.findOneAndDelete({ _id: commentId, userId } as any);
    if (comment) {
      await Video.findByIdAndUpdate(comment.videoId, { $inc: { commentsCount: -1 } });
    }

    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};

export const saveVideo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const videoId = req.params.id;
    const userId = req.user!._id;

    const existingSave = await SavedVideo.findOne({ videoId, userId } as any);
    if (!existingSave) {
      await SavedVideo.create({ videoId, userId } as any);
    }

    res.json({ success: true, message: 'Video saved' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};

export const unsaveVideo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const videoId = req.params.id;
    const userId = req.user!._id;

    await SavedVideo.findOneAndDelete({ videoId, userId } as any);

    res.json({ success: true, message: 'Video unsaved' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};
