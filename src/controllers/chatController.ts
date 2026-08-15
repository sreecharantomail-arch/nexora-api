import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import mongoose from 'mongoose';

export const getConversations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const conversations = await Conversation.find({ participants: userId })
      .populate('participants', 'username displayName profileImage')
      .populate({
        path: 'lastMessage',
        select: 'text createdAt senderId'
      })
      .sort({ updatedAt: -1 });

    res.json({ success: true, data: conversations });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};

export const getOrCreateConversation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { targetUserId } = req.params;

    if (userId.toString() === targetUserId) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Cannot chat with yourself' } });
      return;
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [userId, targetUserId] }
    }).populate('participants', 'username displayName profileImage');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userId, new mongoose.Types.ObjectId(targetUserId as string)]
      });
      await conversation.populate('participants', 'username displayName profileImage');
    }

    res.json({ success: true, data: conversation });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};

export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const userId = req.user!._id;

    // Verify user is part of the conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Conversation not found' } });
      return;
    }

    if (!conversation.participants.includes(userId)) {
      res.status(403).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not participant' } });
      return;
    }

    const messages = await Message.find({ conversationId: new mongoose.Types.ObjectId(conversationId as string) })
      .sort({ createdAt: 1 })
      .populate('senderId', 'username displayName profileImage');

    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: (error as Error).message } });
  }
};
