import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { Conversation } from "../conversation/conversation.model";
import { Message } from "./message.model";
import AppError from "../../errors/AppError";
import { StatusCodes } from "http-status-codes";
import sendResponse from "../../utils/sendResponse";

export const getMessages = async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const messages = await Message.find({ conversationId })
    .populate("sender", "firstName lastName image")
    .sort({ createdAt: 1 });
  res.json(messages);
};

// Not used by Socket directly, but you can expose a REST POST if needed
// export const createMessage = async (req: Request, res: Response) => {
//   const { conversationId, text } = req.body
//   const sender = req.user._id
//   const msg = await Message.create({ conversationId, sender, text })
//   await Conversation.findByIdAndUpdate(conversationId, {
//     lastMessage: text,
//     updatedAt: new Date(),
//   })
//   res.json(msg)
// }

// export const createMessage = async (req: Request, res: Response) => {
//   try {
//     const { conversationId, text } = req.body;
//     const senderId = req.user._id;

//     // 1) Save the user's message
//     const newMessage = await Message.create({
//       conversationId,
//       sender: senderId,
//       text,
//     });

//     await Conversation.findByIdAndUpdate(conversationId, {
//       lastMessage: text,
//       updatedAt: new Date(),
//     });

//     // 2) Load conversation with participants populated
//     const conversation = await Conversation.findById(conversationId)
//       .populate("participants", "role name email") // IMPORTANT
//       .exec();

//     if (!conversation) {
//       return res.status(404).json({ message: "Conversation not found" });
//     }

//     // 3) Identify sender & opponent
//     const sender: any = conversation.participants.find(
//       (u: any) => u._id.toString() === senderId.toString()
//     );

//     const opponent: any = conversation.participants.find(
//       (u: any) => u._id.toString() !== senderId.toString()
//     );

//     // 4) No auto reply conditions
//     if (!opponent || opponent.role !== "admin" || sender.role === "admin") {
//       return res.json({ message: newMessage });
//     }

//     // 5) Auto-reply logic
//     const now = new Date();
//     let autoReplyText = null;

//     const is24HoursPassed =
//       conversation.lastAutoReplySentAt &&
//       now.getTime() - new Date(conversation.lastAutoReplySentAt).getTime() >
//         24 * 60 * 60 * 1000;

//     if (!conversation.lastAutoReplySentAt || is24HoursPassed) {
//       autoReplyText =
//         "If you don't get a response in the next 2 minutes that means we are currently diving. Please leave your cell phone and email so we can get back to you when we surface.";

//       conversation.autoReplyCount = 1;
//       conversation.lastAutoReplySentAt = now;
//     } else if (conversation.autoReplyCount === 1) {
//       autoReplyText =
//         "Thank you for your message, as long as you sent us your cell phone and email we will be able to get back to you when we surface.";

//       conversation.autoReplyCount = 2;
//       conversation.lastAutoReplySentAt = now;
//     }

//     await conversation.save();

//     let autoMsg = null;

//     // 6) Create system auto-message for NORMAL USER only
//     if (autoReplyText) {
//       autoMsg = await Message.create({
//         conversationId,
//         sender: "system",
//         receiver: senderId, // message goes to the user
//         text: autoReplyText,
//       });
//     }

//     return res.json({
//       message: newMessage,
//       autoReply: autoMsg,
//     });
//   } catch (error) {
//     console.error("createMessage error:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

export const createMessage = catchAsync(async (req, res) => {
  try {
    const { conversationId, text } = req.body;
    const senderId = req.user._id;

    // 1) Save the user's message
    const newMessage = await Message.create({
      conversationId,
      sender: senderId,
      text,
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: text,
      updatedAt: new Date(),
    });

    // 2) Load conversation with participants populated
    const conversation: any = await Conversation.findById(conversationId)
      .populate("participants", "role name email")
      .exec();

    if (!conversation) {
      throw new AppError("Conversation not found", StatusCodes.NOT_FOUND);
    }

    // 3) Identify sender & admin user
    const sender = conversation.participants.find(
      (u: any) => u._id.toString() === senderId.toString()
    );

    const opponent = conversation.participants.find(
      (u: any) => u._id.toString() !== senderId.toString()
    );

    // 4) No auto reply conditions
    if (!opponent || opponent.role !== "admin" || sender.role === "admin") {
      return sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Message created successfully",
        data: { message: newMessage },
      });
    }

    // 5) Auto reply logic
    const now = new Date();
    let autoReplyText: string | null = null;

    const is24HoursPassed =
      conversation.lastAutoReplySentAt &&
      now.getTime() - new Date(conversation.lastAutoReplySentAt).getTime() >
        24 * 60 * 60 * 1000;

    let updateFields: any = {};

    if (!conversation.lastAutoReplySentAt || is24HoursPassed) {
      autoReplyText =
        "If you don't get a response in the next 2 minutes that means we are currently diving. Please leave your cell phone and email so we can get back to you when we surface.";

      updateFields = {
        autoReplyCount: 1,
        lastAutoReplySentAt: now,
      };
    } else if (conversation.autoReplyCount === 1) {
      autoReplyText =
        "Thank you for your message, as long as you sent us your cell phone and email we will be able to get back to you when we surface.";

      updateFields = {
        autoReplyCount: 2,
        lastAutoReplySentAt: now,
      };
    }

    // ❗ Instead of conversation.save() we use updateOne()
    if (autoReplyText) {
      await Conversation.updateOne(
        { _id: conversationId },
        { $set: updateFields }
      );
    }

    let autoMsg = null;

    // 6) Create system auto-message for USER only
    if (autoReplyText) {
      autoMsg = await Message.create({
        conversationId,
        sender: "system",
        receiver: senderId,
        text: autoReplyText,
      });
    }

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Message created successfully",
      data: { message: newMessage, autoReply: autoMsg },
    });
  } catch (error) {
    console.error("createMessage error:", error);
    throw new AppError("Failed to create message", StatusCodes.BAD_REQUEST);
  }
});
