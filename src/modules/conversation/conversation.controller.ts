import { Request, Response } from 'express'
import { Conversation } from './conversation.model'
import mongoose from 'mongoose'

export const getUserConversations = async (req: Request, res: Response) => {
  const userId = req.params.userId
  const conversations = await Conversation.find({ participants: userId })
    .sort({ updatedAt: -1 })
    .populate('participants', 'name email')
    .lean()
  res.json(conversations)
}

/**
 * Create a new conversation
 */
export const createConversation = async (req: Request, res: Response) => {
  const { participants } = req.body

  if (
    !participants ||
    !Array.isArray(participants) ||
    participants.length < 2
  ) {
    res.status(400).json({
      success: false,
      message: 'participants array with at least 2 user IDs is required',
    })
    return
  }

  // Ensure IDs are valid
  const validIds = participants.every((id) =>
    mongoose.Types.ObjectId.isValid(id)
  )
  if (!validIds) {
    res.status(400).json({ success: false, message: 'Invalid user IDs' })
    return
  }

  // Optional: check if a conversation with the same set already exists
  const existing = await Conversation.findOne({
    participants: { $all: participants, $size: participants.length },
  })
  if (existing) {
    res.status(200).json({
      success: true,
      message: 'Conversation already exists',
      conversation: existing,
    })
    return
  }

  const conversation = await Conversation.create({ participants })
  res.status(201).json({ success: true, conversation })
  return
}

/**
 * Delete a conversation by ID
 * Params: :id
 */
export const deleteConversation = async (req: Request, res: Response) => {
  const { id } = req.params

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ success: false, message: 'Invalid conversation ID' })
    return
  }

  const deleted = await Conversation.findByIdAndDelete(id)
  if (!deleted) {
    res.status(404).json({ success: false, message: 'Conversation not found' })
    return
  }

  res.status(200).json({
    success: true,
    message: 'Conversation deleted successfully',
    conversation: deleted,
  })
  return
}
