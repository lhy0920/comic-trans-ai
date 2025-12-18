import mongoose, { Document, Schema } from 'mongoose'

export interface IComic extends Document {
  title: string
  cover: string
  author: string
  description: string
  tags: string[]
  status: 'ongoing' | 'completed'
  views: number
  likes: number
  collects: number
  chapters: IChapter[]
  createdAt: Date
  updatedAt: Date
}

export interface IChapter {
  _id: mongoose.Types.ObjectId
  title: string
  pages: string[]
  createdAt: Date
}

const chapterSchema = new Schema<IChapter>({
  title: { type: String, required: true },
  pages: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
})

const comicSchema = new Schema<IComic>({
  title: { type: String, required: true },
  cover: { type: String, required: true },
  author: { type: String, required: true },
  description: { type: String, default: '' },
  tags: [{ type: String }],
  status: { type: String, enum: ['ongoing', 'completed'], default: 'ongoing' },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  collects: { type: Number, default: 0 },
  chapters: [chapterSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

export const Comic = mongoose.model<IComic>('Comic', comicSchema)
