import { Request, Response } from 'express'
import { Message } from './message.model'
import { Conversation } from '../conversation/conversation.model'

export const getMessages = async (req: Request, res: Response) => {
  const { conversationId } = req.params
  const messages = await Message.find({ conversationId }).populate('sender', 'name avatar').sort({ createdAt: 1 })
  res.json(messages)
}

// Not used by Socket directly, but you can expose a REST POST if needed
export const createMessage = async (req: Request, res: Response) => {
  const { conversationId, text } = req.body
  const sender = req.user._id
  const msg = await Message.create({ conversationId, sender, text })
  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: text,
    updatedAt: new Date(),
  })
  res.json(msg)
}
