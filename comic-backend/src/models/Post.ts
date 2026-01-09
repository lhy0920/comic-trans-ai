import mongoose, { Document, Schema, Types } from 'mongoose'

// 评论接口
export interface IComment {
  _id: Types.ObjectId
  author: Types.ObjectId
  content: string
  replyTo?: Types.ObjectId // 被回复的评论作者
  replyToUsername?: string // 被回复者用户名（冗余存储方便查询）
  likes: Types.ObjectId[] // 点赞用户列表
  createdAt: Date
}

// 帖子接口
export interface IPost extends Document {
  author: Types.ObjectId
  title: string // 帖子标题
  content: string
  images: string[]
  tags: string[]
  likes: Types.ObjectId[] // 点赞用户列表
  stars: Types.ObjectId[] // 收藏用户列表
  shares: number
  comments: IComment[]
  visibility: 'public' | 'followers' | 'private' // 可见性：公开/仅粉丝/仅自己
  createdAt: Date
  updatedAt: Date
}

// 评论 Schema
const commentSchema = new Schema<IComment>({
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, maxlength: 500 },
  replyTo: { type: Schema.Types.ObjectId, ref: 'User' },
  replyToUsername: { type: String },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
})

// 帖子 Schema
const postSchema = new Schema<IPost>({
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, maxlength: 100 },
  content: { type: String, required: true, maxlength: 1000 },
  images: [{ type: String }],
  tags: [{ type: String }],
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  stars: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  shares: { type: Number, default: 0 },
  comments: [commentSchema],
  visibility: { type: String, enum: ['public', 'followers', 'private'], default: 'public' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

// 更新时间中间件
postSchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

// 索引
postSchema.index({ author: 1 })
postSchema.index({ createdAt: -1 })
postSchema.index({ tags: 1 })

export const Post = mongoose.model<IPost>('Post', postSchema)
