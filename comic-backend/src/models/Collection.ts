import mongoose, { Document, Schema } from 'mongoose'

export interface ICollection extends Document {
  userId: mongoose.Types.ObjectId
  comicId: string  // 漫画ID（本地漫画用字符串ID）
  lastReadChapter: number  // 上次阅读的章节
  collectTime: Date
}

const collectionSchema = new Schema<ICollection>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  comicId: { type: String, required: true },
  lastReadChapter: { type: Number, default: 0 },
  collectTime: { type: Date, default: Date.now }
})

// 复合索引，确保用户不能重复收藏同一漫画
collectionSchema.index({ userId: 1, comicId: 1 }, { unique: true })

export const Collection = mongoose.model<ICollection>('Collection', collectionSchema)
