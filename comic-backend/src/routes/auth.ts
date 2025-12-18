import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { User } from '../models/User'
import { auth, AuthRequest } from '../middleware/auth'
import { upload } from '../middleware/upload'
import { generateCode, sendVerifyCode } from '../services/email'

const router = Router()

// 验证邮箱格式
const validateEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

// 验证手机号格式（中国大陆）
const validatePhone = (phone: string): boolean => {
  const regex = /^1[3-9]\d{9}$/
  return regex.test(phone)
}

// 存储验证码（生产环境应该用 Redis）
const codeStore = new Map<string, { code: string; expires: number }>()

// 发送验证码
router.post('/send-code', async (req: Request, res: Response) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ message: '请输入邮箱' })
    }

    // 检查是否频繁发送（60秒内）
    const existing = codeStore.get(email)
    if (existing && existing.expires - Date.now() > 4 * 60 * 1000) {
      return res.status(429).json({ message: '发送太频繁，请稍后再试' })
    }

    const code = generateCode()
    
    // 存储验证码，5分钟有效
    codeStore.set(email, {
      code,
      expires: Date.now() + 5 * 60 * 1000
    })

    await sendVerifyCode(email, code)
    res.json({ message: '验证码已发送' })
  } catch (error) {
    console.error('发送验证码失败:', error)
    res.status(500).json({ message: '发送验证码失败，请检查邮箱是否正确' })
  }
})

// 验证验证码
router.post('/verify-code', async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body
    const stored = codeStore.get(email)

    if (!stored) {
      return res.status(400).json({ message: '请先获取验证码' })
    }

    if (Date.now() > stored.expires) {
      codeStore.delete(email)
      return res.status(400).json({ message: '验证码已过期' })
    }

    if (stored.code !== code) {
      return res.status(400).json({ message: '验证码错误' })
    }

    // 验证成功，删除验证码
    codeStore.delete(email)
    res.json({ message: '验证成功', verified: true })
  } catch (error) {
    res.status(500).json({ message: '验证失败', error })
  }
})

// 注册
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body
    
    const existingUser = await User.findOne({ $or: [{ email }, { username }] })
    if (existingUser) {
      return res.status(400).json({ message: '用户名或邮箱已存在' })
    }

    const user = new User({ username, email, password })
    await user.save()

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET!, { expiresIn: '7d' })
    res.status(201).json({ token, user: { id: user._id, username, email, nickname: user.nickname } })
  } catch (error) {
    res.status(500).json({ message: '注册失败', error })
  }
})

// 登录
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: '邮箱或密码错误' })
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET!, { expiresIn: '7d' })
    
    // 构建完整的头像 URL
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000'
    const avatarUrl = user.avatar ? `${baseUrl}${user.avatar}` : ''
    
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        username: user.username, 
        email, 
        nickname: user.nickname, 
        avatar: avatarUrl,
        signature: user.signature,
        gender: user.gender,
        birthday: user.birthday,
        phone: user.phone
      } 
    })
  } catch (error) {
    res.status(500).json({ message: '登录失败', error })
  }
})

// 获取当前用户
router.get('/me', auth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId).select('-password')
    if (!user) {
      return res.status(404).json({ message: '用户不存在' })
    }
    
    // 构建完整的头像 URL
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000'
    const avatarUrl = user.avatar ? `${baseUrl}${user.avatar}` : ''
    
    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      nickname: user.nickname,
      avatar: avatarUrl,
      signature: user.signature,
      gender: user.gender,
      birthday: user.birthday,
      phone: user.phone,
      createdAt: user.createdAt
    })
  } catch (error) {
    res.status(500).json({ message: '获取用户信息失败', error })
  }
})

// 更新用户信息
router.put('/profile', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { 
      nickname, 
      signature ,
      username,
      gender,
      birthday,
      phone,
      email
    } = req.body
    const updateData: Record<string, string> = {}
    
    if (nickname != undefined) updateData.nickname = nickname
    if (signature !== undefined) updateData.signature = signature
    if (username != undefined) updateData.username = username 
    if(gender != undefined) updateData.gender = gender
    if(birthday != undefined) updateData.birthday = birthday
    if(phone != undefined) updateData.phone = phone
    if(email != undefined) updateData.email = email

    if(email && !validateEmail(email))
    {
      return res.status(400).json({message:"邮箱格式不正确"})
    }
    if(phone && !validatePhone(phone))
    {
      return res.status(400).json({message:"手机号格式不正确"})
    }
    if (username) {
      const existingUser = await User.findOne({ username })
      if (existingUser && existingUser._id.toString() !== req.userId) {
        return res.status(400).json({ message: '用户名已被使用' })
      }
    }
    if(email)
    {
      const existingUser = await User.findOne({email})
      if(existingUser && existingUser._id.toString()!== req.userId){
        return res.status(400).json({ message: '邮箱已被使用' })
      }
    }
    
    const user = await User.findByIdAndUpdate(
      req.userId,
      updateData,
      { new: true }
    ).select('-password')

    res.json(user)
  } catch (error) {
    res.status(500).json({ message: '更新失败', error })
  }
})

// 上传头像
router.post('/avatar', auth, upload.single('avatar'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请选择图片' })
    }

    const avatarPath = `/uploads/${req.file.filename}`
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000'
    const avatarUrl = `${baseUrl}${avatarPath}`
    
    const user = await User.findByIdAndUpdate(
      req.userId,
      { avatar: avatarPath },
      { new: true }
    ).select('-password')

    res.json({ avatar: avatarUrl, user })
  } catch (error) {
    res.status(500).json({ message: '上传头像失败', error })
  }
})

export default router
