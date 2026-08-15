import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';
import { uploadStory, getFeedStories } from '../controllers/storyController';

const router = express.Router();

router.use(protect);

router.post('/', upload.array('media', 10), uploadStory);
router.get('/feed', getFeedStories);

export default router;
