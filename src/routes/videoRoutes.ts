import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { getFeed, getFollowingFeed, getVideo, uploadVideo, likeVideo, unlikeVideo, getComments, addComment, deleteComment, saveVideo, unsaveVideo, getExploreFeed, getFeedByHashtag } from '../controllers/videoController';
import { upload } from '../middleware/uploadMiddleware';

const router = express.Router();

router.get('/feed', protect, getFeed);
router.get('/feed/following', protect, getFollowingFeed);
router.get('/explore', protect, getExploreFeed);
router.get('/hashtag/:hashtag', protect, getFeedByHashtag);
router.get('/:id', protect, getVideo);
router.post('/', protect, upload.array('media', 10), uploadVideo);
// router.delete('/:id', protect, deleteVideo);

router.post('/:id/like', protect, likeVideo);
router.delete('/:id/like', protect, unlikeVideo);

router.get('/:id/comments', protect, getComments);
router.post('/:id/comments', protect, addComment);
router.delete('/comments/:id', protect, deleteComment);

router.post('/:id/save', protect, saveVideo);
router.delete('/:id/save', protect, unsaveVideo);

export default router;
