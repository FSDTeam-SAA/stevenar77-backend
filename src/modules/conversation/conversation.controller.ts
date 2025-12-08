import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import AppError from "../../errors/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { Message } from "../message/message.model";
import { Conversation } from "./conversation.model";

export const getUserConversations = async (req: Request, res: Response) => {
  const userId = req.params.userId;
  const conversations = await Conversation.find({ participants: userId })
    .sort({ updatedAt: -1 })
    .populate("participants", "name email")
    .lean();
  res.json(conversations);
};

/**
 * Create a new conversation
 */
// export const createConversation = async (req: Request, res: Response) => {
//   const { participants } = req.body

//   if (
//     !participants ||
//     !Array.isArray(participants) ||
//     participants.length < 1
//   ) {
//     res.status(400).json({
//       success: false,
//       message: 'participants array with at least 1 user IDs is required',
//     })
//     return
//   }

//   // Ensure IDs are valid
//   const validIds = participants.every((id) =>
//     mongoose.Types.ObjectId.isValid(id)
//   )
//   if (!validIds) {
//     res.status(400).json({ success: false, message: 'Invalid user IDs' })
//     return
//   }

//   // Optional: check if a conversation with the same set already exists
//   const existing = await Conversation.findOne({
//     participants: { $all: participants, $size: participants.length },
//   })
//   if (existing) {
//     res.status(200).json({
//       success: true,
//       message: 'Conversation already exists',
//       conversation: existing,
//     })
//     return
//   }

//   const conversation = await Conversation.create({ participants })
//   res.status(201).json({ success: true, conversation })
//   return
// }

export const createConversation = catchAsync(async (req, res) => {
  const { participants } = req.body;

  // 1) Validate participants
  if (
    !participants ||
    !Array.isArray(participants) ||
    participants.length < 1
  ) {
    throw new AppError(
      "participants array with at least 1 user IDs is required",
      StatusCodes.BAD_REQUEST
    );
  }

  const validIds = participants.every((id) =>
    mongoose.Types.ObjectId.isValid(id)
  );
  if (!validIds) {
    throw new AppError("Invalid user IDs", StatusCodes.BAD_REQUEST);
  }

  // 2) Check if conversation already exists
  const existing = await Conversation.findOne({
    participants: { $all: participants, $size: participants.length },
  });
  if (existing) {
    return sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Conversation already exists",
      data: existing,
    });
  }

  // 3) Create new conversation
  const conversation = await Conversation.create({ participants });

  // 4) Auto-reply logic (only if user + admin conversation)
  const populatedConversation: any = await Conversation.findById(
    conversation._id
  )
    .populate("participants", "_id role")
    .exec();

  if (populatedConversation.participants.length === 2) {
    const userParticipant = populatedConversation.participants.find(
      (u: any) => u.role === "user"
    );
    const adminParticipant = populatedConversation.participants.find(
      (u: any) => u.role === "admin"
    );

    if (userParticipant && adminParticipant) {
      // Auto-reply text
      const autoReplyText =
        "Hello! If you don't get a response in 2 minutes, please leave your contact info so we can reach you.";

      // Create auto-reply message from admin to user
      const autoMsg = await Message.create({
        conversationId: conversation._id,
        sender: adminParticipant._id, // admin
        receiver: userParticipant._id, // user
        text: autoReplyText,
      });

      return sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Conversation created successfully with auto-reply",
        data: {
          conversation,
          autoReply: autoMsg,
        },
      });
    }
  }

  // Normal response (if not user+admin conversation)
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Conversation created successfully",
    data: conversation,
  });
});

/**
 * Delete a conversation by ID
 * Params: :id
 */
export const deleteConversation = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res
      .status(400)
      .json({ success: false, message: "Invalid conversation ID" });
    return;
  }

  const deleted = await Conversation.findByIdAndDelete(id);
  if (!deleted) {
    res.status(404).json({ success: false, message: "Conversation not found" });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Conversation deleted successfully",
    conversation: deleted,
  });
  return;
};

export const allConversations = async (req: Request, res: Response) => {
  const conversations = await Conversation.find()
    .sort({ updatedAt: -1 })
    .populate("participants", "firstName lastName email")
    .lean();
  res.json({
    success: true,
    data: conversations,
  });
};
