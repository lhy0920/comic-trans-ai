import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  MessageCircle,
  Bell,
  Heart,
  MessageSquare,
  UserPlus,
  Send,
  Search,
  Lock
} from 'lucide-react'
import { messageApi, followApi } from '../services/api'
import { socketService } from '../services/socket'
import { DEFAULT_AVATAR } from '../constants/avatar'
import './Mail.css'

interface Conversation {
  _id: string
  user: {
    _id: string
    nickname: string
    avatar?: string
  }
  lastMessage: {
    content: string
    createdAt: string
    read: boolean
  }
  unreadCount: number
  updatedAt: string
}

interface Message {
  _id: string
  sender: {
    _id: string
    nickname: string
    avatar?: string
  }
  content: string
  type: 'text' | 'image'
  read: boolean
  createdAt: string
}

interface Notification {
  _id: string
  type: 'like' | 'comment' | 'follow' | 'system' | 'reply'
  title: string
  content: string
  relatedUser?: {
    _id: string
    nickname: string
    avatar?: string
  }
  read: boolean
  createdAt: string
}

type TabType = 'messages' | 'notifications'

function Mail() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabType>('messages')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const [canSendMore, setCanSendMore] = useState(true)
  const [isFollowingTarget, setIsFollowingTarget] = useState(false)
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')

  // 初始化
  useEffect(() => {
    socketService.connect()
    loadConversations()
    loadNotifications()
  }, [])

  // 处理 URL 参数中的聊天对象
  useEffect(() => {
    const chatWith = searchParams.get('chat')
    if (chatWith && !loading) {
      openChatWithUser(chatWith)
    }
  }, [searchParams, loading, conversations])

  // WebSocket 事件监听
  useEffect(() => {
    const handleNewMessage = (message: Message) => {
      if (selectedChat && message.sender._id === selectedChat.user._id) {
        setMessages(prev => [...prev, message])
        socketService.markAsRead(message.sender._id)
        // 收到新消息时滚动到底部
        setShouldScrollToBottom(true)
        // 对方回复了，可以继续发送
        setCanSendMore(true)
      }
      loadConversations()
    }

    const handleMessageSent = (message: Message) => {
      // 服务器确认消息已发送（悲观更新时可能已通过回调处理）
      setMessages(prev => {
        // 避免重复添加
        if (prev.some(m => m._id === message._id)) return prev
        return [...prev, message]
      })
    }

    const handleMessageError = () => {
      // 发送失败处理（悲观更新时通过回调处理）
    }

    const handleTyping = (data: { userId: string }) => {
      if (selectedChat && data.userId === selectedChat.user._id) {
        setIsTyping(true)
      }
    }

    const handleTypingStop = (data: { userId: string }) => {
      if (selectedChat && data.userId === selectedChat.user._id) {
        setIsTyping(false)
      }
    }

    const handleNewNotification = (notification: Notification) => {
      setNotifications(prev => [notification, ...prev])
    }

    socketService.on('message:receive', handleNewMessage)
    socketService.on('message:sent', handleMessageSent)
    socketService.on('message:error', handleMessageError)
    socketService.on('typing:show', handleTyping)
    socketService.on('typing:hide', handleTypingStop)
    socketService.on('notification:new', handleNewNotification)

    return () => {
      socketService.off('message:receive', handleNewMessage)
      socketService.off('message:sent', handleMessageSent)
      socketService.off('message:error', handleMessageError)
      socketService.off('typing:show', handleTyping)
      socketService.off('typing:hide', handleTypingStop)
      socketService.off('notification:new', handleNewNotification)
    }
  }, [selectedChat])

  // 只在需要时滚动到底部
  useEffect(() => {
    if (shouldScrollToBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      setShouldScrollToBottom(false)
    }
  }, [shouldScrollToBottom])

  const loadConversations = async () => {
    try {
      const data = await messageApi.getConversations()
      setConversations(data)
    } catch (error) {
      console.error('加载会话失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadNotifications = async () => {
    try {
      const { notifications } = await messageApi.getNotifications()
      setNotifications(notifications)
    } catch (error) {
      console.error('加载通知失败:', error)
    }
  }

  const openChatWithUser = async (userId: string) => {
    try {
      // 查找现有会话或创建新的
      let conv = conversations.find(c => c.user._id === userId)
      if (!conv) {
        // 获取用户信息创建临时会话
        const response = await fetch(`http://localhost:5000/api/auth/user/${userId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).then(r => r.json())
        
        // 后端返回 { success: true, user: {...} }
        const userInfo = response.user || response
        
        conv = {
          _id: 'temp',
          user: {
            _id: userInfo.id || userInfo._id || userId,
            nickname: userInfo.nickname,
            avatar: userInfo.avatar
          },
          lastMessage: { content: '', createdAt: '', read: true },
          unreadCount: 0,
          updatedAt: new Date().toISOString()
        }
      }
      selectChat(conv)
    } catch (error) {
      console.error('打开聊天失败:', error)
    }
  }

  const selectChat = async (conv: Conversation) => {
    setSelectedChat(conv)
    try {
      const msgs = await messageApi.getChatHistory(conv.user._id)
      setMessages(msgs)
      socketService.markAsRead(conv.user._id)
      
      // 选择聊天时滚动到底部
      setShouldScrollToBottom(true)
      
      // 更新未读数
      setConversations(prev =>
        prev.map(c =>
          c._id === conv._id ? { ...c, unreadCount: 0 } : c
        )
      )

      // 检查是否关注对方
      const followStatus = await followApi.checkFollow(conv.user._id)
      setIsFollowingTarget(followStatus.isFollowing)

      // 检查是否可以继续发送消息
      checkCanSendMore(msgs, conv.user._id, followStatus.isFollowing)
    } catch (error) {
      console.error('加载聊天记录失败:', error)
    }
  }

  // 检查是否可以发送更多消息
  const checkCanSendMore = (msgs: Message[], targetUserId: string, isFollowing: boolean) => {
    // 如果已关注对方，可以无限发送
    if (isFollowing) {
      setCanSendMore(true)
      return
    }

    // 找到我发送的最后一条消息
    const myMessages = msgs.filter(m => m.sender._id === currentUser.id)
    if (myMessages.length === 0) {
      setCanSendMore(true)
      return
    }

    const lastMyMessage = myMessages[myMessages.length - 1]
    
    // 检查对方是否在我最后一条消息之后回复过
    const targetRepliedAfter = msgs.some(m => 
      m.sender._id === targetUserId && 
      new Date(m.createdAt) > new Date(lastMyMessage.createdAt)
    )

    setCanSendMore(targetRepliedAfter)
  }
  // 悲观更新发送消息（等服务器确认后再显示）
  const [isSending, setIsSending] = useState(false)
  
  const sendMessage = () => {
    if (!inputText.trim() || !selectedChat || !canSendMore || isSending) return
    
    const messageContent = inputText.trim()
    setInputText('')
    setIsSending(true)
    socketService.stopTyping(selectedChat.user._id)

    // 发送消息并等待服务器确认
    socketService.sendMessage(
      selectedChat.user._id,
      messageContent,
      'text',
      (response) => {
        setIsSending(false)
        if (response.success && response.message) {
          // 成功：添加服务器返回的消息
          setMessages(prev => [...prev, response.message])
          // 发送成功后滚动到底部
          setShouldScrollToBottom(true)
        } else {
          // 失败：提示用户
          alert(response.error || '发送失败，请重试')
          setInputText(messageContent) // 恢复输入内容
        }
      }
    )

    // 如果未关注，发送后禁止继续发送
    if (!isFollowingTarget) {
      setCanSendMore(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value)
    if (selectedChat) {
      if (e.target.value) {
        socketService.startTyping(selectedChat.user._id)
      } else {
        socketService.stopTyping(selectedChat.user._id)
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const markAllRead = async () => {
    try {
      await messageApi.markNotificationsRead()
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch (error) {
      console.error('标记已读失败:', error)
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
    return date.toLocaleDateString()
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart size={16} className="notif-icon like" />
      case 'comment': return <MessageSquare size={16} className="notif-icon comment" />
      case 'follow': return <UserPlus size={16} className="notif-icon follow" />
      case 'reply': return <MessageSquare size={16} className="notif-icon reply" />
      default: return <Bell size={16} className="notif-icon system" />
    }
  }

  return (
    <div className="mail-page">
      {/* 左侧列表 */}
      <div className={`mail-sidebar ${selectedChat ? 'hide-mobile' : ''}`}>
        <div className="mail-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <h1>消息</h1>
        </div>

        {/* Tab 切换 */}
        <div className="mail-tabs">
          <button
            className={`tab-btn ${activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => setActiveTab('messages')}
          >
            <MessageCircle size={18} />
            私信
          </button>
          <button
            className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <Bell size={18} />
            通知
          </button>
        </div>

        {/* 搜索框 */}
        <div className="mail-search">
          <Search size={16} />
          <input type="text" placeholder="搜索..." />
        </div>

        {/* 列表内容 */}
        <div className="mail-list">
          {activeTab === 'messages' ? (
            loading ? (
              <div className="loading-state">加载中...</div>
            ) : conversations.length === 0 ? (
              <div className="empty-state">
                <MessageCircle size={48} strokeWidth={1} />
                <p>暂无私信</p>
              </div>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv._id}
                  className={`conversation-item ${selectedChat?._id === conv._id ? 'active' : ''}`}
                  onClick={() => selectChat(conv)}
                >
                  <img
                    src={conv.user.avatar || DEFAULT_AVATAR}
                    alt={conv.user.nickname}
                    className="conv-avatar"
                  />
                  <div className="conv-info">
                    <div className="conv-header">
                      <span className="conv-name">{conv.user.nickname}</span>
                      <span className="conv-time">{formatTime(conv.updatedAt)}</span>
                    </div>
                    <p className="conv-preview">{conv.lastMessage?.content || '开始聊天'}</p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="unread-badge">{conv.unreadCount}</span>
                  )}
                </div>
              ))
            )
          ) : (
            <>
              {notifications.length > 0 && (
                <button className="mark-all-read" onClick={markAllRead}>
                  全部已读
                </button>
              )}
              {notifications.length === 0 ? (
                <div className="empty-state">
                  <Bell size={48} strokeWidth={1} />
                  <p>暂无通知</p>
                </div>
              ) : (
                notifications.map(notif => (
                  <div
                    key={notif._id}
                    className={`notification-item ${notif.read ? '' : 'unread'}`}
                    onClick={() => {
                      if (notif.relatedUser) {
                        navigate(`/user/${notif.relatedUser._id}`)
                      }
                    }}
                  >
                    {getNotificationIcon(notif.type)}
                    <div className="notif-content">
                      <p className="notif-title">{notif.title}</p>
                      {notif.content && <p className="notif-desc">{notif.content}</p>}
                      <span className="notif-time">{formatTime(notif.createdAt)}</span>
                    </div>
                    {notif.relatedUser && (
                      <img
                        src={notif.relatedUser.avatar || DEFAULT_AVATAR}
                        alt=""
                        className="notif-avatar"
                      />
                    )}
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>

      {/* 右侧聊天区域 */}
      <div className={`chat-area ${selectedChat ? 'show' : ''}`}>
        {selectedChat ? (
          <>
            <div className="chat-header">
              <button className="back-btn mobile-only" onClick={() => setSelectedChat(null)}>
                <ArrowLeft size={20} />
              </button>
              <img
                src={selectedChat.user.avatar || DEFAULT_AVATAR}
                alt={selectedChat.user.nickname}
                className="chat-avatar"
                onClick={() => navigate(`/user/${selectedChat.user._id}`)}
              />
              <div className="chat-user-info">
                <span className="chat-username">{selectedChat.user.nickname}</span>
                {isTyping && <span className="typing-indicator">正在输入...</span>}
              </div>
            </div>

            <div className="chat-messages">
              {messages.map(msg => (
                <div
                  key={msg._id}
                  className={`message ${msg.sender._id === currentUser.id ? 'sent' : 'received'}`}
                >
                  {msg.sender._id !== currentUser.id && (
                    <img
                      src={msg.sender.avatar || DEFAULT_AVATAR}
                      alt=""
                      className="msg-avatar"
                    />
                  )}
                  <div className="msg-bubble">
                    {msg.type === 'image' ? (
                      <img src={msg.content} alt="" className="msg-image" />
                    ) : (
                      <p>{msg.content}</p>
                    )}
                    {/* <div className="msg-meta">
                      <span className="msg-time">
                        {new Date(msg.createdAt).toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {msg.sender._id === currentUser.id && (
                        <span className="msg-status">
                          {msg.read ? <CheckCheck size={14} /> : <Check size={14} />}
                        </span>
                      )}
                    </div> */}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-wrapper">
              {canSendMore ? (
                <>
                  <input
                    type="text"
                    value={inputText}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    placeholder={isSending ? "发送中..." : "输入消息..."}
                    disabled={isSending}
                  />
                  <button
                    className="send-btn"
                    onClick={sendMessage}
                    disabled={!inputText.trim() || isSending}
                  >
                    <Send size={18} />
                  </button>
                </>
              ) : (
                <div className="send-limit-tip">
                  <Lock size={16} />
                  <span>关注对方或等待回复后才能继续发送消息</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="no-chat-selected">
            <MessageCircle size={64} strokeWidth={1} />
            <p>选择一个对话开始聊天</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Mail
