import mongoose, { Document, Schema, Types } from 'mongoose'

// 私信消息
export interface IMessage extends Document {
  sender: Types.ObjectId
  receiver: Types.ObjectId
  content: string
  type: 'text' | 'image'
  read: boolean
  createdAt: Date
}

const messageSchema = new Schema<IMessage>({
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  type: { type: String, enum: ['text', 'image'], default: 'text' },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
})

// 索引优化查询
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 })
messageSchema.index({ receiver: 1, read: 1 })

export const Message = mongoose.model<IMessage>('Message', messageSchema)

// 系统通知
export interface INotification extends Document {
  user: Types.ObjectId
  type: 'like' | 'comment' | 'follow' | 'system' | 'reply'
  title: string
  content: string
  relatedUser?: Types.ObjectId
  relatedPost?: Types.ObjectId
  read: boolean
  createdAt: Date
}

const notificationSchema = new Schema<INotification>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['like', 'comment', 'follow', 'system', 'reply'], required: true },
  title: { type: String, required: true },
  content: { type: String, default: '' },
  relatedUser: { type: Schema.Types.ObjectId, ref: 'User' },
  relatedPost: { type: Schema.Types.ObjectId, ref: 'Post' },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
})

notificationSchema.index({ user: 1, createdAt: -1 })
notificationSchema.index({ user: 1, read: 1 })

export const Notification = mongoose.model<INotification>('Notification', notificationSchema)

// 会话（用于私信列表）
export interface IConversation extends Document {
  participants: Types.ObjectId[]
  lastMessage: Types.ObjectId
  updatedAt: Date
}

const conversationSchema = new Schema<IConversation>({
  participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
  updatedAt: { type: Date, default: Date.now }
})

conversationSchema.index({ participants: 1 })
conversationSchema.index({ updatedAt: -1 })

export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema)
