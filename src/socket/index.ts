import { Server, Socket } from 'socket.io'
import { Message } from '../modules/message/message.model'
import { Conversation } from '../modules/conversation/conversation.model'

export const initSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    //console.log('✅ Client connected:', socket.id)

    // Register user for personal notifications
    socket.on('register', (userId: string) => {
      socket.data.userId = userId
      socket.join(userId)
      //console.log(`User ${userId} joined personal room`)
    })

    // Join a specific conversation room for live chat
    socket.on('joinRoom', (conversationId: string) => {
      socket.join(conversationId)
      //console.log(`Joined conversation ${conversationId}`)
    })

    socket.on('sendMessage', async (data) => {
      try {
        const { conversationId, sender, text } = data

        const msg = await Message.create({ conversationId, sender, text })
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: text,
          updatedAt: new Date(),
        })

        io.to(conversationId).emit('receiveMessage', msg)

        const conversation = await Conversation.findById(conversationId)
        conversation?.participants.forEach((uid) => {
          io.to(uid.toString()).emit('conversationUpdated', {
            conversationId,
            lastMessage: text,
            updatedAt: msg.createdAt,
          })
        })
      } catch (err) {
        console.error('sendMessage error:', err)

        // Inform the client so they can handle it gracefully
        socket.emit('error', {
          event: 'sendMessage',
          message: 'Failed to send message. Please try again later.',
        })
      }
    })

    socket.on('disconnect', () => {
      //console.log(' Client disconnected', socket.id)
    })
  })
}
