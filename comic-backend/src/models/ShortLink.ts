import mongoose, { Document, Schema } from 'mongoose'

export interface IShortLink extends Document {
  hash: string          // 短链接哈希码
  originalUrl: string   // 原始URL
  creator: mongoose.Types.ObjectId  // 创建者
  clicks: number        // 点击次数
  createdAt: Date
}

const shortLinkSchema = new Schema<IShortLink>({
  hash: { type: String, required: true, unique: true, index: true },
  originalUrl: { type: String, required: true },
  creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  clicks: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
})

export const ShortLink = mongoose.model<IShortLink>('ShortLink', shortLinkSchema)
