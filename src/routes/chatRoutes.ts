import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { getConversations, getOrCreateConversation, getMessages } from '../controllers/chatController';

const router = express.Router();

router.use(protect);

router.get('/', getConversations);
router.get('/user/:targetUserId', getOrCreateConversation);
router.get('/messages/:conversationId', getMessages);

export default router;
