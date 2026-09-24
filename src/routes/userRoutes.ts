import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { getCurrentUser, getUserProfile, followUser, unfollowUser, getUserVideos, searchUsers, blockUser, unblockUser, reportContent, updateProfile, getNotifications, markNotificationRead, markAllNotificationsRead, getCloseFriends, addCloseFriend, removeCloseFriend, deleteAccount } from '../controllers/userController';
import { upload } from '../middleware/uploadMiddleware';
import { actionLimiter } from '../middleware/rateLimiter';

const router = express.Router();

router.get('/me', protect, getCurrentUser);
router.delete('/me', protect, deleteAccount);
router.get('/me/close-friends', protect, getCloseFriends);
router.get('/search', protect, searchUsers);
router.get('/notifications', protect, getNotifications);
router.post('/notifications/read-all', protect, markAllNotificationsRead);
router.post('/notifications/:id/read', protect, markNotificationRead);
router.post('/report', protect, actionLimiter, reportContent);
router.put('/profile', protect, upload.single('image'), updateProfile);

router.post('/:id/follow', protect, followUser);
router.delete('/:id/follow', protect, unfollowUser);
router.post('/:id/block', protect, blockUser);
router.delete('/:id/block', protect, unblockUser);
router.post('/:id/close-friends', protect, addCloseFriend);
router.delete('/:id/close-friends', protect, removeCloseFriend);

router.get('/:username', protect, getUserProfile);
router.get('/:username/videos', protect, getUserVideos);

export default router;

