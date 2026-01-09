import { Router, Response } from 'express'
import { Message, Notification, Conversation } from '../models/Message'
import { auth, AuthRequest } from '../middleware/auth'
import mongoose from 'mongoose'

const router = Router()

// 辅助函数：构建完整头像URL
const buildAvatarUrl = (avatar: string | undefined): string => {
  if (!avatar) return ''
  if (avatar.startsWith('http')) return avatar
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000'
  return `${baseUrl}${avatar}`
}

// 获取会话列表
router.get('/conversations', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId

    const conversations = await Conversation.find({
      participants: userId
    })
      .populate('participants', 'nickname avatar')
      .populate('lastMessage')
      .sort({ updatedAt: -1 })
      .limit(50)

    // 获取每个会话的未读数
    const result = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          sender: { $ne: userId },
          receiver: userId,
          read: false,
          $or: [
            { sender: conv.participants[0]._id, receiver: conv.participants[1]._id },
            { sender: conv.participants[1]._id, receiver: conv.participants[0]._id }
          ]
        })

        const otherUser = conv.participants.find(
          (p: any) => p._id.toString() !== userId
        ) as any

        return {
          _id: conv._id,
          user: otherUser ? {
            _id: otherUser._id,
            nickname: otherUser.nickname,
            avatar: buildAvatarUrl(otherUser.avatar)
          } : null,
          lastMessage: conv.lastMessage,
          unreadCount,
          updatedAt: conv.updatedAt
        }
      })
    )

    res.json(result)
  } catch (error) {
    console.error('获取会话列表失败:', error)
    res.status(500).json({ message: '获取会话列表失败' })
  }
})

// 获取与某用户的聊天记录
router.get('/chat/:userId', auth, async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.userId
    const { userId } = req.params
    const { page = 1, limit = 30 } = req.query

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId }
      ]
    })
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('sender', 'nickname avatar')

    // 标记为已读
    await Message.updateMany(
      { sender: userId, receiver: currentUserId, read: false },
      { read: true }
    )

    // 处理头像URL
    const messagesWithFullAvatar = messages.map((msg: any) => ({
      ...msg.toObject(),
      sender: {
        _id: msg.sender._id,
        nickname: msg.sender.nickname,
        avatar: buildAvatarUrl(msg.sender.avatar)
      }
    }))

    res.json(messagesWithFullAvatar.reverse())
  } catch (error) {
    console.error('获取聊天记录失败:', error)
    res.status(500).json({ message: '获取聊天记录失败' })
  }
})

// 发送私信
router.post('/send', auth, async (req: AuthRequest, res: Response) => {
  try {
    const senderId = req.userId
    const { receiverId, content, type = 'text' } = req.body

    if (!receiverId || !content) {
      return res.status(400).json({ message: '参数不完整' })
    }

    // 创建消息
    const message = await Message.create({
      sender: senderId,
      receiver: receiverId,
      content,
      type
    })

    // 更新或创建会话
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] }
    })

    if (conversation) {
      conversation.lastMessage = message._id as mongoose.Types.ObjectId
      conversation.updatedAt = new Date()
      await conversation.save()
    } else {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
        lastMessage: message._id
      })
    }

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'nickname avatar')

    // 处理头像URL
    const msgObj = populatedMessage?.toObject() as any
    if (msgObj && msgObj.sender) {
      msgObj.sender.avatar = buildAvatarUrl(msgObj.sender.avatar)
    }

    res.json(msgObj)
  } catch (error) {
    console.error('发送消息失败:', error)
    res.status(500).json({ message: '发送消息失败' })
  }
})

// 获取通知列表
router.get('/notifications', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId
    const { page = 1, limit = 20, type } = req.query

    const query: any = { user: userId }
    if (type && type !== 'all') {
      query.type = type
    }

    const notifications = await Notification.find(query)
      .populate('relatedUser', 'nickname avatar')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))

    // 处理头像URL
    const notificationsWithFullAvatar = notifications.map((notif: any) => {
      const obj = notif.toObject()
      if (obj.relatedUser && obj.relatedUser.avatar) {
        obj.relatedUser.avatar = buildAvatarUrl(obj.relatedUser.avatar)
      }
      return obj
    })

    const total = await Notification.countDocuments(query)

    res.json({ notifications: notificationsWithFullAvatar, total })
  } catch (error) {
    console.error('获取通知失败:', error)
    res.status(500).json({ message: '获取通知失败' })
  }
})

// 标记通知已读
router.put('/notifications/read', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId
    const { ids } = req.body

    if (ids && ids.length > 0) {
      await Notification.updateMany(
        { _id: { $in: ids }, user: userId },
        { read: true }
      )
    } else {
      // 全部标记已读
      await Notification.updateMany(
        { user: userId, read: false },
        { read: true }
      )
    }

    res.json({ success: true })
  } catch (error) {
    console.error('标记已读失败:', error)
    res.status(500).json({ message: '标记已读失败' })
  }
})

// 获取未读数量
router.get('/unread-count', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId

    const [messageCount, notificationCount] = await Promise.all([
      Message.countDocuments({ receiver: userId, read: false }),
      Notification.countDocuments({ user: userId, read: false })
    ])

    res.json({
      messages: messageCount,
      notifications: notificationCount,
      total: messageCount + notificationCount
    })
  } catch (error) {
    console.error('获取未读数量失败:', error)
    res.status(500).json({ message: '获取未读数量失败' })
  }
})

// 删除通知
router.delete('/notifications/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId
    const { id } = req.params

    await Notification.deleteOne({ _id: id, user: userId })
    res.json({ success: true })
  } catch (error) {
    console.error('删除通知失败:', error)
    res.status(500).json({ message: '删除通知失败' })
  }
})

export default router
