import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';
import { uploadStory, uploadStoryBase64, getFeedStories, deleteStory } from '../controllers/storyController';

const router = express.Router();

router.use(protect);

router.post('/', upload.array('media', 10), uploadStory);
router.post('/base64', uploadStoryBase64);
router.get('/feed', getFeedStories);
router.delete('/:id', deleteStory);

export default router;
