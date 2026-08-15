"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportContent = exports.unblockUser = exports.blockUser = exports.searchUsers = exports.unfollowUser = exports.followUser = exports.getUserVideos = exports.getUserProfile = void 0;
const User_1 = require("../models/User");
const Video_1 = require("../models/Video");
const Follow_1 = require("../models/Follow");
const Report_1 = require("../models/Report");
const getUserProfile = async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User_1.User.findOne({ username }).select('-password');
        if (!user) {
            res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
            return;
        }
        const followersCount = await Follow_1.Follow.countDocuments({ followingId: user._id });
        const followingCount = await Follow_1.Follow.countDocuments({ followerId: user._id });
        let isFollowing = false;
        if (req.user) {
            const follow = await Follow_1.Follow.findOne({ followerId: req.user._id, followingId: user._id });
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
    }
};
exports.getUserProfile = getUserProfile;
const getUserVideos = async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User_1.User.findOne({ username });
        if (!user) {
            res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
            return;
        }
        const videos = await Video_1.Video.find({ userId: user._id, status: 'published' }).sort({ createdAt: -1 });
        res.json({ success: true, data: videos });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
    }
};
exports.getUserVideos = getUserVideos;
const followUser = async (req, res) => {
    try {
        const followingId = req.params.id; // ID of user to follow
        const followerId = req.user._id; // Current user
        if (followingId === followerId.toString()) {
            res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'You cannot follow yourself' } });
            return;
        }
        const existingFollow = await Follow_1.Follow.findOne({ followerId, followingId });
        if (!existingFollow) {
            await Follow_1.Follow.create({ followerId, followingId });
        }
        res.json({ success: true, message: 'Successfully followed user' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
    }
};
exports.followUser = followUser;
const unfollowUser = async (req, res) => {
    try {
        const followingId = req.params.id;
        const followerId = req.user._id;
        await Follow_1.Follow.findOneAndDelete({ followerId, followingId });
        res.json({ success: true, message: 'Successfully unfollowed user' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
    }
};
exports.unfollowUser = unfollowUser;
const searchUsers = async (req, res) => {
    try {
        const query = req.query.q;
        if (!query || query.trim() === '') {
            res.json({ success: true, data: [] });
            return;
        }
        const users = await User_1.User.find({
            username: { $regex: query, $options: 'i' }
        })
            .select('username displayName profileImage')
            .limit(20);
        res.json({ success: true, data: users });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
    }
};
exports.searchUsers = searchUsers;
const blockUser = async (req, res) => {
    try {
        const userIdToBlock = req.params.id;
        const currentUserId = req.user._id;
        if (userIdToBlock === currentUserId.toString()) {
            res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'You cannot block yourself' } });
            return;
        }
        await User_1.User.findByIdAndUpdate(currentUserId, {
            $addToSet: { blockedUsers: userIdToBlock }
        });
        // Also remove any follow relationships
        await Follow_1.Follow.deleteMany({
            $or: [
                { followerId: currentUserId, followingId: userIdToBlock },
                { followerId: userIdToBlock, followingId: currentUserId }
            ]
        });
        res.json({ success: true, message: 'Successfully blocked user' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
    }
};
exports.blockUser = blockUser;
const unblockUser = async (req, res) => {
    try {
        const userIdToUnblock = req.params.id;
        const currentUserId = req.user._id;
        await User_1.User.findByIdAndUpdate(currentUserId, {
            $pull: { blockedUsers: userIdToUnblock }
        });
        res.json({ success: true, message: 'Successfully unblocked user' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
    }
};
exports.unblockUser = unblockUser;
const reportContent = async (req, res) => {
    try {
        const { targetId, targetType, reason } = req.body;
        const reporterId = req.user._id;
        if (!targetId || !targetType || !reason) {
            res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Missing required fields' } });
            return;
        }
        const report = await Report_1.Report.create({
            reporterId,
            reportedId: targetId,
            targetType,
            reason,
            status: 'pending'
        });
        res.status(201).json({ success: true, data: report });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
    }
};
exports.reportContent = reportContent;
//# sourceMappingURL=userController.js.map