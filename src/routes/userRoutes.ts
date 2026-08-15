import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { getUserProfile, followUser, unfollowUser, getUserVideos, searchUsers, blockUser, unblockUser, reportContent, updateProfile, getNotifications, getCloseFriends, addCloseFriend, removeCloseFriend } from '../controllers/userController';
import { upload } from '../middleware/uploadMiddleware';

const router = express.Router();

router.get('/search', protect, searchUsers);
router.get('/notifications', protect, getNotifications);
router.post('/report', protect, reportContent);
router.get('/:username', protect, getUserProfile);
router.put('/profile', protect, upload.single('image'), updateProfile);
router.post('/:id/follow', protect, followUser);
router.delete('/:id/follow', protect, unfollowUser);
router.post('/:id/block', protect, blockUser);
router.delete('/:id/block', protect, unblockUser);
router.get('/:username/videos', protect, getUserVideos);
router.get('/me/close-friends', protect, getCloseFriends);
router.post('/:id/close-friends', protect, addCloseFriend);
router.delete('/:id/close-friends', protect, removeCloseFriend);

export default router;

