import { Request, Response } from "express";
import AppError from "../../errors/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { Conversation } from "../conversation/conversation.model";
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
//   const { conversationId, text, sender: userId } = req.body;
//   const sender = req.user._id || userId;
//   const msg = await Message.create({ conversationId, sender, text });
//   await Conversation.findByIdAndUpdate(conversationId, {
//     lastMessage: text,
//     updatedAt: new Date(),
//   });
//   res.json(msg);
// };


export const createMessage = catchAsync(async (req, res) => {
  try {
    const { conversationId, text, sender: bodySender } = req.body;

    // Determine sender:
    let sender: string;

    if (req.user && req.user._id) {
      // Normal logged-in user
      sender = String(req.user._id);
    } else if (bodySender) {
      // Admin or system message sent from frontend
      sender = String(bodySender);
    } else {
      throw new AppError("Sender is required", 400);
    }

    const msg = await Message.create({
      conversationId,
      sender,
      text,
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: text,
      updatedAt: new Date(),
    });

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Message created successfully",
      data: msg,
    });
  } catch (error) {
    console.error("Message creation error:", error);
    throw new AppError("Internal server error", 500);
  }
});

