import mongoose, { Schema, Document } from 'mongoose'

export interface IConversation extends Document {
  participants: mongoose.Types.ObjectId[]
  lastMessage?: string
  updatedAt: Date
}

const conversationSchema = new Schema<IConversation>(
  {
    participants: [
      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ],
    lastMessage: { type: String },
  },
  { timestamps: true }
)

export const Conversation = mongoose.model<IConversation>(
  'Conversation',
  conversationSchema
)
