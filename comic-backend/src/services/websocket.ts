import { Server as HttpServer } from 'http'
import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { Message, Conversation, Notification } from '../models/Message'
import mongoose from 'mongoose'

interface AuthenticatedSocket extends Socket {
  userId?: string
}

// 在线用户映射 userId -> socketId
const onlineUsers = new Map<string, string>()

// 消息处理超时时间（毫秒）
const MESSAGE_TIMEOUT = 10000

export function setupWebSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  })

  // 认证中间件
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token
    if (!token) {
      return next(new Error('未提供认证令牌'))
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any
      socket.userId = decoded.userId
      next()
    } catch (err) {
      next(new Error('认证失败'))
    }
  })

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!
    console.log(`用户 ${userId} 已连接`)

    // 记录在线状态
    onlineUsers.set(userId, socket.id)

    // 加入个人房间
    socket.join(userId)

    // 广播在线状态
    io.emit('user:online', { userId })

    // 发送私信（带超时处理）
    socket.on('message:send', async (data: {
      receiverId: string
      content: string
      type?: 'text' | 'image',
      messageId?: string //客户端消息Id用于确认是否正常接收
    }, callback) => {
      let timeoutId: NodeJS.Timeout | null = null
      let isCompleted = false

      // 设置超时处理
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          if (!isCompleted) {
            reject(new Error('消息处理超时'))
          }
        }, MESSAGE_TIMEOUT)
      })

      const processMessage = async () => {
        const { receiverId, content, type = 'text', messageId } = data

        // 验证接收者
        if (receiverId === userId) {
          throw new Error('不能给自己发消息')
        }

        // 保存消息
        const message = await Message.create({
          sender: userId,
          receiver: receiverId,
          content,
          type
        })

        // 更新会话
        let conversation = await Conversation.findOne({
          participants: { $all: [userId, receiverId] }
        })

        if (conversation) {
          conversation.lastMessage = message._id as mongoose.Types.ObjectId
          conversation.updatedAt = new Date()
          await conversation.save()
        } else {
          await Conversation.create({
            participants: [userId, receiverId],
            lastMessage: message._id
          })
        }

        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'nickname avatar')

        // 发送给接收者
        io.to(receiverId).emit('message:receive', populatedMessage)

        return { populatedMessage, messageId }
      }

      try {
        const result = await Promise.race([processMessage(), timeoutPromise])
        isCompleted = true
        if (timeoutId) clearTimeout(timeoutId)

        // 使用回调确认发送成功
        if (callback) {
          callback({
            success: true,
            message: result.populatedMessage,
            clientMessageId: result.messageId
          })
        }

        // 确认发送成功
        socket.emit('message:sent', result.populatedMessage)
      } catch (error: any) {
        isCompleted = true
        if (timeoutId) clearTimeout(timeoutId)
        
        console.error('发送消息失败:', error.message)
        
        if (callback) {
          callback({
            success: false,
            error: error.message === '消息处理超时' ? '发送超时，请重试' : '发送消息失败'
          })
        }
        socket.emit('message:error', { 
          message: error.message === '消息处理超时' ? '发送超时，请重试' : '发送失败' 
        })
      }
    })

    // 标记消息已读
    socket.on('message:read', async (data: { senderId: string },callback) => {
      try {
        await Message.updateMany(
          { sender: data.senderId, receiver: userId, read: false },
          { read: true }
        )

        // 通知发送者消息已读
        io.to(data.senderId).emit('message:read-ack', { readerId: userId })
      } catch (error) {
        console.error('标记已读失败:', error)
      }
    })

    // 正在输入
    socket.on('typing:start', (data: { receiverId: string }) => {
      io.to(data.receiverId).emit('typing:show', { userId })
    })

    socket.on('typing:stop', (data: { receiverId: string }) => {
      io.to(data.receiverId).emit('typing:hide', { userId })
    })

    // 断开连接
    socket.on('disconnect', () => {
      console.log(`用户 ${userId} 已断开`)
      onlineUsers.delete(userId)
      io.emit('user:offline', { userId })
    })
  })

  return io
}

// 发送通知的辅助函数
export async function sendNotification(
  io: Server,
  userId: string,
  notification: {
    type: 'like' | 'comment' | 'follow' | 'system' | 'reply'
    title: string
    content?: string
    relatedUserId?: string
    relatedPostId?: string
  }
) {
  try {
    const newNotification = await Notification.create({
      user: userId,
      type: notification.type,
      title: notification.title,
      content: notification.content || '',
      relatedUser: notification.relatedUserId,
      relatedPost: notification.relatedPostId
    })

    const populated = await Notification.findById(newNotification._id)
      .populate('relatedUser', 'nickname avatar')

    // 实时推送
    io.to(userId).emit('notification:new', populated)

    return newNotification
  } catch (error) {
    console.error('发送通知失败:', error)
  }
}

// 检查用户是否在线
export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId)
}

// 获取在线用户列表
export function getOnlineUsers(): string[] {
  return Array.from(onlineUsers.keys())
}
