import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { getFeed, getFollowingFeed, getVideo, uploadVideo, uploadVideoBase64, deleteVideo, likeVideo, unlikeVideo, getComments, addComment, deleteComment, saveVideo, unsaveVideo, getSavedVideos, getExploreFeed, getFeedByHashtag } from '../controllers/videoController';
import { upload } from '../middleware/uploadMiddleware';
import { actionLimiter } from '../middleware/rateLimiter';

const router = express.Router();

router.get('/feed', protect, getFeed);
router.get('/feed/following', protect, getFollowingFeed);
router.get('/explore', protect, getExploreFeed);
router.get('/user/saved', protect, getSavedVideos);
router.get('/hashtag/:hashtag', protect, getFeedByHashtag);
router.get('/:id', protect, getVideo);
router.post('/', protect, actionLimiter, upload.array('media', 10), uploadVideo);
router.post('/base64', protect, actionLimiter, uploadVideoBase64);
router.delete('/:id', protect, deleteVideo);

router.post('/:id/like', protect, likeVideo);
router.delete('/:id/like', protect, unlikeVideo);

router.get('/:id/comments', protect, getComments);
router.post('/:id/comments', protect, actionLimiter, addComment);
router.delete('/comments/:id', protect, deleteComment);

router.post('/:id/save', protect, saveVideo);
router.delete('/:id/save', protect, unsaveVideo);

export default router;
