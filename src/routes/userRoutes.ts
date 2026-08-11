import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { getUserProfile, followUser, unfollowUser, getUserVideos, searchUsers, blockUser, unblockUser, reportContent } from '../controllers/userController';

const router = express.Router();

router.get('/search', protect, searchUsers);
router.post('/report', protect, reportContent);
router.get('/:username', protect, getUserProfile);
router.post('/:id/follow', protect, followUser);
router.delete('/:id/follow', protect, unfollowUser);
router.post('/:id/block', protect, blockUser);
router.delete('/:id/block', protect, unblockUser);
router.get('/:username/videos', protect, getUserVideos);

export default router;

