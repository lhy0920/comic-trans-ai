import mongoose, { Document, Schema } from 'mongoose'

export interface IHistory extends Document {
  userId: mongoose.Types.ObjectId
  comicId: string
  chapterId: string
  viewTime: Date
}

const historySchema = new Schema<IHistory>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  comicId: { type: String, required: true },
  chapterId: { type: String, default: '1' },
  viewTime: { type: Date, default: Date.now }
})

// 复合索引
historySchema.index({ userId: 1, comicId: 1 })
historySchema.index({ viewTime: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 }) // 7天后自动删除

export const History = mongoose.model<IHistory>('History', historySchema)
