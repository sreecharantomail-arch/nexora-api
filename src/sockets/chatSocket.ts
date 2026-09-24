import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Message } from '../models/Message';
import { Conversation } from '../models/Conversation';


export const initChatSocket = (io: Server) => {
  // Middleware for auth
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as { id: string };
      const user = await User.findById(decoded.id).select('-passwordHash');
      
      if (!user) {
        return next(new Error('User not found'));
      }
      
      (socket as any).user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    console.log(`User connected to chat: ${user.username} (${socket.id})`);

    // Global user room
    socket.join(user._id.toString());

    // User joins a room specific to a conversation
    socket.on('join_chat', (conversationId: string) => {
      socket.join(conversationId);
      console.log(`User ${user.username} joined chat ${conversationId}`);
    });

    socket.on('leave_chat', (conversationId: string) => {
      socket.leave(conversationId);
    });

    // Handle sending a message
    socket.on('send_message', async (data: { conversationId: string, text: string }) => {
      try {
        const { conversationId, text } = data;
        
        // 0. Verify sender is a participant in the conversation
        const conversationObj = await Conversation.findById(conversationId);
        if (!conversationObj || !conversationObj.participants.some(p => p.toString() === user._id.toString())) {
          return;
        }

        // 1. Create the message
        const message = await Message.create({
          conversationId,
          senderId: user._id,
          text
        });

        // 2. Update conversation's lastMessage and updatedAt
        const conversation = await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: message._id,
          updatedAt: new Date()
        }, { new: true });

        // 3. Populate sender info for the client
        await message.populate('senderId', 'username displayName profileImage');

        // 4. Emit to everyone in the room (including sender, or sender can rely on callback)
        io.to(conversationId).emit('receive_message', message);
        
        // 5. Emit global notification to participants
        if (conversation) {
          conversation.participants.forEach(participantId => {
            if (participantId.toString() !== user._id.toString()) {
              io.to(participantId.toString()).emit('global_new_message', {
                conversationId,
                message
              });
            }
          });
        }
      } catch (error) {
        console.error('Error sending message via socket:', error);
      }
    });

    // Handle typing events
    socket.on('typing_start', (conversationId: string) => {
      socket.to(conversationId).emit('receive_typing_start', { userId: user._id, conversationId });
    });

    socket.on('typing_end', (conversationId: string) => {
      socket.to(conversationId).emit('receive_typing_end', { userId: user._id, conversationId });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected from chat: ${user.username}`);
    });
  });
};
