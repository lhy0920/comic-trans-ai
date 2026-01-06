import express from 'express'
import { Types } from 'mongoose'
import { User } from '../models/User'
import { auth, AuthRequest } from '../middleware/auth'

const router = express.Router()

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000'

// 格式化头像
const formatAvatar = (avatar: string | undefined): string => {
  if (!avatar) return ''
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) return avatar
  return `${BASE_URL}${avatar}`
}

// 关注/取消关注用户
router.post('/:userId', auth, async (req, res) => {
  try {
    const currentUserId = (req as AuthRequest).userId!
    const { userId } = req.params

    if (currentUserId === userId) {
      return res.status(400).json({ success: false, message: '不能关注自己' })
    }

    const targetUser = await User.findById(userId)
    if (!targetUser) {
      return res.status(404).json({ success: false, message: '用户不存在' })
    }

    const currentUser = await User.findById(currentUserId)
    if (!currentUser) {
      return res.status(404).json({ success: false, message: '当前用户不存在' })
    }

    const isFollowing = currentUser.following.some(id => id.toString() === userId)

    if (isFollowing) {
      // 取消关注
      currentUser.following = currentUser.following.filter(id => id.toString() !== userId)
      targetUser.followers = targetUser.followers.filter(id => id.toString() !== currentUserId)
    } else {
      // 关注
      currentUser.following.push(new Types.ObjectId(userId))
      targetUser.followers.push(new Types.ObjectId(currentUserId))
    }

    await currentUser.save()
    await targetUser.save()

    res.json({
      success: true,
      isFollowing: !isFollowing,
      followingCount: currentUser.following.length,
      followersCount: targetUser.followers.length
    })
  } catch (error) {
    console.error('关注操作失败:', error)
    res.status(500).json({ success: false, message: '操作失败' })
  }
})

// 获取自己的关注列表
router.get('/following', auth, async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId
    const { page = 1, limit = 20 } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const user = await User.findById(userId)
      .populate({
        path: 'following',
        select: 'username nickname avatar signature',
        options: { skip, limit: Number(limit) }
      })
      .lean()

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' })
    }

    const following = (user.following as any[]).map(u => ({
      id: u._id,
      username: u.username,
      nickname: u.nickname,
      avatar: formatAvatar(u.avatar),
      signature: u.signature
    }))

    const total = await User.findById(userId).then(u => u?.following.length || 0)

    res.json({
      success: true,
      users: following,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error) {
    console.error('获取关注列表失败:', error)
    res.status(500).json({ success: false, message: '获取失败' })
  }
})

// 获取指定用户的关注列表
router.get('/following/:userId', auth, async (req, res) => {
  try {
    const userId = req.params.userId
    const { page = 1, limit = 20 } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const user = await User.findById(userId)
      .populate({
        path: 'following',
        select: 'username nickname avatar signature',
        options: { skip, limit: Number(limit) }
      })
      .lean()

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' })
    }

    const following = (user.following as any[]).map(u => ({
      id: u._id,
      username: u.username,
      nickname: u.nickname,
      avatar: formatAvatar(u.avatar),
      signature: u.signature
    }))

    const total = await User.findById(userId).then(u => u?.following.length || 0)

    res.json({
      success: true,
      users: following,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error) {
    console.error('获取关注列表失败:', error)
    res.status(500).json({ success: false, message: '获取失败' })
  }
})

// 获取自己的粉丝列表
router.get('/followers', auth, async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId
    const { page = 1, limit = 20 } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const user = await User.findById(userId)
      .populate({
        path: 'followers',
        select: 'username nickname avatar signature',
        options: { skip, limit: Number(limit) }
      })
      .lean()

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' })
    }

    const followers = (user.followers as any[]).map(u => ({
      id: u._id,
      username: u.username,
      nickname: u.nickname,
      avatar: formatAvatar(u.avatar),
      signature: u.signature
    }))

    const total = await User.findById(userId).then(u => u?.followers.length || 0)

    res.json({
      success: true,
      users: followers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error) {
    console.error('获取粉丝列表失败:', error)
    res.status(500).json({ success: false, message: '获取失败' })
  }
})

// 获取指定用户的粉丝列表
router.get('/followers/:userId', auth, async (req, res) => {
  try {
    const userId = req.params.userId
    const { page = 1, limit = 20 } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const user = await User.findById(userId)
      .populate({
        path: 'followers',
        select: 'username nickname avatar signature',
        options: { skip, limit: Number(limit) }
      })
      .lean()

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' })
    }

    const followers = (user.followers as any[]).map(u => ({
      id: u._id,
      username: u.username,
      nickname: u.nickname,
      avatar: formatAvatar(u.avatar),
      signature: u.signature
    }))

    const total = await User.findById(userId).then(u => u?.followers.length || 0)

    res.json({
      success: true,
      users: followers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error) {
    console.error('获取粉丝列表失败:', error)
    res.status(500).json({ success: false, message: '获取失败' })
  }
})

// 获取自己的关注/粉丝数量
router.get('/count', auth, async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId
    const user = await User.findById(userId)

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' })
    }

    res.json({
      success: true,
      followingCount: user.following.length,
      followersCount: user.followers.length
    })
  } catch (error) {
    console.error('获取数量失败:', error)
    res.status(500).json({ success: false, message: '获取失败' })
  }
})

// 获取指定用户的关注/粉丝数量
router.get('/count/:userId', auth, async (req, res) => {
  try {
    const userId = req.params.userId
    const user = await User.findById(userId)

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' })
    }

    res.json({
      success: true,
      followingCount: user.following.length,
      followersCount: user.followers.length
    })
  } catch (error) {
    console.error('获取数量失败:', error)
    res.status(500).json({ success: false, message: '获取失败' })
  }
})

// 检查是否关注
router.get('/check/:userId', auth, async (req, res) => {
  try {
    const currentUserId = (req as AuthRequest).userId
    const { userId } = req.params

    const currentUser = await User.findById(currentUserId)
    const isFollowing = currentUser?.following.some(id => id.toString() === userId) || false

    res.json({ success: true, isFollowing })
  } catch (error) {
    console.error('检查关注状态失败:', error)
    res.status(500).json({ success: false, message: '检查失败' })
  }
})

export default router
