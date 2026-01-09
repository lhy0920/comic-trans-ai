import { io, Socket } from 'socket.io-client'

const SOCKET_URL = 'http://localhost:5000'

class SocketService {
  private socket: Socket | null = null
  private listeners: Map<string, Set<Function>> = new Map()

  connect() {
    const token = localStorage.getItem('token')
    if (!token || this.socket?.connected) return

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    })

    this.socket.on('connect', () => {
      console.log('WebSocket 已连接')
    })

    this.socket.on('disconnect', () => {
      console.log('WebSocket 已断开')
    })

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket 连接错误:', error.message)
    })

    // 转发所有事件给监听器
    const events = [
      'message:receive',
      'message:sent',
      'message:error',
      'message:read-ack',
      'notification:new',
      'typing:show',
      'typing:hide',
      'user:online',
      'user:offline'
    ]

    events.forEach(event => {
      this.socket?.on(event, (data) => {
        this.emit(event, data)
      })
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  // 发送私信（带回调确认）
  sendMessage(
    receiverId: string, 
    content: string, 
    type: 'text' | 'image' = 'text',
    callback?: (response: { success: boolean; message?: any; error?: string }) => void
  ) {
    const messageId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    this.socket?.emit('message:send', { receiverId, content, type, messageId }, (response: any) => {
      callback?.(response)
    })
  }

  // 标记消息已读
  markAsRead(senderId: string) {
    this.socket?.emit('message:read', { senderId })
  }

  // 正在输入
  startTyping(receiverId: string) {
    this.socket?.emit('typing:start', { receiverId })
  }

  stopTyping(receiverId: string) {
    this.socket?.emit('typing:stop', { receiverId })
  }

  // 事件监听
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  off(event: string, callback: Function) {
    this.listeners.get(event)?.delete(callback)
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(cb => cb(data))
  }

  isConnected() {
    return this.socket?.connected ?? false
  }
}

export const socketService = new SocketService()
