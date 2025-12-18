import mongoose, { Document, Schema } from 'mongoose'
import bcrypt from 'bcryptjs'

export interface IUser extends Document {
  username: string
  email: string
  password: string
  avatar?: string
  nickname: string
  signature?: string
  gender?: string
  birthday?: string
  phone?: string
  createdAt: Date
  comparePassword(password: string): Promise<boolean>
}

const userSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String, default: '' },
  nickname: { type: String, default: '私斋蒸鹅心' },
  signature: { type: String, default: '' },
  gender: { type: String, default: '' },
  birthday: { type: String, default: '' },
  phone: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
})

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

userSchema.methods.comparePassword = async function (password: string) {
  return bcrypt.compare(password, this.password)
}

export const User = mongoose.model<IUser>('User', userSchema)
