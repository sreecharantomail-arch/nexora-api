import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { Video } from '../models/Video';
import cloudinary from '../config/cloudinary';
import streamifier from 'streamifier';
import { Like } from '../models/Like';
import { Comment } from '../models/Comment';
import { SavedVideo } from '../models/SavedVideo';
import { Follow } from '../models/Follow';
import { Notification } from '../models/Notification';

export const uploadVideo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { caption } = req.body;
    
    // For arrays in FormData, express body-parser usually gives an array if appended multiple times,
    // or a single string if appended once. Let's normalize them to arrays.
    const normalizeArray = (val: any) => (Array.isArray(val) ? val : val !== undefined ? [val] : []);
    const durations = normalizeArray(req.body.duration);
    const widths = normalizeArray(req.body.width);
    const heights = normalizeArray(req.body.height);

    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'No media files provided' } });
      return;
    }

    // Upload all files concurrently
    const uploadPromises = files.map((file, index) => {
      const isImage = file.mimetype.startsWith('image/');
      
      return new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: isImage ? 'image' : 'video',
            folder: 'nexora/posts',
          },
          (error, result) => {
            if (error || !result) {
              reject(error || new Error('Upload failed'));
            } else {
              const thumbnailUrl = isImage ? result.secure_url : result.secure_url.replace('.mp4', '.jpg');
              resolve({
                url: result.secure_url,
                thumbnailUrl,
                type: isImage ? 'image' : 'video',
                duration: isImage ? 0 : Number(durations[index]) || 0,
                width: Number(widths[index]) || result.width,
                height: Number(heights[index]) || result.height,
              });
            }
          }
        );
        streamifier.createReadStream(file.buffer).pipe(uploadStream);
      });
    });

    const uploadedMedia = await Promise.all(uploadPromises);

    // Extract hashtags from caption
    const extractedHashtags = caption ? (caption.match(/#(\w+)/g) || []).map((t: string) => t.substring(1).toLowerCase()) : [];

    // Fallbacks for legacy clients reading the first item directly
    const firstMedia = uploadedMedia[0];

    const video = await Video.create({
      userId: req.user!._id,
      media: uploadedMedia,
      // Legacy fields
      videoUrl: firstMedia.url,
      thumbnailUrl: firstMedia.thumbnailUrl,
      mediaType: firstMedia.type,
      duration: firstMedia.duration,
      width: firstMedia.width,
      height: firstMedia.height,
      fileSize: (files as any)?.[0]?.size || 0,
      
      caption: caption || '',
      hashtags: extractedHashtags,
      status: 'published'
    });

    res.status(201).json({ success: true, data: video });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};

export const getVideo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const video = await Video.findById(req.params.id).populate('userId', 'username displayName profileImage');
    if (!video) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Video not found' } });
      return;
    }

    let isLiked = false;
    let isSaved = false;

    if (req.user) {
      const like = await Like.findOne({ userId: req.user._id, videoId: video._id });
      isLiked = !!like;
      
      const save = await SavedVideo.findOne({ userId: req.user._id, videoId: video._id });
      isSaved = !!save;
    }

    res.json({
      success: true,
      data: {
        ...video.toObject(),
        isLiked,
        isSaved
      }
    });
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

export const getExploreFeed = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 21; // Multiple of 3 for the grid
    const skip = parseInt(req.query.skip as string) || 0; // Pagination by offset since we sort by likes
    
    const videos = await Video.find({ status: 'published' })
      .sort({ likesCount: -1, createdAt: -1 }) // most popular first
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username displayName profileImage');

    // We only need the basic video objects for the explore grid (thumbnail, ID)
    res.json({
      success: true,
      data: videos
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};

export const getFeedByHashtag = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { hashtag } = req.params;
    const limit = parseInt(req.query.limit as string) || 21;
    const skip = parseInt(req.query.skip as string) || 0;
    
    const videos = await Video.find({ 
      status: 'published',
      hashtags: (hashtag as string).toLowerCase()
    })
      .sort({ _id: -1 }) // newest first
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username displayName profileImage');

    res.json({
      success: true,
      data: videos
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
      const updatedVideo = await Video.findByIdAndUpdate(videoId, { $inc: { likesCount: 1 } });
      
      if (updatedVideo && updatedVideo.userId.toString() !== userId.toString()) {
        await Notification.create({
          recipientId: updatedVideo.userId,
          senderId: userId,
          type: 'like',
          videoId: updatedVideo._id
        });
      }
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
    const updatedVideo = await Video.findByIdAndUpdate(videoId, { $inc: { commentsCount: 1 } });
    
    if (updatedVideo && updatedVideo.userId.toString() !== userId.toString()) {
      await Notification.create({
        recipientId: updatedVideo.userId,
        senderId: userId,
        type: 'comment',
        videoId: updatedVideo._id,
        commentId: comment._id
      });
    }
    
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
