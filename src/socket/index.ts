import { Server, Socket } from "socket.io";
import { Conversation } from "../modules/conversation/conversation.model";
import { Message } from "../modules/message/message.model";
import { User } from "../modules/user/user.model";

// export const initSocket = (io: Server) => {
//   io.on('connection', (socket: Socket) => {
//     //console.log('✅ Client connected:', socket.id)

//     // Register user for personal notifications
//     socket.on('register', (userId: string) => {
//       socket.data.userId = userId
//       socket.join(userId)
//       //console.log(`User ${userId} joined personal room`)
//     })

//     // Join a specific conversation room for live chat
//     socket.on('joinRoom', (conversationId: string) => {
//       socket.join(conversationId)
//       //console.log(`Joined conversation ${conversationId}`)
//     })

//     socket.on('sendMessage', async (data) => {
//       try {
//         const { conversationId, sender, text } = data

//         const msg = await Message.create({ conversationId, sender, text })
//         await Conversation.findByIdAndUpdate(conversationId, {
//           lastMessage: text,
//           updatedAt: new Date(),
//         })

//         io.to(conversationId).emit('receiveMessage', msg)

//         const conversation = await Conversation.findById(conversationId)
//         conversation?.participants.forEach((uid) => {
//           io.to(uid.toString()).emit('conversationUpdated', {
//             conversationId,
//             lastMessage: text,
//             updatedAt: msg.createdAt,
//           })
//         })
//       } catch (err) {
//         console.error('sendMessage error:', err)

//         // Inform the client so they can handle it gracefully
//         socket.emit('error', {
//           event: 'sendMessage',
//           message: 'Failed to send message. Please try again later.',
//         })
//       }
//     })

//     socket.on('disconnect', () => {
//       //console.log(' Client disconnected', socket.id)
//     })
//   })
// }

export const initSocket = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    socket.on("register", (userId: string) => {
      socket.data.userId = userId;
      socket.join(userId);
    });

    socket.on("joinRoom", (conversationId: string) => {
      socket.join(conversationId);
    });

    socket.on("sendMessage", async (data) => {
      try {
        const { conversationId, sender, text } = data;

        // 1) Save message
        const msg = await Message.create({ conversationId, sender, text });
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: text,
          updatedAt: new Date(),
        });

        // 2) Emit to conversation room
        io.to(conversationId).emit("receiveMessage", msg);

        // 3) Load conversation & participants
        const conversation: any = await Conversation.findById(conversationId)
          .populate("participants", "_id role")
          .exec();
        if (
          !conversation ||
          !conversation.participants ||
          conversation.participants.length === 0
        )
          return;

        const senderUser = conversation.participants.find(
          (u: any) => u._id.toString() === sender.toString()
        );
        const opponent = conversation.participants.find(
          (u: any) => u._id.toString() !== sender.toString()
        );

        // 4) Auto-reply logic only for user -> admin conversation
        if (
          opponent &&
          opponent.role === "admin" &&
          senderUser.role !== "admin"
        ) {
          const now = new Date();
          let autoReplyText: string | null = null;

          const is24HoursPassed =
            conversation.lastAutoReplySentAt &&
            now.getTime() -
              new Date(conversation.lastAutoReplySentAt).getTime() >
              24 * 60 * 60 * 1000;

          let updateFields: any = {};

          if (!conversation.lastAutoReplySentAt || is24HoursPassed) {
            autoReplyText =
              "If you don't get a response in the next 2 minutes, please leave your contact info.";
            updateFields = { autoReplyCount: 1, lastAutoReplySentAt: now };
          } else if (conversation.autoReplyCount === 1) {
            autoReplyText =
              "Thank you for your message! We will contact you when possible.";
            updateFields = { autoReplyCount: 2, lastAutoReplySentAt: now };
          }

          if (autoReplyText) {
            await Conversation.updateOne(
              { _id: conversationId },
              { $set: updateFields }
            );

            // Auto-reply sender is admin
            const autoMsg = await Message.create({
              conversationId,
              sender: opponent._id, // admin
              receiver: senderUser._id, // user
              text: autoReplyText,
            });

            io.to(senderUser._id.toString()).emit("receiveMessage", autoMsg);
          }
        }

        // 5) Notify all participants
        conversation.participants.forEach((uid: any) => {
          io.to(uid._id.toString()).emit("conversationUpdated", {
            conversationId,
            lastMessage: text,
            updatedAt: msg.createdAt,
          });
        });
      } catch (err) {
        console.error("sendMessage error:", err);
        socket.emit("error", {
          event: "sendMessage",
          message: "Failed to send message. Please try again.",
        });
      }
    });
  });
};
