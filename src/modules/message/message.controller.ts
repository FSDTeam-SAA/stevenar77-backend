import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import AppError from "../../errors/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { Conversation } from "../conversation/conversation.model";
import { User } from "../user/user.model";
import { Message } from "./message.model";

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
//   const { conversationId, text } = req.body;
//   const senderId = req.user._id;

//   // 1) Save user's message
//   const msg = await Message.create({ conversationId, sender: senderId, text });
//   await Conversation.findByIdAndUpdate(conversationId, {
//     lastMessage: text,
//     updatedAt: new Date(),
//   });

//   // 2) Load conversation
//   const conversation: any = await Conversation.findById(conversationId)
//     .populate("participants", "role")
//     .exec();
//   if (!conversation)
//     return res.status(404).json({ message: "Conversation not found" });

//   const sender = conversation.participants.find(
//     (u: any) => u._id.toString() === senderId.toString()
//   );
//   const opponent = conversation.participants.find(
//     (u: any) => u._id.toString() !== senderId.toString()
//   );

//   // 3) No auto-reply if opponent not admin or sender is admin
//   if (!opponent || opponent.role !== "admin" || sender.role === "admin") {
//     return res.json({ message: msg });
//   }

//   // 4) Auto-reply logic
//   const now = new Date();
//   let autoReplyText: string | null = null;
//   const is24HoursPassed =
//     conversation.lastAutoReplySentAt &&
//     now.getTime() - new Date(conversation.lastAutoReplySentAt).getTime() >
//       24 * 60 * 60 * 1000;

//   let updateFields: any = {};

//   if (!conversation.lastAutoReplySentAt || is24HoursPassed) {
//     autoReplyText =
//       "If you don't get a response in the next 2 minutes that means we are currently diving. Please leave your cell phone and email so we can get back to you when we surface.";
//     updateFields = { autoReplyCount: 1, lastAutoReplySentAt: now };
//   } else if (conversation.autoReplyCount === 1) {
//     autoReplyText =
//       "Thank you for your message, as long as you sent us your cell phone and email we will be able to get back to you when we surface.";
//     updateFields = { autoReplyCount: 2, lastAutoReplySentAt: now };
//   }

//   if (autoReplyText) {
//     await Conversation.updateOne(
//       { _id: conversationId },
//       { $set: updateFields }
//     );
//     await Message.create({
//       conversationId,
//       sender: "system",
//       receiver: senderId,
//       text: autoReplyText,
//     });
//   }

//   return res.json({ message: msg, autoReply: autoReplyText });
// };

export const createMessage = catchAsync(async (req, res) => {
  const { conversationId, text } = req.body;
  const { id: senderId } = req.user;

  // 1) Save user's message
  const msg = await Message.create({ conversationId, sender: senderId, text });

  // 2) Update conversation last message
  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: text,
    updatedAt: new Date(),
  });

  // 3) Load conversation with participants
  const conversation: any = await Conversation.findById(conversationId)
    .populate("participants", "_id role")
    .exec();

  if (
    !conversation ||
    !conversation.participants ||
    conversation.participants.length === 0
  ) {
    throw new AppError(
      "Conversation participants not found",
      StatusCodes.NOT_FOUND
    );
  }

  // 4) Find sender & opponent
  const sender = conversation.participants.find(
    (u: any) => u._id.toString() === senderId.toString()
  );
  const opponent = conversation.participants.find(
    (u: any) => u._id.toString() !== senderId.toString()
  );

  if (!sender)
    throw new AppError(
      "Sender not found in conversation",
      StatusCodes.NOT_FOUND
    );

  // 5) Auto-reply only if opponent is admin & sender is user
  if (!opponent || opponent.role !== "admin" || sender.role === "admin") {
    return sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Message created successfully",
      data: { message: msg },
    });
  }

  // 6) Auto-reply logic with 24 hours check
  const now = new Date();
  let autoReplyText: string | null = null;

  const is24HoursPassed =
    conversation.lastAutoReplySentAt &&
    now.getTime() - new Date(conversation.lastAutoReplySentAt).getTime() >
      24 * 60 * 60 * 1000;

  let updateFields: any = {};

  if (!conversation.lastAutoReplySentAt || is24HoursPassed) {
    autoReplyText =
      "If you don't get a response in the next 2 minutes, please leave your contact info so we can reach you.";
    updateFields = { autoReplyCount: 1, lastAutoReplySentAt: now };
  } else if (conversation.autoReplyCount === 1) {
    autoReplyText =
      "Thank you for your message! We will contact you when possible.";
    updateFields = { autoReplyCount: 2, lastAutoReplySentAt: now };
  }

  let autoMsg = null;
  if (autoReplyText) {
    // Update conversation auto-reply fields
    await Conversation.updateOne(
      { _id: conversationId },
      { $set: updateFields }
    );

    // Admin is sending auto-reply
    autoMsg = await Message.create({
      conversationId,
      sender: opponent._id, // admin
      receiver: sender._id, // user
      text: autoReplyText,
    });
  }

  // 7) Send final response
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Message created successfully",
    data: { message: msg, autoReply: autoMsg },
  });
});
