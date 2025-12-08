import mongoose, { Schema, Document } from 'mongoose'

export interface IConversation extends Document {
  participants: mongoose.Types.ObjectId[];
  lastMessage?: string;
  autoReplyCount: number;
  lastAutoReplySentAt?: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    participants: [
      { type: Schema.Types.ObjectId, ref: "User", required: true },
    ],
    lastMessage: { type: String },
    autoReplyCount: { type: Number, default: 0 },
    lastAutoReplySentAt: { type: Date },
  },
  { timestamps: true }
);

export const Conversation = mongoose.model<IConversation>(
  'Conversation',
  conversationSchema
)
