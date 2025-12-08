import { Server, Socket } from "socket.io";
import { Conversation } from "../modules/conversation/conversation.model";
import { Message } from "../modules/message/message.model";

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
        ) {
          return;
        }

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
          let updateFields: any = {};

          // Check if 24 hours have passed since last auto-reply
          const is24HoursPassed = conversation.lastAutoReplySentAt
            ? now.getTime() -
                new Date(conversation.lastAutoReplySentAt).getTime() >
              24 * 60 * 60 * 1000
            : false;

          // If 24 hours passed, reset auto-reply count
          if (is24HoursPassed) {
            // Reset and start from first auto-reply again
            autoReplyText = "Hello! How are you?";
            updateFields = {
              autoReplyCount: 1,
              lastAutoReplySentAt: now,
              lastMessage: autoReplyText,
            };
          } else {
            // Check current auto-reply count
            const currentAutoReplyCount = conversation.autoReplyCount || 0;

            if (currentAutoReplyCount === 0) {
              // First auto-reply (when user sends first message after conversation creation)
              autoReplyText = "Hello! How are you?";
              updateFields = {
                autoReplyCount: 1,
                lastAutoReplySentAt: now,
                lastMessage: autoReplyText,
              };
            } else if (currentAutoReplyCount === 1) {
              // Second auto-reply (when user sends second message)
              autoReplyText = "I'm fine, thank you!";
              updateFields = {
                autoReplyCount: 2,
                lastAutoReplySentAt: now,
                lastMessage: autoReplyText,
              };
            } else if (currentAutoReplyCount === 2) {
              // After second auto-reply, stop sending auto-replies until 24 hours pass
              // No more auto-replies until reset
            }
          }

          // Send auto-reply if we have a message
          if (autoReplyText) {
            // Update conversation with auto-reply tracking
            await Conversation.findByIdAndUpdate(conversationId, {
              $set: updateFields,
            });

            // Auto-reply sender is admin
            const autoMsg = await Message.create({
              conversationId,
              sender: opponent._id, // admin
              receiver: senderUser._id, // user
              text: autoReplyText,
            });

            // Emit auto-reply message
            io.to(senderUser._id.toString()).emit("receiveMessage", autoMsg);
            io.to(conversationId).emit("receiveMessage", autoMsg);
          }

          // Notify all participants about the original message
          conversation.participants.forEach((uid: any) => {
            io.to(uid._id.toString()).emit("conversationUpdated", {
              conversationId,
              lastMessage: text,
              updatedAt: msg.createdAt,
            });
          });

          return;
        }

        // 5) Notify all participants (for non-user-admin conversations)
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