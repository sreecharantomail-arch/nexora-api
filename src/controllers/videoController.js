"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unsaveVideo = exports.saveVideo = exports.deleteComment = exports.addComment = exports.getComments = exports.unlikeVideo = exports.likeVideo = exports.getFeed = exports.uploadVideo = void 0;
const Video_1 = require("../models/Video");
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
const streamifier_1 = __importDefault(require("streamifier"));
const Like_1 = require("../models/Like");
const Comment_1 = require("../models/Comment");
const SavedVideo_1 = require("../models/SavedVideo");
const uploadVideo = async (req, res) => {
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
        const uploadStream = cloudinary_1.default.uploader.upload_stream({
            resource_type: 'video',
            folder: 'nexora/videos',
        }, async (error, result) => {
            if (error || !result) {
                res.status(500).json({ success: false, error: { code: 'UPLOAD_FAILED', message: 'Failed to upload video' } });
                return;
            }
            // Create thumbnail URL (Cloudinary auto-generates .jpg from video)
            const thumbnailUrl = result.secure_url.replace('.mp4', '.jpg');
            const video = await Video_1.Video.create({
                userId: req.user._id,
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
        });
        streamifier_1.default.createReadStream(req.file.buffer).pipe(uploadStream);
    }
    catch (error) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
    }
};
exports.uploadVideo = uploadVideo;
const getFeed = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const cursor = req.query.cursor;
        let query = {};
        if (cursor) {
            query = { _id: { $lt: cursor } }; // Simple cursor pagination using ObjectId
        }
        const videos = await Video_1.Video.find(query)
            .sort({ _id: -1 }) // newest first
            .limit(limit)
            .populate('userId', 'username displayName profileImage');
        const videoIds = videos.map(v => v._id);
        let userLikedVideoIds = new Set();
        let userSavedVideoIds = new Set();
        if (req.user) {
            const likes = await Like_1.Like.find({
                userId: req.user._id,
                videoId: { $in: videoIds }
            });
            userLikedVideoIds = new Set(likes.map(l => l.videoId.toString()));
            const saves = await SavedVideo_1.SavedVideo.find({
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
        const nextCursor = videos.length === limit ? videos[videos.length - 1]._id : null;
        res.json({
            success: true,
            data: {
                videos: videosWithLikeStatus,
                nextCursor
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
    }
};
exports.getFeed = getFeed;
const likeVideo = async (req, res) => {
    try {
        const videoId = req.params.id;
        const userId = req.user._id;
        const existingLike = await Like_1.Like.findOne({ videoId, userId });
        if (!existingLike) {
            await Like_1.Like.create({ videoId, userId });
            await Video_1.Video.findByIdAndUpdate(videoId, { $inc: { likesCount: 1 } });
        }
        res.json({ success: true, message: 'Video liked' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
    }
};
exports.likeVideo = likeVideo;
const unlikeVideo = async (req, res) => {
    try {
        const videoId = req.params.id;
        const userId = req.user._id;
        const deletedLike = await Like_1.Like.findOneAndDelete({ videoId, userId });
        if (deletedLike) {
            await Video_1.Video.findByIdAndUpdate(videoId, { $inc: { likesCount: -1 } });
        }
        res.json({ success: true, message: 'Video unliked' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
    }
};
exports.unlikeVideo = unlikeVideo;
const getComments = async (req, res) => {
    try {
        const videoId = req.params.id;
        const comments = await Comment_1.Comment.find({ videoId })
            .sort({ createdAt: -1 })
            .populate('userId', 'username displayName profileImage');
        res.json({ success: true, data: comments });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
    }
};
exports.getComments = getComments;
const addComment = async (req, res) => {
    try {
        const videoId = req.params.id;
        const userId = req.user._id;
        const { text } = req.body;
        if (!text || text.trim() === '') {
            res.status(400).json({ success: false, error: { code: 'INVALID_COMMENT', message: 'Comment cannot be empty' } });
            return;
        }
        const comment = await Comment_1.Comment.create({ videoId, userId, text });
        await Video_1.Video.findByIdAndUpdate(videoId, { $inc: { commentsCount: 1 } });
        await comment.populate('userId', 'username displayName profileImage');
        res.status(201).json({ success: true, data: comment });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
    }
};
exports.addComment = addComment;
const deleteComment = async (req, res) => {
    try {
        const commentId = req.params.id;
        const userId = req.user._id;
        const comment = await Comment_1.Comment.findOneAndDelete({ _id: commentId, userId });
        if (comment) {
            await Video_1.Video.findByIdAndUpdate(comment.videoId, { $inc: { commentsCount: -1 } });
        }
        res.json({ success: true, message: 'Comment deleted' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
    }
};
exports.deleteComment = deleteComment;
const saveVideo = async (req, res) => {
    try {
        const videoId = req.params.id;
        const userId = req.user._id;
        const existingSave = await SavedVideo_1.SavedVideo.findOne({ videoId, userId });
        if (!existingSave) {
            await SavedVideo_1.SavedVideo.create({ videoId, userId });
        }
        res.json({ success: true, message: 'Video saved' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
    }
};
exports.saveVideo = saveVideo;
const unsaveVideo = async (req, res) => {
    try {
        const videoId = req.params.id;
        const userId = req.user._id;
        await SavedVideo_1.SavedVideo.findOneAndDelete({ videoId, userId });
        res.json({ success: true, message: 'Video unsaved' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
    }
};
exports.unsaveVideo = unsaveVideo;
//# sourceMappingURL=videoController.js.map