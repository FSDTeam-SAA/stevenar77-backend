import { Server, Socket } from 'socket.io'
import { Message } from '../modules/message/message.model' 
import { Conversation } from '../modules/conversation/conversation.model'

export const initSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log('✅ Client connected:', socket.id)

    // Register user for personal notifications
    socket.on('register', (userId: string) => {
      socket.data.userId = userId
      socket.join(userId)
      console.log(`User ${userId} joined personal room`)
    })

    // Join a specific conversation room for live chat
    socket.on('joinRoom', (conversationId: string) => {
      socket.join(conversationId)
      console.log(`Joined conversation ${conversationId}`)
    })

    // Handle sending messages
    socket.on(
      'sendMessage',
      async (data: {
        conversationId: string
        sender: string
        text: string
      }) => {
        const { conversationId, sender, text } = data

        const msg = await Message.create({ conversationId, sender, text })
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: text,
          updatedAt: new Date(),
        })

        // 1️⃣ Real-time message to users in that conversation
        io.to(conversationId).emit('receiveMessage', msg)

        // 2️⃣ Update conversation preview to all participants (personal rooms)
        const conversation = await Conversation.findById(conversationId)
        conversation?.participants.forEach((uid) => {
          io.to(uid.toString()).emit('conversationUpdated', {
            conversationId,
            lastMessage: text,
            updatedAt: msg.createdAt,
          })
        })
      }
    )

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected', socket.id)
    })
  })
}
